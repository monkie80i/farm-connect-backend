const db = require("../db");
const {
  toCamelCaseObject,
  formatSQLValue,
} = require("../utils/utlis");
const {
  successResponse,
  errorResponse,
  notFound,
} = require("../responses/api.responses");



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

module.exports = {
  getOrderDisputes,
  createOrderDispute,
  getOrderDisputeDetails,
  editDispute,
  sendChat,
  relaodChat
};
