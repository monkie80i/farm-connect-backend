const db = require("../db");
const {
  toCamelCaseObject,
  addDate,
  getTodayDate,
  convertToAcre,
  formatSQLValue
} = require("../utils/utlis");
const { successResponse, errorResponse, notFound} = require("../responses/api.responses");
const { userExists } = require("../services/user.service");
const { calculateYieldEstimation,computeYieldFactors } = require("../services/yeild-est.services");


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

    return successResponse(res,toCamelCaseObject(crops));
  } catch (error) {
    console.log("getFarmerCrops", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const getCropDetails = (req, res) => {
  // tested working
  try {
    const cropId = Number(req.params.cropId);
    const crop = db.prepare(`SELECT * FROM Crop WHERE Id = ?`).get(cropId);

    if (!crop) {
      return res.status(404).json({ message: "Crop not found!" });
    }

    return successResponse(res,toCamelCaseObject(crop));
  } catch (error) {
    console.log("getCropDetails", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
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
    const cultivatedAreaInAcres = convertToAcre(cultivatedArea,cultivatedAreaUnit);

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

        if(stage.stageName === 'HARW') {
          estHarvDate = estStartDate;
        }
      }

      const updateCropStmnt = db.prepare(`UPDATE Crop SET EstdHarvestDate = ? WHERE Id = ?`);
      updateCropStmnt.run(estHarvDate,savedCropId);

      return savedCropId;
    });

    const cropId = cropCreatetrnsaction();
    return successResponse(res,{cropId},"Crop created successfully!",201);
  } catch (error) {
    console.log("createCrop", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const editCrop = (req, res) => {
  try {
    // not needed as of now, can be implemented later when we have more details on what can be edited for crop
    return successResponse(res,null,"Not implemented yet!",200);
  } catch (error) {
    console.log("editCrop", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const deleteCrop = (req, res) => {
  // tested Working
  try {
    const cropId = Number(req.params.cropId);
    const stmt = db.prepare(`DELETE FROM Crop WHERE Id = ?`);
    const result = stmt.run(cropId);

    if (result.changes === 0) {
      return res.status(404).json({ message: "Crop not found!", data: null });
    }

    return successResponse(res,null,"Crop deleted successfully!");
  } catch (error) {
    console.log("deleteCrop", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
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
      return notFound(res,"Crop not found!")
    }

    return successResponse(res);
  } catch (error) {
    console.log("markCropAsHarvested", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const getCropLifecycle = (req, res) => {
  // tested working
  try {
    const cropId = Number(req.params.cropId);
    const stages = db.prepare(`
      SELECT * from CropStageProgress WHERE CropId = ? ORDER BY StageOrder ASC;
    `).all(cropId);

    return successResponse(res,stages);
  } catch (error) {
    console.log("getCropLifecycle", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
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
      return errorResponse(res,"Invalid Date: Obsered Date cannot be in the future",400);
    }

    const getCropStageStmnt = db.prepare(`
      SELECT * FROM CropStageProgress WHERE Id = ?;
    `);
    const curntProgState = toCamelCaseObject(
      getCropStageStmnt.get(cropStageProgressId),
    );

    if (!curntProgState || curntProgState.cropId !== cropId) {
      res.status(404).json({ message: "Crop Stage Not Found", error: null });
      return notFound(res,"Crop Stage Not Found");

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
        return errorResponse(res,"Invalid Date: Inconsitent with previous stages.",400);
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
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const allCropsCalenders = (req,res) => {
  try {
    const userId = Number(req.params.userId);

    if(!userExists(userId)) {
      return notFound(res, "User Does not Exists");
    }
    
    const stmnt = db.prepare(`
      SELECT 
      c.FarmerId,c.Id as CropId,c.Name as CropName,c.LandPrepDate,c.SowingDate,
      s.Id as StageProgressId,s.StageName,s.StageOrder,s.EstStartDate,s.EstEndDate,s.ActualStartDate,s.ActualEndDate
      FROM Crop c JOIN CropStageProgress s ON c.Id = s.CropId WHERE c.FarmerId = ?;
    `);
    const result = toCamelCaseObject(stmnt.all(userId));
    return successResponse(res,result);
  } catch (error) {
    console.log("allCropsCalender", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const cropCalender = (req,res) => {
  try {
    const cropId = Number(req.params.cropId);
    const crop = db.prepare(`SELECT Count(*) as count FROM Crop WHERE Id = ?`)
    .get(cropId);

    if(crop.count !== 1) {
      return notFound(res,"Crop Does not Exists");
    }

    const stmnt = db.prepare(`
      SELECT 
      c.FarmerId,c.Id as CropId,c.Name as CropName,c.LandPrepDate,c.SowingDate,
      s.Id as StageProgressId,s.StageName,s.StageOrder,s.EstStartDate,s.EstEndDate,s.ActualStartDate,s.ActualEndDate
      FROM Crop c JOIN CropStageProgress s ON c.Id = s.CropId WHERE c.Id = ?;
    `);
    const result = toCamelCaseObject(stmnt.all(userid));

    return successResponse(res,result);
  } catch (error) {
    console.log("cropsCalender", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const cropYieldEstimation = (req,res) =>{
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
    console.log(data)
    if(!data) {
      return notFound(res,"Crop Does not Exists");
    }

    crop = {...data};
    variety = { yieldPerAcre : JSON.parse(JSON.stringify(data.yieldPerAcre))};
    delete crop.yieldPerAcre;

    const yieldEstimate = calculateYieldEstimation(crop,variety);
    const yieldFactors = computeYieldFactors(crop);

    const result = {
      ...yieldEstimate,
      yieldFactors
    }

    return successResponse(res,result);
  } catch (error) {
    console.log("cropsCalender", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const getCropTypes = (req,res) => {
  try {
    const cropTypes = db.prepare(`
      SELECT * FROM CropType;
      `).all();
    
      return successResponse(res,cropTypes);
  } catch (error) {
    console.log("getCropTypes", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};


const createCropTypes = (req,res) => {
  try {
    const { cropName, scientificName, isPerennial} = req.body;

    const cropTypes = db.prepare(`
      INSERT INTO CropType(CropName,ScientificName,IsPerennial)
      VALUES (?,?,?)
      `).run(
        formatSQLValue(cropName),formatSQLValue(scientificName),formatSQLValue(isPerennial)
      );
    
    return successResponse(res,cropTypes.lastInsertRowid);
  } catch (error) {
    console.log("createCropTypes", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};


const getCropType = (req,res) => {
  try {
    const cropTypeId = req.params.cropTypeId;
    const cropType = db.prepare(`
      SELECT * FROM CropType WHERE Id = ?;
      `).get(cropTypeId);
    
      return successResponse(res,cropType);
  } catch (error) {
    console.log("getCropType", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const deleteCropType = (req, res) => {
  // tested Working
  try {
    const cropTypeId = Number(req.params.cropTypeId);
    const stmt = db.prepare(`DELETE FROM CropType WHERE Id = ?`);
    const result = stmt.run(cropTypeId);

    if (result.changes === 0) {
      return res.status(404).json({ message: "Crop Type not found!", data: null });
    }

    return successResponse(res,null,"Crop Type deleted successfully!");
  } catch (error) {
    console.log("deleteCropType", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const getCropVarieities = (req,res) => {
  try {
    const result = db.prepare(`
      SELECT * FROM CropVariety;
      `).all();
    
      return successResponse(res,result);
  } catch (error) {
    console.log("getCropVarieities", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};


const createCropVarieities = (req,res) => {
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
      userId
    } = req.body;

    const cropVarieities = db.prepare(`
      INSERT INTO CropVariety(
        CropTypeId,
        VarietyName,
        MaturityMinDays,
        MaturityMaxDays,
        YieldPerAcre,
        ShelfLifeDays,
        IsHybrid,
        Notes,
        CreatedUser
      )
      VALUES (?,?,?,?,?,?,?,?,?)
      `).run(
        formatSQLValue(cropTypeId),
        formatSQLValue(varietyName),
        formatSQLValue(maturityMinDays),
        formatSQLValue(maturityMaxDays),
        formatSQLValue(yieldPerAcre),
        formatSQLValue(shelfLifeDays),
        formatSQLValue(isHybrid),
        formatSQLValue(notes),
        formatSQLValue(userId)
      );
    
    return successResponse(res,cropVarieities.lastInsertRowid);
  } catch (error) {
    console.log("createCropVarieities", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};


const getCropVarieity = (req,res) => {
  try {
    const cropVarietyId = req.params.cropVarietyId;
    const result = db.prepare(`
      SELECT * FROM CropVariety WHERE Id = ?;
      `).get(cropVarietyId);
    
      return successResponse(res,result);
  } catch (error) {
    console.log("getCropVarieity", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const deleteCropVarieity = (req, res) => {
  try {
    const cropVarietyId = Number(req.params.cropVarietyId);
    const stmt = db.prepare(`DELETE FROM CropVariety WHERE Id = ?`);
    const result = stmt.run(cropVarietyId);

    if (result.changes === 0) {
      return res.status(404).json({ message: "Crop Variety not found!", data: null });
    }

    return successResponse(res,null,"Crop Variety deleted successfully!");
  } catch (error) {
    console.log("deleteCropVarieity", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

// ---

const getCropLifeCycleStages = (req,res) => {
  try {
    const result = db.prepare(`
      SELECT * FROM CropVariety;
      `).all();
    
      return successResponse(res,result);
  } catch (error) {
    console.log("getCropLifeCycleStages", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};


const createCropLifeCycleStage = (req,res) => {
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
      userId
    } = req.body;

    const cropVarieities = db.prepare(`
      INSERT INTO CropVariety(
        CropTypeId,
        VarietyName,
        MaturityMinDays,
        MaturityMaxDays,
        YieldPerAcre,
        ShelfLifeDays,
        IsHybrid,
        Notes,
        CreatedUser
      )
      VALUES (?,?,?,?,?,?,?,?,?)
      `).run(
        formatSQLValue(cropTypeId),
        formatSQLValue(varietyName),
        formatSQLValue(maturityMinDays),
        formatSQLValue(maturityMaxDays),
        formatSQLValue(yieldPerAcre),
        formatSQLValue(shelfLifeDays),
        formatSQLValue(isHybrid),
        formatSQLValue(notes),
        formatSQLValue(userId)
      );
    
    return successResponse(res,cropVarieities.lastInsertRowid);
  } catch (error) {
    console.log("createCropLifeCycleStages", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};


const getCropLifeCycleStage = (req,res) => {
  try {
    const cropVarietyId = req.params.cropVarietyId;
    const result = db.prepare(`
      SELECT * FROM CropVariety WHERE Id = ?;
      `).get(cropVarietyId);
    
      return successResponse(res,result);
  } catch (error) {
    console.log("getCropLifeCycleStage", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const deleteCropLifeCycleStage = (req, res) => {
  try {
    const cropVarietyId = Number(req.params.cropVarietyId);
    const stmt = db.prepare(`DELETE FROM CropVariety WHERE Id = ?`);
    const result = stmt.run(cropVarietyId);

    if (result.changes === 0) {
      return res.status(404).json({ message: "Crop Variety not found!", data: null });
    }

    return successResponse(res,null,"Crop Variety deleted successfully!");
  } catch (error) {
    console.log("deleteCropLifeCycleStage", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
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
  deleteCropType,
  getCropVarieities,
  createCropVarieities,
  getCropVarieity,
  deleteCropVarieity

};
