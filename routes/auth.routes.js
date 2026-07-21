const express = require("express");
const router = express.Router();
const { registerUser,loginUser,runsql } = require("../controllers/auth.controller");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/sql", runsql)

module.exports = router;
