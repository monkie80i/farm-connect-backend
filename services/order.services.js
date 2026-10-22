const db = require("../db");
const { log } = require("./logger.services");
const {
  toCamelCaseObject,
} = require("../utils/utlis");



const createOrderRecord = (
  buyerId,
  totalAmount,
  deliveryAddressId,
  deliveryOption,
  paymentMethod,
  paymentStatus
) => {
  const stmnt = `
    INSERT INTO Orders
    (
      BuyerId,
      TotalAmount,
      DeliveryAddressId,
      DeliveryOption,
      PaymentMethod,
      PaymentStatus,
      CreatedUser
    ) VALUES (
      @buyerId,
      @totalAmount,
      @deliveryAddressId,
      @deliveryOption,
      @paymentMethod,
      @paymentStatus,
      @buyerId
    )
  `;
  const result = db.prepare(stmnt).run({
    buyerId,
    totalAmount,
    deliveryAddressId,
    deliveryOption,
    paymentMethod,
    paymentStatus
  });

  return result;
};

/**
 * 
 * @param {*} lineItems 
 * @returns 
 * 
 * Handles validation and and preparation of line item data for creation
 */
const prepareOrderLineItems = (lineItems) => {
  const result = [];
  let totalAmount = 0;

  for (const [index, item] of lineItems.entries()) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    futureDate.toISOString().slice(0, 10);

    const record = {
      listingId: null,
      listerId: null,
      quantity: null,
      deliveryStatus: "INACTIVE",
      deliveryStatusReason: null,
      status: "PLACED",
      statusReason: null,
      isNegotiated: 0,
      negotiationId: null,
      orderTicketId: null,
      amount: null,
      estimatedDeliveryDate: futureDate.toISOString().slice(0, 10),
      remainingQuantity: null
    };

    if (
      !item.listingId ||
      item.listingId === 0 ||
      typeof item.listingId !== "number"
    ) {
      throw new Error(`Invalid listingId line item ${index}`);
    }

    const listing = toCamelCaseObject(
      db.prepare("SELECT * FROM CropListing WHERE Id = ?").get(item.listerId),
    );

    if (!listing) {
      return notFound(res, `listing Not found in line Item ${index}`);
    }

    record.listingId = item.listingId;
    record.listerId = listing.createdUser;

    if (
      item.isNegotiated === undefined ||
      typeof item.isNegotiated !== "number"
    ) {
      throw new Error(`Invalid isNegotiated line item ${index}`);
    }

    if (item.isNegotiated === 1) {
      if (
        !item.negotiationId ||
        item.negotiationId === 0 ||
        typeof item.negotiationId !== "number"
      ) {
        throw new Error(`Invalid negotiationId line item ${index}`);
      }

      const negotiation = toCamelCaseObject(
        db
        .prepare("SELECT * FROM Negotiations WHERE Id = ?")
        .get(item.negotiationId),
      );

      if (!negotiation) {
        return notFound(res, `Negotiation Not found in line Item ${index}`);
      }

      if (
        !item.orderTicketId ||
        item.orderTicketId === 0 ||
        typeof item.orderTicketId !== "number"
      ) {
        throw new Error(`Invalid orderTicketId line item ${index}`);
      }

      const orderTicket = toCamelCaseObject(
        db
          .prepare("SELECT * FROM OrderTickets WHERE Id = ?")
          .get(item.orderTicketId),
      );

      if (!orderTicket) {
        return notFound(res, `OrderTicket Not found in line Item ${index}`);
      }

      const negotiationHistory = toCamelCaseObject(
        db
          .prepare("SELECT * FROM NegotiationHistory WHERE Id = ?")
          .get(orderTicket.NegotiationHistoryId),
      );

      if (negotiationHistory.negotiationId !== item.negotiationId) {
        return notFound(
          res,
          `OrderTicket does not belong to the negotiation ${index}`,
        );
      }

      record.quantity = negotiationHistory.quantity;
      record.amount = negotiationHistory.quantity * negotiationHistory.price;
      record.isNegotiated = 1;
      record.negotiationId = item.negotiationId;
      record.orderTicketId = item.orderTicketId;

    } else {
      if (
        !item.quantity ||
        item.quantity === 0 ||
        typeof item.quantity !== "number"
      ) {
        throw new Error(`Invalid quantity line item ${index}`);
      }

      record.quantity = item.quantity;
      record.amount = item.quantity * listing.pricePerUnit;

    }
    
    if(listing.remainingQuantity === 0) {
      throw new Error(`Sold out ${index}`);
    } else if(record.quantity > listing.remainingQuantity) {
      throw new Error(`Quantity not available ${index}`);
    } else if (listing.remainingQuantity <= listing.minimumOrderQuantity) {
      if (record.quantity !== listing.remainingQuantity ) {
        throw new Error(`Only ${listing.remainingQuantity } left. You must order all of it. ${index}`);
      }
    } else if (record.quantity < listing.minimumOrderQuantity) {
      throw new Error(`You must order MOQ. ${index}`);
    }

    totalAmount = totalAmount + record.amount;
    result.push(record);
  }

  return { newlineItems: result, totalAmount } ;
};

const insertOrderLineItem = (
  {
    listingId,
    groupId,
    listerId,
    quantity,
    deliveryStatus,
    deliveryStatusReason,
    status,
    statusReason,
    isNegotiated,
    negotiationId,
    orderTicketId,
    amount,
    estimatedDeliveryDate,
  },
  orderId,
  listingEntityType,
) => {

  const stmnt = `
    INSERT INTO OrderLineItems 
    (
      OrderId,
      ListingEntityType,
      ListingId,
      GroupId,
      ListerId,
      Quantity,
      DeliveryStatus,
      DeliveryStatusReason,
      Status,
      StatusReason,
      IsNegotiated,
      NegotiationId,
      OrderTicketId,
      Amount,
      EstimatedDeliveryDate
    ) VALUES (
      @orderId,
      @listingEntityType,
      @listingId,
      @groupId,
      @listerId,
      @quantity,
      @deliveryStatus,
      @deliveryStatusReason,
      @status,
      @statusReason,
      @isNegotiated,
      @negotiationId,
      @orderTicketId,
      @amount,
      @estimatedDeliveryDate,
    )
  `;

  const result = db.prepare(stmnt)
    .run({
      listingId,
      groupId,
      listerId,
      quantity,
      deliveryStatus,
      deliveryStatusReason,
      status,
      statusReason,
      isNegotiated,
      negotiationId,
      orderTicketId,
      amount,
      estimatedDeliveryDate,
      orderId,
      listingEntityType,
    });

  return result;
}

const updateListingRemainingQuantity = (listingId,quanity) => {
  const remStmnt = `SELECT RemainingQuantity FROM CropListing WHERE Id = ?`;
  const rem = toCamelCaseObject(db.prepare(remStmnt).get(listingId));
  const remainingQuantity = rem.remainingQuantity;

  const newValue = remainingQuantity - quanity;

  if(newValue < 0) {
    throw new Error(`Listing Id ${listingId}, remianing quantity less than order quantity`);
  }

  const stmnt = `UPDATE CropListing SET RemainingQuantity = ? WHERE Id = ?`;
  const result = db.prepare(stmnt).run(newValue,listingId);
  return result;
};


module.exports = {
    createOrderRecord,
    prepareOrderLineItems,
    insertOrderLineItem,
    updateListingRemainingQuantity
}