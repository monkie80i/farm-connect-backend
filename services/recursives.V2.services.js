const db = require("../db");
const {
  toCamelCaseObject,
  capitalize,
  pascalToCamel,
  formatSQLValue,
  timeElapsed,
} = require("../utils/utlis");
const {
  getRelatedName,
  getTableColumns,
  tableExists,
  bulkDeletehelper
} =  require("./db.services");

const { log } = require('./logger.services');

/** Global Variable for tracking Database changes of the recursive functions. 
 * Mainly for debugging 
 * */
var ACTIONS = [];

const clearActions = () => {
  ACTIONS = [];
};

const getActions = () => {
  return JSON.parse(JSON.stringify(ACTIONS));
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
const patchHelperV2 = (tableName,data,updateUser = null,caller = 'direct',depth = 0) => {
  const start = new Date();
  const indent = " ".repeat(depth*4);
  log(indent,`PATCH started`);

  const tableExist = tableExists(tableName);
  const newTableName = tableExist.tableName;
  const UID = `PATCH/${newTableName}/${caller}: `;

  if(!tableExist.found) {
    log(indent,`${UID} error:`,'Table name does not exist.');
    throw new Error(`${UID}: Table name does not exist.`);
  }

  if(data  === null || typeof(data) !== 'object') {
    log(indent,`${UID} error:`,'Input Data is invalid.');
    throw new Error(`${UID}: Input Data is invalid.`);
  }

  const dataKeys = Object.keys(data);
  const excludeColumns = [
    "CreatedUser",
    "UpdatedUser",
    "CreatedDate",
    "UpdatedDate",
  ];

  const TABLE_COLUMNS = getTableColumns(newTableName);
  const pkColumn = TABLE_COLUMNS.find((col) => col.pk === 1);
  const tableHasUpdateDateColumn = TABLE_COLUMNS.some((p) => p.name === "UpdatedDate");

  if(!pkColumn) {
    log(indent,`${UID} error:`,`Table ${newTableName} has no Primary Key Field.`);
    throw new Error(`${UID}: Table ${newTableName} has no Primary Key Field. `);
  }

  excludeColumns.push(pkColumn.name);

  const pk = pkColumn.name;
  const patchableTableColumns = new Set(
    TABLE_COLUMNS.map((col) => col.name)
    .filter((col) => !excludeColumns.includes(col)),
  );

  log(indent,`${UID} Filtering`);

  const updatableFieldsInData = dataKeys.filter((k) => patchableTableColumns.has(capitalize(k)));
  const directUpdatableFields = updatableFieldsInData.filter((k) => !Array.isArray(data[k])); 
  const unpatchableFields = dataKeys.filter((k) => !updatableFieldsInData.includes(k));
  const nestedFields = unpatchableFields.filter((k) => Array.isArray(data[k])); 
  const unusedFields = unpatchableFields.filter((k) => !Array.isArray(data[k])); 

  if(directUpdatableFields.length === 0) {
    log(indent,`${UID} complete: (no change)`,timeElapsed(start,new Date()));
    return { result: null, nestedFields, pk, unusedFields };
  }

  log(indent,`${UID} Preparing Query`);

  let setParts = [];
  let valueList = [];

  for (const field of directUpdatableFields) { // shouldnt this be directUpdatableFields updatableFieldsInData
    setParts.push(`${capitalize(field)} = ?`);
    valueList.push(data[field]);
  }

  if (tableHasUpdateDateColumn) {
    setParts.push('UpdatedDate = CURRENT_TIMESTAMP');
  }

  if(updateUser) {
    setParts.push('UpdatedUser = ?');
    valueList.push(updateUser);
  }

  //  for "WHERE PK = ?"
  valueList.push(data[pascalToCamel(pk)]); 

  const setStr = setParts.join(', ');
  const sql = `UPDATE ${newTableName} SET ${setStr} WHERE ${pk} = ?`;

  log(indent,`${UID} Update`);
  const result = db.prepare(sql).run(...valueList);

  ACTIONS.push(`${sql} : ${JSON.stringify(valueList)}`);

  log(indent,`${UID} Exit Complete:`,timeElapsed(start,new Date()));
  return { result, nestedFields, pk, unusedFields };
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
const recursiveCreateV2 = (
  tableName,
  dataArray,
  relatedTableFieldName,
  relatedTableFieldValue,
  createdUser = null,
  caller = 'direct',
  depth = 0
) => {
  const start = new Date();
  const indent = " ".repeat(depth*4); 
  log(indent,`REC_CREATE started`);

  if(!tableName || tableName.toString().trim() == "") {
    log(indent,`REC_CREATE error: Invalid Table Name ${tableName}`);
    throw new Error(`REC_CREATE: Invalid Table Name ${tableName}`);
  }

  const tableExist = tableExists(tableName);
  const newTableName = tableExist.tableName;

  if(!tableExist.found) {
    log(indent,`REC_CREATE error: Table '${newTableName}' does not exist.`);
    throw new Error(`REC_CREATE: Table '${newTableName}' does not exist.`);
  }

  if(!Array.isArray(dataArray) || dataArray.length === 0) {
    log(indent,`REC_CREATE error: Input data not array or empty.`);
    throw new Error(`REC_CREATE: Input data not array or empty.`)
  }

  if(!relatedTableFieldName) {
    log(indent,`REC_CREATE error: relatedTableFieldName invalid`);
    throw new Error(`REC_CREATE: relatedTableFieldName invalid`)
  }

  if(!relatedTableFieldValue) {
    log(indent,`REC_CREATE error: relatedTableFieldValue invalid`);
    throw new Error(`REC_CREATE: relatedTableFieldValue invalid`)
  }


  const UID = `REC_CREATE/${newTableName}/${caller}/${dataArray.length}/${relatedTableFieldName}/${relatedTableFieldValue}`;
  log(indent,`${UID} initializing`);

  const excludeColumns = ["CreatedUser","UpdatedUser","CreatedDate", "UpdatedDate"];
  const TABLE_COLUMNS = getTableColumns(newTableName);
  const pkColumn = TABLE_COLUMNS.find((col) => col.pk === 1);
  const tableHasCreatedDateColumn = TABLE_COLUMNS.some((p) => p.name === "CreatedDate");

  if(!pkColumn) {
    log(indent,`${UID} error:`,`Table ${newTableName} has no Primary Key Field.`);
    throw new Error(`${UID}: Table ${newTableName} has no Primary Key Field. `);
  }

  const pk = pkColumn.name;
  const itemsQualifiedForCreation = dataArray.filter((item) => !item[pascalToCamel(pk)]);

  if (itemsQualifiedForCreation.length === 0) {
    log(indent,`${UID} Exit: none to create`);
    return;
  }

  const firstItem =  itemsQualifiedForCreation[0];
  const dataKeys = Object.keys(firstItem);

  excludeColumns.push(relatedTableFieldName)
  excludeColumns.push(pk);

  const insertableTableColumns = new Set (
    TABLE_COLUMNS.map((col) => col.name)
    .filter((col) => !excludeColumns.includes(col)),
  )

  log(indent,`${UID} insertableTableColumns `, insertableTableColumns);

  log(indent,`${UID} filtering data...`);
  const insertableFieldsInData = dataKeys
    .filter((k) => insertableTableColumns.has(capitalize(k))); // makes sure uniqeness
  const directInsertableFields = insertableFieldsInData
    .filter((k) => !Array.isArray(firstItem[k])); 
  const nestedFields = dataKeys
    .filter((k) => !insertableFieldsInData.includes(k))
    .filter((k) => Array.isArray(firstItem[k])); 
  
  log(indent,`${UID} processing each item...`);
  itemsQualifiedForCreation.forEach((item,$index) => {
    log(indent,`${UID} $index: ${$index}`);
    const columnNameSet = [];
    const value_list = [];
    let tknCnt = 0;
    
    log(indent,`${UID}/${$index}: preparing query`);
    for (const field of directInsertableFields) {
      columnNameSet.push(`${capitalize(field)}`);
      tknCnt++;
      value_list.push(item[field]);
    }

    columnNameSet.push(`${relatedTableFieldName}`);
    tknCnt++;
    value_list.push(relatedTableFieldValue);

    if (tableHasCreatedDateColumn) {
      columnNameSet.push('CreatedDate');
      tknCnt++;
      value_list.push('CURRENT_TIMESTAMP');
    }

    if(createdUser) {
      columnNameSet.push('CreatedUser');
      tknCnt++;
      value_list.push(createdUser);
    }
    
    const sql = `INSERT INTO ${newTableName} (${columnNameSet.join(",")}) VALUES (${"?,".repeat(tknCnt).slice(0,-1)})`;
   
    log(indent,`${UID}/${$index}: executing insert`);
    const result = db.prepare(sql).run(...value_list);

    ACTIONS.push(`${sql} :${JSON.stringify(value_list)} - ID: ${result.lastInsertRowid}`);

    const realtedValue = JSON.parse(JSON.stringify(result.lastInsertRowid));

    log(indent,`${UID}/${$index}: preparing nested fields`);
    if(nestedFields.length !== 0) {

      nestedFields.forEach((nestedField) => {

        log(indent,`${UID}/${$index}: ${nestedField}`);

        const tblName = capitalize(nestedField);
        const tblExst = tableExists(tblName);
        const childTableName = tblExst.tableName;

        if(!tblExst.found) {
          log(indent,`${UID}/${$index}: ${nestedField} error table ${tblName} does not exist`);
          return;
        }

        const relatedName = getRelatedName(childTableName, newTableName,depth+1);

        if(!relatedName) {
          log(indent,`${UID}/${$index}: ${nestedField} error no FK from ${childTableName} to ${newTableName}`);
          return;
        }

        const subDataArray = item[nestedField];

        log(indent,`${UID}/${$index}: ${nestedField} calling REC_CREATE`);
        recursiveCreateV2(
          childTableName,
          subDataArray,
          relatedName,
          realtedValue,
          null,
          "REC_CREATE",
          depth + 1
        );
        log(indent,`${UID}/${$index}: ${nestedField} returned REC_CREATE`);
      });
    }
  });
  log(indent,`${UID} Exit Complete:`,timeElapsed(start,new Date()));
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
const upsertDeleteHelperV2 = (
  tableName,
  dataArray,
  relatedTableField,
  relatedTableFieldValue,
  caller = null,
  depth = 0,
) => {
  const start = new Date();
  const indent = " ".repeat(depth*4); 
  log(indent,`UPSERT_DEL started`);

  if(!tableName || tableName.toString().trim() == "") {
    log(indent,`UPSERT_DEL error: Invalid Table Name ${tableName}`);
    throw new Error(`${UID}: Invalid Table Name ${tableName}`);
  }

  const tableExist = tableExists(tableName);
  const TABLE_NAME = tableExist.tableName;

  if(!tableExist.found) {
    log(indent,`UPSERT_DEL error: Table '${TABLE_NAME}' does not exist.`);
    throw new Error(`UPSERT_DEL: Table '${TABLE_NAME}' does not exist.`);
  }

  if(!Array.isArray(dataArray)) {
    log(indent,`UPSERT_DEL error: Input data not array or empty.`);
    throw new Error(`UPSERT_DEL: Input data not array or empty.`)
  }

  if(!relatedTableField) {
    log(indent,`UPSERT_DEL error: relatedTableField invalid`);
    throw new Error(`UPSERT_DEL: relatedTableField invalid`)
  }

  if(!relatedTableFieldValue) {
    log(indent,`UPSERT_DEL error: relatedTableFieldValue invalid`);
    throw new Error(`UPSERT_DEL: relatedTableFieldValue invalid`)
  }

  const UID = `UPSERT_DEL/${TABLE_NAME}/${caller}/${dataArray.length}/${relatedTableField}/${relatedTableFieldValue}`;
  log(indent,`${UID} initializing`);

  const TABLE_COLUMNS = getTableColumns(TABLE_NAME);
  const pkColumn = TABLE_COLUMNS.find((col) => col.pk === 1);

  if(!pkColumn) {
    log(indent,`${UID} error:`,`Table ${TABLE_NAME} has no Primary Key Field.`);
    throw new Error(`${UID}: Table ${TABLE_NAME} has no Primary Key Field. `);
  }
  
  const pkColumnName = pkColumn.name;
  const pkKey = pascalToCamel(pkColumnName);

  log(indent,`${UID} filtering`);

  const stmnt1 = `SELECT * FROM ${TABLE_NAME} WHERE ${relatedTableField} = ?;`;
  const existing = db.prepare(stmnt1).all(relatedTableFieldValue);
  const existingIds = existing.map(row => row[pkColumnName]);
  const incomingWithIds = dataArray.filter((p) => ![undefined, null,0].includes(p[pkKey]));
  const incomingWithOutIds = dataArray.filter((p) => [undefined, null,0].includes(p[pkKey]));
  const incomingIds = incomingWithIds.map((item) => item[pkKey]);
  const toBeDelIds = existingIds.filter((p) => !incomingIds.includes(p));

  log(indent,`${UID} counts::`);
  log(indent,`\texisting: ${existingIds.length}, patches : ${incomingIds}`);
  log(indent,`\tdeletes : ${toBeDelIds.length}, inserts: ${incomingWithOutIds.length}`);

  if (toBeDelIds.length > 0) {
    log(indent,`${UID} calling BULK_DEL`);
    const resp = bulkDeletehelper(TABLE_NAME, pkColumnName, toBeDelIds);
    ACTIONS.push(resp);
  }

  if(dataArray.length === 0) {
    log(indent,`${UID} Exit: no incoming`,timeElapsed(start,new Date()));
    return;
  }

  incomingWithIds.forEach((patchData) => {

    log(indent,`${UID} calling PATCH`);
    const { result, nestedFields } = patchHelperV2(
      TABLE_NAME,
      patchData,
      false,
      "UPSERT_DEL",
      depth+1,
    );

    log(indent,`${UID} sub arrays`, nestedFields.length);
    
    const realtedValue = patchData[pkKey];
    log(indent,`${UID} realtedValue`, realtedValue);

    if (nestedFields.length > 0) {
      nestedFields.forEach((nestedFieldName,$index) => {
        const nestedTable = tableExists(capitalize(nestedFieldName));
        const nestedTableName = nestedTable.tableName;

        if(!nestedTable.found) {
          log(indent,`${UID}/${$index} invalid nested patchData ${nestedFieldName}`);
          return;
        }

        const relatedName = getRelatedName(nestedTableName, TABLE_NAME);
        if(!relatedName) {
          log(indent,`${UID}/${$index} no relation from ${nestedTableName} to ${TABLE_NAME}`);
          return;
        }

        log(indent,`${UID}/${$index} calling UPSERT_DEL`);
        upsertDeleteHelperV2(
          nestedTableName,
          patchData[nestedFieldName],
          relatedName,
          realtedValue,
          "UPSERT_DEL",
          depth+1
        );
      });
    }
  });

  if(incomingWithOutIds.length !== 0) {
    log(indent,`${UID} calling REC_CREATE`);
    recursiveCreateV2(
      TABLE_NAME,
      dataArray,
      relatedTableField,
      relatedTableFieldValue,
      null,
      "upsertDeleteHelperV2",
      2
    );
  }

  log(indent,`${UID} Exit Complete:`,timeElapsed(start,new Date()));

};


module.exports = {
    patchHelperV2,
    upsertDeleteHelperV2,
    clearActions,
    getActions
};