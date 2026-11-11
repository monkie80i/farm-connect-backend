const db = require("../db");
const { toCamelCaseObject } = require("../utils/utlis");
const {
  successResponse,
  errorResponse,
  notFound,
} = require("../responses/api.responses");
const { getUserById } = require("../services/user.service");
const { 
    inList,
    parseUserId,
    getLastMonths 
} = require("../services/dashboard.services");


const ORDER_ACTIVE_STATUSES = ["NEW", "CONF", "SHIP"];
// OrderLineItems.Status values that count as "active" (farmer dashboard)
const LINE_ITEM_ACTIVE_STATUSES = ["NEW", "CONF", "SHIP"];
// OrderLineItems.Status value that counts as earned revenue
const LINE_ITEM_REVENUE_STATUS = "COMPLETED";
// OrderDispute.Status values that count as active (same set as UX_OrderDispute_ActivePerLineItem)
const DISPUTE_ACTIVE_STATUSES = ["NEW", "ACTIVE"];
// Negotiations.Status values that count as pending
const NEGOTIATION_PENDING_STATUSES = ["ACTIVE"];
// CropListing.Status value for a live listing
const LISTING_ACTIVE_STATUS = "ACTIVE";

const REVENUE_MONTHS = 5;
const NEW_USERS_DAYS = 7;
const ORDER_VOLUME_DAYS = 30;



const getFarmerDashboard = (req, res) => {
  try {
    const userId = parseUserId(req.query.userId);

    const user = getUserById(userId);
    if (!user) {
      return notFound(res, "userId: User not Found!");
    }

    const { activeOrders } = db
      .prepare(
        `
        SELECT COUNT(*) AS activeOrders
        FROM OrderLineItems
        WHERE ListerId = ?
          AND Status IN (${inList(LINE_ITEM_ACTIVE_STATUSES)})
      `,
      )
      .get(userId);

    const { openDisputes } = db
      .prepare(
        `
        SELECT COUNT(*) AS openDisputes
        FROM OrderDispute OD
        JOIN OrderLineItems LI ON OD.OrderLineItemId = LI.Id
        WHERE LI.ListerId = ?
          AND OD.Status IN (${inList(DISPUTE_ACTIVE_STATUSES)})
      `,
      )
      .get(userId);

    const months = getLastMonths(REVENUE_MONTHS);
    const revenueStartDate = `${months[0].key}-01`;

    const revenueRows = toCamelCaseObject(
      db
        .prepare(
          `
          SELECT 
            strftime('%Y-%m', ActualDeliveryDate) AS YearMonth,
            SUM(Amount) AS Total
          FROM OrderLineItems
          WHERE ListerId = ?
            AND Status = ?
            AND ActualDeliveryDate >= ?
          GROUP BY strftime('%Y-%m', ActualDeliveryDate)
        `,
        )
        .all(userId, LINE_ITEM_REVENUE_STATUS, revenueStartDate),
    );

    const revenueByMonth = {};
    revenueRows.forEach((r) => {
      revenueByMonth[r.yearMonth] = r.total;
    });

    const revenuePerMonth = months.map((m) => ({
      month: m.month,
      year: m.year,
      total: Number((revenueByMonth[m.key] || 0).toFixed(2)),
    }));

    const revenueThisMonth = revenuePerMonth[revenuePerMonth.length - 1].total;

    const stages = toCamelCaseObject(
      db
        .prepare(
          `
          SELECT 
            C.CurrentStage AS Stage,
            S.Description AS Description,
            COUNT(*) AS Count
          FROM Crop C
          LEFT JOIN CropStagesLov S ON C.CurrentStage = S.Code
          WHERE C.FarmerId = ?
            AND C.isLifeCycleEnded = 0
          GROUP BY C.CurrentStage, S.Description
          ORDER BY Count DESC
        `,
        )
        .all(userId),
    );

    const totalCrops = stages.reduce((sum, s) => sum + s.count, 0);

    const resultData = {
      activeOrders,
      revenueThisMonth,
      openDisputes,
      revenuePerMonth,
      cropsByStage: {
        total: totalCrops,
        stages,
      },
    };

    return successResponse(res, resultData);
  } catch (error) {
    console.log("getFarmerDashboard", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const getBuyerDashboard = (req, res) => {
  try {
    const userId = parseUserId(req.query.userId);

    const user = getUserById(userId);
    if (!user) {
      return notFound(res, "userId: User not Found!");
    }

    const { activeOrders } = db
      .prepare(
        `
        SELECT COUNT(*) AS activeOrders
        FROM Orders
        WHERE BuyerId = ?
          AND Status IN (${inList(ORDER_ACTIVE_STATUSES)})
      `,
      )
      .get(userId);

    const { pendingNegotiations } = db
      .prepare(
        `
        SELECT COUNT(*) AS pendingNegotiations
        FROM Negotiations
        WHERE CreatedUser = ?
          AND Status IN (${inList(NEGOTIATION_PENDING_STATUSES)})
      `,
      )
      .get(userId);

    const { activeDisputes } = db
      .prepare(
        `
        SELECT COUNT(*) AS activeDisputes
        FROM OrderDispute OD
        JOIN OrderLineItems LI ON OD.OrderLineItemId = LI.Id
        JOIN Orders O ON LI.OrderId = O.Id
        WHERE O.BuyerId = ?
          AND OD.Status IN (${inList(DISPUTE_ACTIVE_STATUSES)})
      `,
      )
      .get(userId);

    const resultData = {
      activeOrders,
      pendingNegotiations,
      activeDisputes,
    };

    return successResponse(res, resultData);
  } catch (error) {
    console.log("getBuyerDashboard", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const getAdminDashboard = (req, res) => {
  try {
    const { activeDisputes } = db
      .prepare(
        `
        SELECT COUNT(*) AS activeDisputes
        FROM OrderDispute
        WHERE Status IN (${inList(DISPUTE_ACTIVE_STATUSES)})
      `,
      )
      .get();

    const { unassignedDisputes } = db
      .prepare(
        `
        SELECT COUNT(*) AS unassignedDisputes
        FROM OrderDispute
        WHERE AssignedAdminId IS NULL
          AND Status IN (${inList(DISPUTE_ACTIVE_STATUSES)})
      `,
      )
      .get();

    const { pendingVerifications } = db
      .prepare(
        `
        SELECT COUNT(*) AS pendingVerifications
        FROM Users
        WHERE IsVerificationFilled = 1
          AND IsAdminVerified = 0
          AND IsAdmin = 0
          AND IsBanned = 0
      `,
      )
      .get();

    const { activeListings } = db
      .prepare(
        `
        SELECT COUNT(*) AS activeListings
        FROM CropListing
        WHERE Status = ?
      `,
      )
      .get(LISTING_ACTIVE_STATUS);

    const { newUsers } = db
      .prepare(
        `
        SELECT COUNT(*) AS newUsers
        FROM Users
        WHERE IsAdmin = 0
          AND CreatedDate >= datetime('now', '-${NEW_USERS_DAYS} days')
      `,
      )
      .get();

    const orderVolume = db
      .prepare(
        `
        SELECT 
          COUNT(*) AS orderCount,
          COALESCE(SUM(TotalAmount), 0) AS totalValue
        FROM Orders
        WHERE CreatedDate >= datetime('now', '-${ORDER_VOLUME_DAYS} days')
      `,
      )
      .get();

    const statuses = toCamelCaseObject(
      db
        .prepare(
          `
          SELECT 
            L.Code AS Status,
            L.Description AS Description,
            COUNT(O.Id) AS Count
          FROM OrderStatusLov L
          LEFT JOIN Orders O ON O.Status = L.Code
          GROUP BY L.Code, L.Description
        `,
        )
        .all(),
    );

    const totalOrders = statuses.reduce((sum, s) => sum + s.count, 0);

    const resultData = {
      activeDisputes,
      unassignedDisputes,
      pendingVerifications,
      activeListings,
      newUsers,
      orderVolume: {
        days: ORDER_VOLUME_DAYS,
        orderCount: orderVolume.orderCount,
        totalValue: Number(orderVolume.totalValue.toFixed(2)),
      },
      ordersByStatus: {
        total: totalOrders,
        statuses,
      },
    };

    return successResponse(res, resultData);
  } catch (error) {
    console.log("getAdminDashboard", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

module.exports = {
  getFarmerDashboard,
  getBuyerDashboard,
  getAdminDashboard,
};
