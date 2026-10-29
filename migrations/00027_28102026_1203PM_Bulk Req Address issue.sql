DROP TABLE GroupInvitation; -- permanently
DROP TABLE OrderLineItemStatusHistory;

-- =========================================================
-- BulkRequest
-- =========================================================

ALTER TABLE BulkRequest RENAME TO BulkRequest_Old;

CREATE TABLE BulkRequest (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    BuyerId INTEGER NOT NULL,
    CropTypeId INTEGER NOT NULL,
    VarietyId INTEGER NOT NULL,
    RequiredQuantity FLOAT NOT NULL,
    Unit NVARCHAR(10) DEFAULT 'KG',
    OfferedPricePerUnit FLOAT NOT NULL,
    DeliveryAddressId INTEGER NOT NULL,
    NeededByDate DATE NOT NULL,
    PledgeDeadline DATE NOT NULL,
    ConfirmationDeadline DATE,
    CommittedQuantity FLOAT DEFAULT 0,
    Status NVARCHAR(10) DEFAULT 'OPEN',
    MinLeadDays INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (BuyerId) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (CropTypeId) REFERENCES CropType(Id) ON DELETE RESTRICT,
    FOREIGN KEY (VarietyId) REFERENCES CropVariety(Id) ON DELETE RESTRICT,
    FOREIGN KEY (Unit) REFERENCES CropUnitLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (DeliveryAddressId) REFERENCES BuyerAddress(Id) ON DELETE RESTRICT,
    FOREIGN KEY (Status) REFERENCES BulkRequestStatus(Code) ON DELETE RESTRICT
);

INSERT INTO BulkRequest (
    Id,
    BuyerId,
    CropTypeId,
    VarietyId,
    RequiredQuantity,
    Unit,
    OfferedPricePerUnit,
    DeliveryAddressId,
    NeededByDate,
    PledgeDeadline,
    ConfirmationDeadline,
    CommittedQuantity,
    Status,
    MinLeadDays,
    CreatedDate,
    UpdatedDate
)
SELECT
    Id,
    BuyerId,
    CropTypeId,
    VarietyId,
    RequiredQuantity,
    Unit,
    OfferedPricePerUnit,
    5,
    NeededByDate,
    PledgeDeadline,
    ConfirmationDeadline,
    CommittedQuantity,
    Status,
    MinLeadDays,
    CreatedDate,
    UpdatedDate
FROM BulkRequest_Old;


-- =========================================================
-- GroupListing
-- =========================================================

ALTER TABLE GroupListing RENAME TO GroupListing_Old;

CREATE TABLE GroupListing (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    BulkRequestId INTEGER NOT NULL,
    Name TEXT NOT NULL,
    CropTypeId INTEGER NOT NULL,
    VarietyId INTEGER NOT NULL,
    RequiredQuantity FLOAT NOT NULL,
    TotalCombinedQuantity FLOAT NOT NULL,
    Status NVARCHAR(10) DEFAULT 'NEW',
    PricePerUnit FLOAT NOT NULL,
    Unit NVARCHAR(10) DEFAULT 'KG',
    DeliveryLocation TEXT NOT NULL,
    NeededByDate DATE NOT NULL,
    ClosingDate DATE,
    NumberOfParticipants INTEGER,
    CreatedUser INTEGER,
    UpdatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (CropTypeId) REFERENCES CropType(Id) ON DELETE RESTRICT,
    FOREIGN KEY (VarietyId) REFERENCES CropVariety(Id) ON DELETE RESTRICT,
    FOREIGN KEY (Status) REFERENCES GroupListingStatusLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (Unit) REFERENCES CropUnitLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (BulkRequestId) REFERENCES BulkRequest(Id) ON DELETE RESTRICT
);

INSERT INTO GroupListing (
    Id,
    BulkRequestId,
    Name,
    CropTypeId,
    VarietyId,
    RequiredQuantity,
    TotalCombinedQuantity,
    Status,
    PricePerUnit,
    Unit,
    DeliveryLocation,
    NeededByDate,
    ClosingDate,
    NumberOfParticipants,
    CreatedUser,
    UpdatedUser,
    CreatedDate,
    UpdatedDate
)
SELECT
    Id,
    BulkRequestId,
    Name,
    CropTypeId,
    VarietyId,
    RequiredQuantity,
    TotalCombinedQuantity,
    Status,
    PricePerUnit,
    Unit,
    DeliveryLocation,
    NeededByDate,
    ClosingDate,
    NumberOfParticipants,
    CreatedUser,
    UpdatedUser,
    CreatedDate,
    UpdatedDate
FROM GroupListing_Old;


-- =========================================================
-- BulkRequestPledge
-- =========================================================

ALTER TABLE BulkRequestPledge RENAME TO BulkRequestPledge_Old;

CREATE TABLE BulkRequestPledge (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    BulkRequestId INTEGER NOT NULL,
    FarmerId INTEGER NOT NULL,
    CropId INTEGER,
    PledgedQuantity FLOAT NOT NULL,
    PledgeDeliveryDate DATE NOT NULL,
    Status NVARCHAR(10) DEFAULT 'PLEDGED',
    IsSelected INTEGER DEFAULT 0,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (BulkRequestId) REFERENCES BulkRequest(Id) ON DELETE CASCADE,
    FOREIGN KEY (Status) REFERENCES BulkRequestPledgeStatus(Code) ON DELETE RESTRICT,
    FOREIGN KEY (FarmerId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE SET NULL
);

INSERT INTO BulkRequestPledge (
    Id,
    BulkRequestId,
    FarmerId,
    CropId,
    PledgedQuantity,
    PledgeDeliveryDate,
    Status,
    IsSelected,
    CreatedDate,
    UpdatedDate
)
SELECT
    Id,
    BulkRequestId,
    FarmerId,
    CropId,
    PledgedQuantity,
    PledgeDeliveryDate,
    Status,
    IsSelected,
    CreatedDate,
    UpdatedDate
FROM BulkRequestPledge_Old;


-- =========================================================
-- GroupParticipants
-- =========================================================

ALTER TABLE GroupParticipants RENAME TO GroupParticipants_Old;

CREATE TABLE GroupParticipants (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    CropId INTEGER NOT NULL,
    GroupId INTEGER NOT NULL,
    ContributionQuantity FLOAT NOT NULL,
    ContributingQuantityUnit NVARCHAR(10) DEFAULT 'KG',
    PledgedDeliveryDate DATE NOT NULL,
    Status NVARCHAR(10) DEFAULT 'NEW',
    DeliveryDateTime DATETIME,
    JoinedDate DATETIME,
    UpdatedDate DATETIME,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE RESTRICT,
    FOREIGN KEY (Status) REFERENCES GroupParticipantStatusLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (ContributingQuantityUnit) REFERENCES CropUnitLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (GroupId) REFERENCES GroupListing(Id) ON DELETE RESTRICT
);

INSERT INTO GroupParticipants (
    Id,
    UserId,
    CropId,
    GroupId,
    ContributionQuantity,
    ContributingQuantityUnit,
    PledgedDeliveryDate,
    Status,
    DeliveryDateTime,
    JoinedDate,
    UpdatedDate
)
SELECT
    Id,
    UserId,
    CropId,
    GroupId,
    ContributionQuantity,
    ContributingQuantityUnit,
    PledgedDeliveryDate,
    Status,
    DeliveryDateTime,
    JoinedDate,
    UpdatedDate
FROM GroupParticipants_Old;


-- =========================================================
-- OrderLineItems
-- =========================================================

ALTER TABLE OrderLineItems RENAME TO OrderLineItems_Old;

CREATE TABLE OrderLineItems (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    OrderId INTEGER NOT NULL,
    ListingEntityType NVARCHAR(1) CHECK (ListingEntityType IN ('I', 'G')) NOT NULL,
    ListingId INTEGER,
    GroupId INTEGER,
    ListerId INTEGER,
    Quantity FLOAT NOT NULL,
    DeliveryStatus NVARCHAR(10) NOT NULL,
    DeliveryStatusReason NVARCHAR(30),
    Status NVARCHAR(10) NOT NULL,
    StatusReason NVARCHAR(30),
    IsNegotiated INTEGER DEFAULT 0,
    NegotiationId INTEGER,
    OrderTicketId INTEGER,
    Amount FLOAT,
    EstimatedDeliveryDate DATE,
    ActualDeliveryDate DATE,
    DeliveryAttemptCount INTEGER,
    FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE CASCADE,
    FOREIGN KEY (GroupId) REFERENCES GroupListing(Id) ON DELETE SET NULL,
    FOREIGN KEY (ListingId) REFERENCES CropListing(Id) ON DELETE SET NULL,
    FOREIGN KEY (ListerId) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (NegotiationId) REFERENCES Negotiations(Id) ON DELETE SET NULL,
    FOREIGN KEY (OrderTicketId) REFERENCES OrderTickets(Id) ON DELETE SET NULL,
    FOREIGN KEY (DeliveryStatus) REFERENCES OrderDeliveryStatusLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (DeliveryStatus, DeliveryStatusReason)
        REFERENCES OrderDeliveryStatusReasonsLov(StatusCode, ReasonCode)
        ON DELETE RESTRICT,
    FOREIGN KEY (Status) REFERENCES OrderLineItemStatusLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (Status, StatusReason)
        REFERENCES OrderLineItemStatusReasonsLov(StatusCode, ReasonCode)
        ON DELETE RESTRICT,
    CONSTRAINT chk_at_least_one_contact
        CHECK (ListingId IS NOT NULL OR GroupId IS NOT NULL)
);

INSERT INTO OrderLineItems (
    Id,
    OrderId,
    ListingEntityType,
    ListingId,
    GroupId,
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
    EstimatedDeliveryDate,
    ActualDeliveryDate,
    DeliveryAttemptCount
)
SELECT
    Id,
    OrderId,
    ListingEntityType,
    ListingId,
    GroupId,
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
    EstimatedDeliveryDate,
    ActualDeliveryDate,
    DeliveryAttemptCount
FROM OrderLineItems_Old;

-- Drop the old child tables first
DROP TABLE GroupParticipants_Old;
DROP TABLE OrderLineItems_Old;

-- Drop the old tables that those children referenced
DROP TABLE GroupListing_Old;
DROP TABLE BulkRequestPledge_Old;
DROP TABLE BulkRequest_Old;


-- =========================================================
-- OrderLineItemStatusHistory
-- =========================================================

CREATE TABLE OrderLineItemStatusHistory (
    Id    INTEGER PRIMARY KEY AUTOINCREMENT,
    LineItemId      INTEGER NOT NULL,
    StatusColumn VARCHAR(30) NOT NULL,   -- 'Status','DeliveryStatus'
    StatusCode   VARCHAR(30) NOT NULL,
    ChangedAt    DATETIME DEFAULT CURRENT_TIMESTAMP,
    ChangedBy    INTEGER NULL,
    FOREIGN KEY (ChangedBy) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (LineItemId) REFERENCES OrderLineItems(Id) ON DELETE RESTRICT
);

