const authService = require("../services/auth.services");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET;

const registerFarmer = (req, res) => {
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

    res.status(200).json({ message: "success", data: userId });
  } catch (error) {
    console.log("user/register", error);
    res.status(500).json({ message: "Something went wrong!", error: error });
  }
};

const loginUser = (req, res) => {
    try {
      const { email, password } = req.body;
      console.log(req.body)
      const user = authService.login(email, password);

      if (user) {

        const token = jwt.sign(
            {userId: user.Id, role: user.Role},
            SECRET_KEY,
            { expiresIn: "1d"}
        );

        res.status(200).json({ message: "success", data: user , token: token });
      } else {
        res.status(401).json({ message: "Login Failed", data: null });
      }

    } catch (error) {
      console.log("user/register", error);
      res.status(500).json({ message: "Something went wrong!", error: error });
    }
};

module.exports = {
  registerFarmer,loginUser
};
