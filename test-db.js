const Databse = require('better-sqlite3');
const path = require('path');

const dbpath = path.join(__dirname,'database','test.db');

const db = Databse(dbpath);
db.pragma('foreign_keys = ON');


module.exports = db;