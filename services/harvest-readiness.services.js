const { toCamelCaseObject } = require("../utils/utlis");

const HARVEST_STAGE_CODE = 'HARW'; // no IsHarvestStage column exists; hardcoded per confirmed lov code

/**
 * computeHarvestReadiness
 * ------------------------
 * Computes HarvestReadinessPercentage and HarvestReadinessInd for a single
 * HarvestCycleInstance.
 *
 * MODEL:
 *  - CropLifeCycleStages defines the ordered template: each stage's
 *    Min/MaxDaysFromPreviousStage is the expected GAP between the previous
 *    stage and this one (not "how long this stage lasts").
 *  - CropStages holds observed reality: exactly one row per
 *    (HarvestCycleInstanceId, StageName), with ObservedDate marking when
 *    that stage was reached. (Confirmed: stage codes are unique per
 *    HarvestCycleInstanceId -- no dedup/collision handling needed.)
 *  - Progress = how far we've walked through the cumulative expected-gap
 *    timeline, using ObservedDate where we have it and "today" for the gap
 *    we're currently sitting inside.
 *
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number} harvestCycleInstanceId
 * @param {object} [opts]
 * @param {number} [opts.readyThresholdPct=90]
 * @returns {{ percentage: number, indicator: number, currentStageCode: string|null }}
 */
function computeHarvestReadiness(db, harvestCycleInstanceId, opts = {}) {
  // inidcator is not correct
  // harvest readiness is become 100% only at dorm, which is stupid
  // redines indicator should be 1 at mat stage observation, then after harves it should go back to 0
  const readyThresholdPct = opts.readyThresholdPct ?? 90;

  const hciRow = db.prepare(`
    SELECT Id, CropLifecycleDefinitionId, StartDate, Status, CurrentStage
    FROM HarvestCycleInstance
    WHERE Id = @harvestCycleInstanceId
  `).get({ harvestCycleInstanceId });

  if (!hciRow) {
    return { percentage: 0, indicator: 0, currentStageCode: null };
  }
  const hci = toCamelCaseObject(hciRow);

  // 1. Template stages, in order, with expected gap durations.
  const templateRows = db.prepare(`
    SELECT Stage, StageOrder, MinDaysFromPreviousStage, MaxDaysFromPreviousStage
    FROM CropLifeCycleStages
    WHERE CropLifecycleDefinitionId = @cropLifecycleDefinitionId
    ORDER BY StageOrder ASC
  `).all({ cropLifecycleDefinitionId: hci.cropLifecycleDefinitionId });

  if (templateRows.length === 0) {
    return { percentage: 0, indicator: 0, currentStageCode: null };
  }
  const templateStages = templateRows.map(toCamelCaseObject);

  // 2. Observed stage dates for this cycle instance -- one row per stage.
  const observedRows = db.prepare(`
    SELECT StageName, ObservedDate
    FROM CropStages
    WHERE HarvestCycleInstanceId = @harvestCycleInstanceId
  `).all({ harvestCycleInstanceId });

  const observedMap = {};
  for (const row of observedRows.map(toCamelCaseObject)) {
    observedMap[row.stageName] = row.observedDate;
  }

  const midpointGap = (stage) => {
    const min = stage.minDaysFromPreviousStage ?? 0;
    const max = stage.maxDaysFromPreviousStage ?? min;
    return (min + max) / 2;
  };

  const today = new Date();
  let totalExpectedDays = 0;
  let elapsedDays = 0;
  let currentStageCode = null;
  let reachedHarvestStage = false;

  for (let i = 0; i < templateStages.length; i++) {
    const stage = templateStages[i];
    const expected = midpointGap(stage);
    totalExpectedDays += expected;

    const observedDate = observedMap[stage.stage];

    if (observedDate) {
      // This stage has been reached -- full expected credit for the gap
      // leading into it, regardless of actual pace.
      elapsedDays += expected;
      if (stage.stage === HARVEST_STAGE_CODE) {
        reachedHarvestStage = true;
      }
      continue;
    }

    // Not yet reached. Are we currently inside the gap leading into it?
    const prevObservedDate = i === 0
      ? hci.startDate
      : observedMap[templateStages[i - 1].stage];

    if (prevObservedDate) {
      currentStageCode = i === 0 ? null : templateStages[i - 1].stage;
      const start = new Date(prevObservedDate);
      const daysIn = Math.max(0, (today - start) / (1000 * 60 * 60 * 24));
      elapsedDays += Math.min(daysIn, expected);
    }

    // Either way, nothing beyond this point has begun -- stop walking.
    break;
  }

  const percentage = totalExpectedDays > 0
    ? Math.min(100, Math.round((elapsedDays / totalExpectedDays) * 10000) / 100)
    : 0;

  const indicator = (percentage >= readyThresholdPct || reachedHarvestStage) ? 1 : 0;

  return { percentage, indicator, currentStageCode };
}

/**
 * updateHarvestReadiness
 * ------------------------
 * Computes and persists readiness for a single HarvestCycleInstance.
 * Call inside the same transaction as the stage-transition write that
 * triggered the recompute.
 */
function updateHarvestReadiness(db, harvestCycleInstanceId) {
  // for stages like dorm no need to compute, or handle accrodingly
  const { percentage, indicator } = computeHarvestReadiness(db, harvestCycleInstanceId);

  db.prepare(`
    UPDATE HarvestCycleInstance
    SET HarvestReadinessPercentage = @percentage,
        HarvestReadinessInd = @indicator
    WHERE Id = @harvestCycleInstanceId
  `).run({ percentage, indicator, harvestCycleInstanceId });

  console.log ("updateHarvestReadiness cycle:",harvestCycleInstanceId," %:",percentage," ind:", indicator );
  return { percentage, indicator };
}

/**
 * recomputeAllActiveReadiness
 * ------------------------
 * Cron entry point -- sweeps active HarvestCycleInstance rows and refreshes
 * readiness for time-drift.
 */
function recomputeAllActiveReadiness(db) {
  const activeCycles = db.prepare(`
    SELECT Id FROM HarvestCycleInstance
    WHERE Status = 'ACTIVE'
  `).all().map(toCamelCaseObject);

  console.log('activeCycles', activeCycles)

  const runAll = db.transaction((cycles) => {
    for (const cycle of cycles) {
      updateHarvestReadiness(db, cycle.id);
    }
  });

  runAll(activeCycles);

  return { updated: activeCycles.length };
}

module.exports = {
  computeHarvestReadiness,
  updateHarvestReadiness,
  recomputeAllActiveReadiness,
};