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
    searchUsers,
    getRecentNotifications,
    markNotificationRead,
    getRecentOrderAlerts,
    markOrderAlertRead
} = require("../controllers/user.controller");

const {
    getOrderDisputes,
    createOrderDispute,
    getOrderDisputeDetails,
    editDispute,
    sendChat,
    relaodChat,
} = require("../controllers/order.controller")

router.get('/users',searchUsers); // tested working

router.get('/notifications/:userId', getRecentNotifications); // tested working

router.put('/notification-mark-as-read/:notificationId', markNotificationRead); // tested working

router.get('/order-alerts/:userId', getRecentOrderAlerts); // tested working

router.put('/order-alert-mark-as-read/:alertId', markNotificationRead); // tested working

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

// router.delete('/order-dispute/:disputeId', (req,res) => {}); // not urgent

// router.get('/user/:userId', (req,res) => {}); // not urgent

// router.put('/user/:userId', (req,res) => {}); // not urgent

module.exports = router;
