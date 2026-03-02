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

const getOrders = (req, res) => {
  try {
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
      COALESCE (o.ListingId,o.GroupId) as OrderListingId
      COALESCE (cl.Name,g.Name) as OrderName
      buyer.UserName,
      seller.UserName,
      o.Quantity,
      o.OrderStatus,
      o.IsNegotiated,
      COALESCE (o.ActualFulfillmentDate,o.EstimatedFulfillmentDate) as FullfilmentDate,
      o.UpdatedUser,o.UpdatedDate
      FROM Orders o
      LEFT JOIN User buyer ON o.BuyerId = buyer.Id
      LEFT JOIN User seller ON o.ListerId = seller.Id
      LEFT JOIN CropListing cl ON o.ListingId = cl.Id
      LEFT JOIN Crop c ON cl.CropId = c.Id
      LEFT JOIN Group g ON o.GroupId = g.Id
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

const orderDetails = (req,res) => {
  try {
    const orderId = Number(req.params.orderId);
    const stmnt = db.prepare(`
      SELECT * FORM Orders WHERE Id = ?
    `);
    const order = stmnt.get(orderId);
    if(!order) {
      return notFound(res,"Order Not Found!");
    }

    return successResponse(res,order);
  } catch (error) {
    console.log("orderDetails", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

/**
 * CREATE TABLE IF NOT EXISTS Orders (
        ListingEntityType NVARCHAR(1) CHECK (ListingEntityType IN ('I', 'G')),
        ListingId INTEGER,
        GroupId INTEGER,
        ListerId INTEGER,
        BuyerId INTEGER,
        Quantity FLOAT,
        OrderStatus NVARCHAR(20),
        IsNegotiated INTEGER DEFAULT 0,
        NegotiationId INTEGER,
        FinalPrice FLOAT,
        EstimatedFulfillmentDate DATE,
        ActualFulfillmentDate DATE,
        DeliveryAddressId INTEGER,
        DeliveryOption NVARCHAR(20),
        PaymentMethod NVARCHAR(20),
        IsPaymentComplete INTEGER DEFAULT 0,
        CreatedUser INTEGER,
        UpdatedUser INTEGER,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (BuyerId) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (DeliveryAddressId) REFERENCES BuyerAddress(Id) ON DELETE SET NULL,
        FOREIGN KEY (OrderStatus) REFERENCES OrderStatusLov(Code) ON DELETE SET NULL,
        FOREIGN KEY (DeliveryOption) REFERENCES DeliveryOptionLov(Code) ON DELETE SET NULL,
        FOREIGN KEY (PaymentMethod) REFERENCES PaymentMethodsLov(Code) ON DELETE SET NULL,
        FOREIGN KEY (GroupId) REFERENCES GroupListing(Id) ON DELETE SET NULL,
        FOREIGN KEY (NegotiationId) REFERENCES Negotiation(Id) ON DELETE SET NULL
    );
 */

module.exports = { getOrders,createOrder,orderDetails };
