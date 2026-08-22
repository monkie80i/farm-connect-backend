const db = require("../db");
const {
  toCamelCaseObject,
} = require("../utils/utlis");
const { successResponse, errorResponse, notFound} = require("../responses/api.responses");


const cropHealthLogs = (req, res) => {
    // tested working - decommissioned
  try {
    const cropId = Number(req.params.cropId);

    const stmnt = db.prepare(`SELECT * FROM CropHealthLog WHERE CropId = ?;`);
    const result = toCamelCaseObject(stmnt.all(cropId));

    return successResponse(res,result);
  } catch (error) {
    console.log("cropHealthLogs", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const cropHealthLogsSearch = (req, res) => {
  try {
    const cropId = Number(req.params.cropId);
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const allowedFields = [ 
      'harvestCycleInstanceId','severity'
    ];

    const whereCondtions = [];
    const params  = [];

    for (const key of allowedFields) {
      if (key in req.query) {
        if(req.query[key] !== null && req.query[key].toString().trim() !== "") {
          const name = capitalize(key);
          whereCondtions.push(`CHL.${name}=?`);
          params.push(req.query[key]);
        }
      }
    }
    whereCondtions.push('CHL.CropId=?');
    params.push(cropId);

    const whereClause = whereCondtions.length > 0 ? `WHERE ${whereCondtions.join(" AND ")}`: "";

    const  txn = db.transaction(() => {
      const start = new Date();

      const stmnt = `
      SELECT
        CHL.Id,
        CHL.CropId,
        C.Name as CropName,
        CHL.HarvestCycleInstanceId,
        HCI.CycleLabel,
        CHL.Title,
        CHL.Description,
        CHL.Date,
        CHL.Severity,
        CHL.ImagePath,
        CHL.CreatedUser,
        CU.UserName,
        CHL.UpdatedUser,
        U.UserName,
        CHL.CreatedDate,
        CHL.UpdatedDate
      FROM CropHealthLog CHL 
      LEFT JOIN Crop C ON CHL.CropId = C.Id 
      LEFT JOIN HarvestCycleInstance HCI ON CHL.HarvestCycleInstanceId = HCI.Id
      LEFT JOIN Users CU ON CHL.CreatedUser = CU.Id 
      LEFT JOIN Users U ON CHL.UpdatedUser = U.Id 
      ${whereClause} LIMIT ? OFFSET ?;
      `;

      const result = db.prepare(stmnt).all(...params,pageSize, offset);

      // Get total count for pagination
      const countStmnt = db.prepare(
        `SELECT COUNT(DISTINCT Id) as total 
        FROM CropHealthLog CHL
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

    return successResponse(res,txnResult);
  } catch (error) {
    console.log("getFarmerCrops", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const createHealthLog = (req, res) => {
    // tested working
  try {
    const cropId = Number(req.params.cropId);
    const { title, harvestCycleInstanceId, description, date, severity, imagePath } = req.body;

    const stmnt = db.prepare(`
      INSERT INTO CropHealthLog 
      (
        CropId,
        HarvestCycleInstanceId,
        Title,
        Description,
        Date,
        Severity,
        ImagePath
      )
      VALUES
      (?,?,?,?,?,?,?)
    `);

    const log = stmnt.run(
      cropId,
      harvestCycleInstanceId,
      title,
      description,
      date,
      severity,
      imagePath,
    );

    return successResponse(res,log.lastInsertRowid);
  } catch (error) {
    console.log("createHealthLog", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const editCropHealthLog = (req, res) => {
    // tested working
  try {
    const logId = Number(req.params.logId);
    const { title, description, date, severity, imagePath } = req.body;

    const stmnt = db.prepare(`
            UPDATE CropHealthLog SET
            Title = ?,
            Description = ?,
            Date = ?,
            Severity = ?,
            ImagePath = ?,
            UpdatedDate = CURRENT_TIMESTAMP
            WHERE Id = ?;
        `);
    stmnt.run(title, description, date, severity, imagePath, logId);

    return successResponse(res);
  } catch (error) {
    console.log("editCropHealthLog", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const deleteHealthlog = (req, res) => {
    // tested working
  try {
    const logId = Number(req.params.logId);
    const stmt = db.prepare(`DELETE FROM CropHealthLog WHERE Id = ?`);
    const result = stmt.run(logId);

    if (result.changes === 0) {
      return notFound(res,"Crop Health Log not found!")
    }

    return successResponse(res,null,"Crop Health Log deleted successfully!")
  } catch (error) {
    console.log("deleteHealthlog", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};
module.exports = {
  cropHealthLogs,
  createHealthLog,
  editCropHealthLog,
  deleteHealthlog,
  cropHealthLogsSearch
};
