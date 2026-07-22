const express = require("express");
const router = express.Router();
const { registerUser,loginUser,runsql,verifyEmail } = require("../controllers/auth.controller");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/sql", runsql)
router.get("/verify-email", verifyEmail);


module.exports = router;
