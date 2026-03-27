const db = require("../db");
const { toCamelCaseObject, addDate, getTodayDate } = require("../utils/utlis");
const {
  successResponse,
  errorResponse,
  notFound,
} = require("../responses/api.responses");

const getBuyerDashboard = (req, res) => {
  try {
    const userId = Number(req.params.userId);

    const activeOrders = db.prepare(`
      SELECT COUNT(*) as count 
      FROM Orders 
      WHERE BuyerId = ? 
      AND Status IN ('PEND', 'NEGO', 'CONF')
    `).get(userId);                                

    const pendingNegotiations = db.prepare(`
      SELECT COUNT(*) as count 
      FROM Negotiation 
      WHERE CreatedUser = ? 
      AND IsAccepted = 0
    `).get(userId);                               

    const recentOrders = db.prepare(`
      SELECT * 
      FROM Orders 
      WHERE BuyerId = ? 
      AND UpdateDate >= DATE('now', '-30 days') 
      LIMIT 5
    `).all(userId);                                  

    const recentNegotiations = db.prepare(`
      SELECT *
      FROM Negotiation 
      WHERE CreatedUser = ?                          
      AND UpdateDate >= DATE('now', '-30 days')
      LIMIT 5
    `).all(userId);                                 

    const dashboardData = {
      activeOrders: activeOrders.count,
      pendingNegotiations: pendingNegotiations.count,
      recentOrders: toCamelCaseObject(recentOrders),
      recentNegotiations: toCamelCaseObject(recentNegotiations),
    };

    return successResponse(res, dashboardData);
  } catch (error) {
    console.log("getBuyerDashboard", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const marketPlaceSearch = (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const { cropTypeId, cropVarietyId, sortBy, listingFilter } = req.query;

    const results = db.prepare(`
      SELECT
          'CROP' AS ListingType,
          cl.Id AS ListingId,
          cl.CropId,
          ct.CropName,
          cv.VarietyName,
          cl.AvailableQuantity AS Quantity,
          cl.PricePerUnit,
          cl.Unit,
          cl.AvailabilityDate,
          cl.IsNegotiable,
          cl.MinimumOrderQuantity,
          NULL AS GroupName,
          NULL AS GroupStatus,
          NULL AS NumberOfParticipants,
          cl.CreatedDate,
          cl.UpdatedDate
      FROM CropListing cl
      JOIN Crop c ON c.Id = cl.CropId
      JOIN CropType ct ON ct.Id = c.CropTypeId
      LEFT JOIN CropVariety cv ON cv.Id = c.VarietyId
      WHERE
          (:cropTypeId IS NULL OR c.CropTypeId = :cropTypeId)
          AND (:cropVarietyId IS NULL OR c.VarietyId = :cropVarietyId)
          AND (:listingFilter = 'ALL' OR :listingFilter = 'INDIVIDUAL')
      UNION ALL
      SELECT
          'GROUP' AS ListingType,
          gl.Id AS ListingId,
          gl.CropId,
          ct.CropName,
          cv.VarietyName,
          gl.TotalRequiredQuantity AS Quantity,
          gl.PricePerUnit,
          gl.Unit,
          gl.GroupAvailabilityDate AS AvailabilityDate,
          NULL AS IsNegotiable,
          gl.MinRequiredQuantity AS MinimumOrderQuantity,
          gl.Name AS GroupName,
          gl.Status AS GroupStatus,
          gl.NumberOfParticipants,
          gl.CreatedDate,
          gl.UpdatedDate
      FROM GroupListing gl
      JOIN Crop c ON c.Id = gl.CropId
      JOIN CropType ct ON ct.Id = c.CropTypeId
      LEFT JOIN CropVariety cv ON cv.Id = c.VarietyId
      WHERE
          gl.Status = 'OPEN'
          AND (:cropTypeId IS NULL OR c.CropTypeId = :cropTypeId)
          AND (:cropVarietyId IS NULL OR c.VarietyId = :cropVarietyId)
          AND (:listingFilter = 'ALL' OR :listingFilter = 'GROUP')
      ORDER BY
          CASE WHEN :sortBy = 'UpdatedDate' THEN UpdatedDate ELSE CreatedDate END DESC
      LIMIT :limit OFFSET :offset
    `).all({
      cropTypeId: cropTypeId || null,     
      cropVarietyId: cropVarietyId || null,
      listingFilter: listingFilter || 'ALL',
      sortBy: sortBy || 'CreatedDate',
      limit: pageSize,
      offset: offset
    });

    return successResponse(res, toCamelCaseObject(results));
  } catch (error) {
    console.log("marketPlaceSearch", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const getMarketplaceDetails = (req, res) => {
  try {
    const { listingId, listingType } = req.params;
    const id = Number(listingId);

    if (!listingId || !listingType) {
      return errorResponse(res, "listingId and listingType are required", 400);
    }

    const type = listingType.toUpperCase();

    if (type !== "CROP" && type !== "GROUP") {
      return errorResponse(res, "listingType must be CROP or GROUP", 400);
    }

    if (type === "CROP") {
      const row = db.prepare(`
        SELECT
            cl.Id                                         AS ListingId,
            'CROP'                                        AS ListingType,
            ct.CropName                                   AS ListingName,
            ct.CropName                                   AS CropType,
            cv.VarietyName,
            cl.AvailableQuantity,
            cl.Unit,
            cl.PricePerUnit,
            cl.IsNegotiable,
            cl.MinimumOrderQuantity,
            cl.AvailabilityDate,
            c.HealthStatus,
            c.CurrentStage,
            c.CultivatedArea,
            c.CultivatedAreaUnit,
            f.Name                                        AS FarmName,
            f.City                                        AS FarmCity,
            f.State                                       AS FarmState,
            u.Id                                          AS FarmerId,
            u.UserName                                    AS FarmerUsername,
            u.FirstName || ' ' || u.LastName              AS FarmerFullName,
            u.PhoneCode,
            u.Phone
        FROM CropListing cl
        JOIN Crop c              ON c.Id  = cl.CropId
        JOIN CropType ct         ON ct.Id = c.CropTypeId
        JOIN Users u             ON u.Id  = c.FarmerId
        JOIN Farm f              ON f.Id  = c.FarmId
        LEFT JOIN CropVariety cv ON cv.Id = c.VarietyId
        WHERE cl.Id = ?
      `).get(id);

      if (!row) {
        return errorResponse(res, "Listing not found", 404);
      }

      // Shape the response — farmer as a list for consistency with group
      const result = {
        listingId:           row.ListingId,
        listingType:         row.ListingType,
        listingName:         row.ListingName,
        cropType:            row.CropType,
        varietyName:         row.VarietyName,
        availableQuantity:   row.AvailableQuantity,
        unit:                row.Unit,
        pricePerUnit:        row.PricePerUnit,
        isNegotiable:        Boolean(row.IsNegotiable),
        minimumOrderQty:     row.MinimumOrderQuantity,
        availabilityDate:    row.AvailabilityDate,
        healthStatus:        row.HealthStatus,
        currentStage:        row.CurrentStage,
        cultivatedArea:      row.CultivatedArea,
        cultivatedAreaUnit:  row.CultivatedAreaUnit,
        farm: {
          name:  row.FarmName,
          city:  row.FarmCity,
          state: row.FarmState,
        },
        farmers: [
          {
            id:       row.FarmerId,
            username: row.FarmerUsername,
            fullName: row.FarmerFullName,
            phone:    row.PhoneCode && row.Phone
                        ? `${row.PhoneCode}${row.Phone}`
                        : null,
          }
        ],
        // // Data needed by the frontend for button redirects
        // actions: {
        //   startNegotiation: row.IsNegotiable
        //     ? { listingId: row.ListingId, listingType: "CROP" }
        //     : null,                                  // null = hide the button
        //   placeOrder: {
        //     listingId:   row.ListingId,
        //     listingType: "CROP"
        //   }
        // }
      };

      return successResponse(res, result);

    } else {
      // GROUP — returns one row per participant, aggregate farmers
      const rows = db.prepare(`
        SELECT
            gl.Id                                         AS ListingId,
            'GROUP'                                       AS ListingType,
            gl.Name                                       AS ListingName,
            ct.CropName                                   AS CropType,
            cv.VarietyName,
            gl.TotalCombinedQuantity                      AS AvailableQuantity,
            gl.Unit,
            gl.PricePerUnit,
            NULL                                          AS IsNegotiable,
            gl.MinRequiredQuantity                        AS MinimumOrderQuantity,
            gl.GroupAvailabilityDate                      AS AvailabilityDate,
            gl.Status                                     AS GroupStatus,
            gl.NumberOfParticipants,
            gl.StartDate,
            gl.TerminationDate,
            u.Id                                          AS FarmerId,
            u.UserName                                    AS FarmerUsername
        FROM GroupListing gl
        JOIN Crop c               ON c.Id       = gl.CropId
        JOIN CropType ct          ON ct.Id      = c.CropTypeId
        JOIN GroupParticipants gp ON gp.GroupId = gl.Id
        JOIN Users u              ON u.Id       = gp.UserId
        LEFT JOIN CropVariety cv  ON cv.Id      = c.VarietyId
        WHERE gl.Id = ?
      `).all(id);

      if (!rows.length) {
        return errorResponse(res, "Listing not found", 404);
      }

      const base = rows[0];

      const result = {
        listingId:          base.ListingId,
        listingType:        base.ListingType,
        listingName:        base.ListingName,
        cropType:           base.CropType,
        varietyName:        base.VarietyName,
        availableQuantity:  base.AvailableQuantity,
        unit:               base.Unit,
        pricePerUnit:       base.PricePerUnit,
        isNegotiable:       false,                  // group listings are never negotiable
        minimumOrderQty:    base.MinimumOrderQuantity,
        availabilityDate:   base.AvailabilityDate,
        groupStatus:        base.GroupStatus,
        numberOfParticipants: base.NumberOfParticipants,
        startDate:          base.StartDate,
        terminationDate:    base.TerminationDate,
        // Aggregate one row per farmer
        farmers: rows.map(r => ({
          id:       r.FarmerId,
          username: r.FarmerUsername,
        })),
        // actions: {
        //   startNegotiation: null,                   // group listings don't support negotiation
        //   placeOrder: {
        //     listingId:   base.ListingId,
        //     listingType: "GROUP"
        //   }
        // }
      };

      return successResponse(res, result);
    }

  } catch (error) {
    console.log("getMarketplaceDetails", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

module.exports = {
  getBuyerDashboard,
  marketPlaceSearch,
  getMarketplaceDetails
};
