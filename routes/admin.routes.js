const express = require("express");
const router = express.Router();


router.get("/dashboard/:userId", (req, res) => {
    // get dashboard data for admin
});

router.get("/generate-reports/:userId", (req, res) => {
    // generate reports for admin
});

router.get("/crop-types", (req, res) => {
    // get crop types for admin
});

router.post("/crop-types", (req, res) => {
    // create crop type for admin
});

router.get("/crop-type/:cropTypeId", (req, res) => {
    // get crop types for admin
});

router.put("/crop-type/:cropTypeId", (req, res) => {
    // update crop type for admin
});

router.delete("/crop-type/:cropTypeId", (req, res) => {
    // delete crop type for admin
});

router.get("/crop-varieties", (req, res) => {
    // get crop varieties for admin
});

router.post("/crop-varieties", (req, res) => {
    // create crop variety for admin
});

router.get("/crop-variety/:cropVarietyId", (req, res) => {
    // get crop variety details for admin
});

router.put("/crop-variety/:cropVarietyId", (req, res) => {
    // update crop variety for admin
});

router.delete("/crop-variety/:cropVarietyId", (req, res) => {
    // delete crop variety for admin
});

router.get("/crop-lifecycle-stages", (req, res) => {
    // get crop lifecycle stages for admin
});

router.post("/crop-lifecycle-stages", (req, res) => {
    // create crop lifecycle stage for admin
});

router.get("/crop-lifecycle-stage/:cropLifecycleStageId", (req, res) => {
    // get crop lifecycle stage details for admin
});

router.put("/crop-lifecycle-stage/:cropLifecycleStageId", (req, res) => {
    // update crop lifecycle stage for admin
});

router.delete("/crop-lifecycle-stage/:cropLifecycleStageId", (req, res) => {
    // delete crop lifecycle stage for admin
});




module.exports = router;



