const db = require("../db");
const { toCamelCaseObject, capitalizeFirstLetter, pascalToCamel,formatSQLValue } = require("../utils/utlis");

const editProfileAndIdVerification = (userId, profileData) => {
  const {
    address,
    city,
    state,
    farmName,
    farmAddress,
    farmCity,
    farmState,
    totalCultivableArea,
    landUnit,
    crops,
    landProofPath,
    idProofType,
    idProofPath,
    paymentMethods,
    upiId,
  } = profileData;

  db.prepare(
    `INSERT INTO FarmerProfile (UserId,Address,City,State,LandProofPath,IdProofType,IdProofpath,UPIId) VALUES (?,?,?,?,?,?,?,?)`,
  ).run(
    userId,
    address,
    city,
    state,
    landProofPath,
    idProofType,
    idProofPath,
    upiId,
  );

  paymentMethods.forEach((method) => {
    db.prepare(
      `INSERT INTO FarmerPaymentMethod (UserId,PaymentMethod) VALUES (?,?)`,
    ).run(userId, method);
  });

  const farmId = db
    .prepare(
      `INSERT INTO Farm (UserId,FarmName,Address,City,State,TotalCultivableArea,LandUnit,OwnershipProofPath,IsDefault) VALUES (?,?,?,?,?,?,?,?)`,
    )
    .run(
      userId,
      farmName,
      farmAddress,
      farmCity,
      farmState,
      totalCultivableArea,
      landUnit,
    ).lastInsertRowid;

  crops.forEach((crop) => {
    db.prepare(
      `INSERT INTO FarmCropTypes (FarmId,CropTypeId) VALUES (?,?)`,
    ).run(farmId, crop);
  });

  db.prepare(
    `UPDATE Users SET IsVerificationFilled = TRUE, UpdateDate = CURRENT_TIMESTAMP WHERE Id = ?`,
  ).run(userId);
};

const editProfileAndIdVerfication_v2 = (userId, profileData) => {
  const {
    firstName,
    lastName,
    dob,
    address,
    city,
    state,
    farmName,
    farmAddress,
    farmCity,
    farmState,
    totalCultivableArea,
    landUnit,
    crops,
    // landProofPath,
    idProofType,
    idProofPath,
    paymentMethods,
    upiId,
  } = profileData;

  const txn = db.transaction(() => {
    db.prepare(
      `INSERT INTO UserProfile (UserId,Address,City,State,IdProofType,IdProofpath,UPIId) VALUES (?,?,?,?,?,?,?)`,
    ).run(userId, address, city, state, idProofType, idProofPath, upiId);

    paymentMethods?.forEach((method) => {
      db.prepare(
        `INSERT INTO FarmerPaymentMethod (UserId,PaymentMethod) VALUES (?,?)`,
      ).run(userId, method);
    });

    let farmId;
    if (farmName) {
      farmId = db
        .prepare(
          `INSERT INTO Farm (UserId,FarmName,Address,City,State,TotalCultivableArea,LandUnit,OwnershipProofPath,IsDefault) VALUES (?,?,?,?,?,?,?,?)`,
        )
        .run(
          userId,
          farmName,
          farmAddress,
          farmCity,
          farmState,
          totalCultivableArea,
          landUnit,
          true,
        ).lastInsertRowid;
    }

    crops?.forEach((crop) => {
      db.prepare(
        `INSERT INTO FarmCropTypes (FarmId,CropTypeId) VALUES (?,?)`,
      ).run(farmId, crop);
    });

    db.prepare(
      `UPDATE Users SET FirstName = ?, LastName = ?,DateOfBirth = ?, IsVerificationFilled = 1, UpdateDate = CURRENT_TIMESTAMP WHERE Id = ?`,
    ).run(firstName, lastName, dob, userId);

    // throw new Error("__ROLLBACK__"); // force rollback
  });

  txn();
};

const getUserById = (userId) => {
  const stmnt = db.prepare(`SELECT * FROM Users WHERE Id = ?`);
  const user = stmnt.get(userId);

  if (!user) {
    return null;
  }

  return toCamelCaseObject(user);
};

const userExists = (userId) => {
  const user = db
    .prepare(`SELECT Count(*) as count FROM Users WHERE Id = ?`)
    .get(userId);
  return user.count === 1;
};

const getUserByEmail = (email) => {
  const stmnt = db.prepare(`SELECT * FROM Users WHERE Email = ?`);
  const user = stmnt.get(email);

  if (!user) {
    return null;
  }

  return toCamelCaseObject(user);
};

const userPatch = (userId, data) => {
  const id = Number(userId);
  const stmnt = db.prepare(`SELECT * FROM Users WHERE Id = ?`);
  const user = toCamelCaseObject(stmnt.get(id));

  if (!user) {
    throw new Error("__USER_NOT_FOUND_404__");
  }

  const allowedFields = [
    "userName",
    "firstName",
    "lastName",
    "phoneCode",
    "phone",
    "dateOfBirth",
    "isAdminVerified",
    "isActive",
    "isAdmin",
    "isBanned",
  ];

  const querySet = [];
  const params = [];

  for (const key of allowedFields) {
    if (key in req.body) {
      const name = capitalizeFirstLetter(key);
      querySet.push(`${name} = ?`);
      params.push(req.body[key]); // check how null is converted to sql
    }
  }

  const querySetString = querySet.join(",");
  const query = `UPDATE Users SET ${querySetString} WHERE Id = ?`;
  db.prepare(query).run(...params, id);
};

const profilePatch = (profileId, data) => {
  // working
  const id = Number(profileId);
  const stmnt = db.prepare(`SELECT * FROM UserProfile WHERE Id = ?`);
  const profile = toCamelCaseObject(stmnt.get(id));

  if (!profile) {
    throw new Error("__PROFILE_NOT_FOUND_404__");
  }

  const allowedFields = [
    address,
    city,
    state,
    idProofType,
    idProofPath,
    idProofExtension,
    idProofFileName,
    displayPicturePath,
    uPIId,
  ];

  const querySet = [];
  const params = [];

  for (const key of allowedFields) {
    if (key in req.body) {
      const name = capitalizeFirstLetter(key);
      querySet.push(`${name} = ?`);
      params.push(req.body[key]); // check how null is converted to sql
    }
  }

  const querySetString = querySet.join(",");
  const query = `UPDATE UserProfile SET ${querySetString} WHERE Id = ?`;

  // till here is fine
};



/**New Stuff Starts here */

const deleteHelper = (tableName,pkKey,pkValue) => {
  /**
   * tableName - Pascal case
   * pkKey - Pascal case
   * pkValue - Any
   */
  db.prepare(`DELETE FROM ${tableName} WHERE ${capitalizeFirstLetter(pkKey)} = ${pkValue}`);
};

const getFKReftoTargetTable = (target) => {
  const result = db.prepare(`
    SELECT name FROM sqlite_schema WHERE type = 'table' AND sql LIKE '%REFERENCES ${target}%';
  `);
  return result;
}

const getRelatedName = (tableName,fkToTableName) => {
  console.log(" get related name",tableName,fkToTableName)
  const result = db.prepare(`PRAGMA foreign_key_list('${tableName}')`)
    .all()
    .find(p => p.table === fkToTableName);
  return result && result["from"] ? result["from"] : null;
  
};

const getTableColumns = (tableName) => {
  return db.prepare(`pragma table_info(${tableName})`).all();
};

const tableExistsQurey = (tblName) => {
  const q = db.prepare(`SELECT COUNT(*) from sqlite_master WHERE name = '${tblName}'`).get();
  const value = q["COUNT(*)"];
  return value;
}

const tableExistsInDb = (tableName) => {
  let value = tableExistsQurey(tableName);
  let newTableName = '';
  console.log("###########################################################")
  if(value === 0) {
    if(tableName.slice(-2,tableName.length).toLowerCase() === 'es') {
      newTableName = tableName.slice(0,-2);
      console.log(1,newTableName)
    } else if(tableName[tableName.length-1].toLowerCase() === 's') {
      newTableName = tableName.slice(0,-1);
      console.log(2,newTableName)
    } else {
      newTableName = tableName+'s';
      console.log(3,newTableName)
    }
    value = tableExistsQurey(newTableName);
    if(value === 1) {
      return {found: value && value > 0 ? true : false, tableName: newTableName};
    }
  }

  return {found: value && value > 0 ? true : false, tableName: tableName};
};

var Actions = [];
/**
   * tableName - Pascal Case
   * dataArray - Array of object corresponding to table in tableName
   * relatedTableFieldName - Pascal Case -is the foreing key field of this tableName , which holds the link to the parent/ related tables
   * relatedTableFieldValue - raw - can be any valid pk value
   * 
   * Action: 
   * Recustively creates each object of the data array in teh tables.
   */
const recursiveCreate = (tableName,dataArray,relatedTableFieldName,relatedTableFieldValue, caller = null) => {
  

  let RCId = `RC/${caller}/${tableName}/${dataArray.length}/${relatedTableFieldName}/${relatedTableFieldValue}: `;
  if(caller) {
    RCId = '    '+RCId;
    if(caller === 'recursiveCreate') {
    RCId = '    '+RCId;
    }
  }
  console.log("Enter RC, from ", caller,"Code", RCId );

  const TABLE_COLUMNS = getTableColumns(tableName);
  const PK = TABLE_COLUMNS.find(p => p["pk"] === 1).name;
  const pkKey = pascalToCamel(PK);
  console.log(`${RCId} 1 pkKey`,pkKey)
  const toBeCreated = dataArray.filter((item) => !item[pkKey]);
  console.log(`${RCId} 2 toBeCreated`,toBeCreated.length)
  const tableHasCreatedDateCol = TABLE_COLUMNS.map(p => p.name).find(p => p==='CreatedDate') || false;
  console.log(`${RCId} 2.1 tableHasCreatedDateCol`,tableHasCreatedDateCol.length)


  console.log(`${RCId} 3 toBeCreated[0]`,toBeCreated[0])
  if(toBeCreated.length < 1) {
    console.log(`${RCId} 3.1 Exit RC, To`, caller,"Reason: Nothing to Create");
    return;
  }
  let columnNames = Object.keys(toBeCreated[0])
    .filter(p => p !== pkKey || !Array.isArray(toBeCreated[0][p]))
    .map(p => capitalizeFirstLetter(p));
  // columnNames.push(relatedTableFieldName);
  console.log(`${RCId} 4 columnNames`,columnNames)

  // nestedTableNames is the nested tables in each item element of Data Array, assuming they are consistent (Pascal Case)
  let nestedTableNames = Object.keys(toBeCreated[0])
    .filter(p => p !== pkKey)
    .filter(p => Array.isArray(toBeCreated[0][p]))
    .map(p => capitalizeFirstLetter(p));
  console.log(`${RCId} 5 nestedTableNames`,nestedTableNames)

  const tableColumns = db.prepare(`SELECT name FROM pragma_table_info('${tableName}')`).all();
  console.log(`${RCId} 6 tableColumns`,tableColumns)
  const tableColumnNames = tableColumns.map(p => p.name);
  
  const excludeColumns = ['CreatedUser','UpdatedUser','CreatedDate','UpdatedDate'];
  // filter out incoming clumn names that are actually existing
  columnNames = columnNames.filter(p => tableColumnNames.includes(p) && !excludeColumns.includes(p) && p !== relatedTableFieldName); 
  console.log(`${RCId} 7 tableColumnNames`,tableColumnNames)
  console.log(`${RCId} 7.1 columnNames`,columnNames)
  columnNames.push(relatedTableFieldName);
  console.log(`${RCId} 8 columnNames`,columnNames)

  console.log(`${RCId} 8.1 tableHasCreatedDateCol`,tableHasCreatedDateCol)
  if(tableHasCreatedDateCol) {
    console.log(`8.2 pushed`)
    columnNames.push('CreatedDate')
  }



  toBeCreated.forEach((item) => {
    const valueList = columnNames.filter(p=> !excludeColumns.includes(p)).filter(p => p !== relatedTableFieldName).map(columnName => item[pascalToCamel(columnName)]);
    console.log(`${RCId} 9.0 valueList`,valueList)
    console.log(`${RCId} 9.0.1 tableHasCreatedDateCol`,tableHasCreatedDateCol)

    valueList.push(relatedTableFieldValue);
    console.log(`${RCId} 9.0.2  relatedTableFieldName pushed`)

    
    if(tableHasCreatedDateCol) {
      console.log(`${RCId} 9.0.3 pushed`)
      valueList.push('CURRENT_TIMESTAMP');
    }
    console.log(`${RCId} 9.1 valueList`,valueList)
    const placeHolders = valueList.map(p => '?').join(',');
    console.log(`${RCId} 9.1 placeHolders`,placeHolders)

    console.log(`${RCId} 9.2 INSERT INTO ${tableName} (${columnNames.join(',')}) VALUES (${placeHolders})`)
    let result = db
      .prepare(`INSERT INTO ${tableName} (${columnNames.join(',')}) VALUES (${placeHolders})`)
      .run(...valueList);

    Actions.push(`INSERT INTO ${tableName} (${columnNames.join(',')}) VALUES (${placeHolders}); ${JSON.stringify(valueList)} - ID: ${result.lastInsertRowid}`);
    
    console.log(`${RCId} 9.3 result`,result)
    const realtedValue = JSON.parse(JSON.stringify(result.lastInsertRowid))
    console.log(`${RCId} 9.4 lastInsertRowid realtedValue`,realtedValue)

    if(nestedTableNames.length > 0) {
      nestedTableNames.forEach((nestedTableName) => {
        const nestedTableNameOg = pascalToCamel(nestedTableName);
        console.log(`${RCId} 9.4.0 nestedTableName,tableName`,nestedTableName,tableName)
        const relatedName = getRelatedName(nestedTableName,tableName);
        console.log(`${RCId} 9.4.1 relatedName`,relatedName)

        item[nestedTableNameOg] = item[nestedTableNameOg]
        .map(x => ({
          ...x,
          [relatedName]: realtedValue
        }));
        console.log(`${RCId} 9.4.2 item[nestedTableNameOg]`,item[nestedTableNameOg].length)

        console.log(`${RCId} 9.4.3 called RC , hand Over: RC/${tableName}/${dataArray.length}/${relatedTableFieldName}/${relatedTableFieldValue}`);
        recursiveCreate(nestedTableName,item[nestedTableNameOg],relatedName,realtedValue,"recursiveCreate"); 
        console.log(`${RCId} 9.4.4 returned From RC`);
      });
    }
    
  });
  console.log(`${RCId} 10 Exit RC, To`, caller,"Reason: Completed");

}

/**
   * tableName : PascalCase
   * data : object corresponding to table in tableName
   * hasUpdateTimesStamp : boolean
   * updateUser : number ! null
   * 
   * Action:
   * patches an object, returns new created object and nested fields that were in the object
   */
const patchHelper = (tableName,data,hasUpdateTimesStamp = true,updateUser = null,caller = null) => {
  let PHId = `PH/${tableName}/${caller}: `;
  if(caller) {
    PHId = '    '+PHId;
    if(caller === 'patchHelper') {
    PHId = '    '+PHId;
    }
  }
  
  console.log(`Enter PH, from `, caller,"Code", PHId );

  const TABLE_COLUMNS = getTableColumns(tableName);
  const pk = TABLE_COLUMNS.find(p => p.pk === 1).name; // pk - Pascal case
  console.log(`${PHId} 1 pk`,pk);
  const excludeColumns = ['CreatedUser','UpdatedUser','CreatedDate','UpdatedDate'];
  const table_col_names = TABLE_COLUMNS.map(p => p.name ) 
    .filter(p => !excludeColumns.includes(p)); // table_col_names - Pascal Case
  console.log(`${PHId} 2 table_col_names`,table_col_names);

  const hasUpdateDate = TABLE_COLUMNS.map(p => p.name ).find(p => p==='UpdatedDate') || null;

  console.log(`${PHId} 3 tableName Has Update date`,hasUpdateDate);
  const updatableFieldsInData = Object.keys(data) 
    .filter(p => p !== pascalToCamel(pk)) // good // camel case
    .filter(p => table_col_names.includes(capitalizeFirstLetter(p))); // camelCase
  console.log(`${PHId} 4 updatableFieldsInData`,updatableFieldsInData);

  const directUpdatableFields = updatableFieldsInData.filter(fieldName => !Array.isArray(data[fieldName])); // camelCase
  console.log(`${PHId} 5 directUpdatableFields`,directUpdatableFields)

  const nestedFeilds = Object.keys(data)
    .filter(p => p !== pascalToCamel(pk))
    // cos it has for existng colum names only - nested fiedls are related columns
    .filter(p => !updatableFieldsInData.includes(p)) 
    .filter(p => Array.isArray(data[p])); // camelCase

  let setStr = directUpdatableFields
    .map(p => capitalizeFirstLetter(p))
    .join(' = ?, ') + ' = ?';
  console.log(`${PHId} 6 setStr`,setStr)

  const value_list = directUpdatableFields.map(fieldName => data[fieldName]);
  value_list.push(data[pascalToCamel(pk)]);

  console.log(`${PHId} 7 value_list`,value_list)

  if(hasUpdateTimesStamp && hasUpdateDate) {
    setStr = setStr + ' ,UpdatedDate = CURRENT_TIMESTAMP';
    console.log(`${PHId} 7.1 setStr`,setStr)
  } 
  if(updateUser) {
    setStr = setStr + ' ,UpdatedUser = ?';
    value_list.push(updateUser);
    console.log(`${PHId} 7.2 setStr`,setStr,'pushed to value list:', updateUser)
  }
  
  console.log(`${PHId} 8 UPDATE ${tableName} SET ${setStr} WHERE ${pk} = ?`)
  console.log(`${PHId} 9 ...value_list`,...value_list)
  const result = db.prepare(`UPDATE ${tableName} SET ${setStr} WHERE ${pk} = ?`).run(...value_list);

  Actions.push(`UPDATE ${tableName} SET ${setStr} WHERE ${pk} = ? : ${JSON.stringify(value_list)}`);

  console.log(`${PHId} 10 Exit PH, To`, caller,"Reason: Completed");
  return { result, nestedFeilds, pk }
};

/*** 
   * tableName is PascalCase
   * dataArray is array of objects to be upsert and deleted 
   * relatedField -Pascal Case -is the foreing key field of this tableName , which holds the link to the parent/ related tables
   * relatedTableFieldValue - raw , could be any type whihc is suitable for primary key
   * 
   * Action:
   * updates/patch already existing and
   * create/insert new ones, without their primary key
   * deletes ones missing
   */
const upsertDeleteHelper = (tableName,dataArray,relatedTableField,relatedTableFieldValue,caller=null) => {
  let UDHId = `UDH/${caller}/${tableName}/${dataArray.length}/${relatedTableField}/${relatedTableFieldValue}/: `;
  if(caller) {
    UDHId = '    '+UDHId;
    if(caller === 'upsertDeleteHelper') {
    UDHId = '    '+UDHId;
    }
  }

  console.log(`Enter UDH, from `,caller,"Code", UDHId );

  const tableExistsResp = tableExistsInDb(tableName);
  console.log(`${UDHId} 1 tableExistsResp`,tableExistsResp)

  tableName = tableExistsResp.tableName;
  if(!tableExistsResp.found) {
    console.log(`${UDHId} 1.1 Exit UDH, To`, caller,"Reason: Incoming null/empty/not array");
    return;
  }

  const TABLE_COLUMNS = getTableColumns(tableName);
  const PK = TABLE_COLUMNS.find(p => p["pk"] === 1).name;
  const pkKey = pascalToCamel(PK);
  console.log(`${UDHId} 2 pkKey`,pkKey)

  const incoming = dataArray && Array.isArray(dataArray) ? dataArray : [];
  console.log(`${UDHId} 3 incoming`,incoming.length)

  if(incoming.length < 1) {
    // need to chceck for delete
    console.log(`${UDHId} 3.1 SELECT * FROM ${tableName} WHERE ${relatedTableField} = ?;`,relatedTableFieldValue)
    const existing = toCamelCaseObject(db
      .prepare(`SELECT * FROM ${tableName} WHERE ${relatedTableField} = ?;`)
      .all(relatedTableFieldValue)
    );
    console.log(`${UDHId} 3.2 existing`,existing.length)
    const toBeDelIds = existing.map((item) => item[pkKey]);
    console.log(`${UDHId} 3.3 toBeDelIds`,toBeDelIds)
    console.log(`${UDHId} 3.4 Exit UDH, To`, caller,"Reason: Incoming null/empty/not array");
    return;
  }

  console.log(`${UDHId} 4 SELECT * FROM ${tableName} WHERE ${relatedTableField} = ?;`,relatedTableFieldValue)
  const existing = toCamelCaseObject(db
    .prepare(`SELECT * FROM ${tableName} WHERE ${relatedTableField} = ?;`)
    .all(relatedTableFieldValue)
  );
  console.log(`${UDHId} 5 existing`,existing)
  const incomingWithId = incoming.filter((p) => ![undefined, null, 0].includes(p[pkKey]));
  console.log(`${UDHId} 6 incomingWithId`,incomingWithId.length)

  const incomingIds = incomingWithId.map((item) => item[pkKey]);
  console.log(`${UDHId} 7 incomingIds`,incomingIds)
  const toBeDelIds = existing.filter((p) => !incomingIds.includes(p[pkKey])).map((item) => item[pkKey]);
  console.log(`${UDHId} 8 toBeDelIds`,toBeDelIds)

  if(toBeDelIds.length > 0) {
    console.log(`${UDHId} 9 calling bulkDeletehelper:`,tableName,pkKey,toBeDelIds)
    bulkDeletehelper(tableName,pkKey,toBeDelIds);
    console.log(`${UDHId} 10 back from bulkDeletehelper:`,tableName,pkKey,toBeDelIds)
  }

  const tobePatched = incoming.filter((item) => item[pkKey]);
  console.log(`${UDHId} 11 tobePatched`,tobePatched)
  
  tobePatched.forEach((field) => { // feild is object not names
    console.log(`${UDHId} 12.1 calling patchHelper`,tableName,field)

    // this table Name's PK
    const { result, nestedFeilds,pk } = patchHelper(tableName,field,true,null,"upsertDeleteHelper");
    console.log(`${UDHId} 12.2 back from patchHelper`,result)
    console.log(`${UDHId} 12.3 nestedFeilds`,nestedFeilds.length)
    
    const realtedValue = JSON.parse(JSON.stringify(field[pascalToCamel(pk)])) // wrong
    console.log(`${UDHId} 12.4 lastInsertRowid/realtedValue`,realtedValue)
    if(nestedFeilds.length > 0) {
      nestedFeilds.forEach(nestedField => { 
        const nestedTablesName = capitalizeFirstLetter(nestedField)
        console.log(`${UDHId} 12.4.1 nestedTablesName`,nestedTablesName)

        const relatedName = getRelatedName(nestedField,tableName);
        console.log(`${UDHId} 12.4.2 relatedName`,relatedName)
        if(relatedName) {
          console.log(`${UDHId} 12.4.2.1 calling upsertDeleteHelper:`,capitalizeFirstLetter(nestedTablesName),nestedField.length,relatedName,realtedValue);
          upsertDeleteHelper(capitalizeFirstLetter(nestedTablesName),field[nestedField],relatedName,realtedValue,"upsertDeleteHelper");
          console.log(`${UDHId} 12.4.2.2 back from upsertDeleteHelper:`);
        }
      });
    }
    
  });

  console.log(`${UDHId} 13 calling recursiveCreate`,tableName,incoming.length)
  recursiveCreate(tableName,incoming,relatedTableField,relatedTableFieldValue,'upsertDeleteHelper'); // it will take care of the filtering
  console.log(`${UDHId} 14 back from recursive create`);

  console.log(`${UDHId} 15 Exit UDH, To`, caller,"Reason: Completed");


};


/** 
 * - Type check
 *  1.recursiveCreate - Done
 *  2. upsertDeleteHelper - Done
 *  3. patchhelper - Done
 * - Arguments consitency chek
 *  1.recursiveCreate - done
 *  2. upsertDeleteHelper - Done
 *  3. patchhelper - Done
 * 
 * 
 * - format sql make sure its good
 * 
 * 
 * - move db helpers to another files
 */

// const insertOrDeleteHelper = (
//   key,
//   data,
//   tableName,
//   relatedTableField,
//   relatedTableFieldValue,
//   creationFieldName,
//   creationFieldKey,
// ) => {
//   const incoming = data[key] && Array.isArray(data[key]) ? data[key] : [];
//   const existing = toCamelCaseObject(
//     db
//       .prepare(`SELECT * FROM ${tableName} WHERE ${relatedTableField} = ?;`)
//       .all(relatedTableFieldValue),
//   );
//   const toBeCreated = incoming.filter((item) => !item.id);
//   const tuples = toBeCreated
//     .map(
//       (item) =>
//         `(${relatedTableFieldValue},${item[creationFieldKey]})`,
//     )
//     .join(",");
//   console.log(tuples);
//   db.prepare(
//     `INSERT INTO ${tableName} (${relatedTableField}, ${creationFieldName}) VALUES ${tuples}`,
//   ).run();

//   const incomingWithId = incoming.filter((p) => ![undefined, null, 0].includes(p.id));
//   const toBeDelIds = existing.filter((p) => !incomingWithId.includes(p.id)).map((item) => item.id);
//   if(toBeDelIds.length > 0) {
//     db.prepare(`DELETE FROM ${tableName} WHERE Id IN (${toBeDelIds})`).run();
//   }
// };

const bulkDeletehelper = (tableName,pkKey,toBeDelIds) => {
  db.prepare(`DELETE FROM ${tableName} WHERE ${pkKey} IN (${toBeDelIds.join(',')})`).run();
  Actions.push(`DELETE FROM ${tableName} WHERE ${pkKey} IN (${toBeDelIds.join(',')})`)
};

const clearActions = () => {
  Actions = [];
}

const getActions = () => {
  return JSON.parse(JSON.stringify(Actions));
}



module.exports = {
  editProfileAndIdVerification,
  editProfileAndIdVerfication_v2,
  getUserById,
  userExists,
  getUserByEmail,getRelatedName,getTableColumns,
  patchHelper,upsertDeleteHelper,tableExistsInDb,
  clearActions,getActions
};
