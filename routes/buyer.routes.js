const express = require("express");
const router = express.Router();

// dashboard for buyer
router.get('/dashboard/:userId', (req,res) => {
    // get dashboar data for buyer
});

router.get('/marketplace', (req,res) => {
    // get marketplace data for buyer
});

router.get('/crop-listing/:cropId', (req,res) => {
    // get crop listing details for buyer
});

router.post('/start-negotiation/:cropId', (req,res) => {
    // start negotiation for crop listing for buyer
});

router.get('/negotiations', (req,res) => {
    // get negotiations for buyer
});

router.get('/negotiation-history/:negotiationId', (req,res) => {
    // get negotiation history for buyer
});

router.post('/negotiation-submit-offer/:negotiationId', (req,res) => {
    // submit offer for negotiation for buyer
});

router.get('/negotiation-details/:negotiationId', (req,res) => {
    // get negotiation details for buyer
});

router.post('/place-order', (req,res) => {
    // place order for listing for buyer
});

router.get('/orders/:userId', (req,res) => {
    // get orders for buyer
});

router.get('/order/:orderId', (req,res) => {
    // get order details for buyer
});

router.put('/order/:orderId', (req,res) => {
    // update order for buyer
});

