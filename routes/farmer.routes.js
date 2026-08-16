const express = require('express');
const router = express.Router();
const { getFarmerDashboard } = require('../controllers/farmer.controller');
const {
    getFarmerCrops,
    getCropDetails,
    cropInitializer,
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

router.post('/crops/:userId', cropInitializer); // tested working

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

router.get('/groups', searchGroupListings); // tested working

router.post('/groups/:userId', createGroup); // tested working

router.get('/group/:groupId', groupDetails); // tested working

router.put('/group/:groupId', editGroup); // tested working

// router.delete('/group/:groupId', (req,res) => {});

router.get('/group-invitations/:userId', listGroupInivitation); // tested working

router.post('/group-invitation',createGroupInvitation); // tested working

router.get('/group-requests/:groupId', listGroupRequest); // tested working

router.post('/group-request', createGroupRequest); // tested working

router.post('/accept-reject-group-request', acceptRejectGroupRequest); // tested working

// router.delete('/remove-group-participants',(req,res) => {}); // not needed atm

router.get('/orders/:userId', getOrders); // tested working

router.get('/order/:orderId', orderDetails); // tested workings

router.get('/negotiations/:listingId', negotiations); // tested working

router.post('/negotiations/:listingId', createNegotiation); // tested working

router.post('/negotiation-history/:negotiationId', createNegotiationHistory); // tested working

router.get('/negotiation-history/:negotiationId', listNegotiationHistory); // tested working

router.post('/negotiation-accept/:negoHistId', accepNegotiation); // tested working

router.post('/generate-reports', genFarmerReports);


module.exports = router;