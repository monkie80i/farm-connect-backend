const db = require("../db");
const { toCamelCaseObject, capitalize } = require("../utils/utlis");
const {
  successResponse,
  errorResponse,
  notFound,
} = require("../responses/api.responses");
const { log } = require("../services/logger.services");
const { getUserById } = require("../services/user.service");
const { 
  insertDisputeRecord,
  prepareDisputeFiles,
  insertFilesRecord
} = require("../services/dispute.services");

  
const searchOrderDisputes = (req, res) => {
  try {
    const queryParams = req.query;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const orderBy = req.query.orderBy;

    let orderByQuery;

    const orderByOptions = [
      { option: "CREATED_DESC", query: "O.CreatedDate DESC" },
      { option: "CREATED_ASC", query: "O.CreatedDate ASC" },
    ];

    if (!orderBy || !orderByOptions.map((p) => p.option).includes(orderBy)) {
      orderByQuery = orderByOptions.find(
        (p) => p.option === "CREATED_DESC",
      ).query;
    } else {
      orderByQuery = orderByOptions.find((p) => p.option === orderBy).query;
    }

    const allowedInput = ["disputeType", "status", "assignedAdminId","lineItemId"];

    const filterMap = {
      disputeType: "OD.DisputeType",
      status: "OD.Status",
      assignedAdminId: "OD.AssignedAdminId",
      lineItemId: "OD.OrderLineItemId"
    };

    const whereCondtions = [];
    const params = [];

    // this is a repeating code, so helperize it
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

    /**
     * Special Case: 'userId'
     * If Farmer: LineItem.ListerId
     * If Buyer: Order.BuyerId
     */
    if (
      queryParams["userId"] !== undefined &&
      queryParams["userId"] !== null &&
      queryParams["userId"].toString().trim() !== ""
    ) {
      whereCondtions.push(`(LI.ListerId = ? OR O.BuyerId = ?)`);
      params.push(queryParams["userId"]);
      params.push(queryParams["userId"]);
    }

    const whereClause =
      whereCondtions.length > 0 ? `WHERE ${whereCondtions.join(" AND ")}` : "";
    const stmnt = `
      SELECT 
        OD.Id,
        OD.OrderLineItemId,
        COALESCE(CL.Name,GL.Name) as ListingName,
        OD.DisputeType,
        OD.Status,
        OD.AssignedAdminId,
        OD.CreatedUser,
        C.FirstName as FilerFirstName,
        C.LastName as FilerLastName,
        A.FirstName as AdminFirstName,
        A.LastName as AdminLastName,
        OD.CreatedDate,
        OD.UpdatedDate
      FROM OrderDispute OD
      LEFT JOIN OrderLineItems LI ON OD.OrderLineItemId = LI.Id
      LEFT JOIN Orders O ON LI.OrderId = O.Id
      LEFT JOIN GroupListing GL ON LI.GroupId = GL.Id
      LEFT JOIN CropListing CL ON LI.ListingId = CL.Id
      LEFT JOIN Users C ON OD.CreatedUser = C.Id
      LEFT JOIN Users A ON OD.AssignedAdminId = A.Id
      ${whereClause} 
      ORDER BY ${orderByQuery}
      LIMIT ? OFFSET ?
    `;

    const results = toCamelCaseObject(
      db.prepare(stmnt).all(...params, pageSize, offset),
    );
    const countStmnt = db.prepare(
      `SELECT COUNT(DISTINCT OD.Id) as total 
      FROM OrderDispute OD
      LEFT JOIN OrderLineItems LI ON OD.OrderLineItemId = LI.Id
      LEFT JOIN Orders O ON LI.OrderId = O.Id
      ${whereClause}`,
    );
    const { total } = countStmnt.get(...params);

    const resultData = {
      data: results,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };

    return successResponse(res, resultData);
  } catch (error) {
    console.log("searchOrderDisputes", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const createOrderDispute = (req, res) => {
  try {
    const { 
      orderLineItemId, 
      disputeType, 
      disputeTypeDesc, 
      description, 
      userId
    } =
      req.body;

    let diputeTypeOtherDesc;

    if (
      !orderLineItemId ||
      orderLineItemId.toString().trim() === "" ||
      Number(orderLineItemId) === NaN
    ) {
      throw new Error("Invalid orderLineItemId");
    }

    if (
      !disputeType ||
      disputeType.toString().trim() === "" ||
      typeof disputeType !== "string"
    ) {
      throw new Error("Invalid disputeType");
    }

    const type = toCamelCaseObject(
      db.prepare('SELECT * FROM DisputeTypesLov WHERE Code = ?')
      .get(disputeType)
    )

    if(disputeType === "OTHR") {
      if (
        !disputeTypeDesc ||
        disputeTypeDesc.toString().trim() === "" ||
        typeof disputeTypeDesc !== "string"
      ) {
        throw new Error("disputeTypeDesc required for disputeType other");
      }

      diputeTypeOtherDesc = disputeTypeDesc;
    } else {
      diputeTypeOtherDesc = null
    }

    if (
      !description ||
      description.toString().trim() === "" ||
      typeof description !== "string"
    ) {
      throw new Error("Invalid description");
    }

    if (
      !userId ||
      userId.toString().trim() === "" ||
      Number(userId) === NaN
    ) {
      throw new Error("Invalid userId");
    }


    const files = req.files.filter((f) => f.fieldname === 'files');
    const user = getUserById(userId);

    if (!user) {
      return notFound(res, "userId: User not Found!");
    }

    const lineItemStmnt = `
      SELECT 
        LI.Id,
        LI.ListerId,
        O.BuyerId 
      FROM OrderLineItems LI
      LEFT JOIN Orders O ON LI.OrderId = O.Id
      WHERE LI.Id = ?
    `;
    const lineItem = toCamelCaseObject(
      db.prepare(lineItemStmnt).get(orderLineItemId)
    );

    if(!lineItem) {
      return notFound(res, "orderLineItemId: Line Item not Found!");
    }

    if(![lineItem.listerId,lineItem.buyerId].includes(Number(userId))) {
      throw new Error("User has no relateion to the Order Line Item!");
    }


    const createTxn = db.transaction(() => {

      const result = insertDisputeRecord(
        Number(orderLineItemId),
        disputeType,
        diputeTypeOtherDesc,
        description,
        Number(userId),
      );


      if(files.length > 0) {
        const newFilesData = prepareDisputeFiles(files);
        newFilesData.forEach(d => {
          insertFilesRecord(
            d.originalName,
            d.fileName,
            d.fullPath,
            d.url,
            d.size,
            'OrderDispute',
            result.lastInsertRowid,
            userId
          )
        })
      }

      // throw new Error("__ROLL_BACK__");
      return result;
    });
    
    const result = createTxn();

    return successResponse(res, result.lastInsertRowid);
  } catch (error) {
    console.log("createOrderDispute", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const getOrderDisputeDetails = (req, res) => {
  try {
    const disputeId = Number(req.params.id);
    const dispute = toCamelCaseObject(
      db.prepare(`
        SELECT 
          OD.*,
          LI.Quantity,
          LI.DeliveryStatus,
          LI.Status as OrderLineItemStatus,
          LI.Amount,
          LI.EstimatedDeliveryDate,
          LI.ActualDeliveryDate,
          LI.DeliveryAttemptCount,
          COALESCE(CL.Name,GL.Name) as ListingName,
          COALESCE(C.CropTypeId,GL.CropTypeId) as CropTypeId,
          COALESCE(C.VarietyId,GL.VarietyId) as VarietyId,
          LI.ListingEntityType,
          LI.ListingId,
          LI.GroupId,
          CL.ImagePath,
          LI.ListerId,
          S.FirstName as SellerFirstName,
          S.LastName as SellerLastName,
          O.BuyerId
        FROM OrderDispute OD
        LEFT JOIN OrderLineItems LI ON OD.OrderLineItemId = LI.Id
        LEFT JOIN Orders O ON LI.OrderId = O.Id
        LEFT JOIN GroupListing GL ON LI.GroupId = GL.Id
        LEFT JOIN CropListing CL ON LI.ListingId = CL.Id
        LEFT JOIN Produce P ON CL.ProduceId = P.Id
        LEFT JOIN Crop C ON P.CropId = C.Id
        LEFT JOIN Users S ON LI.ListerId = S.Id
        WHERE OD.Id = ?
      `)
      .get(disputeId)
    );

    if (!dispute) {
      return notFound(res);
    }

    const filesStmtnt = `
      SELECT * FROM FILES 
      WHERE EntityType = 'OrderDispute' AND EntityId = ?
    `;
    const files = toCamelCaseObject(
      db.prepare(filesStmtnt).all(disputeId)
    );

    dispute['files'] = files;

    return successResponse(res, dispute);
  } catch (error) {
    console.log("getOrderDisputeDetails", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const editDispute = (req, res) => {
  try {
    const depth = 0;
    const indent = " ".repeat(depth * 4);
    log(indent, `editDispute started`);

    const disputeId = Number(req.params.id);

    const dispute = db
      .prepare(`SELECT * FROM OrderDispute WHERE Id = ?`)
      .get(disputeId);

    if (!dispute) {
      return notFound(res);
    }

    const files = req.files.filter((f) => f.fieldname === 'files');
    console.log('files',files);

    const incomingData = req.body;
    const patchableFields = [
      "Status",
      "AdminVerdict",
      "AssignedAdminId",
      "AdminInternalNotes",
      "UpdatedUser"
    ];

    const incomingKeys = Object.keys(incomingData).filter((k) =>
      patchableFields.includes(capitalize(k)),
    );

    if (incomingKeys.length === 0) {
      throw new Error("editDispute: No incoming data.");
    }

    if (
      !incomingData['updatedUser'] ||
      incomingData['updatedUser'].toString().trim() === ""
    ) {
      throw new Error("Invalid updatedUser (required)");
    }

    /**  Validation */
    if (incomingData["status"] && ['RES','REJ'].includes(incomingData["status"])) {
      if (!incomingData["adminVerdict"]) {
        throw new Error(
          "editDispute: adminVerdict is required for conlusions",
        );
      }
      
    }

    let toBeDeletedFileIds = [];
    if(incomingData['deleteFiles']) {
      incomingData['deleteFiles'].split(',').forEach((value) => {
        const newValue = Number(value);
        if(newValue) {
          toBeDeletedFileIds.push(newValue);
        }
      });
    }

    const updatekeys = [];
    const updateValues = [];

    for (const key of incomingKeys) {
      updatekeys.push(`${capitalize(key)} = ?`);
      // modifier start
      if(['AssignedAdminId','UpdatedUser'].includes(capitalize(key))) {
        updateValues.push(Number(incomingData[key]));
        continue;
      }
      // modifier end
      updateValues.push(incomingData[key]);

    }

    updatekeys.push(`UpdatedDate = CURRENT_TIMESTAMP`);
    const updateClause = `SET ${updatekeys.join(", ")}`;

    const updateTxn = db.transaction(() => {
      log(indent, `editDispute txn start`);

      const stmnt = `
        UPDATE OrderDispute
        ${updateClause}
        WHERE Id = ?;
      `;

      const result = db.prepare(stmnt).run(...updateValues, disputeId);

      if(files.length > 0) {
        const newFilesData = prepareDisputeFiles(files);
        newFilesData.forEach(d => {
          insertFilesRecord(
            d.originalName,
            d.fileName,
            d.fullPath,
            d.url,
            d.size,
            'OrderDispute',
            disputeId,
            Number(incomingData['updatedUser'])
          )
        })
      }

      toBeDeletedFileIds.forEach((fileId) => {
        const flStmnt = `
          SELECT * FROM Files 
          WHERE 
            EntityType = 'OrderDispute' AND
            EntityId = ? AND
            Id = ?
        `;
        const fileExists = db.prepare(flStmnt).get(disputeId,fileId);
        if(fileExists) deleteFileRecord(fileId);
      });

      log(indent, `editDispute txn end`);

    
      // throw new Error('_ROLL_BACK_');
      return result;
    });

    const result = updateTxn();
    log(indent, `editDispute end`);

    return successResponse(res, result.changes);
  } catch (error) {
    console.log("editDispute", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const sendChat = (req, res) => {
  try {
    const disputeId = req.params.id;
    const { senderId , message , isInternal } = req.body; 

    if (
      !senderId ||
      senderId.toString().trim() === "" ||
      typeof senderId !== "number"
    ) {
      throw new Error("Invalid senderId");
    }

    if (
      !message ||
      message.toString().trim() === "" ||
      typeof message !== "string"
    ) {
      throw new Error("Invalid message");
    }

    if (
      isInternal === undefined ||
      isInternal.toString().trim() === "" ||
      typeof isInternal !== "number"
    ) {
      throw new Error("Invalid isInternal");
    }

    const dispute = db
      .prepare("SELECT * FROM OrderDispute WHERE Id = ?")
      .get(disputeId);

    if (!dispute) {
      return notFound(res);
    }

    const stmnt = db.prepare(
      `INSERT INTO OrderDisputeChat 
      ( 
        DisputeId,
        SentBy,
        Message,
        IsInternal
      ) VALUES (?,?,?,?)`,
    );
    const result = stmnt.run(disputeId, senderId, message, isInternal);

    return successResponse(res, result.lastInsertRowid);
  } catch (error) {
    console.log("sendChat", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const relaodChat = (req, res) => {
  try {
    // const queryParams = req.query;
    const disputeId = req.params.id;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const orderBy = req.query.orderBy;

    let orderByQuery;

    const orderByOptions = [
      { option: "SENT_DESC", query: "SentDate DESC" },
      { option: "SENT_ASC", query: "SentDate ASC" },
    ];

    if (!orderBy || !orderByOptions.map((p) => p.option).includes(orderBy)) {
      orderByQuery = orderByOptions.find(
        (p) => p.option === "SENT_DESC",
      ).query;
    } else {
      orderByQuery = orderByOptions.find((p) => p.option === orderBy).query;
    }


    // const allowedInput = ["disputeId",];

    // const filterMap = {
    //   disputeType: "DisputeId"
    // };

    const whereCondtions = [];
    const params = [];

    // // this is a repeating code, so helperize it
    // for (const key of allowedInput) {
    //   if (key in queryParams) {
    //     if (
    //       queryParams[key] !== null &&
    //       queryParams[key].toString().trim() !== ""
    //     ) {
    //       whereCondtions.push(`${filterMap[key]}=?`);
    //       params.push(queryParams[key]);
    //     }
    //   }
    // }

    whereCondtions.push(`DisputeId = ?`);
    params.push(disputeId);


    const whereClause =
      whereCondtions.length > 0 ? `WHERE ${whereCondtions.join(" AND ")}` : "";

    const stmnt = `
      SELECT * FROM OrderDisputeChat
      ${whereClause} 
      ORDER BY ${orderByQuery}
      LIMIT ? OFFSET ?
    `;

    const results = toCamelCaseObject(
      db.prepare(stmnt).all(...params, pageSize, offset),
    );
    const countStmnt = db.prepare(
      `SELECT COUNT(DISTINCT Id) as total 
      FROM OrderDisputeChat
      ${whereClause}`,
    );
    const { total } = countStmnt.get(...params);

    const resultData = {
      data: results,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };

    return successResponse(res, resultData);
  } catch (error) {
    console.log("relaodChat", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const deleteFileRecord = (id) => {
  return db.prepare("DELETE FROM Files WHERE Id = ?").run(id);
}

module.exports = {
  searchOrderDisputes,
  createOrderDispute,
  getOrderDisputeDetails,
  editDispute,
  sendChat,
  relaodChat,
};
