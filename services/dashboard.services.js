
// ['A','B'] => "'A', 'B'"
const inList = (codes) => codes.map((c) => `'${c}'`).join(", ");

const parseUserId = (value) => {
  if (!value || value.toString().trim() === "" || Number.isNaN(Number(value))) {
    throw new Error("Invalid userId");
  }
  return Number(value);
};

// Last `count` months, oldest first, current month last
const getLastMonths = (count) => {
  const months = [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      month: d.toLocaleString("en-US", { month: "short" }),
      year: d.getFullYear(),
    });
  }

  return months;
};

module.exports = {
    inList,
    parseUserId,
    getLastMonths
}