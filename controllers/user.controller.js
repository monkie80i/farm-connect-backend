const userService = require("../services/user.service");
const authService = require("../services/auth.services");
const db = require("../db");
const e = require("express");

const editProfileAndIdVerfication = (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = authService.getUserByUserId(id);
    if (user) {
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
      } = req.body;

      userService.createProfileAndIdVerificationRecord(
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
      );

      res.status(200).json({ message: "success", data: null });
    } else {
      res.status(404).json({ message: "User Not Found", data: null });
    }
  } catch (error) {
    console.log("user/:id", error);
    res.status(500).json({ message: "Something went wrong!", error: error });
  }
};

const getUserDetails = (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = authService.getUserByUserId(id);
    if (user) {
      const data = utils.toCamelCaseObject(user);
      res.status(200).json({ message: "success", data: data });
    } else {
      res.status(404).json({ message: "Not Found", data: null });
    }
  } catch (error) {
    console.log("user/:id", error);
    res.status(500).json({ message: "Something went wrong!", error: error });
  }
};

const getUserProfileDetails = (req, res) => {
    const userId = Number(req.params.id);
    const role = req.queryParam.role;

    // get profile details 
    const stmnt = db.prepare(`SELECT * FROM UserProfile WHERE UserId = ?`);
    const profileDetails = stmnt.get(userId);

    if(role === "FARMER") {
        const paymentStmnt = db.prepare(`SELECT * FROM UserPaymentMethod WHERE UserId = ?`);
        profileDetails.paymentMethods = paymentStmnt.all(userId);

        const farmStmnt = db.prepare(`SELECT * FROM Farm WHERE UserId = ?`);
        profileDetails.farmDetails = farmStmnt.all(userId);

        
    } else if(role === "BUYER") {
    
    } else if(role === "ADMIN") {

    }
    



};

module.exports = {
  editProfileAndIdVerfication,getUserDetails,getUserProfileDetails
};