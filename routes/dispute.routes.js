const express = require("express");
const router = express.Router();


const {
    searchOrderDisputes,
    createOrderDispute,
    getOrderDisputeDetails,
    editDispute,
    sendChat,
    relaodChat,
} = require("../controllers/dispute.controller");
const { upload } = require("../services/file.services");

router.get('', searchOrderDisputes);
router.post('',upload.array('files',5), createOrderDispute);
router.get('/:id', getOrderDisputeDetails);
router.patch('/:id',upload.array('files',5), editDispute);
router.post('/:id/chat', sendChat);
router.get('/:id/chat', relaodChat);


module.exports = router;