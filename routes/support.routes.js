const express = require('express');
const router = express.Router();
const db = require('../db');
const { successResponse } = require('../responses/api.responses');

router.get('/lov/:tableName', (req,res) => {
    const tablename = req.params.tableName;
    const tableNameStmnt = db.prepare(`SELECT * FROM ${tablename}`);
    const lovData = tableNameStmnt.all();
    return successResponse(res,lovData);
});

module.exports = router;
