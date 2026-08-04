const db = require("../db");
const { capitalize } = require("../utils/utlis");


/** tableName - Pascal case , primaryKeyName - Pascal case , primaryKeyValue - Any. */
const deleteHelper = (tableName, primaryKeyName, primaryKeyValue) => {
    const stmnt = `DELETE FROM ${tableName} WHERE ${capitalize(primaryKeyName)} = ?`;
    db.prepare(stmnt).run(primaryKeyValue);
};

/** Get Foreign key refences from othere tables to 'target' table. */
const getForeignKeyToTable = (target) => {
  const stmnt = `SELECT name FROM sqlite_schema WHERE type = 'table' AND sql LIKE '%REFERENCES ?%'`
  const result = db.prepare(stmnt).all(target);
  return result;
};

/** Gets the name of the Foreing key from sourceTable to targetTable.
  * sourceTable - Pascal Case, targetTable - Pascal Case.
*/
const getRelatedName = (sourceTable, targetTable,depth = 0) => {
  const result = db
    .prepare(`PRAGMA foreign_key_list('${sourceTable}')`)
    .all()
    .find((p) => p.table === targetTable);
  return result && result["from"] ? result["from"] : null;
};

/** Gets the list of columns of table. */
const getTableColumns = (tableName) => {
  return db.prepare(`pragma table_info(${tableName})`).all();
};

/** Gets boolean for whether the table exists or not. */
const tableExistsQurey = (tableName) => {
  const stmnt = `SELECT COUNT(*) from sqlite_master WHERE name = ?`;
  const result = db.prepare(stmnt).get(tableName);
  return result["COUNT(*)"];
};

/** Checks if the table exists but with different possiblities of the name in singular and plural
   * returns { found: boolean, tableName: string (actual table name ) }
   */
const tableExists = (tableName) => {
  let value = tableExistsQurey(tableName);
  let newTableName;
  if (value === 0) {
    if (tableName.slice(-2, tableName.length).toLowerCase() === "es") {
      newTableName = tableName.slice(0, -2);
    } else if (tableName[tableName.length - 1].toLowerCase() === "s") {
      newTableName = tableName.slice(0, -1);
    } else {
      newTableName = tableName + "s";
    }
    value = tableExistsQurey(newTableName);
  };
  
  return {
    found: value && value > 0 ? true : false,
    tableName: newTableName ? newTableName : tableName,
  };
};

/** Bulk Delete by column values */
const bulkDeletehelper = (tableName, primaryKey, valueList) => {
  const stmnt = `DELETE FROM ${tableName} WHERE ${primaryKey} IN (${valueList.join(",")})`;
  db.prepare(stmnt).run();
  return stmnt;
};

module.exports = {
    deleteHelper,
    getForeignKeyToTable,
    getRelatedName,
    getTableColumns,
    tableExistsQurey,
    tableExists,
    bulkDeletehelper
}