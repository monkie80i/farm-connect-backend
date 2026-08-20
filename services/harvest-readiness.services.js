/**
 * computeHarvestReadiness
 * ------------------------
 * Computes HarvestReadinessPercentage and HarvestReadinessInd for a single
 * HarvestCycleInstance, based on elapsed stage progress vs. expected stage
 * durations (midpoint of Min/MaxDurationDays per stage).
 *
 * ASSUMPTIONS (adjust column names to match your real schema):
 *  - CropStages has: Id, HarvestCycleInstanceId, StageCode, SequenceOrder,
 *    ActualStartDate, ActualEndDate, EstimatedStartDate, EstimatedEndDate
 *  - CropLifeCycleStages has: StageCode, SequenceOrder, MinDurationDays,
 *    MaxDurationDays, IsHarvestStage (0/1) -- if you don't have IsHarvestStage,
 *    swap the harvestStage lookup for "last stage by SequenceOrder"
 *
 * This function is read/compute-only -- it does NOT write to the DB.
 * Call updateHarvestReadiness() (below) when you want to persist the result,
 * inside the same transaction as whatever triggered the recompute.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number} harvestCycleInstanceId
 * @param {object} [opts]
 * @param {number} [opts.readyThresholdPct=90] - percentage at which HarvestReadinessInd flips to 1
 * @returns {{ percentage: number, indicator: number, currentStageCode: string|null }}
 */
function computeHarvestReadiness(db, harvestCycleInstanceId, opts = {}) {
  const readyThresholdPct = opts.readyThresholdPct ?? 90;

  // 1. Pull all stages for this cycle instance, joined to their expected durations,
  //    ordered by sequence.
  const stages = db.prepare(`
    SELECT
      cs.Id,
      cs.StageCode,
      cs.SequenceOrder,
      cs.ActualStartDate,
      cs.ActualEndDate,
      cs.EstimatedStartDate,
      cs.EstimatedEndDate,
      cls.MinDurationDays,
      cls.MaxDurationDays,
      cls.IsHarvestStage
    FROM CropStages cs
    JOIN HarvestCycleInstance hci ON hci.Id = cs.HarvestCycleInstanceId
    JOIN CropLifeCycleStages cls
      ON cls.StageCode = cs.StageCode
     AND cls.CropLifecycleDefinitionId = hci.CropLifecycleDefinitionId
    WHERE cs.HarvestCycleInstanceId = @harvestCycleInstanceId
    ORDER BY cs.SequenceOrder ASC
  `).all({ harvestCycleInstanceId });

  if (stages.length === 0) {
    // No stage data yet -- nothing to compute against.
    return { percentage: 0, indicator: 0, currentStageCode: null };
  }

  const midpointDuration = (stage) => {
    const min = stage.MinDurationDays ?? 0;
    const max = stage.MaxDurationDays ?? min;
    return (min + max) / 2;
  };

  const today = new Date();
  let totalExpectedDays = 0;
  let elapsedDays = 0;
  let currentStageCode = null;

  for (const stage of stages) {
    const expected = midpointDuration(stage);
    totalExpectedDays += expected;

    if (stage.ActualEndDate) {
      // Completed stage -- full expected credit, regardless of how long it
      // actually took. (If you want "actual" pace to affect readiness of
      // later stages, that's a separate signal -- not folded in here.)
      elapsedDays += expected;
      continue;
    }

    if (stage.ActualStartDate) {
      // In-progress stage -- partial credit based on days elapsed so far,
      // capped at the stage's own expected duration.
      currentStageCode = stage.StageCode;
      const start = new Date(stage.ActualStartDate);
      const daysIn = Math.max(0, (today - start) / (1000 * 60 * 60 * 24));
      elapsedDays += Math.min(daysIn, expected);
      continue;
    }

    // Future stage, not yet started -- 0 credit, and stop walking further
    // since nothing beyond this point has begun either.
    break;
  }

  const percentage = totalExpectedDays > 0
    ? Math.min(100, Math.round((elapsedDays / totalExpectedDays) * 10000) / 100)
    : 0;

  const currentStage = stages.find(s => s.StageCode === currentStageCode);
  const reachedHarvestStage = currentStage?.IsHarvestStage === 1
    || (!currentStageCode && stages[stages.length - 1]?.ActualEndDate && stages[stages.length - 1]?.IsHarvestStage === 1);

  const indicator = (percentage >= readyThresholdPct || reachedHarvestStage) ? 1 : 0;

  return { percentage, indicator, currentStageCode };
}

/**
 * updateHarvestReadiness
 * ------------------------
 * Computes and persists readiness for a single HarvestCycleInstance.
 * Call this inside the same transaction as the stage-transition write
 * that triggered the recompute.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number} harvestCycleInstanceId
 */
function updateHarvestReadiness(db, harvestCycleInstanceId) {
  const { percentage, indicator } = computeHarvestReadiness(db, harvestCycleInstanceId);

  db.prepare(`
    UPDATE HarvestCycleInstance
    SET HarvestReadinessPercentage = @percentage,
        HarvestReadinessInd = @indicator
    WHERE Id = @harvestCycleInstanceId
  `).run({ percentage, indicator, harvestCycleInstanceId });

  return { percentage, indicator };
}

/**
 * recomputeAllActiveReadiness
 * ------------------------
 * Cron entry point -- sweeps all active HarvestCycleInstance rows and
 * refreshes readiness for time-drift (no new events, but days have passed).
 * Assumes an active cycle has no CompletedDate / Status = 'ACTIVE' -- adjust
 * the WHERE clause to your actual status column.
 *
 * @param {import('better-sqlite3').Database} db
 */
function recomputeAllActiveReadiness(db) {
  const activeCycles = db.prepare(`
    SELECT Id FROM HarvestCycleInstance
    WHERE Status = 'ACTIVE'
  `).all();

  const runAll = db.transaction((cycles) => {
    for (const cycle of cycles) {
      updateHarvestReadiness(db, cycle.Id);
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