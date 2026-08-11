const db = require("../db");
const {
  toCamelCaseObject,
  addDate,
  getTodayDate,
  convertToAcre,
  formatSQLValue,
  capitalize
} = require("../utils/utlis");
const {
  successResponse,
  errorResponse,
  notFound,
} = require("../responses/api.responses");
const { userExists } = require("../services/user.service");
const {
  calculateYieldEstimation,
  computeYieldFactors,
} = require("../services/yeild-est.services");

const ALLOWED_PHASE_TYPES = ["FULL", "ESTABLISHMENT", "RECURRING"];
const FIELD_TO_COLUMN = {
  minDaysFromPreviousStage: "MinDaysFromPreviousStage",
  maxDaysFromPreviousStage: "MaxDaysFromPreviousStage",
};



const getFarmerCrops = (req, res) => {
  // tested working
  try {
    const userId = Number(req.params.userId);
    let page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const crops = db
      .prepare(
        `
            SELECT * 
            FROM Crop 
            WHERE FarmerId = ?
            ORDER BY CreatedDate DESC
            LIMIT ? OFFSET ?
        `,
      )
      .all(userId, pageSize, offset);

    return successResponse(res, toCamelCaseObject(crops));
  } catch (error) {
    console.log("getFarmerCrops", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const getCropDetails = (req, res) => {
  // tested working
  try {
    const cropId = Number(req.params.cropId);
    const crop = db.prepare(`SELECT * FROM Crop WHERE Id = ?`).get(cropId);

    if (!crop) {
      return notFound(res,"Crop not found!" );
    }

    return successResponse(res, toCamelCaseObject(crop));
  } catch (error) {
    console.log("getCropDetails", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const createCrop = (req, res) => {
  // tested working
  try {
    const userId = Number(req.params.userId);
    const {
      name,
      cropTypeId,
      varietyId,
      farmId,
      landPrepDate,
      sowingDate,
      cultivatedArea,
      cultivatedAreaUnit,
      initialSoilCondition,
      initialNotes,
    } = req.body;
    const cultivatedAreaInAcres = convertToAcre(
      cultivatedArea,
      cultivatedAreaUnit,
    );

    const lifeCycleStmnt = db.prepare(`
      SELECT 
      l.CropTypeId,l.CropTypeId,
      s.StageName,s.StageOrder,
      s.MinDaysFromPreviousStage,s.MaxDaysFromPreviousStage,s.Description
      FROM CropLifecycleDefinition l JOIN CropLifeCycleStages s
      ON l.Id = s.CropLifecycleDefinitionId
      WHERE l.CropVarietyId = ?
      ORDER BY s.StageOrder ASC;

    `);

    const lifecycle = toCamelCaseObject(lifeCycleStmnt.all(varietyId));
    const growthDur = lifecycle.filter((stage) => stage.stageName === "MAT")[0]
      .maxDaysFromPreviousStage;

    const cropCreatetrnsaction = db.transaction(() => {
      const createCropStmnt = db.prepare(`
      INSERT INTO Crop 
        (
            Name, CropTypeId, VarietyId, FarmId, 
            FarmerId,LandPrepDate, SowingDate, CultivatedArea, 
            CultivatedAreaUnit,CultivatedAreaInAcre,
            ExpectedGrowthDurationDays, InitialSoilCondition, 
            InitialNotes, CreatedUser
        ) 
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?);
      `);
      const cropResult = createCropStmnt.run(
        name,
        cropTypeId,
        varietyId,
        farmId,
        userId,
        landPrepDate,
        sowingDate,
        cultivatedArea,
        cultivatedAreaUnit,
        cultivatedAreaInAcres,
        growthDur,
        initialSoilCondition,
        initialNotes,
        userId,
      );

      const savedCropId = cropResult.lastInsertRowid;

      const cropStagesStmnt = db.prepare(`
      INSERT INTO CropStageProgress 
      (CropId,StageName,StageOrder,EstStartDate,EstEndDate)
      VALUES (?,?,?,?,?);`);

      let estHarvDate;

      for (const stage of lifecycle) {
        const estStartDate = addDate(
          sowingDate,
          stage.minDaysFromPreviousStage,
        );
        const estEndDate = addDate(sowingDate, stage.maxDaysFromPreviousStage);

        cropStagesStmnt.run(
          savedCropId,
          stage.stageName,
          stage.stageOrder,
          estStartDate,
          estEndDate,
        );

        if (stage.stageName === "HARW") {
          estHarvDate = estStartDate;
        }
      }

      const updateCropStmnt = db.prepare(
        `UPDATE Crop SET EstdHarvestDate = ? WHERE Id = ?`,
      );
      updateCropStmnt.run(estHarvDate, savedCropId);

      return savedCropId;
    });

    const cropId = cropCreatetrnsaction();
    return successResponse(res, { cropId }, "Crop created successfully!", 201);
  } catch (error) {
    console.log("createCrop", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const editCrop = (req, res) => {
  try {
    // not needed as of now, can be implemented later when we have more details on what can be edited for crop
    return successResponse(res, null, "Not implemented yet!", 200);
  } catch (error) {
    console.log("editCrop", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const deleteCrop = (req, res) => {
  // tested Working
  try {
    const cropId = Number(req.params.cropId);
    const stmt = db.prepare(`DELETE FROM Crop WHERE Id = ?`);
    const result = stmt.run(cropId);

    if (result.changes === 0) {
      return notFound(res,"Crop not found!");
    }

    return successResponse(res, null, "Crop deleted successfully!");
  } catch (error) {
    console.log("deleteCrop", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const markCropAsHarvested = (req, res) => {
  // tested working
  try {
    const cropId = Number(req.params.cropId);
    const { harvestNote, actualYield, actualHarvestDate } = req.body;

    const stmt = db.prepare(`
            UPDATE Crop 
            SET HarvestReadinessInd = 1,
            HarvestNote = ?, ActualYield = ?, 
            ActualHarvestDate = ?, CurrentStage = 'HARW'
            WHERE Id = ?`);
    const result = stmt.run(
      harvestNote,
      actualYield,
      actualHarvestDate,
      cropId,
    );

    if (result.changes === 0) {
      return notFound(res, "Crop not found!");
    }

    return successResponse(res);
  } catch (error) {
    console.log("markCropAsHarvested", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const getCropLifecycle = (req, res) => {
  // tested working
  try {
    const cropId = Number(req.params.cropId);
    const stages = db
      .prepare(
        `
      SELECT * from CropStageProgress WHERE CropId = ? ORDER BY StageOrder ASC;
    `,
      )
      .all(cropId);

    return successResponse(res, stages);
  } catch (error) {
    console.log("getCropLifecycle", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

// after each stage is complete we need to update actual stage dates in cronjob

const cropLifecycleStageObserved = (req, res) => {
  // tested working
  try {
    const cropId = Number(req.params.cropId);
    const { cropStageProgressId, observedDate } = req.body;

    const today = getTodayDate();
    if (observedDate > today) {
      return errorResponse(
        res,
        "Invalid Date: Obsered Date cannot be in the future",
        400,
      );
    }

    const getCropStageStmnt = db.prepare(`
      SELECT * FROM CropStageProgress WHERE Id = ?;
    `);
    const curntProgState = toCamelCaseObject(
      getCropStageStmnt.get(cropStageProgressId),
    );

    if (!curntProgState || curntProgState.cropId !== cropId) {
      return notFound(res, "Crop Stage Not Found");
    }

    if (curntProgState.stageOrder > 1) {
      const prevStageStmnt = db.prepare(`
        SELECT * FROM CropStageProgress WHERE CropId = ? AND StageOrder = ?;
      `);
      const prevStage = prevStageStmnt.get(
        cropId,
        curntProgState.stageOrder - 1,
      );
      let isValid = false;

      if (prevStage.actualStartDate) {
        isValid = prevStage.actualStartDate < observedDate;
      } else {
        isValid = prevStage.estStartDate < observedDate;
      }

      if (!isValid) {
        return errorResponse(
          res,
          "Invalid Date: Inconsitent with previous stages.",
          400,
        );
      }
    }

    const updateCropStageTansaction = db.transaction(() => {
      const stmnt1 = db.prepare(`UPDATE CropStageProgress 
        SET ActualStartDate = ? 
        WHERE Id = ?`);

      stmnt1.run(observedDate, cropStageProgressId);

      if (curntProgState.stageOrder > 2) {
        const prevStageorder = curntProgState.stageOrder - 1;

        const stmnt2 = db.prepare(`
        UPDATE CropStageProgress 
        SET ActualEndDate = ? 
        WHERE CropId = ? AND StageOrder = ?;
      `);
        stmnt2.run(observedDate, cropId, prevStageorder);
      }
    });

    updateCropStageTansaction();
    return successResponse(res);
  } catch (error) {
    console.log("cropLifecycleStageObserved", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const allCropsCalenders = (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!userExists(userId)) {
      return notFound(res, "User Does not Exists");
    }

    const stmnt = db.prepare(`
      SELECT 
      c.FarmerId,c.Id as CropId,c.Name as CropName,c.LandPrepDate,c.SowingDate,
      s.Id as StageProgressId,s.StageName,s.StageOrder,s.EstStartDate,s.EstEndDate,s.ActualStartDate,s.ActualEndDate
      FROM Crop c JOIN CropStageProgress s ON c.Id = s.CropId WHERE c.FarmerId = ?;
    `);
    const result = toCamelCaseObject(stmnt.all(userId));
    return successResponse(res, result);
  } catch (error) {
    console.log("allCropsCalender", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const cropCalender = (req, res) => {
  try {
    const cropId = Number(req.params.cropId);
    const crop = db
      .prepare(`SELECT Count(*) as count FROM Crop WHERE Id = ?`)
      .get(cropId);

    if (crop.count !== 1) {
      return notFound(res, "Crop Does not Exists");
    }

    const stmnt = db.prepare(`
      SELECT 
      c.FarmerId,c.Id as CropId,c.Name as CropName,c.LandPrepDate,c.SowingDate,
      s.Id as StageProgressId,s.StageName,s.StageOrder,s.EstStartDate,s.EstEndDate,s.ActualStartDate,s.ActualEndDate
      FROM Crop c JOIN CropStageProgress s ON c.Id = s.CropId WHERE c.Id = ?;
    `);
    const result = toCamelCaseObject(stmnt.all(userid));

    return successResponse(res, result);
  } catch (error) {
    console.log("cropsCalender", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const cropYieldEstimation = (req, res) => {
  // tested working
  try {
    const cropId = Number(req.params.cropId);
    const stmnt = db.prepare(`
      SELECT 
      SowingDate,CultivatedAreaInAcre,EstdHarvestDate,
      CurrentStage,HealthStatus,v.YieldPerAcre
      FROM Crop c JOIN CropVariety v ON c.VarietyId = v.Id WHERE c.Id = ? ;
    `);
    const data = toCamelCaseObject(stmnt.get(cropId));
    console.log(data);
    if (!data) {
      return notFound(res, "Crop Does not Exists");
    }

    crop = { ...data };
    variety = { yieldPerAcre: JSON.parse(JSON.stringify(data.yieldPerAcre)) };
    delete crop.yieldPerAcre;

    const yieldEstimate = calculateYieldEstimation(crop, variety);
    const yieldFactors = computeYieldFactors(crop);

    const result = {
      ...yieldEstimate,
      yieldFactors,
    };

    return successResponse(res, result);
  } catch (error) {
    console.log("cropsCalender", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const getCropTypes = (req, res) => {
  try {
    const cropTypes = db
      .prepare(`SELECT * FROM CropType;`)
      .all();

    return successResponse(res, toCamelCaseObject(cropTypes));
  } catch (error) {
    console.log("getCropTypes", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const createCropTypes = (req, res) => {
  try {
    const { cropName, scientificName, growthDurationType,isActive } = req.body;
    const stmnt = `INSERT INTO CropType(CropName,ScientificName,GrowthDurationType,IsActive) VALUES (?,?,?,?)`;
    const cropTypes = db
      .prepare(stmnt)
      .run(cropName,scientificName,growthDurationType,isActive);
    return successResponse(res, cropTypes.lastInsertRowid);
  } catch (error) {
    console.log("createCropTypes", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const getCropTypeById = (cropTypeId) => {
  return db.prepare(`SELECT * FROM CropType WHERE Id = ?`).get(cropTypeId);
};

const getCropVarieityById = (id) => {
  return db.prepare(`SELECT * FROM CropVariety WHERE Id = ?`).get(id);
};

const getCropStageCapById = (id) => {
  return db.prepare(`SELECT * FROM CropStageCaps WHERE Id = ?`).get(id);
};

const updateCropType = (req, res) => {
  try {
    const { cropTypeId } = req.params;
    const cropType = getCropTypeById(cropTypeId);
    const { cropName, scientificName, growthDurationType,isActive } = req.body;

    if(!cropType) {
      return notFound(res,'Crop Type not found!');
    }
   
    const stmnt = `UPDATE CropType SET 
      CropName = ?,ScientificName = ?, GrowthDurationType = ?, IsActive = ? 
      WHERE Id=?`;
    const cropTypes = db
      .prepare(stmnt)
      .run(cropName,scientificName,growthDurationType,formatSQLValue(isActive),cropTypeId);
    return successResponse(res, cropTypes.changes);
  } catch (error) {
    console.log("createCropTypes", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const getCropType = (req, res) => {
  try {
    const cropTypeId = req.params.cropTypeId;
    const cropType = getCropTypeById(cropTypeId)

    if(!cropType) {
      return notFound(res,'Crop Type not found!');
    }

    return successResponse(res, toCamelCaseObject(cropType));
  } catch (error) {
    console.log("getCropType", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const deleteCropType = (req, res) => {
  try {
    const cropTypeId = Number(req.params.cropTypeId);
    const stmt = db.prepare(`DELETE FROM CropType WHERE Id = ?`);
    const result = stmt.run(cropTypeId);

    if (result.changes === 0) {
      return notFound(res,'Crop Type not found!');
    }

    return successResponse(res, null, "Crop Type deleted successfully!");
  } catch (error) {
    console.log("deleteCropType", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const getCropVarieities = (req, res) => {
  try {
    const result = db
      .prepare(`SELECT * FROM CropVariety;`)
      .all();

    return successResponse(res, toCamelCaseObject(result));
  } catch (error) {
    console.log("getCropVarieities", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const createCropVarieities = (req, res) => {
  try {
    const {
      cropTypeId,
      varietyName,
      maturityMinDays,
      maturityMaxDays,
      yieldPerAcre,
      shelfLifeDays,
      isHybrid,
      notes,
      isActive,
    } = req.body;

    console.log(cropTypeId,
      varietyName,
      maturityMinDays,
      maturityMaxDays,
      yieldPerAcre,
      shelfLifeDays,
      isHybrid,
      notes,
      isActive)

    const cropVarieities = db
      .prepare(
        `
      INSERT INTO CropVariety(
        CropTypeId,
        VarietyName,
        MaturityMinDays,
        MaturityMaxDays,
        YieldPerAcre,
        ShelfLifeDays,
        IsHybrid,
        Notes,
        IsActive
      )
      VALUES (?,?,?,?,?,?,?,?,?)
      `,
      )
      .run(
        cropTypeId,
        varietyName,
        maturityMinDays,
        maturityMaxDays,
        yieldPerAcre,
        shelfLifeDays,
        formatSQLValue(isHybrid),
        notes,
        formatSQLValue(isActive)
      );

    return successResponse(res, cropVarieities.lastInsertRowid);
  } catch (error) {
    console.log("createCropVarieities", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const updateCropVarieities = (req, res) => {
  try {
    const { cropVarietyId } = req.params;
    const cropVariety = getCropVarieityById(cropVarietyId);
    const { 
      cropTypeId,
      varietyName,
      maturityMinDays,
      maturityMaxDays,
      yieldPerAcre,
      shelfLifeDays,
      isHybrid,
      notes,
      isActive } = req.body;

    if(!cropVariety) {
      return notFound(res,'Crop Varitey not found!');
    }
   
    const stmnt = `UPDATE CropVariety SET 
      CropTypeId = ?,
      VarietyName = ?,
      MaturityMinDays = ?,
      MaturityMaxDays = ?,
      YieldPerAcre = ?,
      ShelfLifeDays = ?,
      IsHybrid = ?,
      Notes = ?,
      IsActive = ?
      WHERE Id=?`;
    const result = db
      .prepare(stmnt)
      .run(
        cropTypeId,
        varietyName,
        maturityMinDays,
        maturityMaxDays,
        yieldPerAcre,
        shelfLifeDays,
        formatSQLValue(isHybrid),
        notes,
        formatSQLValue(isActive),
        cropVarietyId
      );
    return successResponse(res, result.changes);
  } catch (error) {
    console.log("updateCropTypes", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const getCropVarieity = (req, res) => {
  try {
    const cropVarietyId = req.params.cropVarietyId;
    const result = db
      .prepare(`SELECT * FROM CropVariety WHERE Id = ?;`)
      .get(cropVarietyId);

    return successResponse(res, toCamelCaseObject(result));
  } catch (error) {
    console.log("getCropVarieity", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const deleteCropVarieity = (req, res) => {
  try {
    const cropVarietyId = Number(req.params.cropVarietyId);
    const stmt = db.prepare(`DELETE FROM CropVariety WHERE Id = ?`);
    const result = stmt.run(cropVarietyId);

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ message: "Crop Variety not found!", data: null });
    }

    return successResponse(res, null, "Crop Variety deleted successfully!");
  } catch (error) {
    console.log("deleteCropVarieity", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const searchCropLifeCycleDefenitions = (req, res) => {
  try {
    
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const allowedFields = [ 
      'cropTypeId', 'cropVarietyId', 'region', 'season', 'phaseType'
    ];

    const whereCondtions = [];
    const params  = [];

    for (const key of allowedFields) {
      if (key in req.query) {
        if(req.query[key] !== null && req.query[key].toString().trim() !== "") {
          const name = capitalize(key);
          console.log('name',name)
          whereCondtions.push(`DEF.${name}=?`);
          params.push(req.query[key]);
        }
      }
    }

    const whereClause = whereCondtions.length > 0 ? `WHERE ${whereCondtions.join(" AND ")}`: "";

    const  txn = db.transaction(() => {
      const start = new Date();
      // const stmnt = `SELECT * FROM CropLifecycleDefinition ${whereClause} LIMIT ? OFFSET ?`;

      const stmnt = `SELECT
        DEF.Id,
        DEF.CropTypeId,
        CT.CropName as CropTypeName,
        DEF.CropVarietyId,
        VAR.VarietyName,
        DEF.Season,
        S.Description as SeasonDescription,
        DEF.Region,
        REG.Description as RegionDescription,
        DEF.PhaseType,
        DEF.CreatedUser,
        DEF.UpdatedUser,
        DEF.CreatedDate,
        DEF.UpdatedDate
      FROM CropLifecycleDefinition DEF
      INNER JOIN CropType CT ON DEF.CropTypeId = CT.Id 
      INNER JOIN CropVariety VAR ON DEF.CropVarietyId = VAR.Id 
      INNER JOIN RegionLov REG ON DEF.Region = REG.Code 
      INNER JOIN SeasonLov S ON DEF.Season = S.Code ${whereClause} LIMIT ? OFFSET ?`;

      const result = db.prepare(stmnt).all(...params,pageSize, offset);

      result.forEach(def => {
        const stageStmtn = `SELECT * FROM CropLifeCycleStages WHERE CropLifecycleDefinitionId = ${def.Id} ORDER BY StageOrder ASC`;
        const stages = db.prepare(stageStmtn).all();
        def["cropLifeCycleStages"] = stages;
      });

      // Get total count for pagination
      const countStmnt = db.prepare(
        `SELECT COUNT(DISTINCT Id) as total 
        FROM CropLifecycleDefinition DEF
        ${whereClause}`,
      );
      const { total } = countStmnt.get(...params);
      console.log(`time elapsed with join (${Date.now() - start} ms)`)
      return {
        data: toCamelCaseObject(result),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      }

    });

    const txnResult = txn();

    return successResponse(res, txnResult);
  } catch (error) {
    console.log("searchCropLifeCycleDefenitions", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

function validateDefinition(def, index) {
  const prefix = `definitions[${index}]`;
  if (!def || typeof def !== "object") return `${prefix} must be an object`;
  if (!Number.isInteger(def.cropTypeId)) return `${prefix}.cropTypeId is required`;
  if (!Number.isInteger(def.cropVarietyId)) return `${prefix}.cropVarietyId is required`;
  if (!ALLOWED_PHASE_TYPES.includes(def.phaseType))
    return `${prefix}.phaseType must be one of ${ALLOWED_PHASE_TYPES.join(", ")}`;
  if (!Array.isArray(def.stages) || def.stages.length === 0)
    return `${prefix}.stages must be a non-empty array`;

  for (const [i, stage] of def.stages.entries()) {
    const stagePrefix = `${prefix}.stages[${i}]`;
    if (!stage.stage || typeof stage.stage !== "string")
      return `${stagePrefix}.stage is required`;
    if (!Number.isInteger(stage.minDaysFromPreviousStage) || stage.minDaysFromPreviousStage < 0)
      return `${stagePrefix}.minDaysFromPreviousStage must be a non-negative integer`;
    if (!Number.isInteger(stage.maxDaysFromPreviousStage) || stage.maxDaysFromPreviousStage < 0)
      return `${stagePrefix}.maxDaysFromPreviousStage must be a non-negative integer`;
    if (stage.maxDaysFromPreviousStage < stage.minDaysFromPreviousStage)
      return `${stagePrefix}.maxDaysFromPreviousStage must be >= minDaysFromPreviousStage`;
  }
  return null;
}

const bulkCreateCropLifeCycleDefenition = (req, res) => {
  try {
    const { createdUser, definitions } = req.body;

    if (!Array.isArray(definitions) || definitions.length === 0) {
      return errorResponse(res, "definitions must be a non-empty array", 400);
    }

    for (const [index, def] of definitions.entries()) {
      const validationError = validateDefinition(def, index);
      if (validationError) {
        return errorResponse(res, validationError, 400);
      }
    }

    console.log("here");
    
    const insertDefinitionStmt = db.prepare(`
      INSERT INTO CropLifecycleDefinition
        (CropTypeId, CropVarietyId, Region, Season, PhaseType, CreatedUser)
      VALUES (@cropTypeId, @cropVarietyId, @region, @season, @phaseType, @createdUser)
    `);

    console.log("here not");


    const insertStageStmt = db.prepare(`
      INSERT INTO CropLifeCycleStages
        (CropLifecycleDefinitionId, Stage, StageOrder, MinDaysFromPreviousStage, MaxDaysFromPreviousStage)
      VALUES (@cropLifecycleDefinitionId, @stage, @stageOrder, @minDaysFromPreviousStage, @maxDaysFromPreviousStage)
    `);

    // Transaction: all definitions + all their stages succeed together, or none are written.
    const insertAll = db.transaction((defs) => {
      console.log("enter transaction")
      return defs.map((def) => {
        const result = insertDefinitionStmt.run({
          cropTypeId: def.cropTypeId,
          cropVarietyId: def.cropVarietyId,
          region: def.region ?? null,
          season: def.season ?? null,
          phaseType: def.phaseType,
          createdUser: createdUser ?? null,
        });

        const definitionId = result.lastInsertRowid;

        def.stages.forEach((stage, i) => {
          insertStageStmt.run({
            cropLifecycleDefinitionId: definitionId,
            stage: stage.stage,
            stageOrder: stage.stageOrder ?? i + 1,
            minDaysFromPreviousStage: stage.minDaysFromPreviousStage,
            maxDaysFromPreviousStage: stage.maxDaysFromPreviousStage,
          });
        });

        return { id: definitionId, ...def };
      });
    });

    const created = insertAll(definitions);

    return successResponse(res, toCamelCaseObject(created));
  } catch (error) {
    console.log("createCropLifeCycleDefenition", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const bulkUpdateCropLifeCycleStageDays = (req, res) => {
  try {
    const { definitionIds, stage, field, delta, updatedUser } = req.body;

    if (!Array.isArray(definitionIds) || definitionIds.length === 0) {
      return errorResponse(res, "definitionIds must be a non-empty array", 400);
    }
    if (!definitionIds.every((id) => Number.isInteger(id))) {
      return errorResponse(res, "definitionIds must all be integers", 400);
    }
    if (!stage || typeof stage !== "string") {
      return errorResponse(res, "stage is required", 400);
    }
    const column = FIELD_TO_COLUMN[field];
    if (!column) {
      return errorResponse(
        res,
        `field must be one of ${Object.keys(FIELD_TO_COLUMN).join(", ")}`,
        400,
      );
    }
    if (!Number.isInteger(delta)) {
      return errorResponse(res, "delta must be an integer", 400);
    }

    // column name is whitelisted above via FIELD_TO_COLUMN, so this is safe to interpolate
    const updateStmt = db.prepare(`
      UPDATE CropLifeCycleStages
      SET ${column} = MAX(0, ${column} + @delta),
          UpdatedDate = CURRENT_TIMESTAMP,
          UpdatedUser = @updatedUser
      WHERE CropLifecycleDefinitionId = @definitionId
        AND Stage = @stage
    `);

    const applyBulkUpdate = db.transaction((ids) => {
      let affected = 0;
      for (const definitionId of ids) {
        const result = updateStmt.run({
          definitionId,
          stage,
          delta,
          updatedUser: updatedUser ?? null,
        });
        affected += result.changes;
      }
      return affected;
    });

    const affected = applyBulkUpdate(definitionIds);

    return successResponse(res, { affected });
  } catch (error) {
    console.log("bulkUpdateCropLifeCycleStageDays", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const createCropLifeCycleDefenition = (req, res) => {
  try {
    const {
      cropTypeId,
      cropVarietyId,
      season,
      region,
      userId,
      stages,
    } = req.body;

    const createLifeCycleDefTrxn = db.transaction(() => {

      const lifecycleDefStmnt = db.prepare(
        `INSERT INTO CropLifecycleDefinition 
        (CropTypeId,CropVarietyId,Season,Region,CreatedUser)
        VALUES (?,?,?,?,?);
        `
      );
      const lcd = lifecycleDefStmnt.run(
        formatSQLValue(cropTypeId),
        formatSQLValue(cropVarietyId),
        formatSQLValue(season),
        formatSQLValue(region),
        formatSQLValue(userId)
      );

      const lifecycleDefId = lcd.lastInsertRowid;
      console.log(lifecycleDefId)
      for (const stage of stages) {
        // needs more validation
        console.log(stage.stageName,formatSQLValue(stage.stageName))
        const lifecycleStage = db.prepare(`
          INSERT INTO CropLifeCycleStages (
            CropLifecycleDefinitionId,
            StageName,
            StageOrder,
            MinDaysFromPreviousStage,
            MaxDaysFromPreviousStage,
            Description
          )  VALUES (?,?,?,?,?,?);
        `).run(
          lifecycleDefId,
          stage.stageName,
          stage.stageOrder,
          stage.minDaysFromPreviousStage,
          stage.maxDaysFromPreviousStage,
          stage.description,
        );
      };

      return lifecycleDefId;
    });

    const lifecycleDefId = createLifeCycleDefTrxn();

    return successResponse(res, lifecycleDefId);
  } catch (error) {
    console.log("createCropLifeCycleDefenition", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const getCropLifeCycleDefenitionDetails = (req, res) => {
  try {
    const cropLifecycleDefId = req.params.cropLifecycleDefId;
    const cropLifecycleDef = db
      .prepare(`SELECT * FROM CropLifecycleDefinition WHERE Id = ?;`)
      .get(cropLifecycleDefId);

    const stages = db
      .prepare(`SELECT * FROM CropLifeCycleStages WHERE CropLifecycleDefinitionId = ?;`)
      .all(cropLifecycleDefId);

    cropLifecycleDef.stages = stages;

    return successResponse(res, toCamelCaseObject(cropLifecycleDef));
  } catch (error) {
    console.log("getCropLifeCycleDefenitionDetails", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const updateCropLifeCycleDefenition = (req, res) => {
  try {
    const cropLifecycleDefId = Number(req.params.cropLifecycleDefId);
    const { stages, updatedUser } = req.body;

    if (!Number.isInteger(cropLifecycleDefId)) {
      return errorResponse(res, "cropLifecycleDefId must be an integer", 400);
    }
    if (!Array.isArray(stages) || stages.length === 0) {
      return errorResponse(res, "stages must be a non-empty array", 400);
    }

    const definition = db
      .prepare(`SELECT Id FROM CropLifecycleDefinition WHERE Id = ?`)
      .get(cropLifecycleDefId);

    if (!definition) {
      return notFound(res, "CropLifecycleDefinition not found");
    }

    // Load existing stages for this definition so we can validate ownership
    // and min/max against the fields actually being edited.
    const existingStages = db
      .prepare(
        `SELECT Id, MinDaysFromPreviousStage, MaxDaysFromPreviousStage 
         FROM CropLifeCycleStages 
         WHERE CropLifecycleDefinitionId = ?`,
      )
      .all(cropLifecycleDefId);

    const existingStageIds = new Set(existingStages.map((s) => s.Id));
    const existingById = new Map(existingStages.map((s) => [s.Id, s]));

    for (const [index, stage] of stages.entries()) {
      const prefix = `stages[${index}]`;
      if (!Number.isInteger(stage.id)) {
        return errorResponse(res, `${prefix}.id is required`, 400);
      }
      if (!existingStageIds.has(stage.id)) {
        return errorResponse(
          res,
          `${prefix}.id (${stage.id}) does not belong to definition ${cropLifecycleDefId}`,
          400,
        );
      }
      if (
        !Number.isInteger(stage.minDaysFromPreviousStage) ||
        stage.minDaysFromPreviousStage < 0
      ) {
        return errorResponse(
          res,
          `${prefix}.minDaysFromPreviousStage must be a non-negative integer`,
          400,
        );
      }
      if (
        !Number.isInteger(stage.maxDaysFromPreviousStage) ||
        stage.maxDaysFromPreviousStage < 0
      ) {
        return errorResponse(
          res,
          `${prefix}.maxDaysFromPreviousStage must be a non-negative integer`,
          400,
        );
      }
      if (stage.maxDaysFromPreviousStage < stage.minDaysFromPreviousStage) {
        return errorResponse(
          res,
          `${prefix}.maxDaysFromPreviousStage must be >= minDaysFromPreviousStage`,
          400,
        );
      }
    }

    const updateStageStmt = db.prepare(`
      UPDATE CropLifeCycleStages
      SET MinDaysFromPreviousStage = @min,
          MaxDaysFromPreviousStage = @max,
          UpdatedDate = CURRENT_TIMESTAMP,
          UpdatedUser = @updatedUser
      WHERE Id = @id
    `);

    const touchDefinitionStmt = db.prepare(`
      UPDATE CropLifecycleDefinition
      SET UpdatedDate = CURRENT_TIMESTAMP,
          UpdatedUser = @updatedUser
      WHERE Id = @id
    `);

    const applyEdit = db.transaction((stagesToUpdate) => {
      stagesToUpdate.forEach((stage) => {
        updateStageStmt.run({
          id: stage.id,
          min: stage.minDaysFromPreviousStage,
          max: stage.maxDaysFromPreviousStage,
          updatedUser: updatedUser ?? null,
        });
      });
      touchDefinitionStmt.run({ id: cropLifecycleDefId, updatedUser: updatedUser ?? null });
    });

    applyEdit(stages);

    const updatedStages = db
      .prepare(
        `SELECT * FROM CropLifeCycleStages WHERE CropLifecycleDefinitionId = ? ORDER BY StageOrder`,
      )
      .all(cropLifecycleDefId);

    return successResponse(res, toCamelCaseObject(updatedStages));
  } catch (error) {
    console.log("updateCropLifeCycleDefenition", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const deleteCropLifeCycleStage = (req, res) => {
  try {
    const cropLifecycleDefId = req.params.cropLifecycleDefId;
    
    const stmnt = db.prepare(`DELETE FROM CropLifecycleDefinition WHERE Id = ?`);
    const result = stmnt.run(cropLifecycleDefId);

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ message: "Crop Lifecycle Definition not found!", data: null });
    }

    return successResponse(res, null, "Crop Lifecycle Definition deleted successfully!");
  } catch (error) {
    console.log("deleteCropLifeCycleStage", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const defaultStages = (req, res) => {
  try {
    const data = [
      {
        stageName: "LAND",
        stageOrder: 1,
        minDaysFromPreviousStage: 0,
        maxDaysFromPreviousStage: 0,
        description: "Land preparation with mulch and compost",
      },
      {
        stageName: "SOW",
        stageOrder: 2,
        minDaysFromPreviousStage: 0,
        maxDaysFromPreviousStage: 0,
        description: "Planted suckers at 2.5m x 2.5m spacing",
      },
      {
        stageName: "GERM",
        stageOrder: 3,
        minDaysFromPreviousStage: 0,
        maxDaysFromPreviousStage: 0,
        description: "Sucker sprouting and initial root development",
      },
      {
        stageName: "GROW",
        stageOrder: 4,
        minDaysFromPreviousStage: 0,
        maxDaysFromPreviousStage: 0,
        description: "Vegetative growth - leaves and pseudo-stem development",
      },
      {
        stageName: "FLOW",
        stageOrder: 5,
        minDaysFromPreviousStage: 0,
        maxDaysFromPreviousStage: 0,
        description: "Flowering and inflorescence emergence",
      },
      {
        stageName: "FRUIT",
        stageOrder: 6,
        minDaysFromPreviousStage: 0,
        maxDaysFromPreviousStage: 0,
        description: "Fruit development and bunch formation",
      },
      {
        stageName: "MAT",
        stageOrder: 7,
        minDaysFromPreviousStage: 0,
        maxDaysFromPreviousStage: 0,
        description: "Maturity - fruit maturation and coloring",
      },
      {
        stageName: "HARW",
        StageOrder: 8,
        minDaysFromPreviousStage: 0,
        maxDaysFromPreviousStage: 0,
        description: "Harvest window - fruit ready for picking",
      },
    ];

    return successResponse(res, data);
  } catch (error) {
    console.log("getCropLifeCycleDefenition", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};


//===================
const getCropStageCaps = (req, res) => {
  try {
    const result = db
      .prepare(`SELECT * FROM CropStageCaps;`)
      .all();

    return successResponse(res, toCamelCaseObject(result));
  } catch (error) {
    console.log("getCropStageCaps", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const createCropStageCaps = (req, res) => {
  try {
    const { stageName,cap } = req.body;

    const result = db
      .prepare(`INSERT INTO CropStageCaps(StageName,Cap) VALUES (?,?)`)
      .run(stageName,cap);

    return successResponse(res, result.lastInsertRowid);
  } catch (error) {
    console.log("createCropStageCaps", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const updateCropStageCap = (req, res) => {
  try {
    const { cropStageCapId } = req.params;
    const cropStageCap = getCropVarieityById(cropStageCapId);
    const { stageName,cap } = req.body;

    if(!cropStageCap) {
      return notFound(res,'Crop Stage Cap not found!');
    }
   
    const stmnt = `UPDATE CropStageCaps SET StageName = ?,Cap=? WHERE Id=?`;
    const result = db
      .prepare(stmnt)
      .run(stageName,cap,cropStageCapId);
    return successResponse(res, result.changes);
  } catch (error) {
    console.log("updateCropStageCap", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const getCropStageCap = (req, res) => {
  try {
    const cropStageCapId = req.params.cropStageCapId;
    const result = db
      .prepare(`SELECT * FROM CropStageCaps WHERE Id = ?;`)
      .get(cropStageCapId);

    return successResponse(res, toCamelCaseObject(result));
  } catch (error) {
    console.log("getCropStageCap", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const deleteCropStageCap = (req, res) => {
  try {
    const cropStageCapId = Number(req.params.cropStageCapId);
    const stmt = db.prepare(`DELETE FROM CropStageCaps WHERE Id = ?`);
    const result = stmt.run(cropStageCapId);

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ message: "Crop Stage Cap not found!", data: null });
    }

    return successResponse(res, null, "Crop Stage Cap deleted successfully!");
  } catch (error) {
    console.log("deleteCropStageCap", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

module.exports = {
  getFarmerCrops,
  getCropDetails,
  createCrop,
  editCrop,
  deleteCrop,
  markCropAsHarvested,
  getCropLifecycle,
  cropLifecycleStageObserved,
  allCropsCalenders,
  cropCalender,
  cropYieldEstimation,
  getCropTypes,
  createCropTypes,
  getCropType,
  updateCropType,
  deleteCropType,
  getCropVarieities,
  createCropVarieities,
  getCropVarieity,
  deleteCropVarieity,
  searchCropLifeCycleDefenitions,
  createCropLifeCycleDefenition,
  getCropLifeCycleDefenitionDetails,
  deleteCropLifeCycleStage,
  defaultStages,
  bulkCreateCropLifeCycleDefenition,
  bulkUpdateCropLifeCycleStageDays,
  updateCropLifeCycleDefenition,
  updateCropVarieities,
  getCropStageCaps,
  createCropStageCaps,
  getCropStageCap,
  updateCropStageCap,
  deleteCropStageCap,

};
