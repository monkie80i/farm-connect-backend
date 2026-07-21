const authService = require("../services/auth.services");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET;
const db = require('../db');
const { successResponse, errorResponse, notFound} = require("../responses/api.responses");


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
      res.status(409).json({ message: "Email Already Exists", data: null });
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

        res.status(200).json({ message: "success", data: user , token: token });
      } else {
        res.status(401).json({ message: "Login Failed", data: null });
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

    res.status(200).json({ message: "success", data: result })
    
  } catch (error) {
    console.log("user/runsql", error);
      return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

module.exports = {
  registerUser,loginUser,runsql
};
