const { daysBetween } = require("../utils/utlis");
const db = require("../db");

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

// HealthStatusLov: CRIT, HARV, HLTY, MINOR, RISK
function getHealthReduction(healthStatus) {
  const reductions = {
    HLTY: 0.0,
    MINOR: 0.05,
    RISK: 0.15,
    CRIT: 0.30,
    // HARV is intercepted earlier in calculateYieldEstimation (early return
    // using ActualYield) — this function should no longer be reached with
    // HARV in practice, but kept as a safe default rather than throwing.
    HARV: 0.0,
  };

  return reductions[healthStatus] || 0.0;
}

/**
 * Calculates Yield Estimation for a crop's active harvest cycle.
 *
 * Expects camelCase objects (i.e. already passed through toCamelCaseObject).
 *
 * If the cycle is already harvested (Status === 'COMPLETED' or stage is
 * HARV), this returns the actual recorded yield instead of computing an
 * estimate — an estimate at that point would be fiction; ActualYield is
 * the authoritative number.
 *
 * @param {Object} crop - row from Crop
 * @param {number} crop.cultivatedAreaInAcre
 * @param {string} crop.healthStatus
 * @param {string} [crop.currentStage] - fallback if the cycle doesn't have one
 *
 * @param {Object} harvestCycleInstance - row from HarvestCycleInstance
 * @param {string} harvestCycleInstance.status
 * @param {string} harvestCycleInstance.startDate
 * @param {string} harvestCycleInstance.estdHarvestDate
 * @param {string} harvestCycleInstance.currentStage
 * @param {number} harvestCycleInstance.harvestReadinessPercentage - persisted, 0-100
 * @param {number} [harvestCycleInstance.actualYield]
 *
 * @param {Object} variety - row from CropVariety
 * @param {number} variety.yieldPerAcre
 */
function calculateYieldEstimation(crop, harvestCycleInstance, variety) {
  const currentStage = harvestCycleInstance.currentStage || crop.currentStage;

  // STEP 0: Already-harvested short-circuit — no estimation, just the fact.
  if (
    harvestCycleInstance.status === "COMPLETED" ||
    currentStage === "HARV"
  ) {
    const actual = harvestCycleInstance.actualYield ?? null;
    return {
      estimatedYieldMin: actual,
      estimatedYieldMax: actual,
      confidenceLevel: actual != null ? "ACTUAL" : "UNKNOWN",
    };
  }

  const today = new Date();

  // STEP 1: Base Yield
  const baseYield = variety.yieldPerAcre * crop.cultivatedAreaInAcre;

  let baseMin = baseYield * 0.9;
  let baseMax = baseYield * 1.1;

  // STEP 2: Lifecycle Progress
  // Reading the persisted readiness % instead of recomputing from dates,
  // to stay in sync with computeHarvestReadiness and avoid a second,
  // possibly-diverging progress calculation.
  const progressRatio = clamp(
    (harvestCycleInstance.harvestReadinessPercentage || 0) / 100,
    0,
    1
  );

  // STEP 3: Apply Progress Scaling
  let adjustedMin = baseMin * progressRatio;
  let adjustedMax = baseMax * progressRatio;

  // STEP 4: Health Reduction
  const reduction = getHealthReduction(crop.healthStatus);
  adjustedMin = adjustedMin * (1 - reduction);
  adjustedMax = adjustedMax * (1 - reduction);

  // STEP 5: Delay Penalty (optional)
  if (harvestCycleInstance.estdHarvestDate && today > new Date(harvestCycleInstance.estdHarvestDate)) {
    adjustedMin *= 0.9;
    adjustedMax *= 0.9;
  }

  // STEP 6: Confidence
  let confidence = "LOW";
  if (progressRatio >= 0.8 && crop.healthStatus !== "CRIT") {
    confidence = "HIGH";
  } else if (progressRatio >= 0.5) {
    confidence = "MEDIUM";
  }

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
  healthStatus: "MINOR",
  currentStage: "FRUIT",
};

const harvestCycleInstance = {
  status: "ACTIVE",
  startDate: "2026-01-04",
  estdHarvestDate: "2026-04-06",
  currentStage: "FRUIT",
  harvestReadinessPercentage: 78.5,
};

const variety = {
  yieldPerAcre: 3200,
};

const result = calculateYieldEstimation(crop, harvestCycleInstance, variety);
console.log(result);
*/

// --------------

/**
 * @param {Object} crop - row from Crop
 * @param {Object} harvestCycleInstance - row from HarvestCycleInstance
 */
const computeYieldFactors = (crop, harvestCycleInstance) => {
  const today = new Date();
  const factors = [];

  // 1. Lifecycle Progress Factor — reading persisted readiness %, same as above.
  const progressRatio = clamp(
    (harvestCycleInstance.harvestReadinessPercentage || 0) / 100,
    0,
    1
  );

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

  // 3. Stage Delay Factor
  if (harvestCycleInstance.estdHarvestDate && today > new Date(harvestCycleInstance.estdHarvestDate)) {
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

  // 4. Area Sufficiency Factor
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
};

module.exports = {
  calculateYieldEstimation,
  computeYieldFactors,
};