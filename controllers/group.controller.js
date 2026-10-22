const db = require("../db");
const {
  toCamelCaseObject,
  getTodayDate,
  formatSQLValue,
  capitalize,
} = require("../utils/utlis");
const {
  successResponse,
  errorResponse,
  notFound,
} = require("../responses/api.responses");
const { userExists } = require("../services/user.service");
const { stat } = require("fs-extra");
const {
  createGroupListing,
  preparePledgesFromPledgeIds,
  insertGroupLsitngParticipants,
  createBulkReqPledge,
} = require("../services/bulk-request.services");
const { log } = require("../services/logger.services");
const { groupListingSearchService } = require("../services/group.services");

const searchGroupListings = (req, res) => {
  // tested working
  try {
    const depth = 0;
    const indent = " ".repeat(depth * 4);
    log(indent, `searchGroupListings started`);

    const start = new Date();
    const result = groupListingSearchService(req.query);

    log(indent,`searchGroupListings: time elapsed with join (${Date.now() - start} ms)`);
    return successResponse(res, result);

  } catch (error) {
    console.log("searchGroupListings", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};


const groupDetails = (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const stmnt = `SELECT * FROM GroupListing GL WHERE Id = @groupId`;
    const groupListing = toCamelCaseObject(db.prepare(stmnt).get({ groupId }));

    if (!groupListing) {
      return notFound(res, "Group Listing not found!");
    }

    const stmnt2 = `
      SELECT 
        GP.*,
        U.FirstName AS UserFristName,
        U.LastName AS UserLastName,
        U.UserName AS UserUserName,
        C.Name AS CropName,
        C.ExpectedGrowthDurationDays AS CropExpectedGrowthDurationDays
      FROM GroupParticipants GP
      LEFT JOIN Users U ON GP.UserId = U.Id
      LEFT JOIN Crop C ON GP.CropId = C.Id
      WHERE GroupId = @groupId
    `;

    groupListing['participants'] = toCamelCaseObject(db.prepare(stmnt2).all({ groupId }));

    return successResponse(res, groupListing);
  } catch (error) {
    console.log("groupDetails", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const editGroup = (req, res) => {
  // tested working
  try {
    const groupId = Number(req.params.groupId);
    const {
      name,
      adminContribution,
      minRequiredQuantity,
      totalRequiredQuantity,
      status,
      pricePerUnit,
      unit,
      groupAvailabilityDate,
      startDate,
      updatedUser,
    } = req.body;

    // Check if group exists
    const existingGroup = db
      .prepare(`SELECT Id FROM GroupListing WHERE Id = ?`)
      .get(groupId);

    if (!existingGroup) {
      return notFound(res, "Group not found!");
    }

    // Check if user exists
    if (updatedUser && !userExists(updatedUser)) {
      return notFound(res, "User not found!");
    }

    // Build dynamic UPDATE statement
    let updateFields = [];
    let params = [];

    if (name !== undefined) {
      updateFields.push(`Name = ?`);
      params.push(name);
    }
    if (adminContribution !== undefined) {
      updateFields.push(`AdminContribution = ?`);
      params.push(adminContribution);
    }
    if (minRequiredQuantity !== undefined) {
      updateFields.push(`MinRequiredQuantity = ?`);
      params.push(minRequiredQuantity);
    }
    if (totalRequiredQuantity !== undefined) {
      updateFields.push(`TotalRequiredQuantity = ?`);
      params.push(totalRequiredQuantity);
    }
    if (status !== undefined) {
      updateFields.push(`Status = ?`);
      params.push(status);
    }
    if (pricePerUnit !== undefined) {
      updateFields.push(`PricePerUnit = ?`);
      params.push(pricePerUnit);
    }
    if (unit !== undefined) {
      updateFields.push(`Unit = ?`);
      params.push(unit);
    }
    if (groupAvailabilityDate !== undefined) {
      updateFields.push(`GroupAvailabilityDate = ?`);
      params.push(groupAvailabilityDate);
    }
    if (startDate !== undefined) {
      updateFields.push(`StartDate = ?`);
      params.push(startDate);
    }

    // Always update these fields
    updateFields.push(`UpdatedUser = ?`);
    params.push(updatedUser || null);
    updateFields.push(`UpdatedDate = ?`);
    params.push(new Date().toISOString());

    // Add groupId to params for WHERE clause
    params.push(groupId);

    if (updateFields.length > 2) {
      // More than just UpdatedUser and UpdatedDate
      const updateStmnt = db.prepare(`
        UPDATE GroupListing
        SET ${updateFields.join(", ")}
        WHERE Id = ?;
      `);

      updateStmnt.run(...params);
    }

    return successResponse(res);
  } catch (error) {
    console.log("editGroup", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

/**
 * Phase 2.3
 */

const bulkRequestsSearch = (req, res) => {
  try {
    const depth = 0;
    const indent = " ".repeat(depth * 4);
    log(indent, `bulkRequestsSearch started`);

    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    let { orderBy } = req.query;

    const orderByOptions = [
      "CREATED_DESC",
      "CREATED_ASC",
      "QTY_DESC",
      "QTY_ASC",
    ];

    if (!orderBy || !orderByOptions.includes(orderBy)) orderBy = "CREATED_DESC";

    const allowedInput = ["cropTypeId", "cropVarietyId"];
    const colName = {
      cropTypeId: "BR.CropTypeId",
      cropVarietyId: "BR.VarietyId",
    };

    const whereCondtions = [];
    const params = [];

    for (const key of allowedInput) {
      if (key in req.query) {
        if (
          req.query[key] !== null &&
          req.query[key].toString().trim() !== ""
        ) {
          whereCondtions.push(`${colName[key]}=?`);
          params.push(req.query[key]);
        }
      }
    }

    const orderByClauseMap = {
      CREATED_DESC: "BR.CreatedDate DESC",
      CREATED_ASC: "BR.CreatedDate ASC",
      QTY_DESC: "BR.RequiredQuantity DESC",
      QTY_ASC: "BR.RequiredQuantity ASC",
    };

    const whereClause = whereCondtions.length > 0 
      ? `WHERE ${whereCondtions.join(" AND ")}` 
      : ""
    ;

    const start = new Date();
    const stmnt = `
      SELECT 
        BR.Id,
        BR.BuyerId,
        B.FirstName,
        B.LastName,
        B.UserName,
        BR.CropTypeId,
        BR.VarietyId,
        CT.CropName AS CropTypeName,
        V.VarietyName AS CropVarietyName,
        BR.Status,
        BR.RequiredQuantity,
        BR.Unit,
        BR.OfferedPricePerUnit,
        BR.NeededByDate
      FROM BulkRequest BR
      LEFT JOIN CropType CT ON BR.CropTypeId = CT.Id
      LEFT JOIN CropVariety V ON BR.VarietyId = V.Id
      LEFT JOIN Users B ON BR.BuyerId = B.Id
      ${whereClause} 
      ORDER BY ${orderByClauseMap[orderBy]}
      LIMIT ? OFFSET ?
    `;

    const results = toCamelCaseObject(
      db.prepare(stmnt).all(...params, pageSize, offset),
    );

    const countStmnt = db.prepare(
      `SELECT COUNT(DISTINCT BR.Id) as total 
      FROM BulkRequest BR
      ${whereClause}`,
    );
    const { total } = countStmnt.get(...params);

    log(indent,`bulkRequestsSearch: time elapsed with join (${Date.now() - start} ms)`);

    const resultData = {
      data: toCamelCaseObject(results),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };

    return successResponse(res, resultData);
  } catch (error) {
    console.log("bulkRequestsSearch", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const bulkRequestsCreate = (req, res) => {
  try {
    const depth = 0;
    const indent = " ".repeat(depth * 4);
    log(indent, `bulkRequestsCreate started`);

    // need some validations taht dates are in order

    const {
      buyerId,
      cropTypeId,
      varietyId,
      requiredQuantity,
      offeredPricePerUnit,
      deliveryLocation,
      neededByDate,
      pledgeDeadline,
      confirmationDeadline,
      minLeadDays,
    } = req.body;

    const stmnt = `
      INSERT INTO BulkRequest
      (
        BuyerId,
        CropTypeId,
        VarietyId,
        RequiredQuantity,
        OfferedPricePerUnit,
        DeliveryLocation,
        NeededByDate,
        PledgeDeadline,
        ConfirmationDeadline,
        MinLeadDays
        
      ) VALUES (
        @buyerId,
        @cropTypeId,
        @varietyId,
        @requiredQuantity,
        @offeredPricePerUnit,
        @deliveryLocation,
        @neededByDate,
        @pledgeDeadline,
        @confirmationDeadline,
        @minLeadDays
      )
    `;

    const createTxn = db.transaction(() => {
      const result = db.prepare(stmnt).run({
        buyerId,
        cropTypeId,
        varietyId,
        requiredQuantity,
        offeredPricePerUnit,
        deliveryLocation,
        neededByDate,
        pledgeDeadline,
        confirmationDeadline,
        minLeadDays,
      });
      // throw new Error("__ROLL_BACK__");
      return result;
    })

    const result = createTxn();
    
    log(indent, `bulkRequestsCreate end`);

    return successResponse(res, result.lastInsertRowid);
  } catch (error) {
    console.log("bulkRequestsCreate", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const bulkRequestsDetail = (req, res) => {
  try {
    const { reqId } = req.params;

    const request = toCamelCaseObject(
      db.prepare(`
        SELECT 
          B.FirstName as BuyerFirstName,
          B.LastName as BuyerLastName,
          B.UserName as BuyerUserName,
          CT.CropName AS CropTypeName,
          V.VarietyName AS CropVarietyName,
          BR.*
        FROM BulkRequest BR
        LEFT JOIN CropType CT ON BR.CropTypeId = CT.Id
        LEFT JOIN CropVariety V ON BR.VarietyId = V.Id
        LEFT JOIN Users B ON BR.BuyerId = B.Id
        WHERE BR.Id = ?
      `).get(reqId),
    );

    if (!request) {
      return notFound(res, "Bulk Request not found!");
    }

    const pledges = toCamelCaseObject(
      db
      .prepare(`
        SELECT 
          F.FirstName as FarmerFirstName,
          F.LastName as FarmerLastName,
          F.UserName as FarmerUserName,
          BRP.*
        FROM BulkRequestPledge BRP
        LEFT JOIN Users F ON BRP.FarmerId = F.Id
        WHERE BRP.BulkRequestId = ?
      `)
      .all(reqId),
    );

    request["pledges"] = pledges;

    return successResponse(res, request);
  } catch (error) {
    console.log("bulkRequestsDetail", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const bulkRequestsUpdate = (req, res) => {
  try {
    const depth = 0;
    const indent = " ".repeat(depth * 4);
    log(indent, `bulkRequestsUpdate started`);
    const reqId = Number(req.params.reqId);

    const request = toCamelCaseObject(
      db.prepare("SELECT * FROM BulkRequest WHERE Id = ?").get(reqId),
    );

    if (!request) {
      return notFound(res, "Bulk Request not found!");
    }

    const incomingData = req.body;
    const patchableFields = [
      "RequiredQuantity",
      "DeliveryLocation",
      "NeededByDate",
      "PledgeDeadline",
      "ConfirmationDeadline",
      "MinLeadDays",
      "Status",
    ];

    const incomingKeys = Object.keys(incomingData).filter((k) =>
      patchableFields.includes(capitalize(k)),
    );

    if (incomingKeys.length === 0) {
      throw new Error("bulkRequestsUpdate: No incoming data.");
    }

    /**  Confirmation validation */
    if (incomingData["status"] && incomingData["status"] === "CONFIRMED") {
      if (
        !incomingData["pledges"] ||
        !Array.isArray(incomingData["pledges"]) ||
        incomingData["pledges"].length === 0
      ) {
        throw new Error(
          "bulkRequestsUpdate: pledges invalid (Array of pledge ids)",
        );
      }

      if (!incomingData["groupListingName"]) {
        throw new Error(
          "bulkRequestsUpdate: groupListingName is required for confirmation",
        );
      }
    }

    const updatekeys = [];
    const updateValues = [];

    for (const key of incomingKeys) {
      updatekeys.push(`${capitalize(key)} = ?`);
      updateValues.push(incomingData[key]);
    }

    updatekeys.push(`UpdatedDate = CURRENT_TIMESTAMP`);
    const updateClause = `SET ${updatekeys.join(", ")}`;

    const updateTxn = db.transaction(() => {
      log(indent, `bulkRequestsUpdate txn start`);
      
      const stmnt = `
        UPDATE BulkRequest
        ${updateClause}
        WHERE Id = ?;
      `;

      const result = db.prepare(stmnt).run(...updateValues, reqId);
      log(indent, `bulkRequestsUpdate txn end`);

      if (incomingData["status"] && incomingData["status"] === "CONFIRMED") {
        log(indent, `bulkRequestsUpdate txn group listng creation start`);

        const groupListingName = incomingData["groupListingName"];
        const { pledges, combinedQuantity } = preparePledgesFromPledgeIds(
          reqId,
          incomingData["pledges"],
          "bulkRequestsUpdate",
          depth + 1,
        );

        // create Group Listing
        const groupListingResult = createGroupListing(
          request,
          groupListingName,
          combinedQuantity,
          pledges.length,
        );

        const groupListingId = groupListingResult.lastInsertRowid;

        for (const pledge of pledges) {
          insertGroupLsitngParticipants(
            pledge.farmerId,
            pledge.cropId,
            groupListingId,
            pledge.pledgedQuantity,
            pledge.pledgeDeliveryDate,
          );
        }
        log(indent, `bulkRequestsUpdate txn group listng creation end.`);

        // should i create order here? is yes how?
      }

      // throw new Error('_ROLL_BACK_');
      return result;
    });

    const result = updateTxn();
    log(indent, `bulkRequestsUpdate end`);

    return successResponse(res, result.changes);
  } catch (error) {
    console.log("bulkRequestsUpdate", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const bulkRequestsCreatePledge = (req, res) => {
  try {
    const depth = 0;
    const indent = " ".repeat(depth * 4);
    log(indent, `bulkRequestsCreatePledge started`);

    const { reqId } = req.params;
    const { farmerId, cropId, pledgedQuantity, pledgeDeliveryDate } = req.body;

    const bulkRequest = toCamelCaseObject(
      db.prepare('SELECT * FROM BulkRequest WHERE Id=?')
      .get(reqId)
    );

    if(!bulkRequest) {
      return notFound(res,'Bulk Request Not Found!');
    }

    const crop = toCamelCaseObject(
      db.prepare('SELECT * FROM Crop WHERE Id=?')
      .get(cropId)
    );

    if(!crop) {
      return notFound(res,'Crop Not Found!');
    }

    if(bulkRequest.cropTypeId !== crop.cropTypeId) {
      throw new Error("Crop Type doesn't match to the Crop.");
    }

    if(bulkRequest.varietyId !== crop.varietyId) {
      throw new Error("Varitey doesn't match to the Crop.");
    }

    if(pledgedQuantity > bulkRequest.requiredQuantity) {
      throw new Error("Pledge Quantity cannot be greater than Required Quantity.");
    }


    const pledgeExist = db.prepare(`
      SELECT * FROM BulkRequestPledge 
      WHERE BulkRequestId = @reqId AND FarmerId=@farmerId
    `).all({reqId, farmerId}).length > 0 ? true : false;

    if(pledgeExist) {
      throw new Error("Farmer has already pledged on the Bulk Request.");
    }

    log(indent, `bulkRequestsCreatePledge Validation Complete.`);

    const pledgeCreateTxn = db.transaction(() => {
      const result = createBulkReqPledge(reqId,farmerId,cropId,pledgedQuantity,pledgeDeliveryDate);
      log(indent, `bulkRequestsCreatePledge creation Complete`);

      // throw new Error('__ROLL_BACK__');
      return result;
    });

    const result = pledgeCreateTxn();
    log(indent, `bulkRequestsCreatePledge end.`);
    successResponse(res, result.lastInsertRowid);

  } catch (error) {
    console.log("bulkRequestsCreatePledge", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const bulkRequestsSelectPledge = (req, res) => {
  try {
    const pledgeId = Number(req.params.pledgeId);
    const { value } = req.body;

    const pledge = toCamelCaseObject(
      db.prepare('SELECT * FROM BulkRequestPledge WHERE Id=?')
      .get(pledgeId)
    );

    if(!pledge) {
      return notFound(res,'Pledge Not Found!');
    }

    if(value === undefined) {
      throw new Error("value is mandatory!");
    }

    const bulkReq = toCamelCaseObject(
      db.prepare('SELECT * FROM BulkRequest WHERE Id = ?')
      .get(pledge.bulkRequestId)
    );

    let committedQuantity = bulkReq.committedQuantity;
    if(value === true) {
      committedQuantity += pledge.pledgedQuantity;
    } else {
      committedQuantity -= pledge.pledgedQuantity;
    }

    console.log("Comitted Qty",committedQuantity)
    const isSelected = value === true ? 1 : 0;

    const updateTxn = db.transaction(()=> {
      const stmnt =
      "UPDATE BulkRequestPledge SET IsSelected = @isSelected WHERE Id=@pledgeId";
      const result = db.prepare(stmnt).run({ isSelected, pledgeId });

      const stmnt2 = 
      "UPDATE BulkRequest SET CommittedQuantity = @committedQuantity WHERE Id = @id";
      db.prepare(stmnt2).run({ committedQuantity, id: pledge.bulkRequestId });

      return result
    });

    const result = updateTxn();

    return successResponse(res, result.changes);
  } catch (error) {
    console.log("bulkRequestsSelectPledge", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const bulkRequestsDeletePledge = (req, res) => {
  try {
    const pledgeId = Number(req.params.pledgeId);

    const pledge = toCamelCaseObject(
      db.prepare('SELECT * FROM BulkRequestPledge WHERE Id=?')
      .get(pledgeId)
    );

    if(!pledge) {
      return notFound(res,'Pledge Not Found!');
    }

    const bulkReq = toCamelCaseObject(
      db.prepare('SELECT * FROM BulkRequest WHERE Id = ?')
      .get(pledge.bulkRequestId)
    );

    let committedQuantity = bulkReq.committedQuantity;
    if(pledge.isSelected === 1) {
        committedQuantity -= pledge.pledgedQuantity;
    }
  

    const deleteTxn = db.transaction(() => {

      if(pledge.isSelected === 1) {
        const stmnt2 = 
        "UPDATE BulkRequest SET CommittedQuantity = @committedQuantity WHERE Id = @id";
        db.prepare(stmnt2).run({ committedQuantity, id: pledge.bulkRequestId });
      }

      const stmt = db.prepare(`DELETE FROM BulkRequestPledge WHERE Id = ?`);
      stmt.run(pledgeId);

    });

    deleteTxn();

    return successResponse(res, null, "Pledge deleted successfully!");
  } catch (error) {
    console.log("bulkRequestsDeletePledge", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};


module.exports = {
  searchGroupListings,
  groupDetails,
  editGroup,
  bulkRequestsSearch,
  bulkRequestsCreate,
  bulkRequestsDetail,
  bulkRequestsUpdate,
  bulkRequestsCreatePledge,
  bulkRequestsSelectPledge,
  bulkRequestsDeletePledge,
};
