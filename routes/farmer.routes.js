const express = require('express');
const router = express.Router();
const { getFarmerDashboard } = require('../controllers/farmer-controllers/farmer.controller');
const {
    getFarmerCrops,
    getCropDetails,
    createCrop,
    editCrop,
    deleteCrop,
    markCropAsHarvested,
    getCropLifecycle,
    cropLifecycleStageObserved,
    allCropsCalenders,
    cropCalender,
    cropYieldEstimation
} = require('../controllers/farmer-controllers/crop.controller');
const {
    cropHealthLogs,
    createHealthLog,
    editCropHealthLog,
    deleteHealthlog
} = require('../controllers/farmer-controllers/health-log-controllers');

const {
    cropListings,
    createCropListing,
    editCropListing,
    deleteCropListing,
} = require('../controllers/farmer-controllers/listing.controller');

const {
    searchGroupListings,
    createGroup,
    groupDetails,
    editGroup,
    listGroupInivitation,
    createGroupInvitation,
    listGroupRequest,
    createGroupRequest
} = require('../controllers/farmer-controllers/group.controller');


router.get('/dashboard/:userId', getFarmerDashboard); // tested working

router.get('/health-alerts/:userId', (req,res) => {
    // get health alerts for farmers
});

router.get('/crops/:userId', getFarmerCrops); // tested working

router.post('/crops/:userId', createCrop); // tested working

router.get('/crop/:cropId', getCropDetails); // tested working

router.put('/crop/:cropId', editCrop); // tested working

router.delete('/crop/:cropId', deleteCrop); // tested working

router.post('/crop/harvest/:cropId', markCropAsHarvested); // tested working

router.get('/crops/lifecycle/:cropId', getCropLifecycle); // tested working

router.post('/crops/lifecycle-stage-observed/:cropId', cropLifecycleStageObserved); // tested working

router.get('/crops-health-logs/:cropId',cropHealthLogs); // tested working

router.post('/crops-health-logs/:cropId', createHealthLog); // tested working

router.put('/crops-health-logs/:logId', editCropHealthLog); // tested working

router.delete('/crops-health-logs/:logId', deleteHealthlog); // tested working

router.get('/crops-calender/:userId', allCropsCalenders); // tested working

router.get('/crop-calender/:cropId', cropCalender); // tested working

router.get('/crop-yeild-estimate/:cropId', cropYieldEstimation); // tested working

router.get('/listings/:userId', cropListings); // tested working

router.post('/listings/:cropId', createCropListing ); // tested working

router.get('/listing/:listingId', () => {});

router.put('/listing/:listingId', editCropListing); // tested working

router.delete('/listing/:listingId', deleteCropListing); // tested working

router.get('/groups/:userId', searchGroupListings);

router.post('/groups/:userId', createGroup);

router.get('/group/:groupId', groupDetails);

router.put('/group/:groupId', editGroup);

router.delete('/group/:groupId', (req,res) => {
    // Not Needed yet
});

router.delete('/remove-group-participants',(req,res) => {
    // remove participants by farmer
});

router.get('/group-invitations/:userId', listGroupInivitation);

router.post('/group-invitaion',createGroupInvitation);

router.get('/group-requests/:groupId', listGroupRequest);

router.post('/group-request', createGroupRequest);

router.get('/accept-reject-group-request/:reqId', (req,res) => {
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