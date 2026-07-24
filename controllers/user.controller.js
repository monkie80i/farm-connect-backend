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
      if(user.IsVerificationFilled === 0) {
        userService.editProfileAndIdVerfication_v2(id, req.body);
        res.status(200).json({ message: "success", data: null });
      } else {
        res.status(400).json({ message: "Forbidden - Already filled", data: null });
      }
      
    } else {
      res.status(404).json({ message: "User Not Found", data: null });
    }
  } catch (error) {
    if (error.message !== '__ROLLBACK__') {
        res.status(200).json({ message: "success", data: null });
    }; 
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
            INSERT INTO FarmCropTypes (FarmId, CropTypeId) VALUES (${farm.id},${cropType.cropTypeId});
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

const searchUsers = (req,res) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const {
      username,
      email,
      role,
      isVerificationFilled,
      isAdminVerified,
      isAdmin
    } =req.query;

    const whereConditions = [];
    const params = [];

    if(username) {
      whereConditions.push("Username LIKE '%' || ? || '%'");
      params.push(username);
    }

    if(email) {
      whereConditions.push("Email LIKE '%' || ? || '%'");
      params.push(email);
    }

    if(role) {
      whereConditions.push("Role = ?");
      params.push(role);
    }

    if(isVerificationFilled) {
      whereConditions.push("IsVerificationFilled = ?");
      params.push(isVerificationFilled);
    }

    if(isAdminVerified) {
      whereConditions.push("IsAdminVerified = ?");
      params.push(isAdminVerified);
    }

     if(isAdmin) {
      whereConditions.push("IsAdmin = ?");
      params.push(isAdmin);
    }

    params.push(pageSize);
    params.push(offset);

    const whereClause = whereConditions.length > 0 ? `WHERE ` + whereConditions.join(' AND '): "";
    console.log(`SELECT * FROM Users LEFT JOIN UserProfile ${whereClause} LIMIT ? OFFSET ?;`)
    const stmnt = db.prepare(`
      SELECT * FROM Users as u LEFT JOIN UserProfile as p ON p.UserId = u.Id ${whereClause} LIMIT ? OFFSET ?;
    `);
    console.log(stmnt)
    const result = stmnt.all(...params);

    /*
    SELECT u.Id,p.Id FROM Users as u LEFT JOIN UserProfile as p ON p.UserId = u.Id WHERE IsVerificationFilled = 1 AND IsAdminVerified = 0 AND isAdmin = 0;
    */

    return successResponse(res,toCamelCaseObject(result));
    
  } catch (error) {
    console.log("searchUsers", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const getRecentNotifications = (req,res) => {
  try {
    const userId = req.params.userId;
    const stmnt = db.prepare(`SELECT * FROM Notification WHERE Recipient = ? AND IsViewed = 0;`);
    const result = stmnt.all(userId);
    return successResponse(res,toCamelCaseObject(result));
  } catch (error) {
    console.log("getRecentNotifications", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const markNotificationRead = (req,res) => {
  try {
    const notificationId = req.params.notificationId;
    const stmnt = db.prepare(`UPDATE Notification SET IsViewed = 1 WHERE Id = ?;`);
    stmnt.run(notificationId);
    return successResponse(res);
  } catch (error) {
    console.log("markNotificationRead", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const getRecentOrderAlerts = (req,res) => {
  try {
    const userId = req.params.userId;
    const stmnt = db.prepare(`SELECT * FROM OrderAlert WHERE Recipient = ? AND IsViewed = 0;`);
    const result = stmnt.all(userId);
    return successResponse(res,toCamelCaseObject(result));
  } catch (error) {
    console.log("getRecentOrderAlerts", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const markOrderAlertRead = (req,res) => {
  try {
    const alertId = req.params.alertId;
    const stmnt = db.prepare(`UPDATE OrderAlert SET IsViewed = 1 WHERE Id = ?;`);
    stmnt.run(alertId);
    return successResponse(res);
  } catch (error) {
    console.log("markOrderAlertRead", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};


/**
 * 
 * CREATE TABLE IF NOT EXISTS Notification (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Title NVARCHAR(200) NOT NULL,
        Recipient INTEGER,
        NotificationType NVARCHAR(20),
        Message TEXT,
        EntityType NVARCHAR(100),
        EntityId INTEGER,
        ActionUrl TEXT,
        Priority NVARCHAR(20),
        IsViewed INTEGER DEFAULT 0,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (Recipient) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (Priority) REFERENCES NotificationPriorityLov(Code) ON DELETE SET NULL,
        FOREIGN KEY (NotificationType) REFERENCES NotificationTypeLov(Code) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS OrderAlert (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Title NVARCHAR(200) NOT NULL,
        Recipient INTEGER,
        NotificationType NVARCHAR(20),
        OrderId INTEGER,
        ActionUrl TEXT,
        Priority NVARCHAR(20),
        IsViewed INTEGER DEFAULT 0,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (Priority) REFERENCES AlertPriorityLov(Code) ON DELETE SET NULL,
        FOREIGN KEY (NotificationType) REFERENCES NotificationTypeLov(Code) ON DELETE SET NULL,
        FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE SET NULL
    );
 */


module.exports = {
  editProfileAndIdVerfication,
  getUserDetails,
  getUserProfileDetails,
  editUserDetails,
  editProfileDetails,
  getAllUserNegotiations,
  searchUsers,
  getRecentNotifications,
  markNotificationRead,
  getRecentOrderAlerts,
  markOrderAlertRead
};
