INSERT INTO BulkRequestStatus (Code,Description) VALUES 
('OPEN','Open'),
('MET','Thershold Met'),
('CONFIRMED','Confirmed'),
('EXPIRED','Expired'),
('CANCELLED','Cancelled');

INSERT INTO BulkRequestPledgeStatus (Code,Description) VALUES 
('PLEDGED','Pledged'),
('WITHDRAWN','Withdrawn'),
('CONFIRMED','Confirmed'),
('DEFAULTED','Defaulted');

INSERT INTO GroupListingStatusLov (Code,Description) VALUES 
('NEW','New'),
('ACTIVE','Active'),
('COMPLETE','Complete'),
('FAILED','Failed');

INSERT INTO GroupParticipantDeliveryStatusLov (Code,Description) VALUES 
('NEW','New'),
('ACTIVE','Active'),
('DELIVERED','Complete'),
('FAILED','Failed');

CREATE TABLE IF NOT EXISTS BulkRequest (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    BuyerId INTEGER NOT NULL,
    CropTypeId INTEGER NOT NULL,
    VarietyId INTEGER NOT NULL,        -- same-variety rule applies here too, for the same reason as GroupListing
    RequiredQuantity FLOAT NOT NULL,
    Unit NVARCHAR(10) DEFAULT 'KG',
    OfferedPricePerUnit FLOAT NOT NULL, -- fixed at posting no renegotiation
    DeliveryLocation TEXT,
    NeededByDate DATE,
    PledgeDeadline DATE,                -- window for farmers to reach threshold
    ConfirmationDeadline DATE,          -- window for buyer to confirm once threshold met
    CommittedQuantity FLOAT DEFAULT 0,  -- running total, updated on each pledge
    Status NVARCHAR(10),                -- OPEN, THRESHOLD_MET, CONFIRMED, EXPIRED, CANCELLED
    MinLeadDays INTEGER,              -- snapshot of ExpectedGrowthDurationDays at creation, for display/validation
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (BuyerId) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (CropTypeId) REFERENCES CropType(Id) ON DELETE RESTRICT,
    FOREIGN KEY (VarietyId) REFERENCES CropVariety(Id) ON DELETE RESTRICT,
    FOREIGN KEY (Unit) REFERENCES CropUnitLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (Status) REFERENCES BulkRequestStatus(Code) ON DELETE RESTRICT
);


CREATE TABLE IF NOT EXISTS BulkRequestPledge (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    BulkRequestId INTEGER NOT NULL,
    FarmerId INTEGER NOT NULL,
    CropId INTEGER,                     -- which harvest they're pledging from
    PledgedQuantity FLOAT NOT NULL,
    PledgeDeliveryDate DATE,
    Status NVARCHAR(10),                -- PLEDGED, WITHDRAWN, CONFIRMED, DEFAULTED
    IsSelected INTEGER DEFAULT 0,                 -- WHETHER BUyer has SELECTED the prledge 
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (BulkRequestId) REFERENCES BulkRequest(Id) ON DELETE CASCADE,
    FOREIGN KEY (Status) REFERENCES BulkRequestPledgeStatus(Code) ON DELETE RESTRICT,
    FOREIGN KEY (FarmerId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS GroupListing (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    BulkRequestId INTEGER NOT NULL,
    Name NVARCHAR(30) NOT NULL,
    RequiredQuantity FLOAT NOT NULL,
    TotalCombinedQuantity FLOAT NOT NULL,
    Status NVARCHAR(10),            --- 'NEW,ACTIVE,COMPLETE,FAILED
    PricePerUnit FLOAT NOT NULL,             
    Unit NVARCHAR(10) DEFAULT 'KG',  
    DeliveryLocation TEXT,
    NeededByDate DATE,         
    ClosingDate DATE,           -- final fullfilment date
    NumberOfParticipants INTEGER,   
    CreatedUser INTEGER,
    UpdatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE SET NULL,
    FOREIGN KEY (Status) REFERENCES GroupListingStatusLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (Unit) REFERENCES CropUnitLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (BulkRequestId) REFERENCES BulkRequest(Id) ON DELETE RESTRICT
);



CREATE TABLE IF NOT EXISTS GroupParticipants (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER,
    CropId INTEGER,
    GroupId INTEGER,
    ContributionQuantity FLOAT,
    contributingQuantityUnit NVARCHAR(10),
    PledgeDeliveryDate DATE,
    DeliveryStatus NVARCHAR(10),
    DeliveryDateTime DATETIME,
    JoinedDate DATETIME,
    UpdatedDate DATETIME,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE SET NULL,
    FOREIGN KEY (DeliveryStatus) REFERENCES GroupParticipantDeliveryStatusLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (GroupId) REFERENCES GroupListing(Id) ON DELETE SET NULL
);

DROP TABLE GroupRequests;