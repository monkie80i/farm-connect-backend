const express = require("express");
const router = express.Router();
const { registerFarmer,loginUser } = require("../controllers/auth.controller");

router.post("/register", registerFarmer);
router.post("/login", loginUser);

module.exports = router;
