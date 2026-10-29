const express = require('express');
const router = express.Router();
const { getFarmerDashboard, listFarmerFarms } = require('../controllers/farmer.controller');
const {
    getFarmerCrops,
    getCropDetails,
    cropInitializer,
    editCrop,
    deleteCrop,
    getCropLifecycle,
    cropLifecycleStageObserved,
    allCropsCalenders,
    cropCalender,
    cropYieldEstimation,
    getCropTimelines,
    farmerProduceListByCrop,
} = require('../controllers/crop.controller');
const {
    createHealthLog,
    editCropHealthLog,
    deleteHealthlog,
    cropHealthLogsSearch,
} = require('../controllers/health-log-controllers');

const {
    cropListings,
    createCropListing,
    detailCropListing,
    editCropListing,
} = require('../controllers/listing.controller');

const {
    searchGroupListings,
    groupDetails,
    editGroup,
    bulkRequestsCreatePledge,
    bulkRequestsDeletePledge,
    groupParticipantsEdit
} = require('../controllers/group.controller');


const {
    searchNegotiations,
  negotiationDetails,
  createNegotiationHistory,
  accepNegotiation
} = require("../controllers/negotiation.controller");

const { genFarmerReports } = require("../controllers/reports.controller");

// START ROUTES DEFENITION

router.get('/dashboard/:userId', getFarmerDashboard); // tested working
router.get('/crops/:userId', getFarmerCrops); // tested working
router.post('/crops/:userId', cropInitializer); // tested working
router.get('/crop/:cropId', getCropDetails); // tested working
router.put('/crop/:cropId', editCrop); // tested working
router.delete('/crop/:cropId', deleteCrop); // tested working
router.get('/crop/timelines/:cropId', getCropTimelines); // tested working
router.get('/crops/lifecycle/:cropId', getCropLifecycle); // tested working
router.post('/crops/lifecycle-stage-observed/:cropId', cropLifecycleStageObserved); // tested working
router.get('/crops-health-logs/:cropId',cropHealthLogsSearch); // tested working
router.post('/crops-health-logs/:cropId', createHealthLog); // tested working
router.put('/crops-health-logs/:logId', editCropHealthLog); // tested working
router.delete('/crops-health-logs/:logId', deleteHealthlog); // tested working
router.get('/crops-calender/:userId', allCropsCalenders); // tested working
router.get('/crop-calender/:cropId', cropCalender); // tested working
router.get('/crop-yeild-estimate/:cropId', cropYieldEstimation); // tested working
router.get('/produces',farmerProduceListByCrop); // tested working



// LISTINGS
router.get('/listings/:userId', cropListings); // tested working
router.post('/listings', createCropListing ); // tested working
router.get('/listing/:listingId', detailCropListing); 
router.patch('/listing/:listingId', editCropListing);

// BULK REQUESTS
router.post("/bulk-request/:reqId/pledge", bulkRequestsCreatePledge); // tested working
router.delete("/bulk-request/pledge/:pledgeId", bulkRequestsDeletePledge); // tested working

// GROUPS
router.get('/groups', searchGroupListings); // tested working
router.get('/group/:groupId', groupDetails); // tested working
router.put('/group/:groupId', editGroup); // not sure if needed
router.put('/group-participants/:id',groupParticipantsEdit) // untested



// NEGOTIATIONS
router.get('/negotiations', searchNegotiations); 
router.get('/negotiation/:id',negotiationDetails);

// NEGOTIATION HISTORY
router.post('/negotiation-accept/:negoHistId', accepNegotiation); // tested working


router.post('/generate-reports', genFarmerReports);
router.get('/farms/:userId',listFarmerFarms);

router.get('/health-alerts/:userId', (req,res) => {
    // get health alerts for farmers
});

module.exports = router;