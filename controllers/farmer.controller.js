const db = require("../db");
const {
  toCamelCaseObject,
  addDate,getTodayDate
} = require("../utils/utlis");
const { successResponse, errorResponse, notFound} = require("../responses/api.responses");


const getFarmerDashboard = (req, res) => {
  // tested working
  try {
    const userId = Number(req.params.userId);

    const activeCrops = db
      .prepare(`SELECT COUNT(*) as count FROM Crops WHERE UserId = ?`)
      .get(userId);
    const activeOrders = db
      .prepare(
        `
            SELECT COUNT(*) as count 
            FROM Orders 
            WHERE UserId = ? 
            AND Status IN 
            ('PEND', 'NEGO', 'CONF')
        `,
      )
      .get(userId);

    const upcomingHarvests = db
      .prepare(
        `
            SELECT COUNT(*) as count 
            FROM Crops 
            WHERE UserId = ? 
            AND HarvestDate > DATE('now') AND HarvestDate <= DATE('now', '+30 days')
        `,
      )
      .get(userId);

    const recentOrders = db
      .prepare(
        `
            SELECT COUNT(*) as count 
            FROM Orders 
            WHERE UserId = ? 
            AND UpdateDate >= DATE('now', '-30 days')
        `,
      )
      .get(userId);

    const dashboardData = {
      activeCrops: activeCrops.count,
      activeOrders: activeOrders.count,
      upcomingHarvests: upcomingHarvests.count,
      recentOrders: toCamelCaseObject(recentOrders),
    };

    res.status(200).json({ message: "success", data: dashboardData });
  } catch (error) {
    console.log("getFarmerDashboard", error);
    return errorResponse(res,"Something went wrong!",500,error.toString());
  }
};

module.exports = {
  getFarmerDashboard
};
