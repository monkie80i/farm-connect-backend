ALTER TABLE Farm RENAME TO Farm_old;

CREATE TABLE IF NOT EXISTS Farm (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER,
    Name NVARCHAR(30) NOT NULL,
    Address TEXT,
    City NVARCHAR(20),
    State NVARCHAR(10),
    Latitude DECIMAL(11,8),
    Longitude DECIMAL(11,8),
    TotalCultivableArea FLOAT,
    LandUnit NVARCHAR(10),
    OwnershipProofPath TEXT,
    OwnershipProofFileName TEXT,
    IsDefault INTEGER DEFAULT 0,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (LandUnit) REFERENCES LandAreaUnitLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (State) REFERENCES RegionLov(Code) ON DELETE SET NULL
);

INSERT INTO Farm (
    Id,
    UserId,
    Name,
    Address,
    City,
    State,
    Latitude,
    Longitude,
    TotalCultivableArea,
    LandUnit,
    OwnershipProofPath,
    OwnershipProofFileName,
    IsDefault,
    CreatedDate,
    UpdatedDate
)
SELECT 
    Id,
    UserId,
    Name,
    Address,
    City,
    'KL' as State,
    Latitude,
    Longitude,
    TotalCultivableArea,
    LandUnit,
    OwnershipProofPath,
    OwnershipProofFileName,
    IsDefault,
    CreatedDate,
    UpdatedDate    
 FROM Farm_old;

DROP TABLE Farm_old;