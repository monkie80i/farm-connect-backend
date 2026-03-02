const db = require("../../db");
const { toCamelCaseObject, formatSQLValue } = require("../../utils/utlis");
const {
  successResponse,
  errorResponse,
  notFound,
} = require("../../responses/api.responses");

const cropListings = (req, res) => {
  // tested working
  try {
    const farmerId = Number(req.params.userId);
    const stmnt = db.prepare(`
        SELECT l.*
        FROM CropListing l JOIN Crop c ON l.CropId = c.Id 
        WHERE c.FarmerId = ?;
        `);
    const result = toCamelCaseObject(stmnt.all(farmerId));

    return successResponse(res, result);
  } catch (error) {
    console.log("cropListings", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const createCropListing = (req, res) => {
  //tested Working
  try {
    const cropId = Number(req.params.cropId);
    const {
      availableQuantity,
      availabilityDate,
      isNegotiable,
      minimumOrderQuantity,
      pricePerUnit,
      unit,
    } = req.body;
    let cropListing;


    const existingListing = db.prepare(
        `SELECT Count(*) as count FROM CropListing WHERE CropId = ?;`
    ).get(cropId);

    if(existingListing.count > 0) {
        return errorResponse(res,"Crop already listed!",400)
    }

    const createCropListingTransaction = db.transaction(() => {
      const createStmnt = db.prepare(`
            INSERT INTO CropListing (
                CropId, AvailableQuantity,AvailabilityDate,
                IsNegotiable,MinimumOrderQuantity,PricePerUnit,Unit
            ) VALUES (?,?,?,?,?,?,?);
        `);

      cropListing = createStmnt.run(
        cropId,
        availableQuantity,
        availabilityDate,
        formatSQLValue(isNegotiable),
        minimumOrderQuantity,
        pricePerUnit,
        unit,
      );

      const listingId = cropListing.lastInsertRowid;
      db.prepare(`UPDATE Crop SET ListingId = ? WHERE Id = ?;`).run(listingId,cropId);
    });

    createCropListingTransaction();

    return successResponse(res, cropListing.lastInsertRowid);
  } catch (error) {
    console.log("createCropListing", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const editCropListing = (req, res) => {
  // tested working
  try {
    const listingId = Number(req.params.listingId);
    const {
      availableQuantity,
      availabilityDate,
      isNegotiable,
      minimumOrderQuantity,
      pricePerUnit,
      unit,
    } = req.body;

    const stmnt = db.prepare(`
            UPDATE CropListing SET
            AvailableQuantity = ?,
            AvailabilityDate = ?,
            IsNegotiable = ?,
            MinimumOrderQuantity = ?,
            PricePerUnit = ?,
            Unit = ?,
            UpdatedDate = CURRENT_TIMESTAMP
            WHERE Id = ?;
        `);
    const result = stmnt.run(
        availableQuantity,
        availabilityDate,
        formatSQLValue(isNegotiable),
        minimumOrderQuantity,
        pricePerUnit,
        unit,
        listingId
    );

    if (result.changes === 0) {
      return notFound(res, "Crop Listing not found!");
    }


    return successResponse(res);
  } catch (error) {
    console.log("editCropListing", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const deleteCropListing = (req, res) => {
  // tested working
  try {
    const listingId = Number(req.params.listingId);
    const stmt = db.prepare(`DELETE FROM CropListing WHERE Id = ?`);
    const result = stmt.run(listingId);

    if (result.changes === 0) {
      return notFound(res, "Crop Listing not found!");
    }

    return successResponse(res, null, "Crop Listing deleted successfully!");
  } catch (error) {
    console.log("deleteCropListing", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

module.exports = {
  cropListings,
  createCropListing,
  editCropListing,
  deleteCropListing,
};
