const express = require("express");
const router = express.Router();
const utils = require("../utils/utlis");
const authService = require("../services/auth.services");
const { authorization } = require("../middleware/auth.middleware");
const { 
    editProfileAndIdVerfication,
    getUserDetails,
    getUserProfileDetails,
    editUserDetails,editProfileDetails,
    getAllUserNegotiations
} = require("../controllers/user.controller");

router.post("/:userId/id-verification", editProfileAndIdVerfication ); // tested working

router.get("/:userId", getUserDetails ); // tested working
router.put("/:userId", editUserDetails ); // tested working

router.get("/:userId/profile", getUserProfileDetails); // tested working
router.put("/:userId/profile", editProfileDetails ); // tested working

router.get('/:userId/all-negotiations', getAllUserNegotiations);

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
