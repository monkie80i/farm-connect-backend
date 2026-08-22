const db = require('../db');
const { toCamelCaseObject, getFutureDateISO,getPastDateISO } = require("../utils/utlis");

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Math.round(days));
  return d;
}

function toISODate(date) {
  return date ? date.toISOString().split('T')[0] : null;
}

function getStageDefinitions(definitionId) {
  return db.prepare(`
    SELECT Stage, StageOrder, MinDaysFromPreviousStage, MaxDaysFromPreviousStage
    FROM CropLifeCycleStages
    WHERE CropLifecycleDefinitionId = @definitionId
    ORDER BY StageOrder ASC
  `).all({ definitionId });
}

function getObservedStagesMap(harvestCycleInstanceId) {
  const rows = db.prepare(`
    SELECT StageName, ObservedDate, ObservationType
    FROM CropStages
    WHERE HarvestCycleInstanceId = @harvestCycleInstanceId
  `).all({ harvestCycleInstanceId });

  return new Map(rows.map((row) => [row.StageName, row]));
}

/**
 * Resolves one HarvestCycleInstance into an ordered list of RAW stage
 * entries — each still carrying its resolved `date` (Date object, not yet
 * formatted, no estStartDate/estEndDate yet). Cross-segment `next` stitching
 * happens later, once all segments are flattened together, so a segment's
 * last stage can correctly see into the next segment.
 *
 * Anchoring rule: once an observed/backfilled date is hit, later estimates
 * re-anchor off that real date rather than compounding drift from StartDate.
 */
function resolveCycleStageEntries(cycleInstance) {
  const stageDefs = getStageDefinitions(cycleInstance.CropLifecycleDefinitionId);
  const observedMap = getObservedStagesMap(cycleInstance.Id);

  let anchorDate = cycleInstance.StartDate ? new Date(cycleInstance.StartDate) : null;

  return stageDefs.map((stageDef) => {
    const observed = observedMap.get(stageDef.Stage);

    if (observed) {
      const date = new Date(observed.ObservedDate);
      anchorDate = date;
      return {
        stage: stageDef.Stage,
        isObserved: true,
        observedDate: observed.ObservedDate,
        observationType: observed.ObservationType,
        date,
      };
    }

    const meanDays = (stageDef.MinDaysFromPreviousStage + stageDef.MaxDaysFromPreviousStage) / 2;
    const projected = anchorDate ? addDays(anchorDate, meanDays) : null;
    anchorDate = projected;

    return {
      stage: stageDef.Stage,
      isObserved: false,
      observedDate: null,
      observationType: null,
      date: projected,
    };
  });
}

function getRelevantCycleInstances(cropId, growthDurationType) {
  if (growthDurationType === 'PERENNIAL') {
    const establishment = db.prepare(`
      SELECT hci.*
      FROM HarvestCycleInstance hci
      JOIN CropLifecycleDefinition cld ON hci.CropLifecycleDefinitionId = cld.Id
      WHERE hci.CropId = @cropId AND cld.PhaseType = 'ESTABLISHMENT'
      ORDER BY hci.StartDate ASC
      LIMIT 1
    `).get({ cropId });

    const latestRecurring = db.prepare(`
      SELECT hci.*
      FROM HarvestCycleInstance hci
      JOIN CropLifecycleDefinition cld ON hci.CropLifecycleDefinitionId = cld.Id
      WHERE hci.CropId = @cropId AND cld.PhaseType = 'RECURRING'
      ORDER BY hci.StartDate DESC, hci.Id DESC
      LIMIT 1
    `).get({ cropId });

    return [establishment, latestRecurring].filter(Boolean);
  }

  const full = db.prepare(`
    SELECT hci.*
    FROM HarvestCycleInstance hci
    JOIN CropLifecycleDefinition cld ON hci.CropLifecycleDefinitionId = cld.Id
    WHERE hci.CropId = @cropId AND cld.PhaseType = 'FULL'
    ORDER BY hci.StartDate DESC, hci.Id DESC
    LIMIT 1
  `).get({ cropId });

  return [full].filter(Boolean);
}

/**
 * Builds a single flat, continuously-ordered stage timeline for a crop:
 * FULL cycle for ANNUAL/BIENNIAL, or ESTABLISHMENT + latest RECURRING
 * (concatenated, not nested) for PERENNIAL.
 *
 * @param {number} cropId
 * @returns {object} { cropId, growthDurationType, stages }
 */
function buildCropTimeline(cropId) {
  const crop = db.prepare(`
    SELECT c.Id, ct.GrowthDurationType
    FROM Crop c
    JOIN CropType ct ON c.CropTypeId = ct.Id
    WHERE c.Id = @cropId
  `).get({ cropId });

  if (!crop) {
    throw new Error('buildCropTimeline: crop does not exist');
  }

  const cycleInstances = getRelevantCycleInstances(cropId, crop.GrowthDurationType);

  // Resolve each segment independently (dates only), then flatten so that
  // "next" below can see across the establishment -> recurring boundary.
  const flatResolved = cycleInstances.flatMap(resolveCycleStageEntries);

  // Terminal fallback: if the very last stage of the whole timeline is
  // unobserved, use the last cycle instance's cached EstdHarvestDate instead
  // of leaving estEndDate null.
  const lastInstance = cycleInstances[cycleInstances.length - 1];
  const terminalFallbackDate = lastInstance?.EstdHarvestDate
    ? new Date(lastInstance.EstdHarvestDate)
    : null;

    const stages = flatResolved.map((entry, idx) => {
    const order = idx + 1;

    if (entry.isObserved) {
      return {
        order,
        stage: entry.stage,
        estStartDate: null,
        estEndDate: null,
        observedDate: entry.observedDate,
        observationType: entry.observationType,
      };
    }

    const next = flatResolved[idx + 1];

    let endDate;
    if (next) {
      endDate = next.date;
    } else if (entry.stage === 'DORM') {
      // Dormancy is open-ended by design — no cycle-end date to fall back
      // to until the cron creates the next RECURRING instance.
      endDate = null;
    } else {
      endDate = terminalFallbackDate;
    } 

    return {
      order,
      stage: entry.stage,
      estStartDate: toISODate(entry.date),
      estEndDate: endDate ? toISODate(endDate): null,
      observedDate: null,
      observationType: null,
    };
  });

  return { cropId: crop.Id, growthDurationType: crop.GrowthDurationType, stages };
}

module.exports = { buildCropTimeline };