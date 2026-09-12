const db = require("../db");
const { toCamelCaseObject, addDate, getTodayDate } = require("../utils/utlis");
const {
  successResponse,
  errorResponse,
  notFound,
} = require("../responses/api.responses");
const { buildCropTimelineNew } = require("../services/timeline.V2.services");

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

    const { listingId } = req.params;
    const id = Number(listingId);

    if (!listingId) {
      return errorResponse(res, "listingId are required", 400);
    }

    const listing = toCamelCaseObject(db
      .prepare(`
        SELECT 
          CL.*,
          P.QualityGrade,
          P.HarvestDate,
          P.HarvestCycleInstanceId,
          P.Notes as ProduceSpecificNotes,
          CT.CropName as CropTypeName,
          CT.ScientificName,
          V.VarietyName,
          V.IsHybrid,
          V.ShelfLifeDays,
          V.Notes as VarietySpecificNotes,
          FA.FirstName as FarmerFirstName,
          FA.LastName as FarmerLastName,
          FA.UserName as FarmerUserName,
          F.Name as FarmName,
          F.Address as FarmAddress,
          F.City as FarmCity,
          F.State as FarmState
        FROM CropListing CL
        LEFT JOIN Produce P ON CL.ProduceId = P.Id
        LEFT JOIN Crop C ON P.CropId = C.Id
        LEFT JOIN CropType CT ON C.CropTypeId = CT.Id
        LEFT JOIN CropVariety V ON C.VarietyId = V.Id
        LEFT JOIN Farm F ON C.FarmId = F.Id
        LEFT JOIN Users FA ON C.FarmerId = FA.Id
        WHERE CL.Id=?
      `)
      .get(id)
    );

    if(!listing) {
      throw new Error('getMarketplaceDetails: Listing Not Found!');
    }

    const harvestCycleInstance  = toCamelCaseObject(
      db.prepare(`
        SELECT *
        FROM HarvestCycleInstance
        WHERE Id = ?
      `).get(listing.harvestCycleInstanceId)
    );

    if(!harvestCycleInstance) {
      return errorResponse(res,"Invalid: harvest cycle invalid",400);
    }
    const timeline = buildCropTimelineNew(harvestCycleInstance);
    listing["timeline"] =  timeline;

    return successResponse(res,listing);

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
