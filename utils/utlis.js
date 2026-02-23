function pascalToCamel(str) {
  if (!str || typeof str !== "string") return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function toCamelCaseObject(data) {

  // array handling
  if (Array.isArray(data)) {
    return data.map(item => toCamelCaseObject(item));
  }

  // object handling
  if (data !== null && typeof data === "object") {
    const newObj = {};

    Object.keys(data).forEach(key => {
      const newKey = pascalToCamel(key);
      newObj[newKey] = toCamelCaseObject(data[key]); // recursion
    });

    return newObj;
  }

  // primitive values
  return data;
}

module.exports = { toCamelCaseObject };