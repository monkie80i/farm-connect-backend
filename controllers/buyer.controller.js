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
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    let { orderBy } = req.query;

    const orderByOptions = [
      'CREATED_DESC', // newest first
      'PRICE_ASC', // Price: Low to High
      'PRICE_DESC', // Price: High to Low
      'QTY_DESC', // Quantity high to low
    ];
    
    if(!orderBy || !orderByOptions.includes(orderBy)) orderBy = 'CREATED_DESC';

    const allowedInput = [
      'cropTypeId',
      'cropVarietyId',
      'qualityGrade',
    ]
    const colName = {
      'cropTypeId': 'C.CropTypeId',
      'cropVarietyId': 'C.VarietyId',
      'qualityGrade': 'P.QualityGrade',
    };
    const whereCondtions = [];
    const params = [];

    for (const key of allowedInput) {
      if(key in req.query) {
        if(req.query[key] !== null && req.query[key].toString().trim() !== "") {
          whereCondtions.push(`${colName[key]}=?`);
          params.push(req.query[key]);
        }
      }
    }

    if(req.query['search']!==null && req.query['search']!==undefined && req.query['search'].toString().trim() !== "") {
      whereCondtions.push(`(CL.Name LIKE ? OR CL.Description LIKE ?)`);
      params.push(`%${req.query['search']}%`);
      params.push(`%${req.query['search']}%`);
    }

    const orderByClauseMap = {
      'CREATED_DESC': 'CL.CreatedDate ASC',
      'PRICE_ASC': 'CL.PricePerUnit ASC',
      'PRICE_DESC': 'CL.PricePerUnit DESC',
      'QTY_DESC': 'CL.RemainingQuantity DESC',
    }

    const whereClause = whereCondtions.length > 0 ? `WHERE ${whereCondtions.join(" AND ")}`: "";

    const start = new Date();
    const stmnt = `
      SELECT 
        CL.Id,
        CL.Name,
        CL.ImagePath,
        CL.IsNegotiable,
        CL.AvailabilityDate,
        CL.MinimumOrderQuantity,
        CL.PricePerUnit,
        CL.Status,
        CL.RemainingQuantity,
        CL.CreatedDate,
        P.QualityGrade,
        CT.CropName AS CropTypeName,
        V.VarietyName AS CropVarietyName,
        FA.FirstName as FarmerFirstName,
        FA.LastName as FarmerLastName
      FROM CropListing CL
      LEFT JOIN Produce P ON CL.ProduceId = P.Id
      LEFT JOIN Crop C ON P.CropId = C.Id
      LEFT JOIN CropType CT ON C.CropTypeId = CT.Id
      LEFT JOIN CropVariety V ON C.VarietyId = V.Id
      LEFT JOIN Farm F ON C.FarmId = F.Id
      LEFT JOIN Users FA ON C.FarmerId = FA.Id
      ${whereClause} ORDER BY ${orderByClauseMap[orderBy]}
      LIMIT ? OFFSET ?
    `;

    const results = toCamelCaseObject(db
      .prepare(stmnt)
      .all(...params,pageSize,offset)
    );

    const countStmnt = db.prepare(
        `SELECT COUNT(DISTINCT CL.Id) as total 
        FROM CropListing CL
        LEFT JOIN Produce P ON CL.ProduceId = P.Id
        LEFT JOIN Crop C ON P.CropId = C.Id
        ${whereClause}`,
      );
    const { total } = countStmnt.get(...params);

    console.log(`time elapsed with join (${Date.now() - start} ms)`)

    const resultData =  {
      data: toCamelCaseObject(results),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }

    return successResponse(res, toCamelCaseObject(resultData));
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
