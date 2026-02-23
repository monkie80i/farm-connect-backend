const express = require("express");
const router = express.Router();
const utils = require("../utils/utlis");
const authService = require("../services/auth.services");
const { authorization } = require("../middleware/auth.middleware");
const { editProfileAndIdVerfication,getUserDetails } = require("../controllers/user.controller");

router.post("/:id/id-verification", editProfileAndIdVerfication );

router.put("/:id", authorization, (req, res) => {
  // update user 
  // update user profile
  // udpate payment methods
  // update farm details
  // update farm crops

});

router.get("/:id/profile", getUserProfileDetails);

router.get("/:id", getUserDetails );

router.get('/all-negotiations/:userId', (req,res) => {
    // get all negotiations for farmers
});

router.post('/order-disputes', (req,res) => {
    // get order dispute details for Admin
})

router.post('/order-disputes/:userId', (req,res) => {
    // get order dispute details for farmers/Buyers 
});

router.post('/order-disputes/:orderId', (req,res) => {
    // create order dispute for farmers/Buyers
});

router.get('/order-dispute/:disputeId', (req,res) => {
    // get order dispute details for farmers/Buyers
});

router.put('/order-dispute/:disputeId', (req,res) => {
    // update order dispute for farmers
});

router.delete('/order-dispute/:disputeId', (req,res) => {
    // delete order dispute for farmers
});

router.get('/users', (req,res) => {
    // get all users for admin
});

router.get('/user/:userId', (req,res) => {
    // get user details for admin
});

router.put('/user/:userId', (req,res) => {
    // update user details for admin
});

router.get('/notifications/:userId', (req,res) => {
    // get notifications for farmers
});

router.get('/order-alerts/:userId', (req,res) => {
    // get order alerts for farmers
});



module.exports = router;
