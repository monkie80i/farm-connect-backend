const {
  getStageMeanDays,
  createHarvestLifecycleInstance,
  createHarvestCycleNStages,
  getLifecycleStagesOfDefinition,
  backTrackStagesWithMean,
  forwardTackStagesDays,
  forwardTackStagesDate,
  getFullStageSeq,
  getEstStageSeq,
  getRecStageSeq,
} = require("../services/crops.services");

const db = require('../db');

/**
 * 
 * getStageMeanDays, // passed
  createHarvestLifecycleInstance,
  createHarvestCycleNStages,
  getLifecycleStagesOfDefinition, - passed
  backTrackStagesWithMean, - passed
  forwardTackStagesDays,- passed
  forwardTackStagesDate, - passed
 */
function test() {
    
}

function test_1() {
  // getLifecycleStagesOfDefinition
  // def id 16
  const lifecycelStages= getLifecycleStagesOfDefinition(16);
  console.log('lifecycelStages',lifecycelStages)
  //passed
}

function test_2() {
  // getStageMeanDays
  const lifecycelStages= getLifecycleStagesOfDefinition(16);
  console.log('lifecycelStages',lifecycelStages[0])
  const mean = getStageMeanDays(lifecycelStages[0])
  console.log('mean',mean)
  //passed
}

/**
 * 
 * lifecycelStages [
  {
    Id: 114,
    CropLifecycleDefinitionId: 16,
    Stage: 'LAND',
    StageOrder: 1,
    MinDaysFromPreviousStage: 10,
    MaxDaysFromPreviousStage: 15,
    UpdatedUser: null,
    UpdatedDate: null
  },
  {
    Id: 115,
    CropLifecycleDefinitionId: 16,
    Stage: 'SOW',
    StageOrder: 2,
    MinDaysFromPreviousStage: 11,
    MaxDaysFromPreviousStage: 16,
    UpdatedUser: null,
    UpdatedDate: null
  },
  {
    Id: 116,
    CropLifecycleDefinitionId: 16,
    Stage: 'GERM',
    StageOrder: 3,
    MinDaysFromPreviousStage: 11,
    MaxDaysFromPreviousStage: 17,
    UpdatedUser: null,
    UpdatedDate: null
  },
  {
    Id: 117,
    CropLifecycleDefinitionId: 16,
    Stage: 'GROW',
    StageOrder: 4,
    MinDaysFromPreviousStage: 11,
    MaxDaysFromPreviousStage: 20,
    UpdatedUser: null,
    UpdatedDate: null
  },
  {
    Id: 118,
    CropLifecycleDefinitionId: 16,
    Stage: 'FLOW',
    StageOrder: 5,
    MinDaysFromPreviousStage: 8,
    MaxDaysFromPreviousStage: 19,
    UpdatedUser: null,
    UpdatedDate: null
  },
  {
    Id: 119,
    CropLifecycleDefinitionId: 16,
    Stage: 'FRUIT',
    StageOrder: 6,
    MinDaysFromPreviousStage: 7,
    MaxDaysFromPreviousStage: 15,
    UpdatedUser: null,
    UpdatedDate: null
  },
  {
    Id: 120,
    CropLifecycleDefinitionId: 16,
    Stage: 'MAT',
    StageOrder: 7,
    MinDaysFromPreviousStage: 16,
    MaxDaysFromPreviousStage: 19,
    UpdatedUser: null,
    UpdatedDate: null
  },
  {
    Id: 121,
    CropLifecycleDefinitionId: 16,
    Stage: 'HARW',
    StageOrder: 8,
    MinDaysFromPreviousStage: 2,
    MaxDaysFromPreviousStage: 9,
    UpdatedUser: null,
    UpdatedDate: null
  }
 */

function test_3() {
  // forwardTackStagesDays
  const lifecycelStages= getLifecycleStagesOfDefinition(16);
  console.log('lifecycelStages',lifecycelStages.length)

  let days = forwardTackStagesDays(lifecycelStages,'LAND')
  console.log('days',days)
  days = forwardTackStagesDays(lifecycelStages,'SOW');
  console.log('days',days)

  days = forwardTackStagesDays(lifecycelStages,'GERM');
  console.log('days',days)

  days = forwardTackStagesDays(lifecycelStages,"GROW");
  console.log('days',days)

  days = forwardTackStagesDays(lifecycelStages,'FLOW');
  console.log('days',days)

  days = forwardTackStagesDays(lifecycelStages,"FRUIT");
  console.log('days',days)

  days = forwardTackStagesDays(lifecycelStages,"MAT");
  console.log('days',days)

  days = forwardTackStagesDays(lifecycelStages,"X");
  console.log('days',days)

  // passed 
}

function test_4() {
  // forwardTackStagesDate
  const lifecycelStages= getLifecycleStagesOfDefinition(16);
  console.log('lifecycelStages',lifecycelStages.length)

  const stDate = '2026-01-01';

  let days = forwardTackStagesDate(lifecycelStages,stDate,'LAND')
  console.log('days',days)
  days = forwardTackStagesDate(lifecycelStages,stDate,'SOW');
  console.log('days',days)

  days = forwardTackStagesDate(lifecycelStages,stDate,'GERM');
  console.log('days',days)

  days = forwardTackStagesDate(lifecycelStages,stDate,"GROW");
  console.log('days',days)

  days = forwardTackStagesDate(lifecycelStages,stDate,'FLOW');
  console.log('days',days)

  days = forwardTackStagesDate(lifecycelStages,stDate,"FRUIT");
  console.log('days',days)

  days = forwardTackStagesDate(lifecycelStages,stDate,"MAT");
  console.log('days',days)

  days = forwardTackStagesDate(lifecycelStages,stDate,"X");
  console.log('days',days)
  // passed
}

function test_5() {
  // backTrackStagesWithMean
  const lifecycelStages= getLifecycleStagesOfDefinition(16);
  console.log('lifecycelStages',lifecycelStages.length)

  const currStageDate = '2026-01-01';

  // let objs = backTrackStagesWithMean(lifecycelStages,'LAND',currStageDate)
  // console.log('LAND',objs)
  // objs = backTrackStagesWithMean(lifecycelStages,'SOW',currStageDate);
  // console.log('SOW',objs)

  objs = backTrackStagesWithMean(lifecycelStages,'GERM',currStageDate);
  console.log('GERm',objs)

  objs = backTrackStagesWithMean(lifecycelStages,"GROW",currStageDate);
  console.log('GROW',objs)

  objs = backTrackStagesWithMean(lifecycelStages,'FLOW',currStageDate);
  console.log('FLOW',objs)

  objs = backTrackStagesWithMean(lifecycelStages,"FRUIT",currStageDate);
  console.log('FRUIT',objs)

  objs = backTrackStagesWithMean(lifecycelStages,"MAT",currStageDate);
  console.log('MAT',objs)

  objs = backTrackStagesWithMean(lifecycelStages,"X",currStageDate);
  console.log('X',objs)
  // passed
}

function test_6() {
  const txn = db.transaction(() => {


    throw new Error("__ROLL_BACK__");
  });
}

test_5();
