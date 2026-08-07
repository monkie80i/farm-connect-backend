ALTER TABLE Crop RENAME TO Crop_old;

CREATE TABLE IF NOT EXISTS Crop (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name NVARCHAR(50) NOT NULL,
    CropTypeId INTEGER,
    VarietyId INTEGER,
    FarmId INTEGER,
    FarmerId INTEGER,
    ExpectedGrowthDurationDays INTEGER,  -- for caching
    CultivatedArea FLOAT,
    CultivatedAreaUnit NVARCHAR(10),
    CultivatedAreaInAcre FLOAT,
    InitialSoilCondition TEXT,
    InitialNotes TEXT,
    HealthStatus NVARCHAR(10), -- changed length 
    CurrentStage NVARCHAR(10), -- changed length
    CreatedUser INTEGER,
    UpdatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (CropTypeId) REFERENCES CropType(Id) ON DELETE SET NULL,
    FOREIGN KEY (VarietyId) REFERENCES CropVariety(Id) ON DELETE SET NULL,
    FOREIGN KEY (FarmId) REFERENCES Farm(Id) ON DELETE SET NULL,
    FOREIGN KEY (FarmerId) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (CultivatedAreaUnit) REFERENCES LandAreaUnitLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (HealthStatus) REFERENCES HealthStatusLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (CurrentStage) REFERENCES CropStagesLov(Code) ON DELETE SET NULL
);

INSERT INTO Crop (
    Id,
    Name,
    CropTypeId,
    VarietyId,
    FarmId,
    FarmerId,
    ExpectedGrowthDurationDays,
    CultivatedArea,
    CultivatedAreaUnit,
    CultivatedAreaInAcre,
    InitialSoilCondition,
    InitialNotes,
    HealthStatus,
    CurrentStage,
    CreatedUser,
    UpdatedUser,
    CreatedDate,
    UpdatedDate
) SELECT 
    Id,
    Name,
    CropTypeId,
    VarietyId,
    FarmId,
    FarmerId,
    ExpectedGrowthDurationDays,
    CultivatedArea,
    CultivatedAreaUnit,
    CultivatedAreaInAcre,
    InitialSoilCondition,
    InitialNotes,
    HealthStatus,
    CurrentStage,
    CreatedUser,
    UpdatedUser,
    CreatedDate,
    UpdatedDate
FROM Crop_old;

DROP TABLE Crop_old;

-----------------------
ALTER TABLE CropLifecycleDefinition RENAME TO CropLifecycleDefinition_old;

CREATE TABLE IF NOT EXISTS CropLifecycleDefinition (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropTypeId INTEGER NOT NULL,
    CropVarietyId Integer NOT NULL,
    Season NVARCHAR(10), -- changed
    Region NVARCHAR(10), -- changed
    PhaseType NVARCHAR(15) DEFAULT 'FULL' CHECK (PhaseType IN ('FULL','ESTABLISHMENT','RECURRING')) NOT NULL, -- new
    CreatedUser INTEGER,
    UpdatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (CropTypeId) REFERENCES CropType(Id) ON DELETE RESTRICT,
    FOREIGN KEY (CropVarietyId) REFERENCES CropVariety(Id) ON DELETE RESTRICT,
    FOREIGN KEY (Season) REFERENCES SeasonLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (Region) REFERENCES RegionLov(Code) ON DELETE SET NULL
);

-- PhaseType COLUMN
-- 'FULL'          -> annual crops: one instance covers the whole lifecycle
-- 'ESTABLISHMENT' -> perennial: first instance only, planting -> first bearing
-- 'RECURRING'     -> perennial: every instance after that

INSERT INTO CropLifecycleDefinition 
(
    Id,
    CropTypeId,
    CropVarietyId,
    Season,
    Region,
    CreatedUser,
    UpdatedUser,
    CreatedDate,
    UpdatedDate
)
SELECT 
    Id,
    CropTypeId,
    CropVarietyId,
    'YEARROUND' as Season,
    'ALLOVER' as Region,
    CreatedUser,
    UpdatedUser,
    CreatedDate,
    UpdatedDate
FROM CropLifecycleDefinition_old;

DROP TABLE CropLifecycleDefinition_old;
----------------------------------------
ALTER TABLE CropLifeCycleStages RENAME TO CropLifeCycleStages_old;

CREATE TABLE IF NOT EXISTS CropLifeCycleStages (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropLifecycleDefinitionId INTEGER,
    Stage NVARCHAR(10) NOT NULL, -- changed 
    StageOrder INTEGER NOT NULL,
    MinDaysFromPreviousStage INTEGER NOT NULL,
    MaxDaysFromPreviousStage INTEGER NOT NULL,
    Description TEXT,
    FOREIGN KEY (CropLifecycleDefinitionId) REFERENCES CropLifecycleDefinition(Id) ON DELETE CASCADE,
    FOREIGN KEY (Stage) REFERENCES CropStagesLov(Code) ON DELETE SET NULL -- changed
);

INSERT INTO CropLifeCycleStages 
(
    Id,
    CropLifecycleDefinitionId,
    Stage,
    StageOrder,
    MinDaysFromPreviousStage,
    MaxDaysFromPreviousStage,
    Description
)
SELECT 
    Id,
    CropLifecycleDefinitionId,
    StageName as Stage,
    StageOrder,
    MinDaysFromPreviousStage,
    MaxDaysFromPreviousStage,
    Description
FROM CropLifeCycleStages_old;

DROP TABLE CropLifeCycleStages_old;
-----------------------------------
-- NEW
CREATE TABLE IF NOT EXISTS HarvestCycleInstance (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropId INTEGER NOT NULL,
    CropLifecycleDefinitionId INTEGER NOT NULL,
    CycleLabel NVARCHAR(20),            -- e.g. '2026' or '2026-27'
    StartDate DATE,                      -- when this cycle's tracked stages begin
    CurrentStage NVARCHAR(10),
    Status NVARCHAR(20) DEFAULT 'ACTIVE' CHECK (Status IN ('ACTIVE','COMPLETED','SKIPPED')) NOT NULL,
    HarvestReadinessInd INTEGER DEFAULT 0,
    HarvestReadinessPercentage DECIMAL(5,2),
    EstdHarvestDate DATE, -- just for caching
    ActualYield FLOAT,
    HarvestNote TEXT,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE CASCADE,
    FOREIGN KEY (CropLifecycleDefinitionId) REFERENCES CropLifecycleDefinition(Id),
    FOREIGN KEY (CurrentStage) REFERENCES CropStagesLov(Code)
);
--------------------------------------------------------------
-- NEW
CREATE TABLE IF NOT EXISTS CropStages (
    -- can be attached to a cropId directly or HarvestCycleInstanceId not both
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropId INTEGER,
    StageName NVARCHAR(10) NOT NULL,
    HarvestCycleInstanceId INTEGER,
    ObservationType NVARCHAR(20) DEFAULT 'AUTO' CHECK (ObservationType IN ('MANUAL','AUTO')) NOT NULL,
    ObservedDate DATETIME,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    CreatedUser INTEGER,
    UpdatedUser INTEGER,
    FOREIGN KEY (HarvestCycleInstanceId) REFERENCES HarvestCycleInstance(Id) ON DELETE CASCADE,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (StageName) REFERENCES CropStagesLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE CASCADE,
    CHECK (CropId IS NOT NULL OR HarvestCycleInstanceId IS NOT NULL)
);

---------------------------------------------------------------------
-- NEW

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

--------------------------------------------------------------------

ALTER TABLE CropListing RENAME TO CropListing_Old;

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

----------------------------------------