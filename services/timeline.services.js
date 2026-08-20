const db = require('../db');

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
 * Resolves one HarvestCycleInstance into an ordered list of stage entries
 * (no `order` field yet — that's assigned once segments are merged).
 * Anchoring rule: once an observed/backfilled date is hit, later estimates
 * re-anchor off that real date rather than compounding drift from StartDate.
 */
function resolveCycleStageEntries(cycleInstance) {
  const stageDefs = getStageDefinitions(cycleInstance.CropLifecycleDefinitionId);
  const observedMap = getObservedStagesMap(cycleInstance.Id);

  let anchorDate = cycleInstance.StartDate ? new Date(cycleInstance.StartDate) : null;

  // Pass 1: resolve one date per stage (actual or projected midpoint).
  const resolved = stageDefs.map((stageDef) => {
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

  // Pass 2: derive estStartDate/estEndDate windows for unobserved stages.
  return resolved.map((entry, idx) => {
    if (entry.isObserved) {
      return {
        stage: entry.stage,
        estStartDate: null,
        estEndDate: null,
        observedDate: entry.observedDate,
        observationType: entry.observationType,
      };
    }

    const next = resolved[idx + 1];
    return {
      stage: entry.stage,
      estStartDate: toISODate(entry.date),
      estEndDate: next ? toISODate(next.date) : null,
      observedDate: null,
      observationType: null,
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

    // Establishment first, then latest recurring — order here drives the
    // final `order` numbering below.
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
 * @returns {object|null} null if the crop doesn't exist.
 */
function buildCropTimeline(cropId) {
  const crop = db.prepare(`
    SELECT c.Id, ct.GrowthDurationType
    FROM Crop c
    JOIN CropType ct ON c.CropTypeId = ct.Id
    WHERE c.Id = @cropId
  `).get({ cropId });

  if (!crop) return null; // throw proper error

  const cycleInstances = getRelevantCycleInstances(cropId, crop.GrowthDurationType);

  const flatEntries = cycleInstances.flatMap(resolveCycleStageEntries);

  const stages = flatEntries.map((entry, idx) => ({
    order: idx + 1,
    ...entry,
  }));

  return { cropId: crop.Id, growthDurationType: crop.GrowthDurationType, stages };
}

module.exports = { buildCropTimeline };