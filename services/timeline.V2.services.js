const db = require("../db");
const {
  toCamelCaseObject
} = require("../utils/utlis");
const { getStageMeanDays } = require("./crops.services");

function toISODate(date) {
  return date ? date.toISOString().split('T')[0] : null;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Math.round(days));
  return d;
}

function getStageDefinitions(definitionId) {
  return toCamelCaseObject(db
    .prepare(
      `
      SELECT Stage, StageOrder, MinDaysFromPreviousStage, MaxDaysFromPreviousStage
      FROM CropLifeCycleStages
      WHERE CropLifecycleDefinitionId = @definitionId
      ORDER BY StageOrder ASC
    `,
    )
    .all({ definitionId }));
}

function getObservedStagesMap(harvestCycleInstanceId) {
  const rows = toCamelCaseObject(db
    .prepare(
      `
      SELECT StageName, ObservedDate, ObservationType
      FROM CropStages
      WHERE HarvestCycleInstanceId = @harvestCycleInstanceId
    `,
    )
    .all({ harvestCycleInstanceId }));

  return new Map(rows.map((row) => [row.stageName, row]));
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
  const stageDefs = getStageDefinitions(
    cycleInstance.cropLifecycleDefinitionId,
  );
  const observedMap = getObservedStagesMap(cycleInstance.id);

  let anchorDate = cycleInstance.startDate
    ? new Date(cycleInstance.startDate)
    : null;

  return stageDefs.map((stageDef) => {
    const observed = observedMap.get(stageDef.stage);

    if (observed) {
      const date = new Date(observed.observedDate);
      anchorDate = date;
      return {
        stage: stageDef.stage,
        isObserved: true,
        observedDate: observed.observedDate,
        observationType: observed.observationType,
        date,
      };
    }

    const meanDays =
      (stageDef.minDaysFromPreviousStage + stageDef.maxDaysFromPreviousStage) /
      2;
    const projected = anchorDate
      ? addDays(anchorDate, meanDays)
      : null;
    anchorDate = projected;

    return {
      stage: stageDef.stage,
      isObserved: false,
      observedDate: null,
      observationType: null,
      date: projected,
    };
  });
}

function buildCropInstanceTimeline(instance) {
  const resolved = resolveCycleStageEntries(instance);
  const stages = resolved.map((entry, idx) => {
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

    const next = resolved[idx + 1];

    let endDate;
    if (next) {
      endDate = next.date; // -1
    } else if (entry.stage === "DORM") {    
      endDate = getDormEndDate(instance.cropLifecycleDefinitionId,entry.date);
    } else {
      endDate = instance.estdHarvestDate 
        ? new Date(instance.estdHarvestDate)
        : null
      ;
    }

    return {
      order,
      stage: entry.stage,
      estStartDate: toISODate(entry.date),
      estEndDate: endDate ? toISODate(endDate) : null,
      observedDate: null,
      observationType: null,
    };
  });

  return stages;
}

function getDormEndDate(defId,startDate) {
  const firstStage = toCamelCaseObject(db.prepare(`
    SELECT * 
    FROM CropLifeCycleStages 
    WHERE CropLifecycleDefinitionId = @defId
    ORDER BY StageOrder ASC
    LIMIT 1
  `).get({defId}));

  let endDate = null;
  if(firstStage) {
    const mean = getStageMeanDays(firstStage);
    const end = addDays(startDate,mean);
    endDate = end;
  }

  return endDate;

}

function buildCropTimelines(cropId) {
  const cycles = toCamelCaseObject(db.prepare(`
    SELECT hci.*,cld.PhaseType
    FROM HarvestCycleInstance hci
    JOIN CropLifecycleDefinition cld ON hci.CropLifecycleDefinitionId = cld.Id
    WHERE hci.CropId=@cropId`
  ).all({ cropId }));

  const timelines = [];
  cycles.forEach((cycle) => {
    const stages = buildCropInstanceTimeline(cycle);
    const item = {
      instanceId: cycle.id,
      cycleLabel : cycle.cycleLabel,
      status: cycle.status,
      yield: null,
      stages: stages
    }
    if(cycle.status === 'COMPLETE') {
      const yeild = {
        acutalYield: cycle.actualYield,
        harvsetNote: cycle.harvestNote
      }
      item.yield = yeild;
    }

    timelines.push(item);
  })

  return timelines;

}

function buildCropTimelineNew(harvestCycle) {
  if(!harvestCycle) {
    throw new Error('buildCropTimelineNew: Invalid harv cycle');
  }
  const defId = harvestCycle.cropLifecycleDefinitionId;

  const def = toCamelCaseObject(
    db
    .prepare(`SELECT PhaseType FROM CropLifecycleDefinition WHERE Id=@defId`)
    .get({ defId })
  )

  harvestCycle['phaseType'] = def['phaseType'];

  const stages = buildCropInstanceTimeline(harvestCycle);
  const timeline = {
    instanceId: harvestCycle.id,
    cycleLabel : harvestCycle.cycleLabel,
    status: harvestCycle.status,
    yield: null,
    stages: stages
  }
  if(harvestCycle.status === 'COMPLETE') {
    const yeild = {
      acutalYield: harvestCycle.actualYield,
      harvsetNote: harvestCycle.harvestNote
    }
    timeline.yield = yeild;
  }

  return timeline;

}




module.exports = {
  buildCropTimelines,
  buildCropTimelineNew
}
