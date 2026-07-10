const Databse = require('better-sqlite3');
const path = require('path');
const dbName = "farmconnect_v2.db";

// const dbpath = path.join(__dirname,'database','farmconnect.db');
// const dbpath = path.join(__dirname,'database','test.db');

const dbpath = path.join(__dirname,'database',dbName);


const db = Databse(dbpath);
db.pragma('foreign_keys = ON');


module.exports = db;