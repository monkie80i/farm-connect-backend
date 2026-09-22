DROP TABLE GroupListing;
DROP TABLE GroupParticipants;


CREATE TABLE IF NOT EXISTS GroupListing (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    BulkRequestId INTEGER NOT NULL,
    Name NVARCHAR(30) NOT NULL,
    CropTypeId INTEGER NOT NULL,
    VarietyId INTEGER NOT NULL,     
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
    FOREIGN KEY (CropTypeId) REFERENCES CropType(Id) ON DELETE RESTRICT,
    FOREIGN KEY (VarietyId) REFERENCES CropVariety(Id) ON DELETE RESTRICT,
    FOREIGN KEY (Status) REFERENCES GroupListingStatusLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (Unit) REFERENCES CropUnitLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (BulkRequestId) REFERENCES BulkRequest(Id) ON DELETE RESTRICT
);



CREATE TABLE IF NOT EXISTS GroupParticipants (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    CropId INTEGER NOT NULL,
    GroupId INTEGER NOT NULL,
    ContributionQuantity FLOAT NOT NULL,
    ContributingQuantityUnit NVARCHAR(10) DEFAULT 'KG',
    PledgeDeliveryDate DATE,
    Status NVARCHAR(10) DEFAULT 'NEW',
    DeliveryDateTime DATETIME,
    JoinedDate DATETIME,
    UpdatedDate DATETIME,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE RESTRICT,
    FOREIGN KEY (Status) REFERENCES GroupParticipantStatusLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (ContributingQuantityUnit) REFERENCES CropUnitLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (GroupId) REFERENCES GroupListing(Id) ON DELETE SET NULL
);
