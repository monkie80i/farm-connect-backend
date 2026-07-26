const express = require("express");
const router = express.Router();
const { registerUser,loginUser,runsql,verifyEmail,forgotPassword,passwordReset } = require("../controllers/auth.controller");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/sql", runsql)
router.get("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/password-reset", passwordReset);




module.exports = router;
