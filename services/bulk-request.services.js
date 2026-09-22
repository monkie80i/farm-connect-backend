const db = require("../db");
const { log } = require("./logger.services");
const {
  toCamelCaseObject,
} = require("../utils/utlis");

const preparePledgesFromPledgeIds = (
  reqId,
  ids,
  funcName = "preparePledgesFromPledgeIds",
  depth = 0,
) => {
  const indent = " ".repeat(depth * 4);
  log(indent, `preparePledgesFromPledgeIds started.`);

  const pledges = [];
  let totalCombinedPledgeQuantity = 0;

  for (const id of ids) {
    const stmnt = "SELECT * FROM BulkRequestPledge WHERE Id=?";
    const pledge = toCamelCaseObject(db.prepare(stmnt).get(id));

    if (!pledge) {
      throw new Error(`${funcName}: pledge invalid ${id}.`);
    }

    console.log(pledge.bulkRequestId, reqId);
    if (pledge.bulkRequestId !== reqId) {
      throw new Error(
        `${funcName}: pledge ${id} does not belong to bulk request`,
      );
    }

    totalCombinedPledgeQuantity += pledge.pledgedQuantity;
    pledges.push(pledge);
  }
  log(indent, `preparePledgesFromPledgeIds end.`);

  return { pledges, combinedQuantity: totalCombinedPledgeQuantity };
};

const createGroupListing = (
  bulkRequest,
  name,
  totalCombinedQuantity,
  numParticipants,
) => {
  const {
    id,
    cropTypeId,
    varietyId,
    buyerId,
    requiredQuantity,
    offeredPricePerUnit,
    neededByDate,
    deliveryLocation,
  } = bulkRequest;
  const stmnt1 = `INSERT INTO GroupListing
    (
        BulkRequestId,
        Name,
        CropTypeId,
        VarietyId,
        RequiredQuantity,
        TotalCombinedQuantity,
        PricePerUnit,
        Unit,
        DeliveryLocation,
        NeededByDate,
        NumberOfParticipants,
        CreatedUser
    ) VALUES (
        @id,
        @name,
        @cropTypeId,
        @varietyId,
        @requiredQuantity,
        @totalCombinedQuantity,
        @offeredPricePerUnit,
        'KG',
        @deliveryLocation,
        @neededByDate,
        @numParticipants,
        @buyerId
    )
    `;

  const result = db.prepare(stmnt1).run({
    id,
    name,
    cropTypeId,
    varietyId,
    requiredQuantity,
    offeredPricePerUnit,
    neededByDate,
    deliveryLocation,
    totalCombinedQuantity,
    numParticipants,
    buyerId,
  });

  return result;
};

const insertGroupLsitngParticipants = (
  participantId,
  cropId,
  groupId,
  contributionQuantity,
  pledgeDeliveryDate,
) => {
  const stmnt = `
        INSERT INTO GroupParticipants (
            UserId,
            CropId,
            GroupId,
            ContributionQuantity,
            contributingQuantityUnit,
            PledgedDeliveryDate,
            JoinedDate
        ) VALUES (
            @participantId,
            @cropId,
            @groupId,
            @contributionQuantity,
            'KG',
            @pledgeDeliveryDate,
            CURRENT_TIMESTAMP
        )
    `;

  const result = db.prepare(stmnt).run({
    participantId,
    cropId,
    groupId,
    contributionQuantity,
    pledgeDeliveryDate,
  });

  return result;
};

const createBulkReqPledge = (
  reqId,
  farmerId,
  cropId,
  pledgedQuantity,
  pledgeDeliveryDate,
) => {
  const stmnt = `
      INSERT INTO BulkRequestPledge
      (
        BulkRequestId,
        FarmerId,
        CropId,
        PledgedQuantity,
        PledgeDeliveryDate,
        Status
      ) VALUES (
        @reqId,
        @farmerId,
        @cropId,
        @pledgedQuantity,
        @pledgeDeliveryDate,
        'PLEDGED'
      )
    `;
  const result = db.prepare(stmnt).run({
    reqId,
    farmerId,
    cropId,
    pledgedQuantity,
    pledgeDeliveryDate,
  });
  return result;
};

module.exports = {
  createGroupListing,
  preparePledgesFromPledgeIds,
  insertGroupLsitngParticipants,
  createBulkReqPledge,
};
