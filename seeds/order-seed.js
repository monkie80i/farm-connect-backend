const db = require("../db");


db.exec(`

    INSERT INTO Orders (
    ListingEntityType,
    ListingId,
    BuyerId,
    Quantity,
    OrderStatus,
    IsNegotiated,
    FinalPrice,
    EstimatedFulfillmentDate,
    CreatedUser
    )
    VALUES (
    'I',3,3,5,'PEND',0,200,'2025-08-20',3
    );


    `);