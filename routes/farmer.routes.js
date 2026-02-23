const express = require('express');
const router = express.Router();

// dashboard for farmers
router.get('/dashboard/:userId', (req,res) => {

});

router.get('/health-alerts/:userId', (req,res) => {
    // get health alerts for farmers
});

router.get('/crops/:userId', (req,res) => {
    // get crops for farmers
});

router.get('/crops/:cropId', (req,res) => {
    // get crop details for farmers
});

router.post('/crops/:cropId', (req,res) => {
    // create crop for farmers
});

router.put('/crops/:cropId', (req,res) => {
    // update crop for farmers
});

router.delete('/crops/:cropId', (req,res) => {
    // delete crop for farmers
});

router.post('/crops/harvest/:cropId', (req,res) => {
    // mark crop as harvested for farmers
});

router.get('/crops/lifecycle/:cropId', (req,res) => {
    // get lifecycle details for crop for farmers
});

router.post('/crops/lifecycle-stage-observed/:cropId', (req,res) => {
    // update lifecycle details for crop for farmers
});

router.get('/crops-health-logs/:cropId', (req,res) => {
    // get health logs for crop for farmers
});

router.post('/crops-health-logs/:cropId', (req,res) => {
    // add health log for crop for farmers
});

router.delete('/crops-health-logs/:cropId', (req,res) => {
    // delete health log for crop for farmers
});

router.get('/crops-calender/:userId', (req,res) => {
    // get crop calendar for farmers
});

router.get('/crop-calender/:cropId', (req,res) => {
    // get crop calendar details for crop for farmers
});

router.get('/crop-yeild-estimate/:cropId', (req,res) => {
    // get crop yeild estimate for crop for farmers
});

router.get('/listings/:userId', (req,res) => {
    // get listings for farmers
});

router.post('/listings/:userId', (req,res) => {
    // create listing for farmers
});

router.get('/listing/:listingId', (req,res) => {
    // get listing details for farmers
});

router.put('/listing/:listingId', (req,res) => {
    // update listing for farmers
});

router.delete('/listing/:listingId', (req,res) => {
    // delete listing for farmers
});

router.get('/groups/:userId', (req,res) => {
    // get groups for farmers
});

router.post('/groups/:userId', (req,res) => {
    // create group for farmers
});

router.get('/group/:groupId', (req,res) => {
    // get group details for farmers
});

router.put('/group/:groupId', (req,res) => {
    // update group for farmers
});

router.delete('/group/:groupId', (req,res) => {
    // delete group for farmers
});

router.get('/group-invitations/:userId', (req,res) => {
    // get group invitations for farmers
});

router.post('/send-group-invitations/:groupId', (req,res) => {
    // send group invitations for farmers
});

router.post('/send-group-requests/:groupId', (req,res) => {
    // send group requests for farmers
});

router.get('/orders/:userId', (req,res) => {
    // get orders for farmers
});

router.post('/orders/:userId', (req,res) => {
    // create order for farmers
});

router.get('/order/:orderId', (req,res) => {
    // get order details for farmers
});

router.put('/order/:orderId', (req,res) => {
    // update order for farmers
});

router.delete('/order/:orderId', (req,res) => {
    // delete order for farmers
});


router.get('/negotiations/:listingId', (req,res) => {
    // get negotiations for farmers
});

router.post('/negotiations/:listingId', (req,res) => {
    // create negotiation for farmers
});

router.get('/negotiation-history/:negotiationId', (req,res) => {
    // get negotiation history for farmers
});

router.post('/negotiation-accept/:negotiationId', (req,res) => {
    // accept negotiation for farmers
});

router.post('/generate-reports/:userId', (req,res) => {
    // generate reports for farmers
});







module.exports = router;