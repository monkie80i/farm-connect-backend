function pascalToCamel(str) {
  if (!str || typeof str !== "string") return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function toCamelCaseObject(data) {

  if (Array.isArray(data)) {
    return data.map(item => toCamelCaseObject(item));
  }

  if (data !== null && typeof data === "object") {
    const newObj = {};

    Object.keys(data).forEach(key => {
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
    return 'NULL';
  }
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  return value;
};

module.exports = { toCamelCaseObject, formatSQLValue };