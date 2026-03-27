const db = require("../db");
const {
  toCamelCaseObject,
  getTodayDate,formatSQLValue
} = require("../utils/utlis");
const {
  successResponse,
  errorResponse,
  notFound,
} = require("../responses/api.responses");
const { userExists } = require("../services/user.service");

const searchGroupListings = (req, res) => {
  // tested working
  try {
    // Pagination from query params
    let page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    // Optional Filters
    const { crop, createdUser, cropType, status } = req.query;

    let whereConditions = [];
    let params = [];

    if (crop) {
      whereConditions.push(`g.CropId = ?`);
      params.push(Number(crop));
    }
    if (createdUser) {
      whereConditions.push(`g.CreatedUser = ?`);
      params.push(Number(createdUser));
    }
    if (status) {
      whereConditions.push(`g.Status = ?`);
      params.push(status);
    }
    if (cropType) {
      whereConditions.push(`c.CropTypeId = ?`);
      params.push(cropType);
    }
    
    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Add pagination params
    params.push(pageSize, offset);
    console.log(whereClause)

    const groups = db
      .prepare(
        `
        SELECT 
        g.*,c.CropTypeId as CropType
        FROM GroupListing g
        LEFT JOIN Crop c ON g.CropId = c.Id
        ${whereClause}
        ORDER BY g.CreatedDate DESC
        LIMIT ? OFFSET ?
      `,
      )
      .all(...params);

    // Get total count for pagination
    const countStmnt = db.prepare(
      `SELECT COUNT(DISTINCT g.Id) as total 
       FROM GroupListing g
       LEFT JOIN Crop c ON g.CropId = c.Id
       ${whereClause}`,
    );
    const countParams = params.slice(0, -2); // Remove LIMIT/OFFSET params
    const { total } = countStmnt.get(...countParams);

    return successResponse(res, {
      data: toCamelCaseObject(groups),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.log("searchGroupListings", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const createGroup = (req, res) => {
  // tested working
  try {
    const {
      name,
      cropId,
      adminContribution,
      minRequiredQuantity,
      totalRequiredQuantity,
      pricePerUnit,
      unit,
      groupAvailabilityDate,
      startDate,
      createdUser,
    } = req.body;

    // Check if user exists
    if (!userExists(createdUser)) {
      return notFound(res, "User Not Found!");
    }

    const createGroupTransaction = db.transaction(() => {
      const createStmnt = db.prepare(`
        INSERT INTO GroupListing (
          Name,
          CropId,
          AdminContribution,
          MinRequiredQuantity,
          TotalRequiredQuantity,
          Status,
          PricePerUnit,
          Unit,
          GroupAvailabilityDate,
          StartDate,
          FormingDate,
          NumberOfParticipants,
          CreatedUser,
          CreatedDate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);

      const result = createStmnt.run(
        name,
        cropId,
        adminContribution,
        minRequiredQuantity,
        totalRequiredQuantity,
        "FORM",
        pricePerUnit,
        unit,
        groupAvailabilityDate,
        startDate,
        getTodayDate(),
        1, // NumberOfParticipants starts with 1 (the creator)
        createdUser,
        new Date().toISOString(),
      );

      return result.lastInsertRowid;
    });

    const groupId = createGroupTransaction();

    return successResponse(
      res,
      { groupId },
      "Group created successfully!",
      201,
    );
  } catch (error) {
    console.log("createGroup", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const groupDetails = (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const group = db
      .prepare(
        `
        SELECT g.*,c.CropTypeId as CropType
        FROM GroupListing g
        LEFT JOIN Crop c ON g.CropId = c.Id
        WHERE g.Id = ?;
      `,
      )
      .get(groupId);

    if (!group) {
      return notFound(res, "Group not found!");
    }

    // Fetch all participants in the group
    const participants = db
      .prepare(
        `
        SELECT 
          gp.Id,
          gp.UserId,
          gp.CropId,
          gp.GroupId,
          gp.ContributionQuantity,
          gp.contributingQuantityUnit,
          gp.JoinedDate,
          gp.UpdatedDate,
          u.FirstName,
          u.LastName,
          u.Email
        FROM GroupParticipants gp
        LEFT JOIN Users u ON gp.UserId = u.Id
        WHERE gp.GroupId = ?
        ORDER BY gp.JoinedDate DESC
      `,
      )
      .all(groupId);

    return successResponse(res, {
      ...toCamelCaseObject(group),
      participants: toCamelCaseObject(participants),
    });
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

const listGroupInivitation = (req, res) => {
  // tested working
  try {
    let page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const userId = Number(req.params.userId);
    const result = db
      .prepare(
        `
      SELECT * FROM GroupInvitation WHERE InvitedUserId = ? LIMIT ? OFFSET ?;
    `,
      )
      .all(userId, pageSize, offset);

    const countStmnt = db.prepare(
      `SELECT COUNT(DISTINCT Id) as total 
       FROM GroupInvitation
       WHERE InvitedUserId = ?`,
    );
    const { total } = countStmnt.get(userId);

    return successResponse(res, {
      data: toCamelCaseObject(result),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.log("listGroupInivitation", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const createGroupInvitation = (req, res) => {
  // tested working
  try {
    const { groupId, invitedUserId, invitedUserCropId, message, createdUser } = req.body;

    const checkCropStmtn = db.prepare(`
      SELECT FarmerId as farmerId FROM Crop WHERE Id = ?;  
    `);
    const checkCrop = checkCropStmtn.get(invitedUserCropId);

    if(!checkCrop) {
      return notFound(res,"Crop Not Found!");
    }

    console.log(invitedUserId,checkCrop.farmerId )
    if (checkCrop.farmerId !== invitedUserId) {
      return errorResponse(res, "Crop Doesnt Belong to the Farmer", 400);
    }

    const stmnt = db.prepare(`
      INSERT INTO GroupInvitation 
      (GroupId,InvitedUserId,InvitedUserCropId,Message,CreatedUser)
      VALUES (?,?,?,?,?);
    `);
    const result = stmnt.run(
      groupId,
      invitedUserId,
      invitedUserCropId,
      message,
      createdUser,
    );

    return successResponse(res, result.lastInsertRowid);
  } catch (error) {
    console.log("createGroupInvitation", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const listGroupRequest = (req, res) => {
  // tested working
  try {
    let page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const groupId = Number(req.params.groupId);
    const result = db
      .prepare(
        `
      SELECT * FROM GroupRequests WHERE GroupId = ? LIMIT ? OFFSET ?;
    `,
      )
      .all(groupId, pageSize, offset);

    const countStmnt = db.prepare(
      `SELECT COUNT(DISTINCT Id) as total 
       FROM GroupRequests
       WHERE GroupId = ?`,
    );
    const { total } = countStmnt.get(groupId);

    return successResponse(res, {
      data: toCamelCaseObject(result),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.log("listGroupRequest", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const createGroupRequest = (req, res) => {
  // tested working
  try {
    const {
      groupId,
      requestingUserId,
      requestingUserCropId,
      message,
      contributingQuantity,
      contributingQuantityUnit,
    } = req.body;

    const stmnt = db.prepare(`
      INSERT INTO GroupRequests 
      (GroupId,RequestingUserId,RequestingUserCropId,Message,
      ContributingQuantity,ContributingQuantityUnit)
      VALUES (?,?,?,?,?,?);
    `);
    const result = stmnt.run(
      formatSQLValue(groupId),
      formatSQLValue(requestingUserId),
      formatSQLValue(requestingUserCropId),
      formatSQLValue(message),
      formatSQLValue(contributingQuantity),
      formatSQLValue(contributingQuantityUnit),
    );

    return successResponse(res, result.lastInsertRowid);
  } catch (error) {
    console.log("createGroupRequest", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const acceptRejectGroupRequest = (req, res) => {
  // tested working
  try {
    const { userId, groupRequestId, decission } = req.body;

    if(!["ACCEPT","REJECT"].includes(decission)){
      return errorResponse(res, "Decission Invalid", 403);
    }

    const groupReqStmnt = db.prepare(`SELECT * FROM GroupRequests WHERE Id = ?`);
    const groupReq = toCamelCaseObject(groupReqStmnt.get(groupRequestId));

    if(!groupReq) {
      return notFound(res,"Group request not found!");
    }

    const group = toCamelCaseObject(
      db.prepare(`SELECT * FROM GroupListing WHERE Id = ?`).get(userId),
    );

    if (group.createdUser !== userId) {
      return errorResponse(res, "Group doesnt belog to the user", 403);
    }

    const groupReqAcceptTransaction = db.transaction(() => {
      const stmnt = db.prepare(`
        UPDATE GroupRequests 
        SET Decission = ?,UpdatedDate = CURRENT_TIMESTAMP
        WHERE Id = ?;
      `);
      stmnt.run(decission, groupRequestId);

      if (decission === "ACCEPT") {
        const stmnt2 = db.prepare(`
          INSERT INTO GroupParticipants
          (UserId,CropId,GroupId,ContributionQuantity,
          contributingQuantityUnit, JoinedDate)
          VALUES (?,?,?,?,?,?);
        `);
        stmnt2.run(
          formatSQLValue(groupReq.requestingUserId),
          formatSQLValue(groupReq.requestingUserCropId),
          formatSQLValue(groupReq.groupId),
          formatSQLValue(groupReq.contributingQuantity),
          formatSQLValue(groupReq.contributingQuantityUnit),
          formatSQLValue(new Date().toISOString()),
        );
      }
    });

    groupReqAcceptTransaction();
    return successResponse(res)
  } catch (error) {
    console.log("acceptRejectGroupRequest", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

/**
 * 
 * 
 * CREATE TABLE IF NOT EXISTS GroupParticipants (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        UserId INTEGER,
        CropId INTEGER,
        GroupId INTEGER,
        ContributionQuantity FLOAT,
        contributingQuantityUnit NVARCHAR(10),
        JoinedDate DATETIME,
        UpdatedDate DATETIME,
        FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE SET NULL,
        FOREIGN KEY (GroupId) REFERENCES GroupListing(Id) ON DELETE SET NULL
    );
 * CREATE TABLE IF NOT EXISTS GroupRequests (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        GroupId INTEGER,
        RequestingUserId INTEGER,
        RequestingUserCropId INTEGER,
        Message TEXT,
        ContributingQuantity FLOAT,
        ContributingQuantityUnit NVARCHAR(10),
        IsAccepted INTEGER DEFAULT 0,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (RequestingUserId) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (RequestingUserCropId) REFERENCES Crop(Id) ON DELETE SET NULL,
        FOREIGN KEY (GroupId) REFERENCES GroupListing(Id) ON DELETE SET NULL
    );
 * CREATE TABLE IF NOT EXISTS GroupInvitation (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        GroupId INTEGER,
        InvitedUserId INTEGER,
        InvitedUserCropId INTEGER,
        Message TEXT,
        IsRead INTEGER DEFAULT 0,
        CreatedUser INTEGER,
        UpdatedUser INTEGER,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (InvitedUserId) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (InvitedUserCropId) REFERENCES Crop(Id) ON DELETE SET NULL,
        FOREIGN KEY (GroupId) REFERENCES GroupListing(Id) ON DELETE SET NULL
    );
 */

module.exports = {
  searchGroupListings,
  createGroup,
  groupDetails,
  editGroup,
  listGroupInivitation,
  createGroupInvitation,
  listGroupRequest,
  createGroupRequest,
  acceptRejectGroupRequest,
};
