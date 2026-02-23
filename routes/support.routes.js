const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/lov/:tableName', (req,res) => {
    const tablename = req.params.tableName;
    const tableNameStmnt = db.prepare(`SELECT * FROM ${tablename}`);
    const lovData = tableNameStmnt.all();
    res.status(200).json({message: "success", data: lovData});
});

module.exports = router;
