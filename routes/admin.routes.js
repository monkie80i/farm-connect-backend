const express = require("express");
const router = express.Router();
const { adminDashboard } = require("../controllers/admin.controller");
const { 
    getCropTypes,
    createCropTypes,
    getCropType,
    deleteCropType,
    getCropVarieities,
    createCropVarieities,
    getCropVarieity,
    deleteCropVarieity

} = require("../controllers/crop.controller");


router.get("/dashboard/:userId", adminDashboard); // tested working

router.get("/generate-reports/:userId", (req, res) => {
    // generate reports for admin
});

router.get("/crop-types", getCropTypes); // tested working

router.post("/crop-types", createCropTypes); // tested working

router.get("/crop-type/:cropTypeId", getCropType); // tested working

router.put("/crop-type/:cropTypeId", (req, res) => {}); // later

router.delete("/crop-type/:cropTypeId", deleteCropType); // tested working

router.get("/crop-varieties", getCropVarieities);  // tested working

router.post("/crop-varieties", createCropVarieities);  // tested working

router.get("/crop-variety/:cropVarietyId", getCropVarieity); // tested working

router.put("/crop-variety/:cropVarietyId", (req, res) => {}); // later

router.delete("/crop-variety/:cropVarietyId", deleteCropVarieity); // tested working

router.get("/crop-lifecycle-defenitions", (req, res) => {
    // get crop lifecycle defenitions for admin
});

router.post("/crop-lifecycle-defenitions", (req, res) => {
    // create crop lifecycle defenitions for admin
});

router.get("/crop-lifecycle-defenitions/:cropLifecycleDefId", (req, res) => {
    // get crop lifecycle defenition details for admin
});

router.put("/crop-lifecycle-defenition/:cropLifecycleDefId", (req, res) => {}); // later

router.delete("/crop-lifecycle-defenition/:cropLifecycleDefId", (req, res) => {
    // delete crop lifecycle defenition for admin
});


router.post("/crop-lifecycle-stages", (req, res) => {
    // create crop lifecycle stage for admin
});

router.get("/crop-lifecycle-stage/:cropLifecycleStageId", (req, res) => {
    // get crop lifecycle stage details for admin
});

router.put("/crop-lifecycle-stage/:cropLifecycleStageId", (req, res) => {}); // later

router.delete("/crop-lifecycle-stage/:cropLifecycleStageId", (req, res) => {
    // delete crop lifecycle stage for admin
});




module.exports = router;



