const db = require("../db");
const { log } = require("./logger.services");
const {
  toCamelCaseObject,
} = require("../utils/utlis");

const groupListingSearchService = (queryParams) => {
    const page = Number(queryParams.page) || 1;
    const pageSize = Number(queryParams.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const orderBy = queryParams.orderBy;
    let orderByQuery;

    const orderByOptions = [
      { option: "CREATED_DESC", query: "GL.CreatedDate DESC"},
      { option: "CREATED_ASC", query: "GL.CreatedDate ASC"},
      { option: "PRICE_DESC", query: "GL.PricePerUnit DESC"},
      { option: "PRICE_ASC", query: "GL.PricePerUnit ASC"},
      { option: "REQ_QTY_DESC", query: "GL.RequiredQuantity DESC"},
      { option: "REQ_QTY_ASC", query: "GL.RequiredQuantity ASC"},
    ];

    if (
      !orderBy || 
      !orderByOptions.map(p => p.option).includes(orderBy)
    ) {
      orderByQuery = orderByOptions.find(p => p.option === 'CREATED_DESC').query;
    } else {
      orderByQuery = orderByOptions.find(p => p.option === orderBy).query;
    }

    const allowedInput = [
      "cropTypeId", 
      "cropVarietyId",
      "createdUser",
      "status"
    ];

    const filterMap = {
      cropTypeId: "GL.CropTypeId",
      cropVarietyId: "GL.VarietyId",
      createdUser: "GL.CreatedUser",
      status: "GL.Status",
    };


    const whereCondtions = [];
    const params = [];

    for (const key of allowedInput) {
      if (key in queryParams) {
        if (
          queryParams[key] !== null &&
          queryParams[key].toString().trim() !== ""
        ) {
          whereCondtions.push(`${filterMap[key]}=?`);
          params.push(queryParams[key]);
        }
      }
    }

    const whereClause = whereCondtions.length > 0 
      ? `WHERE ${whereCondtions.join(" AND ")}` 
      : ""
    ;

   
    // console.log(whereClause);

    const stmnt = `
      SELECT 
        GL.Id,
        GL.BulkRequestId,
        GL.Name,
        BR.BuyerId,
        B.FirstName as BuyerFirstName,
        B.LastName as BuyerLastName,
        B.UserName as BuyerUserName, 
        GL.CropTypeId,
        GL.VarietyId,
        CT.CropName AS CropTypeName,
        V.VarietyName AS CropVarietyName,
        GL.TotalCombinedQuantity,
        GL.PricePerUnit,
        GL.Unit,
        GL.NeededByDate,
        GL.Status,
        GL.RequiredQuantity,
        COUNT(P.Id) AS Participants
      FROM GroupListing GL
      LEFT JOIN BulkRequest BR ON GL.BulkRequestId = BR.Id
      LEFT JOIN CropType CT ON GL.CropTypeId = CT.Id
      LEFT JOIN CropVariety V ON GL.VarietyId = V.Id
      LEFT JOIN Users B ON BR.BuyerId = B.Id
      LEFT JOIN GroupParticipants P ON P.GroupId = GL.Id
      ${whereClause} 
      GROUP BY GL.Id
      ORDER BY ${orderByQuery}
      LIMIT ? OFFSET ?
    `;

    // console.log(stmnt)


    const results = toCamelCaseObject(
      db.prepare(stmnt).all(...params, pageSize, offset),
    );

    const countStmnt = db.prepare(
      `SELECT COUNT(DISTINCT GL.Id) as total 
      FROM GroupListing GL
      ${whereClause}`,
    );
    const { total } = countStmnt.get(...params);

    const resultData = {
      data: toCamelCaseObject(results),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };

    return resultData;
}

module.exports = {
    groupListingSearchService
}