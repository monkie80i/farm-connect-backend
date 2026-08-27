INSERT INTO HarvestCycleInstanceStatusLov (Code,Description)
VALUES 
('NEW','New'),
('WAIT','Waiting'),
('NEXT','Next'),
('ACTIVE','Active'),
('COMPLETE','Complete');

DROP TABLE CropStageProgress;
DROP TABLE CropStageCaps;

---------------------------

ALTER TABLE HarvestCycleInstance RENAME TO HarvestCycleInstance_old;

CREATE TABLE IF NOT EXISTS HarvestCycleInstance (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropId INTEGER NOT NULL,
    CropLifecycleDefinitionId INTEGER NOT NULL,
    CycleLabel NVARCHAR(20),            -- e.g. '2026' or '2026-27'
    StartDate DATE,                      -- when this cycle's tracked stages begin
    CurrentStage NVARCHAR(10),
    Status NVARCHAR(20),
    HarvestReadinessInd INTEGER DEFAULT 0,
    HarvestReadinessPercentage DECIMAL(5,2),
    EstdHarvestDate DATE, -- just for caching
    ActualYield FLOAT,
    HarvestNote TEXT,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE CASCADE,
    FOREIGN KEY (CropLifecycleDefinitionId) REFERENCES CropLifecycleDefinition(Id),
    FOREIGN KEY (CurrentStage) REFERENCES CropStagesLov(Code),
    FOREIGN KEY (Status) REFERENCES HarvestCycleInstanceStatusLov(Code)
);

INSERT INTO HarvestCycleInstance (
    Id,
    CropId,
    CropLifecycleDefinitionId,
    CycleLabel,
    StartDate,
    CurrentStage,
    Status,
    HarvestReadinessInd,
    HarvestReadinessPercentage,
    EstdHarvestDate,
    ActualYield,
    HarvestNote,
    CreatedDate,
    UpdatedDate
) SELECT 
    Id,
    CropId,
    CropLifecycleDefinitionId,
    CycleLabel,
    StartDate,
    CurrentStage,
    Status,
    HarvestReadinessInd,
    HarvestReadinessPercentage,
    EstdHarvestDate,
    ActualYield,
    HarvestNote,
    CreatedDate,
    UpdatedDate
FROM HarvestCycleInstance_old;

DROP TABLE HarvestCycleInstance_old;
-----------------------------------------
DROP TABLE Produce;

CREATE TABLE IF NOT EXISTS Produce (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropId INTEGER,              -- nullable: standalone produce allowed
    FarmerId INTEGER NOT NULL,
    CropTypeId INTEGER,          -- required if CropId is NULL, so it's still classifiable
    HarvestCycleInstanceId INTEGER,  -- nullable, same reasoning as CropId being nullable
    Quantity FLOAT,
    QualityGrade NVARCHAR(20),
    HarvestDate DATE,
    Notes TEXT,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE SET NULL,
    FOREIGN KEY (FarmerId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (HarvestCycleInstanceId) REFERENCES HarvestCycleInstance(Id) ON DELETE SET NULL
);
--------------------------------------------------------------------------------

ALTER TABLE CropStages RENAME TO CropStages_old;

CREATE TABLE IF NOT EXISTS CropStages (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropId INTEGER,
    StageName NVARCHAR(10) NOT NULL,
    HarvestCycleInstanceId INTEGER,
    ObservationType NVARCHAR(10) DEFAUlT 'AUTO' NOT NULL,
    ObservedDate DATETIME,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    CreatedUser INTEGER,
    UpdatedUser INTEGER,
    FOREIGN KEY (HarvestCycleInstanceId) REFERENCES HarvestCycleInstance(Id) ON DELETE CASCADE,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (StageName) REFERENCES CropStagesLov(Code) ON DELETE SET NULL, -- new
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE CASCADE,
    FOREIGN KEY (ObservationType) REFERENCES CropStageObservationTypesLov(Code) ON DELETE RESTRICT,
    CHECK (CropId IS NOT NULL OR HarvestCycleInstanceId IS NOT NULL)
);

INSERT INTO CropStages (
    Id,
    CropId,
    StageName,
    HarvestCycleInstanceId,
    ObservationType,
    ObservedDate,
    CreatedDate,
    UpdatedDate,
    CreatedUser,
    UpdatedUser
) SELECT 
    Id,
    CropId,
    StageName,
    HarvestCycleInstanceId,
    ObservationType,
    ObservedDate,
    CreatedDate,
    UpdatedDate,
    CreatedUser,
    UpdatedUser
FROM CropStages_old;

----------------
DROP TABLE IF EXISTS CropHealthLog;

CREATE TABLE IF NOT EXISTS CropHealthLog (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropId INTEGER,
    HarvestCycleInstanceId INTEGER, -- anchor
    Title NVARCHAR(100) NOT NULL,
    Description TEXT,
    Date DATETIME NOT NULL,
    Severity NVARCHAR(20),
    ImagePath TEXT,
    CreatedUser INTEGER,
    UpdatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE SET NULL,
    FOREIGN KEY (Severity) REFERENCES HealthLogSeverityLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (HarvestCycleInstanceId) REFERENCES HarvestCycleInstance(Id) ON DELETE SET NULL
);


-------------------------------
DROP TABLE CropListing;
CREATE TABLE IF NOT EXISTS CropListing (
    -- removed CropId FK
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    ProduceId INTEGER NOT NULL, -- new
    AvailableQuantity FLOAT,
    AvailabilityDate DATE,
    IsNegotiable INTEGER DEFAULT 0,
    MinimumOrderQuantity FLOAT,
    PricePerUnit FLOAT,
    Unit NVARCHAR(10),
    CreatedUser INTEGER,
    UpdatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (ProduceId) REFERENCES Produce(Id) ON DELETE RESTRICT,
    FOREIGN KEY (Unit) REFERENCES CropUnitLov(Code) ON DELETE SET NULL
);


DROP TABLE CropStages_old;
-------------------------------
DROP TABLE Negotiation;

CREATE TABLE IF NOT EXISTS Negotiation (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    ListingId INTEGER,
    InitialPrice FLOAT,
    CurrentPrice FLOAT,
    FinalPrice FLOAT,
    IsAccepted INTEGER DEFAULT 0,
    AcceptedBy INTEGER,
    IsActive INTEGER DEFAULT 1,
    CreatedUser INTEGER,
    UpdatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (AcceptedBy) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (ListingId) REFERENCES CropListing(Id) ON DELETE SET NULL
);
-------------------------------


