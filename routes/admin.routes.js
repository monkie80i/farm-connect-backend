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
    deleteCropVarieity,
    searchCropLifeCycleDefenitions,
    createCropLifeCycleDefenition,
    getCropLifeCycleDefenitionDetails,
    deleteCropLifeCycleStage,
    defaultStages,
    bulkCreateCropLifeCycleDefenition,
    bulkUpdateCropLifeCycleStageDays
} = require("../controllers/crop.controller");


router.get("/dashboard/:userId", adminDashboard); // tested working

router.get("/generate-reports/:userId", (req, res) => {});

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

router.get("/crop-lifecycle-defenitions", searchCropLifeCycleDefenitions);

router.post("/crop-lifecycle-defenitions", createCropLifeCycleDefenition); // tested working

router.post("/crop-lifecycle-defenitions/bulk", bulkCreateCropLifeCycleDefenition); 

router.put("/crop-lifecycle-defenitions/bulk-stage-days", bulkUpdateCropLifeCycleStageDays);

router.get("/crop-lifecycle-defenition/:cropLifecycleDefId", getCropLifeCycleDefenitionDetails);

router.put("/crop-lifecycle-defenition/:cropLifecycleDefId", (req, res) => {}); // later

router.delete("/crop-lifecycle-defenition/:cropLifecycleDefId", deleteCropLifeCycleStage);

router.get("/crop-lifecycle-stages-default", defaultStages);

module.exports = router;



