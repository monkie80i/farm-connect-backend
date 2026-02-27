const userService = require("../services/user.service");
const authService = require("../services/auth.services");
const db = require("../db");
const { toCamelCaseObject,formatSQLValue } = require("../utils/utlis");
const utils = require("../utils/utlis");
const { successResponse, errorResponse, notFound} = require("../responses/api.responses");


const editProfileAndIdVerfication = (req, res) => {
  // tested working
  try {
    const id = Number(req.params.userId);
    const user = authService.getUserByUserId(id);
    if (user) {
      userService.editProfileAndIdVerification(id, req.body);
      res.status(200).json({ message: "success", data: null });
    } else {
      res.status(404).json({ message: "User Not Found", data: null });
    }
  } catch (error) {
    console.log("user/:id", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const getUserDetails = (req, res) => {
  // tested working
  try {
    const id = Number(req.params.userId);
    console.log("Fetching details for user id:", id);
    const user = authService.getUserByUserId(id);
    console.log("User details retrieved:", user);
    if (user) {
      const data = utils.toCamelCaseObject(user);
      res.status(200).json({ message: "success", data: data });
    } else {
      res.status(404).json({ message: "Not Found", data: null });
    }
  } catch (error) {
    console.log("user/:id", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const getUserProfileDetails = (req, res) => {
  // tested with postman, working fine
  try {
    const userId = Number(req.params.userId);
    
    const user = userService.getUserById(userId);
    if(!user) {
      res.status(404).json({ message: "User Not Found!", data: null })
      return;
    }

    const role = user.role;

    const stmnt = db.prepare(`SELECT * FROM UserProfile WHERE UserId = ?`);
    const profileDetails = stmnt.get(userId);
    profileDetails.farms = [];
    profileDetails.addresses = [];
    profileDetails.paymentMethods = [];

    if (role === "FARMER") {
      const paymentStmnt = db.prepare(
        `SELECT * FROM UserPaymentMethod WHERE UserId = ?`,
      );

      profileDetails.paymentMethods = paymentStmnt.all(userId);

      const farmStmnt = db.prepare(`SELECT * FROM Farm WHERE UserId = ?`);
      profileDetails.farms = farmStmnt.all(userId);

      for (let index = 0; index < profileDetails.farms.length; index++) {
        const farmId = profileDetails.farms[index].Id;
        const cropTypeStmnt = db.prepare(
          `SELECT * FROM FarmCropTypes WHERE FarmId = ?`,
        );
        profileDetails.farms[index].cropTypes = cropTypeStmnt.all(farmId);
      }
    } else if (role === "BUYER") {
      const buyerAdressStmtn = db.prepare(
        `SELECT * FROM BuyerAddress WHERE UserId = ?`,
      );
      profileDetails.addresses = buyerAdressStmtn.all(userId);
    }

    const data = toCamelCaseObject(profileDetails);
    res.status(200).json({ message: "success", data: data });

  } catch (error) {
    console.log("getUserProfileDetails", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const editUserDetails = (req,res) => {
  // tested with postman, working fine
  try {
    const { 
      username,phoneCode,phone,
    } = req.body;
    const id = Number(req.params.userId);

    const stmnt = db.prepare(`SELECT * FROM Users WHERE Id = ?`);
    const user = toCamelCaseObject(stmnt.get(id));

    if(!user) {
      res.status(404).json({ message: "User Not Found!", data: null })
      return;
    }

    if(user.userName !== username) {
      const usernameStmnt = db.prepare(`SELECT 1 FROM Users WHERE Username = ?`);
      const usernameEsixts = usernameStmnt.get(username);

      if(usernameEsixts) {
        res.status(409).json({ message: "Username already exists.", data: null })
        return;
      }
    }

    let resetPhoneVerified = false;

    if(!user.phoneCode || !user.phone) {
      resetPhoneVerified = true;
    }

    let updateStmntStr = `UPDATE Users SET Username = ?`;

    if(phoneCode !== user.phoneCode || phone !== user.phone) {
      updateStmntStr += `, PhoneCode = ? , Phone = ? , IsPhoneVerified = ?`
    }

    updateStmntStr += ` where Id = ?`;

    const updateStmnt = db.prepare(updateStmntStr);

    if(phoneCode !== user.phoneCode || phone !== user.phone) {
      updateStmnt.run(username,phoneCode,phone, resetPhoneVerified ? 0 : user.isPhoneVerified, id);
    } else { 
      updateStmnt.run(username, id);
    }

    res.status(200).json({ message: "Success", data: null });
  
  } catch (error) {
    console.log("editUserDetails", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const editProfileDetails = (req,res) => {
  try {
    const userId = Number(req.params.userId);
    const incomingData = req.body;
    const user = userService.getUserById(userId);

    if(!user) {
      res.status(404).json({ message: "User Not Found!", data: null })
      return;
    }

    const role = user.role;
    const stmnt = db.prepare(`SELECT * FROM UserProfile WHERE UserId = ?`);
    const profileDetails = stmnt.get(userId);

    if(!profileDetails) {
      res.status(404).json({ message: "Profile Not Found!", data: null })
      return;
    }

    const {
      id,
      displayPicturePath,
      address,
      city,
      state,
      idProofType,
      idProofPath,
      idProofExtension,
      uPIId,
    } = incomingData;

    let query = `
      BEGIN;
      UPDATE UserProfile SET 
        DisplayPicturePath = ${formatSQLValue(displayPicturePath)}, Address = ${formatSQLValue(address)},
        City = ${formatSQLValue(city)}, State = ${formatSQLValue(state)}, IdProofType = ${formatSQLValue(idProofType)},
        IdProofPath = ${formatSQLValue(idProofPath)}, IdProofExtension = ${formatSQLValue(idProofExtension)},
        UPIId = ${formatSQLValue(uPIId)}, UpdatedUser = ${userId}, UpdatedDate = CURRENT_TIMESTAMP
      WHERE Id = ${id};
    `;


    if(role === "FARMER") {
      const incomingFarms = incomingData.farms && Array.isArray(incomingData.farms) ? incomingData.farms : [];
      const existingFarms = toCamelCaseObject(db.prepare(`SELECT * FROM Farm WHERE UserId = ?;`).all(userId));
      console.log("existing farms", existingFarms);

      const farmsToBeCreated = incomingFarms.filter(farm => !farm.id );
      const farmsToBeUpdated = incomingFarms.filter(farm => farm.id );
      const farmsToBeDeleted = existingFarms.filter((existingFarm) => {
        // exiting farm not in to be updated
        const exists = farmsToBeUpdated.filter(farm => farm.id === existingFarm.id ).length > 0;
        return !exists;
      });

      const farmsToBeDeletedId = farmsToBeDeleted.map(farm => farm.id);

      // Insert each farm individually so we can capture its ID for crop types
      farmsToBeCreated.forEach(farm => {
        query = query + `
          INSERT INTO Farm (
            UserId,Name,Address,City,State,Latitude,Longitude,
            TotalCultivableArea,OwnershipProofPath,IsDefault,CreatedDate
          ) VALUES (
            ${userId},${formatSQLValue(farm.name)},${formatSQLValue(farm.address)},${formatSQLValue(farm.city)},${formatSQLValue(farm.state)},
            ${farm.latitude},${farm.longitude},${farm.totalCultivableArea},
            ${formatSQLValue(farm.ownershipProofPath)},${farm.isDefault || 0},CURRENT_TIMESTAMP
          );
        `;

        // Use last_insert_rowid() directly in SQL for FarmCropTypes insert
        if (farm.cropTypes && farm.cropTypes.length > 0) {
          query = query + `
            INSERT INTO FarmCropTypes (FarmId, CropTypeId) VALUES
          `;

          farm.cropTypes.forEach(cropType => {
            query = query + `(last_insert_rowid(),${cropType.cropTypeId}),`
          });

          query = query.slice(0,-1) + ";";
        }
      });

      farmsToBeUpdated.forEach(farm => {
        query = query + `
          UPDATE Farm SET 
            Name = ${formatSQLValue(farm.name)}, Address = ${formatSQLValue(farm.address)},
            City = ${formatSQLValue(farm.city)}, State = ${formatSQLValue(farm.state)}, Latitude = ${farm.latitude},
            Longitude = ${farm.longitude}, TotalCultivableArea = ${farm.totalCultivableArea},
            OwnershipProofPath = ${formatSQLValue(farm.ownershipProofPath)}, IsDefault = ${farm.isDefault},
            UpdatedDate = CURRENT_TIMESTAMP
          WHERE Id = ${farm.id};
        `;

        const existingCropTypes = toCamelCaseObject(db.prepare(`SELECT * FROM FarmCropTypes WHERE FarmId = ?;`).all(farm.id));
        
        const cropTypesToBeCreated = farm.cropTypes.filter(cropType => !cropType.id );
        const cropTypesToBeDeleted = existingCropTypes.filter((existingCropType) => {
          // crop types that exists in existingCropTypes but not in incoming crop types
          const exists = farm.cropTypes.filter(cropType => cropType.id === existingCropType.id ).length > 0;
          return !exists;
        });

        cropTypesToBeDeleted.forEach(cropType => {
          query = query + `
            DELETE FROM FarmCropTypes WHERE Id = ${cropType.id};
          `;
        });

        cropTypesToBeCreated.forEach(cropType => {
          query = query + `
            INSERT INTO FarmCropTypes (FarmId, CropTypeId) VALUES
            (
              ${farm.id},${cropType.cropTypeId}
          `;
        });
      });

      farmsToBeDeletedId.forEach(farmId => {
        query = query + `
          DELETE FROM Farm WHERE Id = ${farmId};
        `;

        // deltete crop types related to farm
        query = query + `
          DELETE FROM FarmCropTypes WHERE FarmId = ${farmId};
        `; 
      });

      // payment methods
      const incomingPaymentMethods = incomingData.paymentMethods && Array.isArray(incomingData.paymentMethods) ? incomingData.paymentMethods : [];
      const existingPaymentMethods = toCamelCaseObject(db.prepare(`SELECT * FROM UserPaymentMethod WHERE UserId = ?;`).all(userId));
      console.log("existing payment methods", existingPaymentMethods);

      const paymentMethodsToBeCreated = incomingPaymentMethods.filter(paymentMethod => !paymentMethod.id );
      const paymentMethodsToBeDeleted = existingPaymentMethods.filter((existingPaymentMethod) => {
        // exiting payment method not in to be updated
        const exists = incomingPaymentMethods.filter(paymentMethod => paymentMethod.id === existingPaymentMethod.id ).length > 0;
        return !exists;
      });

      const paymentMethodsToBeDeletedId = paymentMethodsToBeDeleted.map(paymentMethod => paymentMethod.id);

      paymentMethodsToBeCreated.forEach(paymentMethod => {
        query = query + `
          INSERT INTO UserPaymentMethod (UserId, PaymentMethod) VALUES
          (
            ${userId},${formatSQLValue(paymentMethod.paymentMethod)}
          );
        `;
      });

      paymentMethodsToBeDeletedId.forEach(paymentMethodId => {
        query = query + `
          DELETE FROM UserPaymentMethod WHERE Id = ${paymentMethodId};
        `;
      });

     


    } else if (role === "BUYER") {
      const incomingAddresses = incomingData.addresses && Array.isArray(incomingData.addresses) ? incomingData.addresses : [];
      const existingAddresses = toCamelCaseObject(db.prepare(`SELECT * FROM BuyerAddress WHERE UserId = ?;`).all(userId));
      console.log("existing addresses", existingAddresses);

      const addressesToBeCreated = incomingAddresses.filter(address => !address.id );
      const addressesToBeUpdated = incomingAddresses.filter(address => address.id );
      const addressesToBeDeleted = existingAddresses.filter((existingAddress) => {
        // exiting address not in to be updated
        const exists = addressesToBeUpdated.filter(address => address.id === existingAddress.id ).length > 0;
        return !exists;
      });

      const addressesToBeDeletedId = addressesToBeDeleted.map(address => address.id);

      addressesToBeCreated.forEach(buyerAddress => {
        query = query + `
          INSERT INTO BuyerAddress (UserId, Address, City, State, CreatedDate) VALUES
          (
            ${userId},${formatSQLValue(buyerAddress.address)},${formatSQLValue(buyerAddress.city)},${formatSQLValue(buyerAddress.state)},CURRENT_TIMESTAMP
          );
        `;
      });

      addressesToBeUpdated.forEach(buyerAddress => {
        query = query + `
            UPDATE BuyerAddress SET 
              Address = ${formatSQLValue(buyerAddress.address)}, City = ${formatSQLValue(buyerAddress.city)}, State = ${formatSQLValue(buyerAddress.state)},
              UpdatedDate = CURRENT_TIMESTAMP
            WHERE Id = ${buyerAddress.id}; 
          `;

      });

      addressesToBeDeletedId.forEach(addressId => {
        query = query + `
          DELETE FROM BuyerAddress WHERE Id = ${addressId};
        `;
      });
    }

     // execute the query
      query = query + `COMMIT;`;
      console.log("final query", query);
      db.exec(query);

      res.status(200).json({ message: "Success", data: null });
    
  } catch (error) {
    console.log("editProfileDetails", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }

  
  
};

const getAllUserNegotiations = (req,res) => {
  try {
    const userId = Number(req.params.userId);
    const user = userService.getUserById(userId);

    if(!user) {
      res.status(404).json({ message: "User Not Found!", data: null })
      return;
    }

    const role = user.role;

    let negotiations = [];

    if(role === "FARMER") {
      negotiations = toCamelCaseObject(db.prepare(`
        SELECT n.*, b.Name as buyerName FROM Negotiation n
        JOIN Users b ON n.BuyerId = b.Id
        WHERE n.FarmerId = ?;
      `).all(userId));
    } else if(role === "BUYER") {
      negotiations = toCamelCaseObject(db.prepare(`
        SELECT n.*, f.Name as farmerName FROM Negotiation n
        JOIN Users f ON n.FarmerId = f.Id
        WHERE n.BuyerId = ?;
      `).all(userId));
    }

    res.status(200).json({ message: "Success", data: negotiations });

  } catch (error) {
    console.log("getAllUserNegotiations", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};


module.exports = {
  editProfileAndIdVerfication,
  getUserDetails,
  getUserProfileDetails,
  editUserDetails,
  editProfileDetails,
  getAllUserNegotiations,
};
