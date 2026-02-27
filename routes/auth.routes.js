const express = require("express");
const router = express.Router();
const { registerFarmer,loginUser,runsql } = require("../controllers/auth.controller");

router.post("/register", registerFarmer);
router.post("/login", loginUser);
router.post("/sql", runsql)

module.exports = router;
