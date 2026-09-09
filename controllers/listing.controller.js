const db = require("../db");
const { toCamelCaseObject, formatSQLValue, capitalize } = require("../utils/utlis");
const {
  successResponse,
  errorResponse,
  notFound,
} = require("../responses/api.responses");
const { userExists } = require("../services/user.service");
const { log } = require("../services/logger.services");


const cropListings = (req, res) => {
  try {
    const farmerId = Number(req.params.userId);
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    if (!userExists(farmerId)) {
      return notFound(res, "User Does not Exists");
    }

    const allowedFields = [ 
      'cropName', 'cropTypeId', 'status'
    ];

    const fieldPrefix = {
      'cropName': 'C',
      'cropTypeId': 'C',
      'status': 'CL',
    }

    const whereCondtions = [];
    const params  = [];

    for (const key of allowedFields) {
      if (key in req.query) {
        if(req.query[key] !== null && req.query[key].toString().trim() !== "") {
          const name = capitalize(key);
          whereCondtions.push(`${fieldPrefix[key]}.${name}=?`);
          params.push(req.query[key]);
        }
      }
    }

    whereCondtions.push('C.FarmerId = ?');
    params.push(farmerId);

    const whereClause = whereCondtions.length > 0 ? `WHERE ${whereCondtions.join(" AND ")}`: "";

    const stmnt = db.prepare(`
      SELECT 
        CL.Id,
        CL.Name,
        CL.Description,
        CL.ImagePath,
        C.Name as CropName,
        HCL.CycleLabel,
        CL.ListedQuantity,
        CL.RemainingQuantity,
        CL.Status,
        CL.PricePerUnit,
        CL.CreatedDate
      FROM CropListing CL
      LEFT JOIN Produce P ON CL.ProduceId = P.Id
      LEFT JOIN Crop C ON P.CropId = C.Id
      LEFT JOIN HarvestCycleInstance HCL ON P.HarvestCycleInstanceId = HCL.Id
      ${whereClause} LIMIT ? OFFSET ?
    `);
    const result = toCamelCaseObject(stmnt.all(...params,pageSize, offset));

    const countStmnt = db.prepare(
        `SELECT COUNT(DISTINCT CL.Id) as total 
        FROM CropListing CL
        LEFT JOIN Produce P ON CL.ProduceId = P.Id
        LEFT JOIN Crop C ON P.CropId = C.Id
        ${whereClause}`,
      );
    const { total } = countStmnt.get(...params);

    const final = {
        data: result,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      }

    return successResponse(res, final);
  } catch (error) {
    console.log("cropListings", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const createCropListing = (req, res) => {
  try {
    const {
      produceId,
      name,
      description,
      imagePath,
      listedQuantity,
      availabilityDate,
      isNegotiable,
      minimumOrderQuantity,
      pricePerUnit
    } = req.body;

    const prodStmnt = 'SELECT * FROM Produce WHERE Id=?';
    const produce = toCamelCaseObject(db.prepare(prodStmnt).get(produceId));

    if(!produce) {
      throw new Error('createCropListing: Produce not found!');
    }

    if(produce.remainingQuantity === 0) {
      throw new Error('createCropListing: No quantity left!');
    }

    if(listedQuantity > produce.remainingQuantity) {
      throw new Error('createCropListing: Not enough quantity!');
    }
    log("createCropListing: Input validation Complete.");

    const createCropListingTransaction = db.transaction(() => {
      log("createCropListing: Txn Start");
      const start = new Date();

      const produceRemainingQuantity = produce.remainingQuantity - listedQuantity;
      const createStmnt = `
        INSERT INTO CropListing (
          ProduceId,
          Name,
          Description,
          ImagePath,
          ListedQuantity,
          RemainingQuantity,
          Status,
          AvailabilityDate,
          IsNegotiable,
          MinimumOrderQuantity,
          PricePerUnit,
          Unit
        ) VALUES (
          @produceId,
          @name,
          @description,
          @imagePath,
          @listedQuantity,
          @listedQuantity,
          'ACTIVE',
          @availabilityDate,
          @isNegotiable,
          @minimumOrderQuantity,
          @pricePerUnit,
          'KG'
        )
      `;

      const cropListing = db
        .prepare(createStmnt)
        .run({
          produceId,
          name,
          description,
          imagePath,
          listedQuantity,
          availabilityDate,
          isNegotiable,
          minimumOrderQuantity,
          pricePerUnit,
        })
      ;
      log("createCropListing: Listing Created");


      // update remaining quantity
      const updProduceStmnt = `
        UPDATE Produce 
        SET RemainingQuantity=@produceRemainingQuantity 
        WHERE Id = @produceId
      `;
      db
      .prepare(updProduceStmnt)
      .run({produceRemainingQuantity,produceId});
      log("createCropListing: Produce remaining qty updated");


      // throw new Error("__ROLL_BACK__");
      log(`createCropListing: Txn End (${Date.now() - start} ms)`);
      return cropListing.lastInsertRowid
    });

    const listingId = createCropListingTransaction();
    return successResponse(res, listingId);
  } catch (error) {
    console.log("createCropListing", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
};

const detailCropListing = (req,res) => {
  try {
    const listingId = Number(req.params.listingId);
    const listing = toCamelCaseObject(db
      .prepare(`
        SELECT 
          CL.*,
          P.QualityGrade,
          P.HarvestDate,
          P.Notes as ProduceSpecificNotes,
          CT.CropName as CropTypeName,
          CT.ScientificName,
          V.VarietyName,
          V.IsHybrid,
          V.ShelfLifeDays,
          V.Notes as VarietySpecificNotes,
          FA.FirstName as FarmerFirstName,
          FA.LastName as FarmerLastName,
          FA.UserName as FarmerUserName,
          F.Name as FarmName,
          F.Address as FarmAddress,
          F.City as FarmCity,
          F.State as FarmState
        FROM CropListing CL
        LEFT JOIN Produce P ON CL.ProduceId = P.Id
        LEFT JOIN Crop C ON P.CropId = C.Id
        LEFT JOIN CropType CT ON C.CropTypeId = CT.Id
        LEFT JOIN CropVariety V ON C.VarietyId = V.Id
        LEFT JOIN Farm F ON C.FarmId = F.Id
        LEFT JOIN Users FA ON C.FarmerId = FA.Id
        WHERE CL.Id=?
      `)
      .get(listingId)
    );

    if(!listing) {
      throw new Error('detailCropListing: Listing Not Found!');
    }

    return successResponse(res,listing);
  } catch (error) {
    console.log("detailCropListing", error);
    return errorResponse(res, "Something went wrong!", 500, error.toString());
  }
}

const editCropListing = (req, res) => {
  try {
    const listingId = Number(req.params.listingId);
    const listing = toCamelCaseObject(db
      .prepare('SELECT * FROM CropListing WHERE Id=?')
      .get(listingId)
    );

    if(!listing) {
      throw new Error('editCropListing: Listing Not Found!');
    }

    const incomingData = req.body;
    const patchableFields = [
      'Name',
      'Description',
      'ImagePath',
      'RemainingQuantity',
      'Status',
      'AvailabilityDate',
      'IsNegotiable',
      'MinimumOrderQuantity',
      'PricePerUnit',
    ];

    const incomingKeys = Object.keys(incomingData).filter((k) => patchableFields.includes(capitalize(k)));

    if(incomingKeys.length === 0) {
      throw new Error('editCropListing: No incoming data.')
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
      UPDATE CropListing
      ${updateClause}
      WHERE Id = ?;
    `);
    const result = stmnt.run(...updateValues,listingId);

    return successResponse(res,result.changes);
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
  detailCropListing,
  editCropListing,
  deleteCropListing,
};
