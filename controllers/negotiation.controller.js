const db = require("../db");
const { toCamelCaseObject, formatSQLValue } = require("../utils/utlis");
const {
  successResponse,
  errorResponse,
  notFound,
} = require("../responses/api.responses");

const negotiations = (req, res) => {
  try {
    const listingId = Number(req.params.listingId);

    const stmnt = db.prepare(`
       SELECT * FROM Negotiation WHERE ListingId = ? 
    `);

    const result = stmnt.all(listingId);

    return successResponse(res, result);
  } catch (error) {
    console.log("negotiations", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const createNegotiation = (req, res) => {
  try {
    const listingId = Number(req.params.listingId);
    const { initialPrice, createdUser } = req.body;
    // only once per listing per buyer

    const stmnt = db.prepare(`
        INSERT INTO Negotiation (ListingId,InitialPrice,CreatedUser)
        VALUES (?,?,?);
    `);

    const result = stmnt.run(listingId, initialPrice, createdUser);
    return successResponse(res,result.lastInsertRowid)
  } catch (error) {
    console.log("createNegotiation", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const negotiationDetails = (req, res) => {
  try {
    const negotiationId = Number(req.params.negotiationId);

    const stmnt1 = db.prepare(`
        SELECT * FROM Negotiation WHERE Id = ?;
    `);

    const result = stmnt1.get(negotiationId);
    return successResponse(res, result);
  } catch (error) {
    console.log("negotiationDetails", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const updateNegotiation = (req, res) => {
  try {
    const negotiationId = Number(req.params.negotiationId);
    const { currentPrice, finalPrice, isAccepted, acceptedBy } = req.body;

    const setArray = [];
    const params = [];

    if (currentPrice && currentPrice.toString().trim() !== "") {
      setArray.push("CurrentPrice = ?");
      params.push(formatSQLValue(currentPrice));
    }

    if (finalPrice && finalPrice.toString().trim() !== "") {
      setArray.push("FinalPrice = ?");
      params.push(formatSQLValue(finalPrice));
    }

    if (isAccepted) {
      setArray.push("IsAccepted = ?");
      params.push(formatSQLValue(isAccepted));
    }

    if (acceptedBy && acceptedBy.toString().trim() !== "") {
      setArray.push("AcceptedBy = ?");
      params.push(formatSQLValue(acceptedBy));
    }

    setArray.push("UpdatedDate = CURRENT_TIMESTAMP");
    const setClause = setArray.join(",");

    const stmnt1 = db.prepare(`
        UPDATE Negotiation 
        SET ${setClause}
        WHERE Id = ?;
    `);
    const result = stmnt1.run(...params, negotiationId);
    return successResponse(res);
  } catch (error) {
    console.log("updateNegotiation", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const listNegotiationHistory = (req, res) => {
  try {
    const negotiationId = Number(req.params.negotiationId);
    const stmnt = db.prepare(`SELECT * FROM NegotiationHistory WHERE NegotiationId = ?`);
    const result = stmnt.all(negotiationId);
    return successResponse(res, result);
  } catch (error) {
    console.log("listNegotiationHistory", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const createNegotiationHistory = (req, res) => {
  try {
    const negotiationId = Number(req.params.negotiationId);

    const { 
        price, 
        quantity,
        createdUser,
    } = req.body;

    const createNegoHistoryTransaction = db.transaction(() => {
        const historyStatement = db.prepare(`
            INSERT INTO NegotiationHistory 
            (NegotiationId,Price,Quantity,CreatedUser)
            VALUES (?,?,?,?);
        `);
        const history = historyStatement.run(negotiationId,price,quantity,createdUser);

        const updateNegotiation = db.prepare(`
            UPDATE Negotiation
            SET CurrentPrice = ?,UpdatedUser = ?, UpdatedDate = CURRENT_TIMESTAMP
            WHERE Id = ?
        `);
        updateNegotiation.run(
            formatSQLValue(price),
            createdUser,
            negotiationId
        );
        return history.lastInsertRowid;

    });

    const result = createNegoHistoryTransaction();
    return successResponse(res,result);
  } catch (error) {
    console.log("createNegotiationHistory", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};


const accepNegotiation = (req,res) => {
    try {
    const negoHistId = Number(req.params.negoHistId);

    const stmnt = db.prepare(`
        UPDATE NegotiationHistory
        SET IsAccepted = 1
        WHERE Id = ?`);
    const result = stmnt.run(negoHistId);

    if(!result.changes === 0) {
        return notFound(res,"Negotiation history record not found!");
    }

    return successResponse(res);
    } catch (error) {
        console.log("accepNegotiation", error);
        return errorResponse(res, "Something went wrong!", 500, error.toString());
    }
};

/**
     * 
     * CREATE TABLE IF NOT EXISTS Negotiation (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        ListingId INTEGER,
        InitialPrice FLOAT,
        CurrentPrice FLOAT,
        FinalPrice FLOAT,
        IsAccepted INTEGER DEFAULT 0,
        AcceptedBy INTEGER,
        IsActive INTEGER DEFAULT 1,
        CreatedUser INTEGER,
        UpdatedUser INTEGER,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (AcceptedBy) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (ListingId) REFERENCES CropListing(Id) ON DELETE SET NULL
    );
     */
module.exports = {
  negotiations,
  createNegotiation,
  negotiationDetails,
  updateNegotiation,
  listNegotiationHistory,
  createNegotiationHistory,
  accepNegotiation
};
