const db = require("../db");
const {
  toCamelCaseObject,
} = require("../utils/utlis");
const { successResponse, errorResponse, notFound} = require("../responses/api.responses");


const cropHealthLogs = (req, res) => {
    // tested working
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

const createHealthLog = (req, res) => {
    // tested working
  try {
    const cropId = Number(req.params.cropId);
    const { title, description, date, severity, imagePath } = req.body;

    const stmnt = db.prepare(`
            INSERT INTO CropHealthLog 
            (CropId,Title,Description,Date,Severity,ImagePath)
            VALUES
            (?,?,?,?,?,?);
        `);

    const log = stmnt.run(
      cropId,
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
};
