const db = require("../db");

const createProfileAndIdVerificationRecord = (
  id,
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
) => {
  const farmerProfileStmnt = db.prepare(`INSERT INTO FarmerProfile (
        UserId,Address,City,State,LandProofPath,
        IdProofType,IdProofpath,UPIId
        ) VALUES (?,?,?,?,?,?,?,?)`);
  farmerProfileStmnt.run(
    id,
    address,
    city,
    state,
    landProofPath,
    idProofType,
    idProofPath,
    upiId,
  );

  const farmerPaymentStmnt = db.prepare(
    `INSERT INTO FarmerPaymentMethod (UserId,PaymentMethod) VALUES (?,?)`,
  );
  paymentMethods.forEach((method) => {
    farmerPaymentStmnt.run(id, method);
  });

  const farmStmnt = db.prepare(
    `INSERT INTO Farm 
        (UserId,FarmName,Address,City,State,TotalCultivableArea,LandUnit,OwnershipProofPath,IsDefault)
        VALUES (?,?,?,?,?,?,?,?)`,
  );
  farmStmnt.run(
    id,
    farmName,
    farmAddress,
    farmCity,
    farmState,
    totalCultivableArea,
    landUnit,
  );

  const farmCropsStmnt = db.prepare(
    `INSERT INTO FarmCropTypes (FarmId,CropTypeId) VALUES (?,?)`,
  );
  crops.forEach((crop) => {
    farmCropsStmnt.run(farmStmnt.lastInsertRowid, crop);
  });

  const userStmnt = db.prepare(`
    UPDATE Users SET 
    IsVerificationFilled = TRUE, UpdateDate = CURRENT_TIMESTAMP 
    WHERE Id = ?`);
  userStmnt.run(id);

  console.log("Profile and verification record created for user id:", id);
};

const updateUser = (id, username, phoneCode, phone) => {
  const stmt = db.prepare(`
    UPDATE Users SET 
    UserName = ?, PhoneCode = ?, Phone = ?, UpdateDate = CURRENT_TIMESTAMP
    WHERE Id = ?`);
  stmt.run(username, phoneCode, phone, id);
  console.log("User updated for user id:", id);
}






module.exports = {
  createProfileAndIdVerificationRecord,
  updateUser,
  getUserProfile,
  updateUserProfile,
  updateFarm,
  deleteFarm,
  addFarmCrops,
  removeFarmCrops,
};


