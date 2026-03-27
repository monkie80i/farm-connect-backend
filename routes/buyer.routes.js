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

// ROUTES START HERE

router.get('/dashboard/:userId', getBuyerDashboard);

router.get('/marketplace', marketPlaceSearch);  

router.get("/marketplace/:listingType/:listingId", getMarketplaceDetails);

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


