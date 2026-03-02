const ExcelJS = require("exceljs");
const fs = require("fs-extra");
const path = require("path");

async function exportToExcel(data, fileName, folder = "exports") {
  if (!data || data.length === 0)
    throw new Error("No data provided");

  // Ensure folder exists
  const dirPath = path.join(__dirname, "..", folder);
  await fs.ensureDir(dirPath);

  const filePath = path.join(dirPath, `${fileName}.xlsx`);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");

  // Create columns dynamically from object keys
  const columns = Object.keys(data[0]).map(key => ({
    header: key.toUpperCase(),
    key: key,
    width: 20
  }));

  worksheet.columns = columns;

  // Add rows
  data.forEach(item => {
    worksheet.addRow(item);
  });

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

  // Save file
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

module.exports = exportToExcel;