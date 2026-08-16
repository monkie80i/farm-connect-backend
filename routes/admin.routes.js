const express = require("express");
const router = express.Router();

const { adminDashboard } = require("../controllers/admin.controller");
const { 
    getCropTypes,
    createCropTypes,
    getCropType,
    updateCropType,
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
    bulkUpdateCropLifeCycleStageDays,
    updateCropLifeCycleDefenition,
    updateCropVarieities,
    getCropStageCaps,
    createCropStageCaps,
    getCropStageCap,
    updateCropStageCap,
    deleteCropStageCap,
} = require("../controllers/crop.controller");


router.get("/dashboard/:userId", adminDashboard); // tested working

router.get("/generate-reports/:userId", (req, res) => {});

router.get("/crop-types", getCropTypes); // tested working

router.post("/crop-types", createCropTypes); // tested working

router.get("/crop-type/:cropTypeId", getCropType); // tested working

router.put("/crop-type/:cropTypeId", updateCropType); // tested working

router.delete("/crop-type/:cropTypeId", deleteCropType); // tested working

router.get("/crop-varieties", getCropVarieities);  // tested working

router.post("/crop-varieties", createCropVarieities);  // tested working

router.get("/crop-variety/:cropVarietyId", getCropVarieity); // tested working

router.put("/crop-variety/:cropVarietyId",updateCropVarieities); // tested working

router.delete("/crop-variety/:cropVarietyId", deleteCropVarieity); // tested working

router.get("/crop-lifecycle-defenitions", searchCropLifeCycleDefenitions); // tested working

router.post("/crop-lifecycle-defenitions", createCropLifeCycleDefenition); // tested working

router.post("/crop-lifecycle-defenitions/bulk", bulkCreateCropLifeCycleDefenition); // tested working

router.put("/crop-lifecycle-defenitions/bulk-stage-days", bulkUpdateCropLifeCycleStageDays); // tested working

router.get("/crop-lifecycle-defenition/:cropLifecycleDefId", getCropLifeCycleDefenitionDetails); // tested working

router.put("/crop-lifecycle-defenition/:cropLifecycleDefId",updateCropLifeCycleDefenition); // tested working

router.delete("/crop-lifecycle-defenition/:cropLifecycleDefId", deleteCropLifeCycleStage); // tested working

router.get("/crop-lifecycle-stages-default", defaultStages); // ??

router.get("/crop-stage-caps", getCropStageCaps);  // tested working

router.post("/crop-stage-caps", createCropStageCaps);  // tested working

router.get("/crop-stage-cap/:cropStageCapId", getCropStageCap); // tested working

router.put("/crop-stage-cap/:cropStageCapId",updateCropStageCap); // tested working

router.delete("/crop-stage-cap/:cropStageCapId", deleteCropStageCap); // tested working

module.exports = router;



