DROP TABLE GroupParticipants;

CREATE TABLE GroupParticipants (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    CropId INTEGER NOT NULL,
    GroupId INTEGER NOT NULL,
    ProduceId INTEGER,
    ContributionQuantity FLOAT NOT NULL,
    ContributingQuantityUnit NVARCHAR(10) DEFAULT 'KG',
    PledgedDeliveryDate DATE NOT NULL,
    Status NVARCHAR(10) DEFAULT 'NEW',
    DeliveryDateTime DATETIME,
    JoinedDate DATETIME,
    UpdatedDate DATETIME,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE RESTRICT,
    FOREIGN KEY (ProduceId) REFERENCES Produce(Id) ON DELETE RESTRICT,
    FOREIGN KEY (Status) REFERENCES GroupParticipantStatusLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (ContributingQuantityUnit) REFERENCES CropUnitLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (GroupId) REFERENCES GroupListing(Id) ON DELETE SET NULL
);

INSERT INTO GroupParticipants 
(
    Id,
    UserId,
    CropId,
    GroupId,
    ContributionQuantity,
    ContributingQuantityUnit,
    PledgedDeliveryDate,
    Status,
    JoinedDate

) VALUES (1,9,1,1,5000,'KG','2027-07-29','NEW','2026-09-20 08:51:53');