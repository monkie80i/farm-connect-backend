const db = require("../db");
const {
  toCamelCaseObject,
  formatSQLValue,
  getFutureDateISO,
} = require("../utils/utlis");
const {
  successResponse,
  errorResponse,
  notFound,
} = require("../responses/api.responses");

const getOrders = (req, res, role = "Farmer") => {
  // tested working
  try {
    const userId = Number(req.params.userId);
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const {
      listerId,
      orderStatus,
      createdDate,
      // crop,
      isNegotiated,
    } = req.query;

    const whereContions = [];
    const params = [];

    if (userId) {
      if (role === "Farmer") {
        whereContions.push("c.FarmerId = ?");
      } else {
        whereContions.push("o.CreatedUser = ?");
      }
      params.push(formatSQLValue(userId));
    }

    if (listerId) {
      whereContions.push("o.ListerId = ?");
      params.push(formatSQLValue(listerId));
    }

    if (orderStatus) {
      whereContions.push("o.OrderStatus = ?");
      params.push(formatSQLValue(orderStatus));
    }

    if (orderStatus) {
      whereContions.push("o.OrderStatus = ?");
      params.push(formatSQLValue(orderStatus));
    }

    if (createdDate) {
      whereContions.push("o.CreatedDate = ?");
      params.push(formatSQLValue(createdDate));
    }

    if (isNegotiated) {
      whereContions.push("o.IsNegotiated = ?");
      params.push(formatSQLValue(isNegotiated));
    }

    params.push(pageSize, offset);

    const whereClause =
      whereContions.length > 0 ? "WHERE " + whereContions.join(" AND ") : "";

    const stmnt = db.prepare(`
      SELECT 
      o.Id,
      o.ListingEntityType,
      COALESCE (o.ListingId,o.GroupId) as OrderListingId,
      COALESCE (c.Name,g.Name) as OrderName,
      buyer.UserName,
      seller.UserName,
      o.Quantity,
      o.OrderStatus,
      o.IsNegotiated,
      COALESCE (o.ActualFulfillmentDate,o.EstimatedFulfillmentDate) as FullfilmentDate,
      o.UpdatedUser,o.UpdatedDate
      FROM Orders o
      LEFT JOIN Users buyer ON o.BuyerId = buyer.Id
      LEFT JOIN Users seller ON o.ListerId = seller.Id
      LEFT JOIN CropListing cl ON o.ListingId = cl.Id
      LEFT JOIN Crop c ON cl.CropId = c.Id
      LEFT JOIN GroupListing g ON o.GroupId = g.Id
      ${whereClause}
      LIMIT ? OFFSET ?;
    `);
    const result = stmnt.all(...params);
    return successResponse(res, result);
  } catch (error) {
    console.log("getOrders", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const createOrder = (req, res) => {
  try {
    const {
      listingEntityType,
      listingEntityId,
      isNegotiated,
      negotiationId,
      quantity,
      deliveryAddress,
      deliveryOption,
      paymentMethod,
      isPaymentComplete,
      createdUser,
    } = req.body;

    const listingEntity =
      listingEntityType === "G" ? "GroupListing" : "CropListing";
    const groupId = listingEntityType === "G" ? listingEntityId : null;
    const listingId = listingEntityType === "G" ? null : listingEntityId;

    let finalPrice, finalQuantity, listerId;

    const stmnt = db.prepare(`SELECT * FROM ${listingEntity} where Id = ?`);
    const listing = toCamelCaseObject(
      stmnt.get(formatSQLValue(listingEntityId)),
    );

    if (!listing) {
      return notFound(res, "Listing Entity Doesnot Exist!");
    }

    listerId = listing.createdUser;

    if (isNegotiated) {
      const ngStmnt = db.prepare(`
          SELECT * FROM NegotiationHistory WHERE NegotiationId = ? AND IsAccepted = 1
        `);
      const negoHist = toCamelCaseObject(ngStmnt.get(negotiationId));
      finalPrice = negoHist.price;
      finalQuantity = negoHist.quantity;
    } else {
      if (listingEntity === "GroupListing") {
        finalPrice = listing.pricePerUnit;
        finalQuantity = listing.totalCombinedQuantity;
      } else {
        finalPrice = listing.pricePerUnit;
        finalQuantity = quantity;
      }
    }

    const stmnt1 = db.prepare(`
        INSERT INTO Orders (
        ListingEntityType,
        ListingId,
        GroupId,
        ListerId,
        BuyerId,
        Quantity ,
        OrderStatus,
        IsNegotiated,
        NegotiationId,
        FinalPrice,
        EstimatedFulfillmentDate,
        DeliveryAddressId,
        DeliveryOption,
        PaymentMethod,
        IsPaymentComplete,
        CreatedUser
        )

        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);
      `);

    const result = stmnt1.run(
      formatSQLValue(listingEntityType),
      formatSQLValue(listingId),
      formatSQLValue(groupId),
      formatSQLValue(listerId),
      formatSQLValue(createdUser),
      formatSQLValue(finalQuantity),
      formatSQLValue(isNegotiated),
      formatSQLValue(negotiationId),
      formatSQLValue(finalPrice),
      getFutureDateISO(new Date().toISOString()),
      formatSQLValue(deliveryAddress),
      formatSQLValue(deliveryOption),
      formatSQLValue(paymentMethod),
      formatSQLValue(isPaymentComplete),
      formatSQLValue(createdUser),
    );

    return successResponse(
      res,
      result.lastInsertRowid,
      "Order Created Successfully",
    );
  } catch (error) {
    console.log("createOrder", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const orderDetails = (req, res) => {
  // tested working
  try {
    const orderId = Number(req.params.orderId);
    const stmnt = db.prepare(`
      SELECT * FROM Orders WHERE Id = ?
    `);
    const order = stmnt.get(orderId);
    if (!order) {
      return notFound(res, "Order Not Found!");
    }

    return successResponse(res, order);
  } catch (error) {
    console.log("orderDetails", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const getOrderDisputes = (req, res) => {
  try {
    const userId = Number(req.params.userId) || null;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const { disputeType, status, assignedAdmin } = req.query;

    const whereContions = [];
    const params = [];

    if (userId) {
      if (role !== "Farmer") {
        whereContions.push("o.CreatedUser = ?");
      }
      params.push(formatSQLValue(userId));
    }

    if (assignedAdmin) {
      whereContions.push("AssignedAdminId = ?");
      params.push(formatSQLValue(assignedAdmin));
    }

    if (disputeType) {
      whereContions.push("DisputeType = ?");
      params.push(formatSQLValue(disputeType));
    }

    if (status) {
      whereContions.push("Status = ?");
      params.push(formatSQLValue(status));
    }
    params.push(pageSize, offset);

    const whereClause =
      whereContions.length > 0 ? "WHERE " + whereContions.join(" AND ") : "";
    const stmnt = db.prepare(
      `SELECT * FROM OrderDispute ${whereClause} LIMIT ? OFFSET ?;`,
    );
    const result = stmnt.all(...params);

    return successResponse(res, toCamelCaseObject(result));
  } catch (error) {
    console.log("getOrderDisputes", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const createOrderDispute = (req, res) => {
  try {
    const { orderId, disputeType, status, description, against, userId } =
      req.body;

    const stmnt = db.prepare(`
      INSERT INTO  OrderDispute (
        OrderId,
        DisputeType,
        Status,
        Description,
        AgainstUserId,
        CreatedUser,
      ) VALUES (?,?,?,?,?,?);
    `);
    const result = stmnt.run(
      orderId,
      disputeType,
      status,
      description,
      against,
      userId,
    );
    return successResponse(res, result.lastInsertRowid);
  } catch (error) {
    console.log("createOrderDispute", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const getOrderDisputeDetails = (req, res) => {
  try {
    const disputeId = Number(req.params.disputeId);
    const dispute = db
      .prepare(`SELECT * FROM OrderDispute WHERE Id=?`)
      .get(disputeId);

    if (!dispute) {
      return notFound(res);
    }

    const chat = db
      .prepare(`SELECT * FROM OrderDisputeChat WHERE DisputeId=?`)
      .all(disputeId);
    result.chat = chat;

    return successResponse(res, toCamelCaseObject(result));
  } catch (error) {
    console.log("getOrderDisputeDetails", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const editDispute = (req, res) => {
  try {
    const disputeId = req.params.disputeId;
    const {
      status,
      description,
      internalNotes,
      adminVerdict,
      assignedAdminId,
      lastOpenedById,
    } = req.body;

    const updateFields = [];
    const params = [];

    if (status) {
      updateFields.push("Status = ?");
      params.push(status);
    }

    if (description) {
      updateFields.push("Description = ?");
      params.push(description);
    }

    if (internalNotes) {
      updateFields.push("InternalNotes = ?");
      params.push(internalNotes);
    }

    if (adminVerdict) {
      updateFields.push("AdminVerdict = ?");
      params.push(adminVerdict);
    }

    if (assignedAdminId) {
      updateFields.push("AssignedAdminId = ?");
      params.push(assignedAdminId);
    }

    if (lastOpenedById) {
      updateFields.push("LastOpenedById = ?");
      params.push(lastOpenedById);
    }

    params.push(disputeId);

    const updateCaluse = updateFields.join(", ");
    const stmnt = db.prepare(`
    UPDATE OrderDispute SET 
    ${updateCaluse}
    WHERE Id = ?;
  `);

    const result = stmnt.run(...params);

    return successResponse(res);
  } catch (error) {
    console.log("editDispute", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const sendChat = (req,res) => {
  try {
    const disputeId = req.params.disputeId;
    const {
      sender,
      message
    } = req.body;

    const stmnt = db.prepare(`INSERT INTO OrderDisputeChat(DisputeId,SentBy,Message) VALUES (?,?,?)`);
    const result = stmnt.run(disputeId,sender,message);
    return successResponse(res,result.lastInsertRowid);
  } catch (error) {
    console.log("sendChat", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const relaodChat = (req,res) => {
  try {
    const disputeId = req.params.disputeId;
    const lastSeenId = req.query.lastSeenId;

    const stmnt = db.prepare(`SELECT * FROM OrderDisputeChat WHERE DisputeId = ? AND Id > ?`);
    const result = stmnt.all(disputeId,lastSeenId);
    return successResponse(res, toCamelCaseObject(result));
  } catch (error) {
    console.log("relaodChat", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};


/***
 * CREATE TABLE IF NOT EXISTS OrderDispute (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        OrderId INTEGER,
        DisputeType NVARCHAR(20),
        Status NVARCHAR(20),
        Description TEXT,
        AgainstUserId INTEGER,
        InternalNotes TEXT,
        AdminVerdict TEXT,
        AssignedAdminId INTEGER,
        LastOpenedById INTEGER,
        CreatedUser INTEGER,
        UpdatedUser INTEGER,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE SET NULL,
        FOREIGN KEY (DisputeType) REFERENCES DisputeTypesLov(Code) ON DELETE SET NULL,
        FOREIGN KEY (Status) REFERENCES DisputeStatusLov(Code) ON DELETE SET NULL,
        FOREIGN KEY (AgainstUserId) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (AssignedAdminId) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (LastOpenedById) REFERENCES Users(Id) ON DELETE SET NULL
    );
 */

module.exports = {
  getOrders,
  createOrder,
  orderDetails,
  getOrderDisputes,
  createOrderDispute,
  getOrderDisputeDetails,
  editDispute,
  sendChat,
  relaodChat,
};
