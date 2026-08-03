const db = require("../db");
const { toCamelCaseObject, capitalize, pascalToCamel,formatSQLValue } = require("../utils/utlis");

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
      const name = capitalize(key);
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
      const name = capitalize(key);
      querySet.push(`${name} = ?`);
      params.push(req.body[key]); // check how null is converted to sql
    }
  }

  const querySetString = querySet.join(",");
  const query = `UPDATE UserProfile SET ${querySetString} WHERE Id = ?`;

  // till here is fine
};

module.exports = {
  editProfileAndIdVerification,
  editProfileAndIdVerfication_v2,
  getUserById,
  userExists,
  getUserByEmail
};
