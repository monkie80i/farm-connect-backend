const db = require("../db");
const { toCamelCaseObject, formatSQLValue } = require("../utils/utlis");
const {
  successResponse,
  errorResponse,
  notFound,
} = require("../responses/api.responses");

const createNegotiationHistory = (req, res) => {
  try {
    const negotiationId = Number(req.params.negotiationId);

    const { price, quantity, createdUser } = req.body;

    const createNegoHistoryTransaction = db.transaction(() => {
      const historyStatement = db.prepare(`
            INSERT INTO NegotiationHistory 
            (NegotiationId,Price,Quantity,CreatedUser)
            VALUES (?,?,?,?);
        `);
      const history = historyStatement.run(
        negotiationId,
        price,
        quantity,
        createdUser,
      );

      const updateNegotiation = db.prepare(`
            UPDATE Negotiation
            SET CurrentPrice = ?,UpdatedUser = ?, UpdatedDate = CURRENT_TIMESTAMP
            WHERE Id = ?
        `);
      updateNegotiation.run(formatSQLValue(price), createdUser, negotiationId);
      return history.lastInsertRowid;
    });

    const result = createNegoHistoryTransaction();
    return successResponse(res, result);
  } catch (error) {
    console.log("createNegotiationHistory", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const accepNegotiation = (req, res) => {
  try {
    const negoHistId = Number(req.params.negoHistId);

    const stmnt = db.prepare(`
        UPDATE NegotiationHistory
        SET IsAccepted = 1
        WHERE Id = ?`);
    const result = stmnt.run(negoHistId);

    if (!result.changes === 0) {
      return notFound(res, "Negotiation history record not found!");
    }

    return successResponse(res);
  } catch (error) {
    console.log("accepNegotiation", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

// -----------------------
const searchNegotiations = (req, res) => {
  try {
    const queryParams = req.query;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const orderBy = req.query.orderBy;

    let orderByQuery;

    const orderByOptions = [
      { option: "CREATED_DESC", query: "N.CreatedDate DESC" },
      { option: "CREATED_ASC", query: "N.CreatedDate ASC" },
    ];

    if (!orderBy || !orderByOptions.map((p) => p.option).includes(orderBy)) {
      orderByQuery = orderByOptions.find(
        (p) => p.option === "CREATED_DESC",
      ).query;
    } else {
      orderByQuery = orderByOptions.find((p) => p.option === orderBy).query;
    }

    const allowedInput = [
      "buyerId",
      "farmerId",
      "listingId",
      "status",
      "isAccepted",
      "acceptedBy",
    ];

    const filterMap = {
      buyerId: "N.CreatedUser",
      farmerId: "P.FarmerId",
      listingId: "N.ListingId",
      status: "N.Status",
      isAccepted: "N.IsAccepted",
      acceptedBy: "N.AcceptedBy",
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
        N.Id,
        N.ListingId,
        CL.Name as ListingName,
        P.FarmerId,
        FA.FirstName as FarmerFirstName,
        FA.LastName as FarmerLastName,
        FA.UserName as FarmerUserName,
        CL.PricePerUnit as ListingPricePerUnit,
        CL.Unit as ListingUnit,
        N.CurrentPrice,
        N.FinalPrice,
        N.IsAccepted,
        N.AcceptedBy,
        N.IsActive,
        N.Status,
        N.StatusReason,
        N.CreatedUser AS BuyerId,
        BY.FirstName as BuyerFirstName,
        BY.LastName as BuyerLastName,
        BY.UserName as BuyerUserName,
        N.CreatedUser,
        N.CreatedDate
      FROM Negotiations N
      LEFT JOIN CropListing CL ON N.ListingId = CL.Id
      LEFT JOIN Produce P ON CL.ProduceId = P.Id
      LEFT JOIN Users FA ON P.FarmerId = FA.Id
      LEFT JOIN Users BY ON N.CreatedUser = BY.Id
      ${whereClause} 
      GROUP BY N.Id
      ORDER BY ${orderByQuery}
      LIMIT ? OFFSET ?
    `;


    const results = toCamelCaseObject(
      db.prepare(stmnt).all(...params, pageSize, offset),
    );

    const countStmnt = db.prepare(
      `SELECT COUNT(DISTINCT N.Id) as total 
      FROM Negotiations N
      LEFT JOIN CropListing CL ON N.ListingId = CL.Id
      LEFT JOIN Produce P ON CL.ProduceId = P.Id
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
    console.log("searchNegotiations", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const createNegotiationV2 = (req, res) => {
  try {
    const { listingId, price, quantity, createdUser } = req.body;

    // quantity should be grater than MOQ and less than Remaining Quanitty

    // validation
    if (!listingId) {
      throw new Error("createNegotiation: listingId is required");
    }

    if (!price) {
      throw new Error("createNegotiation: price is required");
    }

    if (!quantity) {
      throw new Error("createNegotiation: quantity is required");
    }

    if (!createdUser) {
      throw new Error("createNegotiation: createdUser is required");
    }

    const listing = toCamelCaseObject(
      db
        .prepare("SELECT * FROM CropListing WHERE Id=@listingId")
        .get({ listingId }),
    );
    if (!listing) {
      return notFound(res, "Crop Listing of listingId does not exist!");
    }

    const MOQ = listing.minimumOrderQuantity;
    const remainingQty = listing.remainingQuantity;

    if (quantity < MOQ) {
      throw new Error(
        "createNegotiation: Quanitity should be greater than MOQ",
      );
    }

    if (quantity > remainingQty) {
      throw new Error(
        "createNegotiation: Quanitity should not be greater than Remaining Quantity",
      );
    }

    const createdUserExists = db
      .prepare("SELECT * FROM Users WHERE Id=@createdUser")
      .get({ createdUser });
    if (!createdUserExists) {
      return notFound(res, "Provided user does not exist!");
    }

    const existsStmnt = `
      SELECT * FROM Negotiations 
      WHERE ListingId = @listingId AND 
      CreatedUser = @createdUser
    `;
    const negotiationExists = db
      .prepare(existsStmnt)
      .get({ listingId, createdUser });

    if (negotiationExists) {
      throw new Error("Negotiations Already Exists for the buyer");
    }

    const createTxn = db.transaction(() => {
      const stmnt1 = `
        INSERT INTO Negotiations (ListingId,CurrentPrice,CreatedUser)
        VALUES (?,?,?)
      `;

      const result = db.prepare(stmnt1).run(listingId, price, createdUser);
      const negotiationId = result.lastInsertRowid;

      const stmnt2 = `
        INSERT INTO NegotiationHistory 
        (
          NegotiationId,
          Price,
          Quantity,
          CreatedUser
        )
        VALUES (?,?,?,?)
      `;
      db.prepare(stmnt2).run(negotiationId, price, quantity, createdUser);

      // throw new Error("Roll back")
      return negotiationId;
    });

    const result = createTxn();

    return successResponse(res, result);
  } catch (error) {
    console.log("createNegotiation", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const negotiationDetails = (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      throw new Error("Id is required");
    }

    const stmnt = `
      SELECT 
        N.*,
        CL.PricePerUnit as ListingPricePerUnit,
        CL.Unit as ListingUnit,
        CL.Name as ListingName,
        P.FarmerId,
        FA.FirstName as FarmerFirstName,
        FA.LastName as FarmerLastName,
        FA.UserName as FarmerUserName,
        N.CreatedUser AS BuyerId,
        BY.FirstName as BuyerFirstName,
        BY.LastName as BuyerLastName,
        BY.UserName as BuyerUserName
      FROM Negotiations N
      LEFT JOIN CropListing CL ON N.ListingId = CL.Id
      LEFT JOIN Produce P ON CL.ProduceId = P.Id
      LEFT JOIN Users FA ON P.FarmerId = FA.Id
      LEFT JOIN Users BY ON N.CreatedUser = BY.Id
      WHERE N.Id = ?;
    `;
    const negotiation = toCamelCaseObject(db.prepare(stmnt).get(id));

    if (!negotiation) {
      return notFound(res, "Negotiation Not Found!");
    }

    const histStmnt = `
      SELECT * FROM NegotiationHistory WHERE NegotiationId = ?;
    `;

    const history = toCamelCaseObject(db.prepare(histStmnt).all(id));

    negotiation["history"] = history;
    return successResponse(res, negotiation);
  } catch (error) {
    console.log("negotiationDetails", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const createNegotiationHistoryV2 = (req, res) => {
  try {
    const negotiationId = Number(req.params.id);
    const { price, quantity, createdUser } = req.body;

    if (!negotiationId) {
      throw new Error("Id is required");
    }

    if (!price) {
      throw new Error("createNegotiation: price is required");
    }

    if (!quantity) {
      throw new Error("createNegotiation: quantity is required");
    }

    if (!createdUser) {
      throw new Error("createNegotiation: createdUser is required");
    }

    const nego = toCamelCaseObject(
      db
        .prepare(
          `
        SELECT 
          N.*,
          CL.MinimumOrderQuantity,
          CL.RemainingQuantity
        FROM Negotiations N
        LEFT JOIN CropListing CL ON N.ListingId = CL.Id
        WHERE N.Id=@negotiationId`,
        )
        .get({ negotiationId }),
    );
    if (!nego) {
      return notFound(res, "Negotiation Not Found!");
    }

    const MOQ = nego.minimumOrderQuantity;
    const remainingQty = nego.remainingQuantity;

    if (quantity < MOQ) {
      throw new Error(
        "createNegotiation: Quanitity should be greater than MOQ",
      );
    }

    if (quantity > remainingQty) {
      throw new Error(
        "createNegotiation: Quanitity should not be greater than Remaining Quantity",
      );
    }

    const createTxn = db.transaction(() => {
      const historyStatement = db.prepare(`
        INSERT INTO NegotiationHistory 
        (NegotiationId,Price,Quantity,CreatedUser)
        VALUES (?,?,?,?);
      `);
      const history = historyStatement.run(
        negotiationId,
        price,
        quantity,
        createdUser,
      );

      const updateNegotiation = db.prepare(`
        UPDATE Negotiations
        SET CurrentPrice = ?,UpdatedUser = ?, UpdatedDate = CURRENT_TIMESTAMP
        WHERE Id = ?
      `);
      updateNegotiation.run(price, createdUser, negotiationId);

      // throw new Error("__ROLL_BACK__")
      return history.lastInsertRowid;
    });

    const result = createTxn();
    return successResponse(res, result);
  } catch (error) {
    console.log("createNegotiationHistory", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const acceptNegotiationV2 = (req, res) => {
  try {
    const negotiationId = Number(req.params.id);
    const { userId, negotiationHistoryId } = req.body; // this should be later moved to Login User , loginUser, LoginUser

    if (!negotiationId) {
      throw new Error("Id is required");
    }

    if (!negotiationHistoryId) {
      throw new Error("histId is required");
    }

    if (!userId) {
      throw new Error("accepNegotiationV2: userId is required");
    }

    const ngStmnt = `
      SELECT 
        N.Id,
        N.Status,
        N.CreatedUser,
        P.FarmerId,
        CL.OrderTicketLifeTime
      FROM Negotiations N
      LEFT JOIN CropListing CL ON N.ListingId = CL.Id
      LEFT JOIN Produce P ON CL.ProduceId = P.Id
      WHERE N.Id = ?
    `;
    const negotiation = toCamelCaseObject(
      db.prepare(ngStmnt).get(negotiationId),
    );

    if (!negotiation) {
      return notFound(res, "Negotiation does not exists!");
    }

    if (negotiation.status !== "ACTIVE") {
      return notFound(res, "Forbidden: Negotitation not Active!");
    }

    const histStmtnt = `
      SELECT * FROM 
      NegotiationHistory 
      WHERE Id = @negotiationHistoryId AND 
      NegotiationId = @negotiationId 
    `;
    const history = toCamelCaseObject(
      db.prepare(histStmtnt).get({ negotiationHistoryId, negotiationId }),
    );

    if (!history) {
      return notFound(res, "Negotiation History does not exists!");
    }

    const buyerId = negotiation.createdUser;
    const sellerId = negotiation.farmerId;
    const expiresIn = negotiation.orderTicketLifeTime || 1;

    if (![buyerId, sellerId].includes(Number(userId))) {
      throw new Error("User provided is not involved with Negotiation.");
    }

    const acceptTxn = db.transaction(() => {
      // 1. Updated History
      const stmnt1 = `
        UPDATE NegotiationHistory
        SET IsAccepted = 1
        WHERE Id = ?
      `;
      db.prepare(stmnt1).run(negotiationHistoryId);

      const finalPrice = history.price;

      // 2. Update Negotiation
      const stmnt2 = `
        UPDATE Negotiations SET 
          IsActive = 0,
          Status = 'TICKET',
          FinalPrice = @finalPrice,
          IsAccepted = 1,
          AcceptedBy = @userId,
          UpdatedUser = @userId,
          UpdatedDate = CURRENT_TIMESTAMP
        WHERE Id = @negotiationId
      `;

      db.prepare(stmnt2).run({
        finalPrice,
        userId,
        negotiationId,
      });

      // 3. Create Order Ticket

      const stmnt3 = `
        INSERT INTO OrderTickets
        (
          NegotiationHistoryId,
          ExpiryTime,
          CreatedUser
        )
        VALUES (
          ?,
          datetime('now', ?),
          ?
        )
      `;

      db.prepare(stmnt3).run(
        negotiationHistoryId,
        `+${expiresIn} hours`,
        userId,
      );

      // throw new Error("__ROLL_BACK__");
    });

    acceptTxn();
    return successResponse(res);
  } catch (error) {
    console.log("accepNegotiation", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const searchOrderTickets = (req, res) => {
  try {
    const queryParams = req.query;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const orderBy = req.query.orderBy;

    let orderByQuery;

    const orderByOptions = [
      { option: "CREATED_DESC", query: "OT.CreatedDate DESC" },
      { option: "CREATED_ASC", query: "OT.CreatedDate ASC" },
    ];

    if (!orderBy || !orderByOptions.map((p) => p.option).includes(orderBy)) {
      orderByQuery = orderByOptions.find(
        (p) => p.option === "CREATED_DESC",
      ).query;
    } else {
      orderByQuery = orderByOptions.find((p) => p.option === orderBy).query;
    }

    const allowedInput = [
      "negotiationId",
      "buyerId",
      "farmerId",
      "listingId",
      "status",
    ];

    const filterMap = {
      negotiationId: "N.Id",
      buyerId: "N.CreatedUser",
      farmerId: "P.FarmerId",
      listingId: "N.ListingId",
      status: "OT.Status",
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
        OT.*,
        NH.Price as AgreedPrice,
        NH.Quantity as AgreedQuantity,
        N.ListingId,
        CL.Name as ListingName,
        P.FarmerId,
        FA.FirstName as FarmerFirstName,
        FA.LastName as FarmerLastName,
        FA.UserName as FarmerUserName,
        N.AcceptedBy,
        N.CreatedUser AS BuyerId,
        BY.FirstName as BuyerFirstName,
        BY.LastName as BuyerLastName,
        BY.UserName as BuyerUserName
      FROM OrderTickets OT
      LEFT JOIN NegotiationHistory NH ON OT.NegotiationHistoryId = NH.Id
      LEFT JOIN Negotiations N ON NH.NegotiationId = N.Id
      LEFT JOIN CropListing CL ON N.ListingId = CL.Id
      LEFT JOIN Produce P ON CL.ProduceId = P.Id
      LEFT JOIN Users FA ON P.FarmerId = FA.Id
      LEFT JOIN Users BY ON N.CreatedUser = BY.Id
      ${whereClause} 
      GROUP BY N.Id
      ORDER BY ${orderByQuery}
      LIMIT ? OFFSET ?
    `;

    const results = toCamelCaseObject(
      db.prepare(stmnt).all(...params, pageSize, offset),
    );

    const countStmnt = db.prepare(`
      SELECT COUNT(DISTINCT OT.Id) as total 
      FROM OrderTickets OT
      LEFT JOIN NegotiationHistory NH ON OT.NegotiationHistoryId = NH.Id
      LEFT JOIN Negotiations N ON NH.NegotiationId = N.Id
      LEFT JOIN CropListing CL ON N.ListingId = CL.Id
      LEFT JOIN Produce P ON CL.ProduceId = P.Id
      ${whereClause}`);
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
    console.log("searchOrderTickets", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const orderTicketDetails = (req, res) => {
  try {
    const id = Number(req.params.id);
    const stmnt = `
      SELECT
        OT.*,
        NH.Price as AgreedPrice,
        NH.Quantity as AgreedQuantity,
        N.ListingId,
        CL.Name as ListingName,
        P.FarmerId,
        FA.FirstName as FarmerFirstName,
        FA.LastName as FarmerLastName,
        FA.UserName as FarmerUserName,
        N.AcceptedBy,
        N.CreatedUser AS BuyerId,
        BY.FirstName as BuyerFirstName,
        BY.LastName as BuyerLastName,
        BY.UserName as BuyerUserName
      FROM OrderTickets OT
      LEFT JOIN NegotiationHistory NH ON OT.NegotiationHistoryId = NH.Id
      LEFT JOIN Negotiations N ON NH.NegotiationId = N.Id
      LEFT JOIN CropListing CL ON N.ListingId = CL.Id
      LEFT JOIN Produce P ON CL.ProduceId = P.Id
      LEFT JOIN Users FA ON P.FarmerId = FA.Id
      LEFT JOIN Users BY ON N.CreatedUser = BY.Id
      WHERE OT.Id = ?;
    `;
    const result = toCamelCaseObject(db.prepare(stmnt).get(id));

    return successResponse(res, result);
  } catch (error) {
    console.log("orderTicketDetails", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

module.exports = {
  // negotiations,
  searchNegotiations,
  createNegotiationV2,
  // createNegotiation,
  negotiationDetails,
  // updateNegotiation,
  // listNegotiationHistory,
  createNegotiationHistory,
  createNegotiationHistoryV2,
  acceptNegotiationV2,
  accepNegotiation,
  searchOrderTickets,
  orderTicketDetails,
};
