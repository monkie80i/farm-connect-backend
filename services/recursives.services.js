const db = require("../db");
const fs = require('node:fs')
const {
  toCamelCaseObject,
  capitalize,
  pascalToCamel,
  formatSQLValue,
} = require("../utils/utlis");


var DEBUG = true;
var DEBUG_CONSOLE = true;
var DEBUG_FILE = false;

const log = (...args) => {
  if (DEBUG && DEBUG_CONSOLE) console.log(...args);
  if(DEBUG && DEBUG_FILE) {
    try {
      fs.writeFileSync('config.json', JSON.stringify({ status: 'ok' }));
      console.log('Sync write complete.');
    } catch (err) {
      console.error(err);
    }
  } 
  
};

/** Global Variable for tracking Database changes of the recursive functions. 
 * Mainly for debugging 
 * */
var ACTIONS = [];

/** tableName - Pascal case , primaryKeyName - Pascal case , primaryKeyValue - Any. */
const deleteHelper = (tableName, primaryKeyName, primaryKeyValue) => {
  db.prepare(
    `DELETE FROM ${tableName} WHERE ${capitalize(primaryKeyName)} = ?`,
  ).run(primaryKeyValue);
};

/** Get Foreign key refences from othere tables to 'target' table. */
const getForeignKeyToTable = (target) => {
  const result = db
    .prepare(
      `
    SELECT name FROM sqlite_schema WHERE type = 'table' AND sql LIKE '%REFERENCES ?%';
  `,
    )
    .run(target);
  return result;
};

/**
   * Gets the name of the Foreing key from sourceTable to targetTable.
   * sourceTable - Pascal Case, targetTable - Pascal Case.
   */
const getRelatedName = (sourceTable, targetTable) => {
  console.log(" get related name", sourceTable, targetTable);
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
  const stmnt = db
    .prepare(`SELECT COUNT(*) from sqlite_master WHERE name = ?`)
    .get(tableName);
  const value = stmnt["COUNT(*)"];
  return value;
};

/** Checks if the table exists but with different possiblities of the name in singular and plural
   * returns { found: boolean, tableName: string (actual table name ) }
   */
const tableExists = (tableName) => {
  
  let value = tableExistsQurey(tableName);

  if (value === 0) {
    const lowerTableName = tableName.toLowerCase();

    const newTableName = lowerTableName.endsWith("es")
      ? tableName.slice(0, -2)
      : lowerTableName.endsWith("s")
        ? tableName.slice(0, -1)
        : tableName + "s";

    value = tableExistsQurey(newTableName);

    if (value === 1) {
      return {
        found: true,
        tableName: newTableName,
      };
    }
  }
};


/**
 * Recustively creates each object of the data array in teh tables.
 * 
 * Inputs::
 * tableName : Pascal Case
 * dataArray : Array of object corresponding to table in tableName
 * relatedTableFieldName : Pascal Case | is the foreing key field of this tableName , which holds the link to the parent/ related tables
 * relatedTableFieldValue :Any | can be any valid pk value
 *
 * Output::
 * None
 */
const recursiveCreate = (
  tableName,
  dataArray,
  relatedTableFieldName,
  relatedTableFieldValue,
  caller = null,
) => {

  let RCId = `RC/${caller}/${tableName}/${dataArray.length}/${relatedTableFieldName}/${relatedTableFieldValue}: `;
  if (caller) {
    RCId = "    " + RCId;
    if (caller === "recursiveCreate") {
      RCId = "    " + RCId;
    }
  }
  console.log("Enter RC, from ", caller, "Code", RCId);

  const TABLE_COLUMNS = getTableColumns(tableName);
  const PK = TABLE_COLUMNS.find((p) => p["pk"] === 1).name;
  const pkKey = pascalToCamel(PK);
  console.log(`${RCId} 1 pkKey`, pkKey);
  const toBeCreated = dataArray.filter((item) => !item[pkKey]);
  console.log(`${RCId} 2 toBeCreated`, toBeCreated.length);
  const tableHasCreatedDateCol =
    TABLE_COLUMNS.map((p) => p.name).find((p) => p === "CreatedDate") || false;
  console.log(
    `${RCId} 2.1 tableHasCreatedDateCol`,
    tableHasCreatedDateCol.length,
  );

  console.log(`${RCId} 3 toBeCreated[0]`, toBeCreated[0]);
  if (toBeCreated.length < 1) {
    console.log(`${RCId} 3.1 Exit RC, To`, caller, "Reason: Nothing to Create");
    return;
  }
  let columnNames = Object.keys(toBeCreated[0])
    .filter((p) => p !== pkKey || !Array.isArray(toBeCreated[0][p]))
    .map((p) => capitalize(p));
  // columnNames.push(relatedTableFieldName);
  console.log(`${RCId} 4 columnNames`, columnNames);

  // nestedTableNames is the nested tables in each item element of Data Array, assuming they are consistent (Pascal Case)
  let nestedTableNames = Object.keys(toBeCreated[0])
    .filter((p) => p !== pkKey)
    .filter((p) => Array.isArray(toBeCreated[0][p]))
    .map((p) => capitalize(p));
  console.log(`${RCId} 5 nestedTableNames`, nestedTableNames);

  const tableColumns = db
    .prepare(`SELECT name FROM pragma_table_info('${tableName}')`)
    .all();
  console.log(`${RCId} 6 tableColumns`, tableColumns);
  const tableColumnNames = tableColumns.map((p) => p.name);

  const excludeColumns = [
    "CreatedUser",
    "UpdatedUser",
    "CreatedDate",
    "UpdatedDate",
  ];
  // filter out incoming clumn names that are actually existing
  columnNames = columnNames.filter(
    (p) =>
      tableColumnNames.includes(p) &&
      !excludeColumns.includes(p) &&
      p !== relatedTableFieldName,
  );
  console.log(`${RCId} 7 tableColumnNames`, tableColumnNames);
  console.log(`${RCId} 7.1 columnNames`, columnNames);
  columnNames.push(relatedTableFieldName);
  console.log(`${RCId} 8 columnNames`, columnNames);

  console.log(`${RCId} 8.1 tableHasCreatedDateCol`, tableHasCreatedDateCol);
  if (tableHasCreatedDateCol) {
    console.log(`8.2 pushed`);
    columnNames.push("CreatedDate");
  }

  toBeCreated.forEach((item) => {
    const valueList = columnNames
      .filter((p) => !excludeColumns.includes(p))
      .filter((p) => p !== relatedTableFieldName)
      .map((columnName) => item[pascalToCamel(columnName)]);
    console.log(`${RCId} 9.0 valueList`, valueList);
    console.log(`${RCId} 9.0.1 tableHasCreatedDateCol`, tableHasCreatedDateCol);

    valueList.push(relatedTableFieldValue);
    console.log(`${RCId} 9.0.2  relatedTableFieldName pushed`);

    if (tableHasCreatedDateCol) {
      console.log(`${RCId} 9.0.3 pushed`);
      valueList.push("CURRENT_TIMESTAMP");
    }
    console.log(`${RCId} 9.1 valueList`, valueList);
    const placeHolders = valueList.map((p) => "?").join(",");
    console.log(`${RCId} 9.1 placeHolders`, placeHolders);

    console.log(
      `${RCId} 9.2 INSERT INTO ${tableName} (${columnNames.join(",")}) VALUES (${placeHolders})`,
    );
    let result = db
      .prepare(
        `INSERT INTO ${tableName} (${columnNames.join(",")}) VALUES (${placeHolders})`,
      )
      .run(...valueList);

    ACTIONS.push(
      `INSERT INTO ${tableName} (${columnNames.join(",")}) VALUES (${placeHolders}); ${JSON.stringify(valueList)} - ID: ${result.lastInsertRowid}`,
    );

    console.log(`${RCId} 9.3 result`, result);
    const realtedValue = JSON.parse(JSON.stringify(result.lastInsertRowid));
    console.log(`${RCId} 9.4 lastInsertRowid realtedValue`, realtedValue);

    if (nestedTableNames.length > 0) {
      nestedTableNames.forEach((nestedTableName) => {
        const nestedTableNameOg = pascalToCamel(nestedTableName);
        console.log(
          `${RCId} 9.4.0 nestedTableName,tableName`,
          nestedTableName,
          tableName,
        );
        const relatedName = getRelatedName(nestedTableName, tableName);
        console.log(`${RCId} 9.4.1 relatedName`, relatedName);

        item[nestedTableNameOg] = item[nestedTableNameOg].map((x) => ({
          ...x,
          [relatedName]: realtedValue,
        }));
        console.log(
          `${RCId} 9.4.2 item[nestedTableNameOg]`,
          item[nestedTableNameOg].length,
        );

        console.log(
          `${RCId} 9.4.3 called RC , hand Over: RC/${tableName}/${dataArray.length}/${relatedTableFieldName}/${relatedTableFieldValue}`,
        );
        recursiveCreate(
          nestedTableName,
          item[nestedTableNameOg],
          relatedName,
          realtedValue,
          "recursiveCreate",
        );
        console.log(`${RCId} 9.4.4 returned From RC`);
      });
    }
  });
  console.log(`${RCId} 10 Exit RC, To`, caller, "Reason: Completed");
};

/**
 * Patches an object, returns new created object and nested fields that were in the object
 * 
 * Inputs::
 * tableName : PascalCase
 * data : object corresponding to table in tableName
 * hasUpdateTimesStamp : boolean
 * updateUser : number ! null
 *
 * Outputs::
 * None
 */
const patchHelper = (
  tableName,
  data,
  hasUpdateTimesStamp = true,
  updateUser = null,
  caller = null,
) => {
  let PHId = `PH/${tableName}/${caller}: `;
  if (caller) {
    PHId = "    " + PHId;
    if (caller === "patchHelper") {
      PHId = "    " + PHId;
    }
  }

  console.log(`Enter PH, from `, caller, "Code", PHId);

  const TABLE_COLUMNS = getTableColumns(tableName);
  const pk = TABLE_COLUMNS.find((p) => p.pk === 1).name; // pk - Pascal case
  console.log(`${PHId} 1 pk`, pk);
  const excludeColumns = [
    "CreatedUser",
    "UpdatedUser",
    "CreatedDate",
    "UpdatedDate",
  ];
  const table_col_names = TABLE_COLUMNS.map((p) => p.name).filter(
    (p) => !excludeColumns.includes(p),
  ); // table_col_names - Pascal Case
  console.log(`${PHId} 2 table_col_names`, table_col_names);

  const hasUpdateDate =
    TABLE_COLUMNS.map((p) => p.name).find((p) => p === "UpdatedDate") || null;

  console.log(`${PHId} 3 tableName Has Update date`, hasUpdateDate);
  const updatableFieldsInData = Object.keys(data)
    .filter((p) => p !== pascalToCamel(pk)) // good // camel case
    .filter((p) => table_col_names.includes(capitalize(p))); // camelCase
  console.log(`${PHId} 4 updatableFieldsInData`, updatableFieldsInData);

  const directUpdatableFields = updatableFieldsInData.filter(
    (fieldName) => !Array.isArray(data[fieldName]),
  ); // camelCase
  console.log(`${PHId} 5 directUpdatableFields`, directUpdatableFields);

  const nestedFields = Object.keys(data)
    .filter((p) => p !== pascalToCamel(pk))
    // cos it has for existng colum names only - nested fiedls are related columns
    .filter((p) => !updatableFieldsInData.includes(p))
    .filter((p) => Array.isArray(data[p])); // camelCase

  let setStr =
    directUpdatableFields.map((p) => capitalize(p)).join(" = ?, ") + " = ?";
  console.log(`${PHId} 6 setStr`, setStr);

  const value_list = directUpdatableFields.map((fieldName) => data[fieldName]);
  value_list.push(data[pascalToCamel(pk)]);

  console.log(`${PHId} 7 value_list`, value_list);

  if (hasUpdateTimesStamp && hasUpdateDate) {
    setStr = setStr + " ,UpdatedDate = CURRENT_TIMESTAMP";
    console.log(`${PHId} 7.1 setStr`, setStr);
  }
  if (updateUser) {
    setStr = setStr + " ,UpdatedUser = ?";
    value_list.push(updateUser);
    console.log(
      `${PHId} 7.2 setStr`,
      setStr,
      "pushed to value list:",
      updateUser,
    );
  }

  console.log(`${PHId} 8 UPDATE ${tableName} SET ${setStr} WHERE ${pk} = ?`);
  console.log(`${PHId} 9 ...value_list`, ...value_list);
  const result = db
    .prepare(`UPDATE ${tableName} SET ${setStr} WHERE ${pk} = ?`)
    .run(...value_list);

  ACTIONS.push(
    `UPDATE ${tableName} SET ${setStr} WHERE ${pk} = ? : ${JSON.stringify(value_list)}`,
  );

  console.log(`${PHId} 10 Exit PH, To`, caller, "Reason: Completed");
  return { result, nestedFields, pk };
};

/***
 * Updates/Patch already existing (recursively),
 * Create/Insert new ones, without their primary key (recursively),
 * Deletes ones missing in the array (non - recursively)
 * 
 * Inputs::
 * tableName : PascalCase
 * dataArray : array of objects to be upsert and deleted
 * relatedField : Pascal Case | is the foreing key field of this tableName , which holds the link to the parent/ related tables
 * relatedTableFieldValue : Any | could be any type whihc is suitable for primary key
 *
 * Action:
 * 
 */
const upsertDeleteHelper = (
  tableName,
  dataArray,
  relatedTableField,
  relatedTableFieldValue,
  caller = null,
) => {
  let UDHId = `UDH/${caller}/${tableName}/${dataArray.length}/${relatedTableField}/${relatedTableFieldValue}/: `;
  if (caller) {
    UDHId = "    " + UDHId;
    if (caller === "upsertDeleteHelper") {
      UDHId = "    " + UDHId;
    }
  }

  console.log(`Enter UDH, from `, caller, "Code", UDHId);

  const tableExistsResp = tableExists(tableName);
  console.log(`${UDHId} 1 tableExistsResp`, tableExistsResp);

  tableName = tableExistsResp.tableName;
  if (!tableExistsResp.found) {
    console.log(
      `${UDHId} 1.1 Exit UDH, To`,
      caller,
      "Reason: Incoming null/empty/not array",
    );
    return;
  }

  const TABLE_COLUMNS = getTableColumns(tableName);
  const PK = TABLE_COLUMNS.find((p) => p["pk"] === 1).name;
  const pkKey = pascalToCamel(PK);
  console.log(`${UDHId} 2 pkKey`, pkKey);

  const incoming = dataArray && Array.isArray(dataArray) ? dataArray : [];
  console.log(`${UDHId} 3 incoming`, incoming.length);

  if (incoming.length < 1) {
    // need to chceck for delete
    console.log(
      `${UDHId} 3.1 SELECT * FROM ${tableName} WHERE ${relatedTableField} = ?;`,
      relatedTableFieldValue,
    );
    const existing = toCamelCaseObject(
      db
        .prepare(`SELECT * FROM ${tableName} WHERE ${relatedTableField} = ?;`)
        .all(relatedTableFieldValue),
    );
    console.log(`${UDHId} 3.2 existing`, existing.length);
    const toBeDelIds = existing.map((item) => item[pkKey]);
    console.log(`${UDHId} 3.3 toBeDelIds`, toBeDelIds);
    console.log(
      `${UDHId} 3.4 Exit UDH, To`,
      caller,
      "Reason: Incoming null/empty/not array",
    );
    return;
  }

  console.log(
    `${UDHId} 4 SELECT * FROM ${tableName} WHERE ${relatedTableField} = ?;`,
    relatedTableFieldValue,
  );
  const existing = toCamelCaseObject(
    db
      .prepare(`SELECT * FROM ${tableName} WHERE ${relatedTableField} = ?;`)
      .all(relatedTableFieldValue),
  );
  console.log(`${UDHId} 5 existing`, existing);
  const incomingWithId = incoming.filter(
    (p) => ![undefined, null, 0].includes(p[pkKey]),
  );
  console.log(`${UDHId} 6 incomingWithId`, incomingWithId.length);

  const incomingIds = incomingWithId.map((item) => item[pkKey]);
  console.log(`${UDHId} 7 incomingIds`, incomingIds);
  const toBeDelIds = existing
    .filter((p) => !incomingIds.includes(p[pkKey]))
    .map((item) => item[pkKey]);
  console.log(`${UDHId} 8 toBeDelIds`, toBeDelIds);

  if (toBeDelIds.length > 0) {
    console.log(
      `${UDHId} 9 calling bulkDeletehelper:`,
      tableName,
      pkKey,
      toBeDelIds,
    );
    bulkDeletehelper(tableName, pkKey, toBeDelIds);
    console.log(
      `${UDHId} 10 back from bulkDeletehelper:`,
      tableName,
      pkKey,
      toBeDelIds,
    );
  }

  const tobePatched = incoming.filter((item) => item[pkKey]);
  console.log(`${UDHId} 11 tobePatched`, tobePatched);

  tobePatched.forEach((field) => {
    // feild is object not names
    console.log(`${UDHId} 12.1 calling patchHelper`, tableName, field);

    // this table Name's PK
    const { result, nestedFields, pk } = patchHelper(
      tableName,
      field,
      true,
      null,
      "upsertDeleteHelper",
    );
    console.log(`${UDHId} 12.2 back from patchHelper`, result);
    console.log(`${UDHId} 12.3 nestedFields`, nestedFields.length);

    const realtedValue = JSON.parse(JSON.stringify(field[pascalToCamel(pk)])); // wrong
    console.log(`${UDHId} 12.4 lastInsertRowid/realtedValue`, realtedValue);
    if (nestedFields.length > 0) {
      nestedFields.forEach((nestedField) => {
        const nestedTablesName = capitalize(nestedField);
        console.log(`${UDHId} 12.4.1 nestedTablesName`, nestedTablesName);

        const relatedName = getRelatedName(nestedField, tableName);
        console.log(`${UDHId} 12.4.2 relatedName`, relatedName);
        if (relatedName) {
          console.log(
            `${UDHId} 12.4.2.1 calling upsertDeleteHelper:`,
            capitalize(nestedTablesName),
            nestedField.length,
            relatedName,
            realtedValue,
          );
          upsertDeleteHelper(
            capitalize(nestedTablesName),
            field[nestedField],
            relatedName,
            realtedValue,
            "upsertDeleteHelper",
          );
          console.log(`${UDHId} 12.4.2.2 back from upsertDeleteHelper:`);
        }
      });
    }
  });

  console.log(
    `${UDHId} 13 calling recursiveCreate`,
    tableName,
    incoming.length,
  );
  recursiveCreate(
    tableName,
    incoming,
    relatedTableField,
    relatedTableFieldValue,
    "upsertDeleteHelper",
  ); // it will take care of the filtering
  console.log(`${UDHId} 14 back from recursive create`);

  console.log(`${UDHId} 15 Exit UDH, To`, caller, "Reason: Completed");
};

/** Inserts if not existing in the table,
 *  Deletes if existing
 */
const insertOrDeleteHelper = (
  dataArray,
  tableName,
  relatedTableField,
  relatedTableFieldValue,
  creationFieldName,
  creationFieldKey,
) => {
  const incoming = dataArray && Array.isArray(dataArray) ? dataArray : [];

  if(incoming.length < 1 ) {
    return;
  }

  const existing = toCamelCaseObject(
    db
      .prepare(`SELECT * FROM ${tableName} WHERE ${relatedTableField} = ?;`)
      .all(relatedTableFieldValue),
  );
  const toBeCreated = incoming.filter((item) => !item.id);
  const tuples = toBeCreated
    .map(
      (item) =>
        `(${relatedTableFieldValue},${item[creationFieldKey]})`,
    )
    .join(",");
  console.log(tuples);
  db.prepare(
    `INSERT INTO ${tableName} (${relatedTableField}, ${creationFieldName}) VALUES ${tuples}`,
  ).run();

  const incomingWithId = incoming.filter((p) => ![undefined, null, 0].includes(p.id));
  const toBeDelIds = existing.filter((p) => !incomingWithId.includes(p.id)).map((item) => item.id);
  if(toBeDelIds.length > 0) {
    db.prepare(`DELETE FROM ${tableName} WHERE Id IN (${toBeDelIds})`).run();
  }
};

/** Bulk Delete by column values */
const bulkDeletehelper = (tableName, primaryKey, valueList) => {
  db.prepare(
    `DELETE FROM ${tableName} WHERE ${primaryKey} IN (${valueList.join(",")})`,
  ).run();

  ACTIONS.push(
    `DELETE FROM ${tableName} WHERE ${primaryKey} IN (${valueList.join(",")})`,
  );
};

const clearActions = () => {
  Actions = [];
};

const getActions = () => {
  return JSON.parse(JSON.stringify(Actions));
};


/**
 *  Versions 2s
 */

/**
 * Patches an object, returns new created object and nested fields that were in the object
 * 
 * Inputs::
 * tableName : PascalCase
 * data : object corresponding to table in tableName
 * hasUpdateTimesStamp : boolean
 * updateUser : number ! null
 *
 * Outputs::
 * None
 */
const patchHelperV2 = (
  tableName,
  data,
  updateUser = null,
  caller = null,
) => {

  let PHId = `PH/${tableName}/${caller || 'direct'}: `;
  if (caller) {
    PHId = "    " + PHId;
    if (caller === "patchHelper") {
      PHId = "    " + PHId;
    }
  }

  const tableExists = this.tableExists(tableName);

  if(!tableExists.found) {
    throw new Error(`${PHId}: Table name does not exist.`);
  }
  const newTableName = tableExists.tableName;

  console.log(`Enter PH, from `, caller, "Code", PHId);

  if(data  === null || typeof(data) !== 'object') {
    throw new Error(`- ${PHId}: Input Data is invalid.`);
  }

  const TABLE_COLUMNS = getTableColumns(newTableName);
  const pkColumn = TABLE_COLUMNS.find((p) => p.pk === 1); // pk - Pascal case

  if(!pkColumn) {
    throw new Error(`- ${PHId}: Table ${newTableName} has no Primary Key Field. `);
  }

  const pk = pkColumn.name;

  console.log(`${PHId} 1 pk`, pk);
  const excludeColumns = [
    "CreatedUser",
    "UpdatedUser",
    "CreatedDate",
    "UpdatedDate",
  ];

  const tableColumns = new Set(
    // Pascal Case
    TABLE_COLUMNS.map((p) => p.name).filter((p) => !excludeColumns.includes(p)),
  );
  console.log(`${PHId} 2 tableColumns`, tableColumns);

  const tableHasUpdateDateColumn = TABLE_COLUMNS.some((p) => p.name === "UpdatedDate");

  console.log(`${PHId} 3 newTableName tableHasUpdateDateColumn `, tableHasUpdateDateColumn);

  const updatableFieldsInData = Object.keys(data)
    .filter((p) => p !== pascalToCamel(pk)) // good // camel case
    .filter((p) => tableColumns.includes(capitalize(p))); // camelCase
  console.log(`${PHId} 4 updatableFieldsInData`, updatableFieldsInData);

  const directUpdatableFields = updatableFieldsInData.filter(
    (fieldName) => !Array.isArray(data[fieldName]),
  ); // camelCase
  console.log(`${PHId} 5 directUpdatableFields`, directUpdatableFields);

  // camelCase []
  const nestedFields = Object.keys(data)
    .filter((p) => p !== pascalToCamel(pk))
    .filter((p) => !updatableFieldsInData.includes(p))
    .filter((p) => Array.isArray(data[p])); 

  const unusedFields = Object.keys(data)
    .filter((p) => !updatableFieldsInData.includes(p))
    .filter((p) => !Array.isArray(data[p])); 

  if(directUpdatableFields.length === 0) {
    console.log(`${PHId} 5.1 Exit PH, To`, caller, "Reason: No Fields to be updated");
    return { result: null, nestedFields, pk };
  }

  let setParts = [];
  let valueList = [];

  for (const field of updatableFieldsInData) {
    setParts.push(`${capitalize(p)} = ?`);
    valueList.push(data[field]);
  }

  if (tableHasUpdateDateColumn) {
    setParts.push('UpdatedDate = CURRENT_TIMESTAMP');
  }

  if(updateUser) {
    setParts.push('UpdateUser = ?');
    valueList.push(updateUser);
  }

  // "WHERE" parameter
  valueList.push(data[pascalToCamel(pk)]); 

  const setStr = setParts.join(', ');
  const sql = `UPDATE ${newTableName} SET ${setStr} WHERE ${pk} = ?`;

  console.log(`${PHId} 8 ${sql}`);
  console.log(`${PHId} 9 valueList`, ...valueList);
  const result = db.prepare(sql).run(...valueList);

  ACTIONS.push(`${sql} : ${JSON.stringify(valueList)}`);

  console.log(`${PHId} 10 Exit PH, To`, caller, "Reason: Completed");
  return { result, nestedFields, pk, unusedFields };
};


module.exports = {
  getRelatedName,
  getTableColumns,
  patchHelper,
  upsertDeleteHelper,
  tableExists,
  clearActions,
  getActions,
};

/**
 * NOTES:
 *
 * 1. If you are sending a field then it better have values, if its null
 * also in incoming upser delte patch, rather than checking the fields on the input request, it should aso check with the tables itsefl, for taht related column
 *
 * 2. If empty [] is send the exsisting ones are delted. If nothing sent, no changes.
 *
 */
