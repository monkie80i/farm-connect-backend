const db = require("../db");
const { log } = require("./logger.services");
const {
  toCamelCaseObject,
  getFutureDateISO,
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
      Status,
      CreatedUser
    ) VALUES (
      @buyerId,
      @totalAmount,
      @deliveryAddressId,
      @deliveryOption,
      @paymentMethod,
      @paymentStatus,
      'ACTIVE',
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
    const record = {
      listingId: null,
      listerId: null,
      quantity: null,
      deliveryStatus: "INACTIVE",
      deliveryStatusReason: null,
      status: "ACTIVE",
      statusReason: null,
      isNegotiated: 0,
      negotiationId: null,
      orderTicketId: null,
      amount: null,
      estimatedDeliveryDate: getFutureDateISO(new Date(),10)
    };

    if (
      !item.listingId ||
      item.listingId === 0 ||
      typeof item.listingId !== "number"
    ) {
      throw new Error(`Invalid listingId line item ${index}`);
    }

    const listing = toCamelCaseObject(
      db.prepare(`
        SELECT 
          CL.*,
          P.FarmerId AS ListerId 
        FROM CropListing CL
        LEFT JOIN Produce P ON CL.ProduceId = P.Id
        WHERE CL.Id = ?
      `).get(item.listingId),
    );

    if (!listing) {
      throw new Error(`listing Not found in line Item ${index}`);
    }

    record.listingId = item.listingId;
    record.listerId = listing.listerId;

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
        throw new Error(`Negotiation Not found in line Item ${index}`);
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
        throw new Error(`OrderTicket Not found in line Item ${index}`);
      }

      const negotiationHistory = toCamelCaseObject(
        db
          .prepare("SELECT * FROM NegotiationHistory WHERE Id = ?")
          .get(orderTicket.negotiationHistoryId),
      );

      if (negotiationHistory.negotiationId !== item.negotiationId) {
        throw new Error(
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
      @estimatedDeliveryDate
    )
  `;

  const result = db.prepare(stmnt)
    .run({
      orderId,
      listingEntityType,
      listingId,
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
      estimatedDeliveryDate
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

  const setClauseList = [];
  const paramsList = [];

  setClauseList.push('RemainingQuantity = ?');
  paramsList.push(newValue);

  if(newValue === 0) {
    setClauseList.push('Status = ?');
    paramsList.push('SOLD_OUT');
  }

  paramsList.push(listingId);

  const setClause = setClauseList.join(', ');
  const stmnt = `UPDATE CropListing SET ${setClause} WHERE Id = ?`;
  const result = db.prepare(stmnt).run(...paramsList);
  return { result , remainingQuantity: newValue};
};

 const redeemOrderTicket = (orderTicketId,userId) => {
  const stmnt = `
    SELECT N.Id as NegotiationId
    FROM OrderTickets OT
    LEFT JOIN NegotiationHistory NH ON OT.NegotiationHistoryId = NH.Id
    LEFT JOIN Negotiations N ON NH.NegotiationId = N.Id
    WHERE OT.Id = ?
  `;

  const result = toCamelCaseObject(
    db.prepare(stmnt)
    .get(orderTicketId)
  );

  const { negotiationId } = result;

  // update Negotiation
  const negUpStmnt = `
    UPDATE Negotiations SET 
    IsActive = 0,
    Status = 'SATISFIED',
    UpdatedUser = ?,
    UpdatedDate = CURRENT_TIMESTAMP
    WHERE Id = ?
  `;
  db.prepare(negUpStmnt).run(userId,negotiationId);

  // update orderTicket
  const otUpStmnt = `
    UPDATE OrderTickets SET 
    Status = 'COMPLETE',
    UpdatedUser = ?,
    UpdatedDate = CURRENT_TIMESTAMP
    WHERE Id = ?
  `;
  db.prepare(otUpStmnt).run(userId,orderTicketId);

}

// const deleteOrder = (orderId) => {

//   const stmtn1 = `SELECT * FROM Orders WHERE Id = ?`;
//   const order = toCamelCaseObject(db.prepare(stmtn1).get(orderId))

//   if(!order) {
//     throw new Error("Order does not exist")
//   }

//   // get order line items - store their ids
//   // DELETE FROM OrderLineItems WHERE OrderId = 4. -- modify accordingly;

  

//   // delete order
//   //  DELETE FROM Orders WHERE Id = 4;

//   // update crop lising 


// // update CropListing set Status = 'ACTIVE', RemainingQuantity = 400 where Id = 1;

// };




module.exports = {
    createOrderRecord,
    prepareOrderLineItems,
    insertOrderLineItem,
    updateListingRemainingQuantity,
    redeemOrderTicket
}


