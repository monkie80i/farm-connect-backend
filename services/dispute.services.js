const db = require("../db");
const { log } = require("./logger.services");


const insertDisputeRecord = (
  orderLineItemId,
  disputeType,
  disputeTypeDesc,
  description,
  createdUser,
) => {
  const stmnt = db.prepare(`
    INSERT INTO OrderDispute (
      OrderLineItemId,
      DisputeType,
      DisputeTypeDesc,
      Description,
      CreatedUser
    ) VALUES (
      @orderLineItemId,
      @disputeType,
      @disputeTypeDesc,
      @description,
      @createdUser
    );
  `);
  const result = stmnt.run({
    orderLineItemId,
    disputeType,
    disputeTypeDesc,
    description,
    createdUser
  });

  log(`Inerted OrderDispute Record ${result.lastInsertRowid} lineItemId: ${orderLineItemId} created by: ${createdUser}`)
  return result;
};

/**
 * Prepares uploaded files for insertion into the Files table.
 *
 * @param {Array<Object>} filesData - Array of uploaded file objects (Multer format).
 * @returns {Array<Object>} Normalized file records containing:
 *   - originalName: Original name of the uploaded file.
 *   - fileName: Generated filename stored on the server.
 *   - fullPath: Absolute path of the uploaded file.
 *   - url: Public URL to access the uploaded file.
 *   - size: File size in bytes.
 *
 * @throws {Error} If filesData is not an array.
 */
const prepareDisputeFiles = (filesData) => {
  // assuming all these fiels are there

  if(!Array.isArray(filesData)) {
    throw new Error("prepareDisputeFiles input has to be an array of uploaded files")
  }

  const newFilesData = filesData.map((f) => ({
    originalName: f.originalname,
    fileName: f.filename,
    fullPath: f.path,
    url: `/uploads/${f.filename}`,
    size: f.size
  }));

  return newFilesData;
};


const insertFilesRecord = (
  originalName,
  fileName,
  fullPath,
  url,
  size,
  entityType,
  entityId,
  createdUser
) => {
  const stmnt = `
    INSERT INTO Files
    (
      OrginalName,
      FileName,
      FullPath,
      Url,
      Size,
      EntityType,
      EntityId,
      CreatedUser
    ) VALUES (
      @originalName,
      @fileName,
      @fullPath,
      @url,
      @size,
      @entityType,
      @entityId,
      @createdUser
    )
  `;

  const result = db.prepare(stmnt).run({
    originalName,
    fileName,
    fullPath,
    url,
    size,
    entityType,
    entityId,
    createdUser
  });

  log(`Inerted Files Record  ${result.lastInsertRowid} ${originalName} ${url}`);
  return result;
};



module.exports = {
  insertDisputeRecord,
  prepareDisputeFiles,
  insertFilesRecord
}