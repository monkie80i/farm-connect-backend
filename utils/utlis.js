function pascalToCamel(str) {
  if (!str || typeof str !== "string") return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function toCamelCaseObject(data) {
  if (Array.isArray(data)) {
    return data.map((item) => toCamelCaseObject(item));
  }

  if (data !== null && typeof data === "object") {
    const newObj = {};

    Object.keys(data).forEach((key) => {
      const newKey = pascalToCamel(key);
      newObj[newKey] = toCamelCaseObject(data[key]); // recursion
    });

    return newObj;
  }

  return data;
}

// Helper function to safely format SQL values
const formatSQLValue = (value) => {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "string") {
    return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return value;
};

const cropStageFactory = (stageName, stageOrder, startDate, endDate) => {
  return { stageName, stageOrder, startDate, endDate };
};

const addDate = (dateString, days) => {
  const date = new Date(dateString);
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate.toISOString().split("T")[0]; // '2026-02-25';
};

const compareDates = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  if (d1 > d2) return 1; // date1 is greater
  if (d1 < d2) return -1; // date2 is greater
  return 0; // dates are equal
};

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const daysBetween = (date1, date2) => {
  const diffTime = new Date(date2) - new Date(date1);
  // console.log("inside datesbetween",date1, date2,new Date(date2),new Date(date1))
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

const convertToAcre = (value, unit) => {
  if (typeof value !== "number" || value < 0) {
    throw new Error("Invalid value");
  }

  const conversionToSqMeter = {
    ACRE: 4046.8564224,
    HA: 10000,
    SQM: 1,
    SQFT: 0.092903,
    SQYD: 0.83612736,
    CENT: 40.468564224,   // 1 cent = 435.6 sqft
    GUNTA: 101.17141056,  // 1089 sqft
    BIGH: 2500,           // ⚠ varies by region (example placeholder)
    KANAL: 505.8570528,   // 5445 sqft
    MARLA: 25.29285264    // 272.25 sqft approx
  };

  const normalizedUnit = unit.toUpperCase();

  if (!conversionToSqMeter[normalizedUnit]) {
    throw new Error(`Unsupported unit: ${unit}`);
  }

  // Step 1: Convert to square meters
  const valueInSqMeter = value * conversionToSqMeter[normalizedUnit];

  // Step 2: Convert sqm to acres
  const acres = valueInSqMeter / conversionToSqMeter.ACRE;

  return acres;
}

/**
 * Returns a date string N days from given date.
 * @param {Date|string|null} inputDate  (optional) JS Date or date string
 * @param {number} days  Number of days to add (default 5)
 * @param {boolean} fullISO  true => full ISO, false => only YYYY-MM-DD
 */
function getFutureDateISO(inputDate = null, days = 5, fullISO = false) {
    // Step 1: normalize input
    let baseDate = inputDate ? new Date(inputDate) : new Date();

    if (isNaN(baseDate)) {
        throw new Error("Invalid date passed");
    }

    // Step 2: create UTC date (THIS avoids timezone bugs)
    const utcDate = new Date(Date.UTC(
        baseDate.getUTCFullYear(),
        baseDate.getUTCMonth(),
        baseDate.getUTCDate()
    ));

    // Step 3: add days safely
    utcDate.setUTCDate(utcDate.getUTCDate() + days);

    // Step 4: output
    if (fullISO) {
        return utcDate.toISOString();
    }

    // only date part
    return utcDate.toISOString().split("T")[0];
}


function capitalizeFirstLetter(str) {
  if (!str) return str; // Handle empty strings safely
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  toCamelCaseObject,
  formatSQLValue,
  cropStageFactory,
  addDate,
  compareDates,
  getTodayDate,
  daysBetween,
  convertToAcre,
  getFutureDateISO,
  capitalizeFirstLetter
};
