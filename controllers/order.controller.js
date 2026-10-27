const db = require("../db");
const { toCamelCaseObject } = require("../utils/utlis");
const {
  successResponse,
  errorResponse,
  notFound,
} = require("../responses/api.responses");
const { getUserById } = require("../services/user.service");
const { log } = require("../services/logger.services");
const { 
  createOrderRecord,
  prepareOrderLineItems,
  insertOrderLineItem,
  updateListingRemainingQuantity,
  redeemOrderTicket
} = require("../services/order.services");


const orderDetails = (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const stmnt = `
      SELECT 
        O.*,
        BA.Address as DeliveryAddressAddress,
        BA.City as DeliveryAddressCity,
        BA.State as State 
      FROM Orders O 
      LEFT JOIN BuyerAddress BA ON O.DeliveryAddressId = BA.Id
      WHERE O.Id = ?
    `;
    const order = toCamelCaseObject(
      db.prepare(stmnt).get(orderId)
    );

    if (!order) {
      return notFound(res, "Order Not Found!");
    }

    const liStmnt = `SELECT * FROM OrderLineItems WHERE OrderId = ?`;
    const lineItems = toCamelCaseObject(db.prepare(liStmnt).all(orderId));

    order["lineItems"] = lineItems;
    return successResponse(res, order);
  } catch (error) {
    console.log("orderDetails", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const orderLineItemDetails = (req, res) => {
  try {
    const lineItemId = Number(req.params.id);
    const stmnt = `
      SELECT 
        LI.*,
        O.BuyerId,
        O.Status as OrderStatus,
        O.StatusReason as OrderStatusReason,
        O.TotalAmount as OrderTotalAmount,
        O.DeliveryAddressId,
        O.DeliveryOption,
        O.PaymentMethod,
        O.PaymentStatus,
        O.PaymentStatusReason,
        O.CreatedUser,
        O.UpdatedUser,
        O.CreatedDate,
        O.UpdatedDate,
        BA.Address as DeliveryAddressAddress,
        BA.City as DeliveryAddressCity,
        BA.State as State,
        B.FirstName as BuyerFirstName,
        B.LastName as BuyerLastName,
        B.UserName as BuyerUserName
      FROM OrderLineItems LI
      LEFT JOIN Orders O ON LI.OrderId = O.Id
      LEFT JOIN BuyerAddress BA ON O.DeliveryAddressId = BA.Id
      LEFT JOIN Users B ON O.CreatedUser = B.Id
      WHERE LI.Id = ?
    `;
    console.log(stmnt)
    const lineItem = toCamelCaseObject(
      db.prepare(stmnt).get(lineItemId)
    );

    if (!lineItem) {
      return notFound(res, "Order Line Item Not Found!");
    }

    return successResponse(res, lineItem);
  } catch (error) {
    console.log("orderLineItemDetails", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const orderSearch = (req, res) => {
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
      { option: "AMOUNT_DESC", query: "O.TotalAmount DESC" },
      { option: "AMOUNT_ASC", query: "O.TotalAmount ASC" },
    ];

    if (!orderBy || !orderByOptions.map((p) => p.option).includes(orderBy)) {
      orderByQuery = orderByOptions.find(
        (p) => p.option === "CREATED_DESC",
      ).query;
    } else {
      orderByQuery = orderByOptions.find((p) => p.option === orderBy).query;
    }

    const allowedInput = ["buyerId", "status"];

    const filterMap = {
      buyerId: "O.BuyerId",
      status: "O.Status",
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

    const whereClause =
      whereCondtions.length > 0 ? `WHERE ${whereCondtions.join(" AND ")}` : "";

    const stmnt = `
      SELECT 
        O.Id,
        O.BuyerId,
        O.Status,
        O.StatusReason,
        O.TotalAmount,
        O.PaymentStatus,
        O.PaymentStatusReason,
        COUNT(LI.Id) as LineItems,
        O.CreatedUser,
        B.FirstName as BuyerFirstName,
        B.LastName as BuyerLastName,
        O.CreatedDate
      FROM Orders O
      LEFT JOIN OrderLineItems LI ON LI.OrderId = O.Id
      LEFT JOIN Users B ON O.CreatedUser = B.Id
      ${whereClause} 
      GROUP BY O.Id
      ORDER BY ${orderByQuery}
      LIMIT ? OFFSET ?
    `;

    const results = toCamelCaseObject(
      db.prepare(stmnt).all(...params, pageSize, offset),
    );
    const countStmnt = db.prepare(
      `SELECT COUNT(DISTINCT O.Id) as total 
      FROM Orders O
      LEFT JOIN OrderLineItems LI ON LI.OrderId = O.Id
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

    successResponse(res, resultData);
  } catch (error) {
    console.log("searchOrders", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

// const orderLineItemSearch = (req,res) => {
// try {
//     const queryParams = req.query;
//     const page = Number(req.query.page) || 1;
//     const pageSize = Number(req.query.pageSize) || 10;
//     const offset = (page - 1) * pageSize;
//     const orderBy = req.query.orderBy;

//     let orderByQuery;

//     const orderByOptions = [
//       { option: "CREATED_DESC", query: "O.CreatedDate DESC" },
//       { option: "CREATED_ASC", query: "O.CreatedDate ASC" },
//       { option: "AMOUNT_DESC", query: "LI.Amount DESC" },
//       { option: "AMOUNT_ASC", query: "LI.Amount ASC" },
//     ];

//     if (!orderBy || !orderByOptions.map((p) => p.option).includes(orderBy)) {
//       orderByQuery = orderByOptions.find(
//         (p) => p.option === "CREATED_DESC",
//       ).query;
//     } else {
//       orderByQuery = orderByOptions.find((p) => p.option === orderBy).query;
//     }

//     const allowedInput = ["buyerId", "listerId","status","listingEntityType","listingId","groupId"];

//     const filterMap = {
//       buyerId: "O.BuyerId",
//       listerId: "LI.BuyerId",
//       status: "LI.Status",
//       listingEntityType: "LI.ListingEntityType",
//       listingId: "LI.ListingId",
//       groupId: "LI.GroupId",
//     };

//     const whereCondtions = [];
//     const params = [];

//     // this is a repeating code, so helperize it
//     for (const key of allowedInput) {
//       if (key in queryParams) {
//         if (
//           queryParams[key] !== null &&
//           queryParams[key].toString().trim() !== ""
//         ) {
//           whereCondtions.push(`${filterMap[key]}=?`);
//           params.push(queryParams[key]);
//         }
//       }
//     }

//     const whereClause =
//       whereCondtions.length > 0 ? `WHERE ${whereCondtions.join(" AND ")}` : "";

//     const stmnt = `
//       SELECT 
//         LI.Id,
//         LI.OrderId,
//         O.BuyerId,
//         LI.ListingEntityType,
//         LI.ListingId,
//         LI.GroupId,
//         LI.ListerId,
//         LI.Quantity,
//         LI.DeliveryStatus,
//         LI.Status,
//         LI.IsNegotiated,
//         LI.Amount,
//         LI.EstimatedDeliveryDate,
//         LI.ActualDeliveryDate
//       FROM OrderLineItems LI
//       LEFT JOIN Orders O ON LI.OrderId = O.Id
//       ${whereClause} 
//       ORDER BY ${orderByQuery}
//       LIMIT ? OFFSET ?
//     `;

//     const results = toCamelCaseObject(
//       db.prepare(stmnt).all(...params, pageSize, offset),
//     );

//     const countStmnt = db.prepare(
//       `SELECT COUNT(DISTINCT LI.Id) as total 
//       FROM OrderLineItems LI
//       LEFT JOIN Orders O ON LI.OrderId = O.Id
//       ${whereClause}`,
//     );
//     const { total } = countStmnt.get(...params);

//     const resultData = {
//       data: toCamelCaseObject(results),
//       pagination: {
//         page,
//         pageSize,
//         total,
//         totalPages: Math.ceil(total / pageSize),
//       },
//     };

//     successResponse(res, resultData);
//   } catch (error) {
//     console.log("orderLineItemSearch", error);
//     return errorResponse(res, "Something went wrong!", 500, error.toString());
//   }
// }

const searchOrderLineItems = (req, res) => {
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
      { option: "AMOUNT_DESC", query: "LI.Amount DESC" },
      { option: "AMOUNT_ASC", query: "LI.Amount ASC" },
    ];

    if (!orderBy || !orderByOptions.map((p) => p.option).includes(orderBy)) {
      orderByQuery = orderByOptions.find(
        (p) => p.option === "CREATED_DESC",
      ).query;
    } else {
      orderByQuery = orderByOptions.find((p) => p.option === orderBy).query;
    }

   const allowedInput = ["buyerId", "listerId","status","listingEntityType","listingId","groupId"];

    const filterMap = {
      buyerId: "O.BuyerId",
      listerId: "LI.ListerId",
      status: "LI.Status",
      listingEntityType: "LI.ListingEntityType",
      listingId: "LI.ListingId",
      groupId: "LI.GroupId",
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

    const whereClause =
      whereCondtions.length > 0 ? `WHERE ${whereCondtions.join(" AND ")}` : "";

    const stmnt = `
      SELECT 
        LI.Id,
        LI.OrderId,
        LI.ListingEntityType,
        LI.ListingId,
        CL.Name as ListingName,
        LI.GroupId,
        GL.Name,
        LI.ListerId,
        LI.Quantity,
        LI.DeliveryStatus,
        LI.DeliveryStatusReason,
        LI.Status,
        LI.StatusReason,
        LI.IsNegotiated,
        LI.OrderTicketId,
        LI.Amount,
        LI.EstimatedDeliveryDate,
        LI.ActualDeliveryDate,
        LI.DeliveryAttemptCount,
        O.Id as OrderId,
        O.BuyerId,
        B.FirstName as BuyerFirstName,
        B.LastName as BuyerLastName,
        B.UserName as BuyerUserName,
        O.Status as OrderStatus,
        O.DeliveryOption,
        O.PaymentMethod
      FROM OrderLineItems LI
      LEFT JOIN Orders O ON LI.OrderId = O.Id
      LEFT JOIN CropListing CL ON LI.ListingId = CL.Id
      LEFT JOIN GroupListing GL ON LI.GroupId = GL.Id
      LEFT JOIN Users B ON O.BuyerId = B.Id
      ${whereClause}
      ORDER BY ${orderByQuery}
      LIMIT ? OFFSET ?
    `;

    console.log(stmnt)

    const results = toCamelCaseObject(
      db.prepare(stmnt).all(...params, pageSize, offset),
    );

    // only the joins which might possibly come in the where clause
    const countStmnt = db.prepare(
      `SELECT COUNT(DISTINCT LI.Id) as total 
      FROM OrderLineItems LI
      LEFT JOIN Orders O ON LI.OrderId = O.Id
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

    successResponse(res, resultData);
  } catch (error) {
    console.log("searchOrderLineItems", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const createOrder = (req, res) => {
  /**
   * 1. Is from listing straigt foreward
   * 2. From order Ticket after negotiation
   */
  try {
    const {
      buyerId,
      deliveryAddressId,
      paymentMethod,
      paymentStatus,
      lineItems,
      deliveryOption
    } = req.body;

    const buyer = getUserById(buyerId);

    if (!buyer) {
      return notFound(res, "Buyer not Found!");
    }

    if (
      !deliveryOption ||
      deliveryOption.toString().trim() === "" ||
      typeof deliveryOption !== "string"
    ) {
      throw new Error("Invalid deliveryOption");
    }

    if (
      !deliveryAddressId ||
      deliveryAddressId === 0 ||
      typeof deliveryAddressId !== "number"
    ) {
      throw new Error("Invalid deliveryAddressId");
    }

    const adrsStmnt = "SELECT * FROM BuyerAddress WHERE UserId = ? AND Id = ?";
    const deliveryAddress = db
      .prepare(adrsStmnt)
      .get(buyerId, deliveryAddressId);

    if (!deliveryAddress) {
      return notFound(res, "Delivery Address not Found!");
    }

    if (
      !paymentMethod ||
      paymentMethod.toString().trim() === "" ||
      typeof paymentMethod !== "string"
    ) {
      throw new Error("Invalid paymentMethod");
    }

    if (
      !paymentStatus ||
      paymentStatus.toString().trim() === "" ||
      typeof paymentStatus !== "string"
    ) {
      throw new Error("Invalid paymentStatus");
    }

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      throw new Error("Invalid lineItems");
    }

    const { newlineItems , totalAmount} = prepareOrderLineItems(lineItems);

    log("Create Transaction Begins");

    const createTxn = db.transaction(() => {
      // 1. Create order
      const orderResult = createOrderRecord(
        buyerId,
        totalAmount,
        deliveryAddressId,
        deliveryOption,
        paymentMethod,
        paymentStatus,
      );
      const orderId = orderResult.lastInsertRowid;

      // 2. Create Each Line Item 1 by one.
      newlineItems.forEach((item)=> {
        insertOrderLineItem(item,orderId,"I");
        updateListingRemainingQuantity(item.listingId,item.quantity);
        if(item.isNegotiated === 1) redeemOrderTicket(item.orderTicketId,buyerId);
      });

      // throw new Error("__ROLL_BACK__");  

      return orderResult;

    });

    const result = createTxn();
    return successResponse(res, result.lastInsertRowid);   
  } catch (error) {
    console.log("createOrder", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};


const editOrderLineItem = (req, res) => {
  try {
    const lineItemId = Number(req.params.id);
    const lineItem = toCamelCaseObject(db
      .prepare('SELECT * FROM OrderLineItems WHERE Id=?')
      .get(lineItemId)
    );

    if(!lineItem) {
      throw new Error('editOrderLineItem: Line Item Not Found!');
    }

    const incomingData = req.body;
    const patchableFields = [
      'Status',
      'StatusReason',
      'DeliveryStatus',
      'DeliveryStatusReason',
      'ActualDeliveryDate',
    ];

    const incomingKeys = Object.keys(incomingData).filter((k) => patchableFields.includes(capitalize(k)));

    if(incomingKeys.length === 0) {
      throw new Error('editOrderLineItem: No incoming data.')
    }

    const updatekeys = [];
    const updateValues = [];

    for (const key of incomingKeys) {
      updatekeys.push(`${capitalize(key)} = ?`);
      updateValues.push(incomingData[key]);
    }

    const updateClause = `SET ${updatekeys.join(", ")}`;

  
    const updateTxn = db.transaction(() => {
      const stmnt = db.prepare(`
        UPDATE OrderLineItems
        ${updateClause}
        WHERE Id = ?;
      `);
      const result = stmnt.run(...updateValues,lineItemId);

      const stmnt2 = db.prepare(`
        UPDATE Orders
        SET UpdatedDate = CURRENT_TIMESTAMP
        WHERE Id = ?;
      `);
      stmnt.run(lineItem.orderId);

      return result;

    });

    const result = updateTxn();
    return successResponse(res,result.changes);
  } catch (error) {
    console.log("editOrderLineItem", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};


const editOrder = (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const order = toCamelCaseObject(db
      .prepare('SELECT * FROM Orders WHERE Id=?')
      .get(orderId)
    );

    if(!order) {
      throw new Error('editOrder: Order Not Found!');
    }

    const incomingData = req.body;
    const patchableFields = [
      'Status',
      'StatusReason',
      'PaymentStatus',
      'PaymentStatusReason',
    ];

    const incomingKeys = Object.keys(incomingData).filter((k) => patchableFields.includes(capitalize(k)));

    if(incomingKeys.length === 0) {
      throw new Error('editOrder: No incoming data.')
    }

    const updatekeys = [];
    const updateValues = [];

    for (const key of incomingKeys) {
      updatekeys.push(`${capitalize(key)} = ?`);
      updateValues.push(incomingData[key]);
    }

    updatekeys.push(`UpdatedDate = CURRENT_TIMESTAMP`);

    const updateClause = `SET ${updatekeys.join(", ")}`;

    const stmnt = db.prepare(`
      UPDATE Orders
      ${updateClause}
      WHERE Id = ?;
    `);
    const result = stmnt.run(...updateValues,orderId);

    return successResponse(res,result.changes);
  } catch (error) {
    console.log("editOrder", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};


module.exports = {
  orderSearch,
  orderDetails,
  orderLineItemDetails,
  searchOrderLineItems,
  createOrder,
  editOrderLineItem,
  editOrder
};
