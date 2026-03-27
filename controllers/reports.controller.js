const db = require("../db");
const {
  toCamelCaseObject,
  formatSQLValue,
  getFutureDateISO,
} = require("../utils/utlis");
const {
  successResponse,
  errorResponse,
  notFound,
} = require("../responses/api.responses");

const exportToExcel = require("../services/excel-exporter.service");

const cropWiseYieldGen = async (farmerId, fileName, trackerRecordId) => {
  const stmnt = db.prepare(`
        SELECT 
        c.Id,c.Name,c.CropTypeId,c.VarietyId,c.FarmId,c.FarmerId,
        c.LandPrepDate,c.SowingDate,c.ExpectedGrowthDurationDays,
        c.CultivatedAreaInAcre,c.EstdHarvestDate,
        c.CurrentStage,c.HealthStatus,v.YieldPerAcre,v.Name
        FROM
        Crop c JOIN CropVariety v ON c.VarietyId = v.Id
        WHERE FarmerId = ?;
    `);

  const data = toCamelCaseObject(stmnt.all(farmerId));

  for (const row of data) {
    const crop = { ...row };
    const variety = {
      yieldPerAcre: JSON.parse(JSON.stringify(row.yieldPerAcre)),
    };
    delete crop.yieldPerAcre;
    row.yieldEstimate = calculateYieldEstimation(crop, variety);
  }

  // generate a unique name .xls

  const filePath = await exportToExcel(data, fileName, "reports/farmer");
};

const genFarmerReports = async (req, res) => {
  try {
    const { userId, reportType, startDay, endDay } = req.body;

    const farmerReportTypes = toCamelCaseObject(
      db.prepare(`SELECT * FROM ReprotType WHERE UserRole = 'FARMER';`).all(),
    );

    if (!farmerReportTypes.map((p) => p.code).include(reportType)) {
      return notFound(res, "Report type not found");
    }
    // `users_${Date.now()}`
    const fileName = `Crop_wise_yeild_report__${userId}_${Date.now()}`;

    const createRecordStatement = db.prepare(`
            INSERT INTO ReportGenerationTracker 
            (ReportOwnerRole,UserId,ReportType,FileName,Status),
            VALUES (?,?,?,?,?,?,?,?);
        `);
    const record = createRecordStatement.run(
      formatSQLValue("FARMER"),
      formatSQLValue(userId),
      formatSQLValue(reportType),
      formatSQLValue(fileName),
      formatSQLValue("NEW"),
    );

    return successResponse(res);
  } catch (error) {
    console.log("genFarmerReports", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const downloadReport = (req, res) => {
  try {
    const { fileName, userRole } = req.body;
    let filePath;

    switch (userRole) {
      case "FARMER":
        filePath = `../reports/farmer/${fileName}`;
        break;
      case "BUYER":
        filePath = `../reports/buyer/${fileName}`;
        break;
      default:
        filePath = `../reports/admin/${fileName}`;
        break;
    }
    res.download(filePath);
  } catch (error) {
    console.log("downloadReport", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

/**
 * 
 * CREATE TABLE IF NOT EXISTS ReportGenerationStatusLov (
        Code NVARCHAR(10) PRIMARY KEY,
        Description TEXT NOT NULL
    );

    INSERT INTO ReportGenerationStatusLov (Code,Description) VALUES 
    ('NEW','New'),
    ('PROCESSING','Processing'),
    ('COMPLETE','Complete');

    Create TABLE IF NOT EXISTS ReprotType (
        Code NVARCHAR(10) PRIMARY KEY,
        Description TEXT,
        UserRole NVARCHAR(10),
        FOREIGN KEY (UserRole) REFERENCES UserRolesLov(Code) ON DELETE SET NULL
    );

    INSERT INTO ReprotType (Code,Description, UserRole) VALUES
    ('CWY','Crop Wise Yeild','FARMER'),
    ('OAS','Order and Sales','FARMER'),
    ('GSP','Group Selling Participants','FARMER');

    CREATE TABLE IF NOT EXISTS ReportGenerationTracker (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        ReportOwnerRole NVARCHAR(10) NOT NULL,
        UserId INTEGER,
        ReportType NVARCHAR(10),
        StartDate DATE,
        EndDate DATE,
        FileName TEXT,
        FileExtension NVARCHAR(10),
        FilePath TEXT,
        Status NVARCHAR(10),
        CreatedDate DATE DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATE,
        FOREIGN KEY (ReportOwnerRole) REFERENCES UserRolesLov(Code) ON DELETE SET NULL,
        FOREIGN KEY (UserId) REFERENCES User(Id) ON DELETE SET NULL,
        FOREIGN KEY (Status) REFERENCES ReportGenerationStatusLov(Code) ON DELETE SET NULL
    );
 */

module.exports = { genFarmerReports,downloadReport };
