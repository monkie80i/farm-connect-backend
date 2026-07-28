const express = require("express");
const router = express.Router();
const db = require("../db");
const { successResponse } = require("../responses/api.responses");
const { upload } = require("../services/file.services");
const { toCamelCaseObject } = require("../utils/utlis");

const fileUploadController = (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, "No file uploaded", 400);
    }
    const fileUrl = `/uploads/${req.file.filename}`; // relative path
    // save fileUrl (or just req.file.filename) to your sqlite table here
    

    return successResponse(res, { fileUrl, originalName: req.file.originalname });
  } catch (error) {
    console.log("createOrderDispute", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

router.get("/lov/:tableName", (req, res) => {
  const tablename = req.params.tableName;
  const tableNameStmnt = db.prepare(`SELECT * FROM ${tablename}`);
  const lovData = tableNameStmnt.all();
  return successResponse(res, toCamelCaseObject(lovData));
});

router.post("/file-upload",upload.single("file"),fileUploadController);

module.exports = router;
