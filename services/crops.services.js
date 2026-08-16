const db = require("../db");
const { log } = require("./logger.services");
const { toCamelCaseObject, getFutureDateISO,getPastDateISO } = require("../utils/utlis");
const FULL_STAGE_SEQUENCE = [
  "LAND",
  "SOW",
  "GERM",
  "GROW",
  "FLOW",
  "FRUIT",
  "MAT",
  "HARW",
];
const ESTABLISHMENT_STAGE_SEQUENCE = ["LAND", "SOW", "GERM", "GROW"];
const RECURRING_STAGE_SEQUENCE = ["FLOW", "FRUIT", "MAT", "HARW", "DORM"];
const DEFAULT_HEALTH_STATUS = "HLTY";
const ALL_STAGES = [...FULL_STAGE_SEQUENCE,"DORM"];
const GROW_CODE = 'GROW';
const HARV_CODE = 'HARW'

/** Types */
/**
 * @typedef {Object} CropLifecycleDefinition
 * @property {number} id - The unique identifier.
 * @property {number} cropTypeId - The crop type identifier.
 * @property {number} cropVarietyId - The crop variety identifier.
 * @property {string} [season] - The optional season.
 * @property {string} [region] - The optional region.
 * @property {string} phaseType - The lifecycle phase type (FULL, ESTABLISHMENT, or RECURRING).
 * @property {number} [createdUser] - The user who created the record.
 * @property {number} [updatedUser] - The user who last updated the record.
 * @property {string} [createdDate] - The date and time when the record was created.
 * @property {string} [updatedDate] - The date and time when the record was last updated.
 */

/**
 * @typedef {Object} CropLifeCycleStage
 * @property {number} id - The unique identifier.
 * @property {number} [cropLifecycleDefinitionId] - The lifecycle definition ID.
 * @property {CropStageCode} stage - The crop stage code.
 * @property {number} stageOrder - The order of the stage in the lifecycle.
 * @property {number} minDaysFromPreviousStage - Minimum days from the previous stage.
 * @property {number} maxDaysFromPreviousStage - Maximum days from the previous stage.
 * @property {string} [description] - Description of the stage.
 */

/**
 * @typedef {"LAND"|"SOW"|"GERM"|"GROW"|"FLOW"|"FRUIT"|"MAT"|"HARW"|"DORM"} CropStageCode
 */

/**
 * @typedef {string} ISODate
 * @description Date in YYYY-MM-DD format.
 */

/**
 * @typedef {Object} DBRunResult
 * @property {number} changes - Number of rows modified by the statement.
 * @property {number|bigint} lastInsertRowid - The row ID of the last inserted row.
 * @property {Object} statement - The prepared statement that was executed.
 */


/** Types End */
const getFullStageSeq = () => structuredClone(FULL_STAGE_SEQUENCE);
const getEstStageSeq = () => structuredClone(ESTABLISHMENT_STAGE_SEQUENCE);
const getRecStageSeq = () => structuredClone(RECURRING_STAGE_SEQUENCE);


const insertStage = (
  cropId,
  currentStageCode,
  harvestCycleInstanceId,
  observationType,
  observedDate,
  depth = 0
) => {
  const indent = " ".repeat(depth*4);
  const insCropStageStmnt = `
    INSERT INTO CropStages (
      CropId,
      StageName,
      HarvestCycleInstanceId,
      ObservationType,
      ObservedDate
    )
    VALUES (?,?,?,?,?)`;

  log(indent,`INSERT INTO CropStages(${cropId},${currentStageCode},${harvestCycleInstanceId},${observationType},${observedDate})`)

  return db
    .prepare(insCropStageStmnt)
    .run(
      cropId,
      currentStageCode,
      harvestCycleInstanceId,
      observationType,
      observedDate,
    )
  ;
};

const createCropBasic = (
  name,
  cropTypeId,
  varietyId,
  farmId,
  userId,
  cultivatedArea,
  cultivatedAreaUnit,
  cultivatedAreaInAcres,
  initialSoilCondition,
  initialNotes,
) => {
  const createStmnt = `
    INSERT INTO Crop ( 
      Name,
      CropTypeId,
      VarietyId,
      FarmId,
      FarmerId,
      CultivatedArea,
      CultivatedAreaUnit,
      CultivatedAreaInAcre,
      HealthStatus,
      InitialSoilCondition,
      InitialNotes
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
  const cropResp = db
    .prepare(createStmnt)
    .run(
      name,
      cropTypeId,
      varietyId,
      farmId,
      userId,
      cultivatedArea,
      cultivatedAreaUnit,
      cultivatedAreaInAcres,
      DEFAULT_HEALTH_STATUS,
      initialSoilCondition,
      initialNotes,
    );

  return cropResp.lastInsertRowid;
};

/**
 * @param {number} expectedGrowthDurationDays - Sum of mean values.
 * @param {number} newCropId - The crop ID.
 *
 * Updates the crop with the expected growth duration.
 *
 * @returns {DBRunResult} Result of the database update operation.
 */
const setCropGrowthDuration = (expectedGrowthDurationDays, newCropId) => {
  const cropUpdateStmnt =
    "UPDATE Crop SET ExpectedGrowthDurationDays=? WHERE Id=?";
  db.prepare(cropUpdateStmnt).run(expectedGrowthDurationDays, newCropId);
};

/**
 * @param {CropLifeCycleStage} stage 
 * @returns {number} - mean
 */
const getStageMeanDays = (stage) => {
  if(!stage) {
    throw new Error('Error getStageMeanDays: stage invalid!');
  }
  const sum = stage.minDaysFromPreviousStage + stage.maxDaysFromPreviousStage;
  const mean = sum/2;
  return Math.floor(mean);
};

const createHarvestLifecycleInstance = (cropId,defenitonId,startDate,cycleLabel,estHarvestDate) => {
  const stmnt = `
    INSERT INTO HarvestCycleInstance (
      CropId,
      CropLifecycleDefinitionId,
      StartDate,
      CycleLabel,
      EstdHarvestDate
    ) VALUES (?,?,?,?,?)
  `;

  return db.prepare(stmnt).run(cropId,defenitonId,startDate,cycleLabel,estHarvestDate);
}

const createHarvestCycleNStages = (payload) => {
  const { cropId, definitionId, startDate, cycleLabel, estHarvDate, cropStages } = payload;
  const harvestCycleInstance = createHarvestLifecycleInstance(
    cropId,
    definitionId,
    startDate,
    cycleLabel,
    estHarvDate
  );

  if(cropStages && cropStages.length !== 0) {
    cropStages.forEach((currStage) => {
      insertStage(
        cropId,
        currStage.stageCode,
        harvestCycleInstance.lastInsertRowid,
        currStage.observationType,
        currStage.observedDate
      );
    });
  }
}


/**
 * 
 * @param {*} definitionId 
 * @returns {CropLifeCycleStage[]}
 */
const getLifecycleStagesOfDefinition = (definitionId) => {
  const stmnt = `
    SELECT * FROM CropLifeCycleStages 
    WHERE CropLifecycleDefinitionId = ?
    ORDER BY StageOrder
  `;
  const result =  db.prepare(stmnt).all(definitionId);
  return toCamelCaseObject(result);
};

/**
 * 
 * @param {CropLifeCycleStage[]} lifecycleStages  
 * @param {CropStageCode} currentStageCode - "LAND"|"SOW"|"GERM"|"GROW"|"FLOW"|"FRUIT"|"MAT"|"HARW"|"DORM"
 * @param {ISODate} currentStageObservedDate - YYYY-MM-DD format.
 *
 * assumes stages are ordered by Stage Order
 * backward tack stages to the begining, from current stage Code,
 * return list of objects with mean observed dates for each stage
 * 
 *  @returns {Object[]}
 */
const backTrackStagesWithMean = (
  lifecycleStages,
  currentStageCode,
  currentStageObservedDate
) => {

  /** Reordering for safety */
  const newStages = lifecycleStages.sort((a,b) => a.stageOrder - b.stageOrder);

  const currentStage = newStages.find(s => s.stage === currentStageCode);
  if(!currentStage) {
    throw new Error(`Error backTrackStagesWithMean: currentStageCode ${currentStageCode} does not exist in lifecycleStages`)
  }
  
  const stageOrder = currentStage.stageOrder
  const pastStages = newStages.filter(p => p.stageOrder <= stageOrder);

  const result = [];
  var prevMeanDays = 0;
  var i = pastStages.length - 1;
  while(i>=0) {
    const value = pastStages[i--];
    const obj = {
      stageCode: value.stage,
      observationType: value.stage === currentStageCode ? 'MANUAL' : 'ESTM',
      observedDate: value.stage === currentStageCode 
        ? currentStageObservedDate 
        : getPastDateISO(currentStageObservedDate,prevMeanDays)
    };
    result.push(obj);
    prevMeanDays += getStageMeanDays(value);
  }

  return result.toReversed();
}

/**
 * 
 * @param {CropLifeCycleStage[]} lifecycleStages  
 * @param {ISODate} startDate - YYYY-MM-DD format.
 * @param {CropStageCode} endCode - "LAND"|"SOW"|"GERM"|"GROW"|"FLOW"|"FRUIT"|"MAT"|"HARW"|"DORM"
 * 
 * returns the number days from first stage , starting at start date to the endCode stage,
 * counting mean days of each stage durations
 * 
 *  @returns {number}
 * 
 */
const forwardTackStagesDays = (lifecycleStages,endCode) => {
  if(!lifecycleStages || !Array.isArray(lifecycleStages) || lifecycleStages.length === 0) {
    throw new Error('Error forwardTackStagesDays: invalid lifecycleStages');
  }

  if(!endCode || typeof(endCode) !== 'string') {
    throw new Error('Error forwardTackStagesDays: invalid endCode');
  }

  if(lifecycleStages.findIndex(p => p.stage === endCode) === -1) {
    throw new Error('Error forwardTackStagesDays: endCode not in lifecycleStages');
  }

  const newStages = lifecycleStages.sort((a,b) => a.stageOrder - b.stageOrder);
  var days = 0;

  newStages.some((stage,index) => {
    if(index !== 0) days += getStageMeanDays(stage);
    return stage.stage === endCode;
  });

  return days;
};


/**
 * @param {CropLifeCycleStage[]} lifecycleStages  
 * @param {ISODate} startDate - YYYY-MM-DD format.
 * @param {CropStageCode} endCode - "LAND"|"SOW"|"GERM"|"GROW"|"FLOW"|"FRUIT"|"MAT"|"HARW"|"DORM"
 * 
 * foreward track stages by counting mean days and
 * returns the total number of days the given stage code.
 * 
 *  @returns {string} - YYYY-MM-DD format.
 */
const forwardTackStagesDate = (lifecycleStages,startDate,endCode,depth = 0) => {
  const indent = " ".repeat(depth*4);
  if(!startDate || typeof(startDate) !== 'string') {
    throw new Error('Error forwardTackStagesDays: invalid startDate');
  }
  
  if(!lifecycleStages || !Array.isArray(lifecycleStages) || lifecycleStages.length === 0) {
    throw new Error('Error forwardTackStagesDays: invalid lifecycleStages');
  }

  if(!endCode || typeof(endCode) !== 'string') {
    throw new Error('Error forwardTackStagesDays: invalid endCode');
  }

  if(lifecycleStages.findIndex(p => p.stage === endCode) === -1) {
    throw new Error('Error forwardTackStagesDays: endCode not in lifecycleStages');
  }

  log(indent,'forwardTackStagesDate validation complete')


  const days = forwardTackStagesDays(lifecycleStages,endCode);

  log(indent,'forwardTackStagesDate forwardTackStagesDays', days)

  return getFutureDateISO(startDate,days);
};

/**
 * @param {number} newCropId - id of a newly created Crop.
 * @param {CropLifecycleDefinition[]} definitions - Array of crop lifecycle definitions.
 * @param {ISODate} startDate - YYYY-MM-DD format.
 * 
 * For each crop life cycle definition:
 * - get the crop life cycle stages for the definition.
 * - create a harvest Life cycle Instance with,
 *   - startDate:
 *      - if phase type is establishment or Full then it is the incoming start date value.
 *      - if reccuring, it is day estimated end date of establishing cycle ,
 *          plus the min date from the previous or first stage of the recurring cycle.
 *   - New Crop Id.
 *   - definition id.
 *   - cycle label : from start date.
 * - Compute estimated Harvest date ( harvest cycle level value):
 *  - if phase type of the definition is full,
 *      it is the no of days from LAND, which is on the start date,
 *      to HARV state, , buy adding the mean days for each stage.
 *  - If the phase type is Establishment, there is no estimated harvest date, because it is not necessarily a harvest cycle.
 *  - if phase type is Recurring,
 *      then it is the day from LAND on start date to the end of previous establishment cycle
 *      to the end of the establishment cycle, counting the mean days on each stage, plus
 *      the starting for recurring stage sequence to the HARV stage, counting forward the mean dates.
 * - Update the estimated Harvest date, for the cycle if it applies to it.
 * - Compute Estimated Growth Duration,in Days (crop level value):
 *  - If phase type of the def is FULL,
 *    it is the number of days from LAND on startDate to Stage GROW stage,
 *    forward counting the mean days of each stage.
 *  - If phase is Establishment,
 *    it is the number of man days from LAND on Start date to GROW stage,
 *    counting forward the mean number of days on each stage.
 *  - if phase is Recurring, no need to compute.
 *  - An instance of this function,
 *    either can have 1 def for Full or 2 definitions for ESTABLISHMENT AND RECURRING,
 *    so, Estimated Growth Duration is a single computation per running of the instance
 * 
 * @returns {number} expectedGrowthDurationDays
 */
const newPlantingCropLifeCycleInstanceCreate = (
  newCropId, definitions, startDate,depth = 0,
) => {
  const indent = " ".repeat(depth*4);
  /** VALIDATIONS START **/
  if(!newCropId) {
    throw new Error('Error newPlantingCropLifeCycleInstanceCreate: no newCropId!');
  }

  if(!definitions || definitions.length===0) {
    throw new Error('Error newPlantingCropLifeCycleInstanceCreate: no Lifecycel Definitons input!');
  }

  if(!startDate || typeof(startDate) !== 'string') {
    throw new Error('Error newPlantingCropLifeCycleInstanceCreate: invalid startDate!');
  }
  /** VALIDATIONS END **/

  log(indent,'validation Complete')
  /** for returning to crop **/
  let estimateGrowthDuration;
  /** For computing the start date of Recurring cycle when currentCode is in Establishment cycle **/
  let establishmentCycleEndDate;
  /** for counting cycles per crop, for cycle lable **/
  let counter = 1;

  log(indent,'init vars')

  
  definitions.forEach((definition) => {
    log(indent+indent,' definition id',definition.id);

    /** only for FULL and RECURRING Cycles **/
    let estimatedHarvestDate;

    const lifecycleStages = getLifecycleStagesOfDefinition(definition.id);
    if(lifecycleStages.length === 0) {
      throw new Error(`Error newPlantingCropLifeCycleInstanceCreate: Definition ${definition.id} has no stages!`);
    }
    log(indent+indent,' lifecycleStages',lifecycleStages.length);


    const effectiveStartDate = ['FULL','ESTABLISHMENT'].includes(definition.phaseType) 
      ? startDate
      : getFutureDateISO(establishmentCycleEndDate,getStageMeanDays(lifecycleStages[0]))
    ;
    const cycleLabel = `${new Date(effectiveStartDate).getFullYear()}-C${counter++}`;

    if(definition.phaseType === 'FULL') {
      log(indent+indent,'FULL Phase')
      estimatedHarvestDate = forwardTackStagesDate(lifecycleStages,effectiveStartDate,HARV_CODE,depth+2);
      estimateGrowthDuration = forwardTackStagesDays(lifecycleStages,GROW_CODE);
      log(indent+indent,'FULL Phase done')
    } else if (definition.phaseType === 'ESTABLISHMENT') {
      log(indent+indent,'ESTABLISHMENT Phase')
      const lastStageCode = lifecycleStages[lifecycleStages.length-1].stage;
      establishmentCycleEndDate = forwardTackStagesDate(lifecycleStages,effectiveStartDate,lastStageCode,depth+2);
      estimateGrowthDuration = forwardTackStagesDays(lifecycleStages,GROW_CODE);
      estimatedHarvestDate = null;
      log(indent+indent,'ESTABLISHMENT Phase done')
    } else if (definition.phaseType === 'RECURRING') {
      log(indent+indent,'RECURRING Phase')
      estimatedHarvestDate = forwardTackStagesDate(lifecycleStages,effectiveStartDate,HARV_CODE,depth+2);
      log(indent+indent,'RECURRING Phase done')
    }

      log(indent+indent,'effectiveStartDate',effectiveStartDate)


    if(effectiveStartDate) {
      log(indent+indent,'newCropId,definition.id,effectiveStartDate,cycleLabel,estimatedHarvestDate',
        newCropId,
        definition.id,
        effectiveStartDate,
        cycleLabel,
        estimatedHarvestDate);
      createHarvestLifecycleInstance(
        newCropId,
        definition.id,
        effectiveStartDate,
        cycleLabel,
        estimatedHarvestDate
      );
    }

  });

  return estimateGrowthDuration;
};


/**
 * 
 * @param {number} newCropId 
 * @param {CropLifecycleDefinition[]} definitions - Array of crop lifecycle definitions.
 * @param {CropStageCode} currentStageCode - "LAND"|"SOW"|"GERM"|"GROW"|"FLOW"|"FRUIT"|"MAT"|"HARW"|"DORM"
 * @param {ISODate} currentStageObservedDate - YYYY-MM-DD format.
 * 
 * For each crop life cycle definition:
 * - gets the life cycle stages as defStages
 * - create a Harvest life cycle instance with
 *  - cropId and definition Id
 *  - other fields cannot be populated initially, but only after they have been computed.
 *  - check if getting values is possible first and then creating instances and actual stages.
 * - if definition's phase type is FULL
 *  - Create new CropStages with the created Harvest cycle instance id, crop id,
 *    - For each stage back ward from the current stage code on current stage observed date,
 *      counting the mean days for each stage. Until the Starting stage.
 *    - while back ward counting, we need each stage's mean days for getting the next(past) stages started.
 *    - returning the starting stage date.
 *  - Compute estimated harvest date:
 *    - If current stage is pre harvest, forward count mean dates of each stage till harvest date,
 *      use the sum of mean days to get the estimated harvest date.
 *    - if current stage is post harvest, then backward count mean days to the HARV stage and compute the estimated date
 *  - Compute Expected Growth Duration:
 *    - if the current stage is pre GROW stage, then forward count mean days to GROW stage from current Stage and return the sum of the mean days.
 *    - if the current stage is post GROW stage, then backward could mean days to GROW stage (accounting for past), and return the number of days.
 *  - Start date is backward counting to 'LAND' and getting the date.
 *  - Update Start Date, Cycle label, Est harvest date on the harvest cycle Instance.
 *  - return growth duration.
 * - if phase type is Establishment:
 *  - Create new CropStages: 2 possibilities
 *    1. Current Stage in Establishment stage sequence:
 *      1.1 insert each stage with cropId,stagecode,stage date, counting backward mean days (adjusted) from currentStage on Current Date,
 *        to, beginning of sequence.
 *      1.2 Estimate the end of this phase, but counting forward mean days, till the end of the sequence.
 *      1.3 Save that date for the starting of the recurring phase of the same crop.
 *    2. Current Stage is not in Establishment stage sequence, but in recurring:
 *      2.1 dont create stages yet
 *      2.2 wait for recurring stage to finish, once it is done, with it start date and mean 
 *        days from its first stage(adjusted), backward count the whole Establishment sequence (adjusted),
 *        to initial stage.
 *        - return the start date
 *        - update the life cycle instance with start date, cycle label.
 *  - Compute estimated harvest date: No need, since it is not a Harvest cycle
 *  - Compute Expected Growth Duration:
 *    - if Current Stage is grow, then this current date is itself the values
 *    - if current stage is Pre GROW, the backward count mean days (adjusted)
 *      till GROW stage and return the growth days
 *  - update start date, cycle label, if not updated already
 * - if phase type is Recurring:
 *  - Create new CropStages: 2 possibilities:
 *    1. Current Stage in Recurring stage sequence:
 *      1.1 create the stages to the beginning of the sequence , backward counting mean (adjusted)
 *        from the current stage on the current stage observed date. Till you get the start date.
 *      1.2 with the start date, continue to 2.2 of the Establishment phase.
 *    2. Current Stage is not in Recurring stage sequence, but in establishment:
 *      2.1 Get the date produced in Establishment 1.3, T-1
 *      2.2 then get the mean days of recurring sequence first stage , and add to the T-1,
 *          to get the T-0 starting date of this sequence.
 *      2.3 No need to create any stages.
 *  - Compute estimated harvest date:
 *    - we have start date for sure now, so with that as the date of first stage, 
 *      forward counting mean days to the stage HARV_CODE,
 *      get the number of days, and compute the date from start date.
 *  - Compute Expected Growth Duration: no need as there is no GROW stage.
 *  - update start date and cycle label.
 * 
 * @returns {number} expectedGrowthDurationDays
 * 
 */
const onGoingCropLifeCycleInstanceCreate = (
  newCropId,
  definitions,
  currentStageCode,
  currentStageObservedDate,
  depth = 0,
) => {
  const indent = " ".repeat(depth*4);
  /** VALIDATION START */
  if(!newCropId) {
    throw new Error('Error onGoingCropLifeCycleInstanceCreate: no newCropId!');
  }

  if(!definitions || definitions.length===0) {
    throw new Error('Error onGoingCropLifeCycleInstanceCreate: no Lifecycel Definitons input!');
  }

  if(!currentStageCode || typeof(currentStageCode) !== 'string' || !ALL_STAGES.includes(currentStageCode)) {
    throw new Error('Error onGoingCropLifeCycleInstanceCreate: invalid currentStageCode!');
  }

  if(!currentStageObservedDate || typeof(currentStageObservedDate) !== 'string') {
    throw new Error('Error onGoingCropLifeCycleInstanceCreate: invalid currentStageObservedDate!');
  }
  /** VALIDATION END */

  log(indent,'validation complete')


  /** for returning to crop **/
  let estimateGrowthDuration;
  /** For computing the start date of Recurring cycle when currentCode is in Establishment cycle **/
  let establishmentCycleEndDate;
  /** for counting cycles per crop, for cycle lable **/
  let counter = 1;
  
  /** For Scernario X */
  const passedEstablishment = {
    lifeCycleStages: [],
    definitionId: null,
  }

  log(indent,'var init')


  definitions.forEach((definition) => {

    log(indent+indent,'var init')

    const superObject = {
      cropId: newCropId,
      definitionId:definition.id,
      startDate: null,
      cycleLabel: "",
      estHarvDate: null,
      cropStages: []
    }

    const lifecycleStages = getLifecycleStagesOfDefinition(definition.id);
    if(lifecycleStages.length === 0) {
      throw new Error(`Error onGoingCropLifeCycleInstanceCreate: Definition ${definition.id} has no stages!`);
    }
    log(indent+indent,'lifecycleStages',lifecycleStages.length)

    
    if(definition.phaseType === 'FULL') {
      log(indent+indent,'FULL')
      const stageObjects = backTrackStagesWithMean(lifecycleStages,currentStageCode,currentStageObservedDate);
      superObject.startDate = stageObjects[0].observedDate;
      superObject.cropStages = stageObjects;
      superObject.cycleLabel = `${new Date(superObject.startDate).getFullYear()}-C${counter++}`;
      superObject.estHarvDate = forwardTackStagesDate(lifecycleStages,superObject.startDate,HARV_CODE);

      estimateGrowthDuration = forwardTackStagesDays(lifecycleStages,GROW_CODE);
    } else if (definition.phaseType === 'ESTABLISHMENT') {
      log(indent+indent,'ESTABLISHMENT')

      if(getEstStageSeq().includes(currentStageCode)) {
        log(indent+indent,'ESTABLISHMENT INCLUDES')

        const stageObjects = backTrackStagesWithMean(lifecycleStages,currentStageCode,currentStageObservedDate);
        superObject.startDate = stageObjects[0].observedDate;
        superObject.cropStages = stageObjects;
        superObject.cycleLabel = `${new Date(superObject.startDate).getFullYear()}-C${counter++}`;
        superObject.estHarvDate =  null;

        const lastStageCode = lifecycleStages[lifecycleStages.length-1].stage;
        const lastStageDate = forwardTackStagesDate(lifecycleStages,superObject.startDate,lastStageCode);
        establishmentCycleEndDate = lastStageDate;

        estimateGrowthDuration = forwardTackStagesDays(lifecycleStages,GROW_CODE);

      } else {
        log(indent+indent,'ESTABLISHMENT NOT INCLUDES Scernario X')

        /** Scernario X preparation */
        passedEstablishment.lifeCycleStages = lifecycleStages;
        passedEstablishment.definitionId = definition.id;
        log(indent+indent,'passedEstablishment',passedEstablishment)
      }

    } else if (definition.phaseType === 'RECURRING') {
      log(indent+indent,'RECURRING')

      if(getRecStageSeq().includes(currentStageCode)) {
        log(indent+indent,'RECURRING INCLUDES')

        const stageObjects = backTrackStagesWithMean(lifecycleStages,currentStageCode,currentStageObservedDate);
        superObject.startDate = stageObjects[0].observedDate;
        superObject.cycleLabel = `${new Date(superObject.startDate).getFullYear()}-C${counter++}`;
        superObject.cropStages = stageObjects;
        superObject.estHarvDate = forwardTackStagesDate(lifecycleStages,superObject.startDate,HARV_CODE);

        /** Scernario X start */
        log(indent+indent,'Scernario X')

        const est = {
          cropId: newCropId,
          definitionId:passedEstablishment.definitionId,
          startDate: null,
          cycleLabel: "",
          estHarvDate: null,
          cropStages: []
        }

        const gap = getStageMeanDays(lifecycleStages[0]);
        const estEndDate = getPastDateISO(superObject.startDate,gap);
        const lastIndexOfPast = passedEstablishment.lifeCycleStages.length - 1;
        const finalStage = passedEstablishment.lifeCycleStages[lastIndexOfPast].stage;
        est.cropStages = backTrackStagesWithMean(passedEstablishment.lifeCycleStages,finalStage,estEndDate);
        est.startDate = est.cropStages[0].observedDate;
        est.cycleLabel = `${new Date(est.startDate).getFullYear()}-C${counter}`;
        estimateGrowthDuration = forwardTackStagesDays(
          passedEstablishment.lifeCycleStages,
          GROW_CODE
        );

        if(est.startDate) {
          createHarvestCycleNStages(est);
        }
        /** Scernario X end */

      } else {
        log(indent+indent,'RECURRING NOT INCLUDES')

        // RECURRING HARVEST CYCLE BUT CURRENT STAGE NOT IN IT
        superObject.startDate = getFutureDateISO(establishmentCycleEndDate,getStageMeanDays(lifecycleStages[0]));
        superObject.cycleLabel = `${new Date(superObject.startDate).getFullYear()}-C${counter}`;
        superObject.estHarvDate = forwardTackStagesDate(lifecycleStages,superObject.startDate,HARV_CODE);
        // NO NEED TO COMPUTE GROWTH DURATION COS THERE IS NO GROWTH IN THIS CYCLE
      }
    }

    log(indent+indent,'superObject',superObject)

    if(superObject.startDate) {
      createHarvestCycleNStages(superObject);
    }
    
  });

  return estimateGrowthDuration;

};



module.exports = {
  createCropBasic,
  onGoingCropLifeCycleInstanceCreate,
  newPlantingCropLifeCycleInstanceCreate,
  setCropGrowthDuration,
  // for testing
  getStageMeanDays,
  createHarvestLifecycleInstance,
  createHarvestCycleNStages,
  getLifecycleStagesOfDefinition,
  backTrackStagesWithMean,
  forwardTackStagesDays,
  forwardTackStagesDate,
  getFullStageSeq,
  getEstStageSeq,
  getRecStageSeq
};
