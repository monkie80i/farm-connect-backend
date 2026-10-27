const express = require('express');
const router = express.Router();
const {
    orderSearch,
    orderDetails,
    orderLineItemDetails,
    searchOrderLineItems,
    createOrder,
    editOrder,
    editOrderLineItem,
} = require("../controllers/order.controller");


router.get('',orderSearch);
router.post('',createOrder);

router.get('/line-items',searchOrderLineItems);
router.get('/line-items/:id',orderLineItemDetails);
router.patch('/line-items/:id',editOrderLineItem);

router.get('/:id',orderDetails);
router.patch('/:id',editOrder);




module.exports = router;