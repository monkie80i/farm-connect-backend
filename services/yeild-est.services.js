const { daysBetween } = require("../utils/utlis");
const db = require("../db");

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function getStageCap(stageCode) {
  const capRows = db.prepare(`SELECT StageName,Cap FROM CropStageCaps;`).all();
  const caps = capRows.reduce((acc, row) => {
    acc[row.StageName] = row.Cap;
    return acc;
  }, {});

  return caps[stageCode] || 1.0;
}

function getHealthReduction(healthStatus) {
  const reductions = {
    HLTY: 0.0,
    MINOR: 0.05,
    RISK: 0.15,
    CRIT: 0.30,
  };

  return reductions[healthStatus] || 0.0;
}

/**
 * Calculates Yield Estimation
 * @param {Object} crop
 * @param {number} crop.cultivatedAreaInAcre
 * @param {string} crop.sowingDate
 * @param {string} crop.estdHarvestDate
 * @param {string} crop.currentStage
 * @param {string} crop.healthStatus
 *
 * @param {Object} variety
 * @param {number} variety.yieldPerAcre
 */
function calculateYieldEstimation(crop, variety) {
  const today = new Date();

  // STEP 1: Base Yield
  const baseYield = variety.yieldPerAcre * crop.cultivatedAreaInAcre;

  let baseMin = baseYield * 0.9;
  let baseMax = baseYield * 1.1;

  console.log("baseMin,baseMax",baseMin,baseMax);

  // STEP 2: Lifecycle Progress
  const totalDays = daysBetween(crop.sowingDate, crop.estdHarvestDate); 
  console.log(totalDays);
  const elapsedDays = daysBetween(crop.sowingDate, today);
  console.log(crop.sowingDate,today,elapsedDays);


  let progressRatio = totalDays > 0 ? elapsedDays / totalDays : 0;
  progressRatio = clamp(progressRatio, 0, 1);

  console.log("progressRatio",progressRatio)

  // Stage cap
  const stageCap = getStageCap(crop.currentStage);
  progressRatio = Math.min(progressRatio, stageCap);
  console.log("progressRatio after stage cap",progressRatio)


  // STEP 3: Apply Progress Scaling
  let adjustedMin = baseMin * progressRatio;
  let adjustedMax = baseMax * progressRatio;

  console.log("adjustedMin,adjustedMax",adjustedMin,adjustedMax)
  // STEP 4: Health Reduction
  const reduction = getHealthReduction(crop.healthStatus);
  adjustedMin = adjustedMin * (1 - reduction);
  adjustedMax = adjustedMax * (1 - reduction);

  console.log("adjustedMin,adjustedMax after reduction",adjustedMin,adjustedMax)


  // STEP 5: Delay Penalty (optional)
  if (today > new Date(crop.estdHarvestDate)) {
    adjustedMin *= 0.9;
    adjustedMax *= 0.9;
  }

  console.log("adjustedMin,adjustedMax delay",adjustedMin,adjustedMax)


  // STEP 6: Confidence
  let confidence = "LOW";
  if (progressRatio >= 0.8 && crop.healthStatus !== "CRIT") {
    confidence = "HIGH";
  } else if (progressRatio >= 0.5) {
    confidence = "MEDIUM";
  }

  console.log("confidence",confidence)

  return {
    estimatedYieldMin: Math.round(adjustedMin), // kg per acre
    estimatedYieldMax: Math.round(adjustedMax),
    confidenceLevel: confidence,
  };
}

/*
usage
const crop = {
  cultivatedAreaInAcre: 0.75,
  sowingDate: "2026-01-04",
  estdHarvestDate: "2026-04-06",
  currentStage: "FRUIT",
  healthStatus: "MINOR",
};

const variety = {
  yieldPerAcre: 3200,
};

const result = calculateYieldEstimation(crop, variety);
console.log(result);
*/

// --------------
/*
[
  { factor: "Lifecycle Progress", status: "GOOD", message: "Crop is in fruiting stage." },
  { factor: "Health Condition", status: "WARNING", message: "Minor health issues recorded." }
]
*/


const computeYieldFactors = (crop) => {
  const today = new Date();
  const factors = [];

  // 1. Lifecycle Progress Factor
  const totalDays = daysBetween(crop.sowingDate, crop.estdHarvestDate);
  const elapsedDays = daysBetween(crop.sowingDate, today);
  const progressRatio = totalDays > 0 ? elapsedDays / totalDays : 0;

  if (progressRatio < 0.5) {
    factors.push({
      factor: "Lifecycle Progress",
      status: "LOW",
      message: "Crop is in early growth stage.",
    });
  } else if (progressRatio < 0.8) {
    factors.push({
      factor: "Lifecycle Progress",
      status: "MODERATE",
      message: "Crop is progressing towards maturity.",
    });
  } else {
    factors.push({
      factor: "Lifecycle Progress",
      status: "GOOD",
      message: "Crop is near harvest stage.",
    });
  }

  // 2. Health Status Factor
  const healthMap = {
    HLTY: { status: "GOOD", message: "Crop health is stable." },
    MINOR: { status: "WARNING", message: "Minor health issues recorded." },
    RISK: { status: "POOR", message: "Crop is at risk due to repeated issues." },
    CRIT: { status: "CRITICAL", message: "Critical health condition detected." },
  };

  const healthFactor = healthMap[crop.healthStatus] || {
    status: "UNKNOWN",
    message: "Health data unavailable.",
  };

  factors.push({
    factor: "Health Condition",
    status: healthFactor.status,
    message: healthFactor.message,
  });

  // 3.Stage Delay Factor
  if (today > new Date(crop.estdHarvestDate)) {
    factors.push({
      factor: "Harvest Delay",
      status: "WARNING",
      message: "Harvest date has passed. Possible delay.",
    });
  } else {
    factors.push({
      factor: "Harvest Schedule",
      status: "GOOD",
      message: "Harvest timeline is on track.",
    });
  }

  // 4.Area Sufficiency Factor
  if (crop.cultivatedAreaInAcre < 0.25) {
    factors.push({
      factor: "Cultivated Area",
      status: "LOW",
      message: "Small cultivated area may limit total yield.",
    });
  } else {
    factors.push({
      factor: "Cultivated Area",
      status: "GOOD",
      message: "Cultivated area is sufficient for expected output.",
    });
  }

  return factors;
}

/** 
 * 
 * const crop = {
  cultivatedAreaInAcre: 0.75,
  sowingDate: "2026-01-04",
  estdHarvestDate: "2026-04-06",
  currentStage: "FRUIT",
  healthStatus: "MINOR",
};

const variety = {
  yieldPerAcre: 3200,
};

const factors = computeYieldFactors(crop, variety);
console.log(factors);

[
  {
    "factor": "Lifecycle Progress",
    "status": "GOOD",
    "message": "Crop is near harvest stage."
  },
  {
    "factor": "Health Condition",
    "status": "WARNING",
    "message": "Minor health issues recorded."
  },
  {
    "factor": "Harvest Schedule",
    "status": "GOOD",
    "message": "Harvest timeline is on track."
  },
  {
    "factor": "Cultivated Area",
    "status": "GOOD",
    "message": "Cultivated area is sufficient for expected output."
  }
]
*/


module.exports = {
  calculateYieldEstimation,
  computeYieldFactors

};