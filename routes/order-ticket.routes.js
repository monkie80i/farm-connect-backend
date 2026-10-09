const express = require('express');
const { searchOrderTickets, orderTicketDetails } = require('../controllers/negotiation.controller');
const router = express.Router();

router.get('',searchOrderTickets);
router.get('/:id',orderTicketDetails);

module.exports = router;