const express = require('express');
const router = express.Router();
const { getFarmerDashboard } = require('../controllers/farmer.controller');
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
} = require('../controllers/crop.controller');
const {
    cropHealthLogs,
    createHealthLog,
    editCropHealthLog,
    deleteHealthlog
} = require('../controllers/health-log-controllers');

const {
    cropListings,
    createCropListing,
    editCropListing,
    deleteCropListing,
} = require('../controllers/listing.controller');

const {
    searchGroupListings,
    createGroup,
    groupDetails,
    editGroup,
    listGroupInivitation,
    createGroupInvitation,
    listGroupRequest,
    createGroupRequest,
    acceptRejectGroupRequest
} = require('../controllers/group.controller');

const {getOrders,createOrder,orderDetails} = require('../controllers/order.controller');

const {
    createNegotiation,
  negotiationDetails,
  updateNegotiation,
  listNegotiationHistory,
  createNegotiationHistory,
  accepNegotiation,
  negotiations
} = require("../controllers/negotiation.controller");

const { genFarmerReports } = require("../controllers/reports.controller");

// START ROUTES DEFENITION

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

// router.delete('/group/:groupId', (req,res) => {});

router.delete('/remove-group-participants',(req,res) => {
    // remove participants by farmer
});

router.get('/group-invitations/:userId', listGroupInivitation);

router.post('/group-invitaion',createGroupInvitation);

router.get('/group-requests/:groupId', listGroupRequest);

router.post('/group-request', createGroupRequest);

router.post('/accept-reject-group-request', acceptRejectGroupRequest);

router.get('/orders/:userId', getOrders);

router.post('/orders/:userId', createOrder);

router.get('/order/:orderId', orderDetails);

// router.put('/order/:orderId', (req,res) => {}); // not needed for now

// router.delete('/order/:orderId', (req,res) => {}); // not needed for now


router.get('/negotiations/:listingId', negotiations);

router.post('/negotiations/:listingId', createNegotiation);

router.get('/negotiation-history/:negotiationId', listNegotiationHistory);

router.post('/negotiation-accept/:negotiationId', accepNegotiation);

router.post('/generate-reports', genFarmerReports);







module.exports = router;