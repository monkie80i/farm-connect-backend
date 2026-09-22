const express = require("express");
const router = express.Router();
const { 
    getBuyerDashboard,
    marketPlaceSearch,
    getMarketplaceDetails
} = require("../controllers/buyer.controller");

const {
    createNegotiation,
  listNegotiationHistory,
  createNegotiationHistory,
  accepNegotiation,
  negotiations
} = require("../controllers/negotiation.controller");

const { getOrders,createOrder,orderDetails } = require("../controllers/order.controller");
const {
bulkRequestsSearch,
  bulkRequestsCreate,
  bulkRequestsDetail,
  bulkRequestsUpdate,
  bulkRequestsCreatePledge,
  bulkRequestsSelectPledge,
  bulkRequestsDeletePledge,
  searchGroupListings,
  groupDetails
} = require("../controllers/group.controller");

// ROUTES START HERE

router.get('/dashboard/:userId', getBuyerDashboard);

router.get('/marketplace', marketPlaceSearch);  

router.get("/marketplace/:listingId", getMarketplaceDetails);

// ----------------

router.get("/bulk-requests", bulkRequestsSearch); // tested working

router.post("/bulk-requests", bulkRequestsCreate); // tested working

router.get("/bulk-request/:reqId", bulkRequestsDetail); // tested working

router.patch("/bulk-request/:reqId", bulkRequestsUpdate); // tested working // group creation happends here

router.put("/bulk-request/pledge/:pledgeId", bulkRequestsSelectPledge); // tested working


// ---------------------

router.get("/groups", searchGroupListings);

router.get("/group/:groupId", groupDetails);

// ---------------------

router.post('/negotiations/:listingId', createNegotiation); // tested working

// router.get('/negotiations', (req,res) => {
//     // get negotiations for buyer
// });
router.get('/negotiations/:listingId', negotiations); // tested working

router.post('/negotiation-history/:negotiationId', createNegotiationHistory); // tested working

router.get('/negotiation-history/:negotiationId', listNegotiationHistory); // tested working

router.post('/negotiation-accept/:negoHistId', accepNegotiation); // tested working

router.post('/orders/:userId', createOrder);

router.get('/orders/:userId', getOrders);

router.get('/order/:orderId', orderDetails );

// router.put('/order/:orderId', (req,res) => {}); // not needed for now

// router.delete('/order/:orderId', (req,res) => {}); // not needed for now

module.exports = router;


