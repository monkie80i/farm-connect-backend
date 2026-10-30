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
    ProduceId INTEGER,
    DeliveryDateTime DATETIME,
    JoinedDate DATETIME,
    UpdatedDate DATETIME,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE RESTRICT,
    FOREIGN KEY (Status) REFERENCES GroupParticipantStatusLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (ProduceId) REFERENCES Produce(Id) ON DELETE RESTRICT,
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