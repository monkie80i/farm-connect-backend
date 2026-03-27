// Pending verifications -  Number
// Active Disputes -  Number
// Total Active Listings - Number
// Order Volume - Number
// Monthly Active Users - For Past 5 Months
// Orders over time -  Past Month
// Most Traded Crops
// Table
// Recent Verifications
// User ID
// User Name
// User Type
// Joining Date
// View Details

const db = require("../db");
const { toCamelCaseObject, addDate, getTodayDate } = require("../utils/utlis");
const {
  successResponse,
  errorResponse,
  notFound,
} = require("../responses/api.responses");

const adminDashboard = (req, res) => {
  try {
    const userId = req.params.userId;
    const pendingVerifications = db
      .prepare(
        `
            SELECT Count(*) as count from Users 
            WHERE IsVerificationFilled = 1 AND IsAdminVerified = 0;   
        `,
      )
      .all();

    const activeDisputes = db
      .prepare(
        `
            SELECT Count(*) as count from OrderDispute 
            WHERE Status = 'OPEN';   
        `,
      )
      .all();

    const totalActiveListings = db
      .prepare(
        `
            SELECT SUM(count) as total
            FROM (
                SELECT COUNT(*) as count FROM CropListing
                UNION ALL
                SELECT COUNT(*) as count FROM GroupListing
            ) as combined;
        `,
      )
      .all();

    const monthlyActiveUsers = db.prepare(`
        SELECT 
            strftime('%Y-%m', o.CreatedDate) AS Month,
            COUNT(DISTINCT o.BuyerId) AS ActiveUsers
        FROM Orders o
        WHERE o.CreatedDate >= date('now', '-5 months', 'start of month')
        GROUP BY strftime('%Y-%m', o.CreatedDate)
        ORDER BY Month ASC;
        `).all();

    const ordersOverTime = db.prepare(`
        SELECT 
        strftime('%Y-%m-%d', CreatedDate) AS Day,
        COUNT(*) AS TotalOrders
        FROM Orders
        WHERE CreatedDate >= date('now', '-1 month')
        GROUP BY strftime('%Y-%m-%d', CreatedDate)
        ORDER BY Day ASC;
    `).all();

    const mostTradedCropTypes = db.prepare(`
        SELECT 
            ct.CropName AS CropType,
            COUNT(o.Id) AS TotalOrders,
            SUM(o.Quantity) AS TotalQuantityTraded
        FROM Orders o
        LEFT JOIN CropListing cl 
            ON o.ListingEntityType = 'I' AND o.ListingId = cl.Id
        LEFT JOIN GroupListing gl 
            ON o.ListingEntityType = 'G' AND o.GroupId = gl.Id
        LEFT JOIN Crop c 
            ON c.Id = COALESCE(cl.CropId, gl.CropId)
        LEFT JOIN CropType ct 
            ON ct.Id = c.CropTypeId
        WHERE ct.CropName IS NOT NULL
        GROUP BY ct.Id, ct.CropName
        ORDER BY TotalOrders DESC
        LIMIT 10;
    `).all();

    const response = {
        pendingVerifications: pendingVerifications[0].count,
        activeDisputes: activeDisputes[0].count,
        totalActiveListings: totalActiveListings[0].total,
        monthlyActiveUsers: monthlyActiveUsers,
        ordersOverTime: ordersOverTime,
        mostTradedCropTypes: mostTradedCropTypes
    }


    return successResponse(res,response);
  } catch (error) {
    console.log("getMarketplaceDetails", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

module.exports = {
  adminDashboard
};
