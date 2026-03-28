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
    getAllUserNegotiations,
} = require("../controllers/user.controller");

const {
    getOrderDisputes,
    createOrderDispute,
    getOrderDisputeDetails,
    editDispute,
    sendChat,
    relaodChat,
} = require("../controllers/order.controller")

router.post("/:userId/id-verification", editProfileAndIdVerfication ); // tested working

router.get("/:userId", getUserDetails ); // tested working
router.put("/:userId", editUserDetails ); // tested working

router.get("/:userId/profile", getUserProfileDetails); // tested working
router.put("/:userId/profile", editProfileDetails ); // tested working

router.get('/:userId/all-negotiations', getAllUserNegotiations);

router.get('/:userId/order-disputes', getOrderDisputes);

router.post('/order-disputes/:orderId', createOrderDispute);

router.get('/order-dispute/:disputeId', getOrderDisputeDetails);

router.put('/order-dispute/:disputeId', editDispute);

router.post('/order-dispute-chat/:disputeId', sendChat);

router.get('/order-dispute-chat/:disputeId', relaodChat);

router.delete('/order-dispute/:disputeId', (req,res) => {}); // not urgent

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
