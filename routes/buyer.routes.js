const express = require("express");
const router = express.Router();
const { 
    getBuyerDashboard,
    marketPlaceSearch,
    getMarketplaceDetails
} = require("../controllers/buyer.controller");

const {
  createNegotiationHistory,
  accepNegotiation,
  searchNegotiations,
  createNegotiationV2,
  negotiationDetails,
} = require("../controllers/negotiation.controller");

const {
  bulkRequestsSearch,
  bulkRequestsCreate,
  bulkRequestsDetail,
  bulkRequestsUpdate,
  bulkRequestsSelectPledge,
  searchGroupListings,
  groupDetails
} = require("../controllers/group.controller");

// ROUTES START HERE

router.get('/dashboard/:userId', getBuyerDashboard);
router.get('/marketplace', marketPlaceSearch);  
router.get("/marketplace/:listingId", getMarketplaceDetails);

/** BULK REQUESTS */
router.get("/bulk-requests", bulkRequestsSearch); // tested working
router.post("/bulk-requests", bulkRequestsCreate); // tested working
router.get("/bulk-request/:reqId", bulkRequestsDetail); // tested working
router.patch("/bulk-request/:reqId", bulkRequestsUpdate); // tested working // group creation happends here
router.put("/bulk-request/pledge/:pledgeId", bulkRequestsSelectPledge); // tested working

/** GROUPS */
router.get("/groups", searchGroupListings);
router.get("/group/:groupId", groupDetails);

/** NEGOTIATIONS */
router.get('/negotiations', searchNegotiations); 
router.post('/negotiation', createNegotiationV2);
router.get('/negotiation/:id',negotiationDetails);

/** NEGOTIATION HISTORY */
router.post('/negotiation-history/:negotiationId', createNegotiationHistory); // tested working
router.post('/negotiation-accept/:negoHistId', accepNegotiation); // tested working

module.exports = router;


