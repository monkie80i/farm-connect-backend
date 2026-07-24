const authService = require("../services/auth.services");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET;
const db = require('../db');
const { successResponse, errorResponse, notFound} = require("../responses/api.responses");
const { getUserById } = require("../services/user.service");
const { toCamelCaseObject,formatSQLValue } = require("../utils/utlis");



const registerUser = (req, res) => {
  try {
    const {
      firstName,
      lastName,
      password,
      email,
      phoneCode,
      phone,
      dateOfBirth,
      role,
    } = req.body;

    const emailExists = authService.checkEmailExists(email);
    if (emailExists) {
      return errorResponse(res,"Email Already Exists",409)
    }

    const username = authService.createRandomUserName(firstName, lastName);
    const userId = authService.registerUser(
      username,
      password,
      role,
      firstName,
      lastName,
      email,
      phoneCode,
      phone,
      dateOfBirth,
    );

    return successResponse(res,userId);
  } catch (error) {
    console.log("user/register", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const loginUser = (req, res) => {
    try {
      const { email, password, role } = req.body;
      const user = authService.login(email, password);

      if (user && user.Role === role.toUpperCase()) {
        const token = jwt.sign(
            {userId: user.Id, role: user.Role},
            SECRET_KEY,
            { expiresIn: "1d"}
        );

        delete user["PasswordHash"];

        return successResponse(res,{token:token, user:toCamelCaseObject(user)});
      } else {
        errorResponse(res,"Login Failed",401);
      }

    } catch (error) {
      console.log("user/register", error);
      return errorResponse(res,"Something went wrong!",500,error.toString());
    }
};

const runsql = (req,res) => {
  try {
    const query = req.body.query;
    console.log(query)
    const stmnt = db.prepare(query);
    const result = stmnt.all();
    console.log(result)

    return successResponse(res,result);
  } catch (error) {
    console.log("user/runsql", error);
      return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

const verifyEmail = (req,res) => {
  try {
    const { id,hash } = req.query;
    const user = getUserById(id);

    if(user) { 
      authService.verifyEmail(id,hash)   
    } else {
      return notFound(res,"User Not Found");
    }    
    return successResponse(res);
  } catch (error) {
    console.log("user/verify-email", error);
      return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

module.exports = {
  registerUser,loginUser,runsql,verifyEmail
};
