const express = require('express');
const { searchNegotiations, createNegotiationV2, createNegotiationHistoryV2, negotiationDetails, acceptNegotiationV2 } = require('../controllers/negotiation.controller');
const router = express.Router();

router.get('',searchNegotiations);
router.post('',createNegotiationV2);
router.get('/:id',negotiationDetails);
router.post('/:id/history',createNegotiationHistoryV2);
router.post('/:id/accept',acceptNegotiationV2);

module.exports = router;