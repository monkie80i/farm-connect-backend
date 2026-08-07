-- V2
/**
add to generic
SeasonLOV
RegionLov
*/

INSERT INTO RegionLov (Code,Description) VALUES 
('AP','Andhra Pradesh'),
('AR','Arunachal Pradesh'),
('AS','Assam'),
('BH','Bihar'),
('CT','Chhattisgarh'),
('GA','Goa'),
('GJ','Gujarat'),
('HR','Haryana'),
('HP','Himachal Pradesh'),
('JH','Jharkhand'),
('KA','Karnataka'),
('KL','Kerala'),
('MP','Madhya Pradesh'),
('MH','Maharashtra'),
('MN','Manipur'),
('ME','Meghalaya'),
('MI','Mizoram'),
('ML','Nagaland'),
('OR','Odisha'),
('PB','Punjab'),
('RJ','Rajasthan'),
('SK','Sikkim'),
('TN','Tamil Nadu'),
('TS','Telangana'),
('TR','Tripura'),
('UP','Uttar Pradesh'),
('UT','Uttarakhand'),
('WB','West Bengal '),
('AN','Andaman and Nicobar Islands'),
('CH','Chandigarh'),
('DN','Dadra and Nagar Haveli'),
('DD','Daman and Diu'),
('DL','Delhi'),
('JK','Jammu and Kashmir'),
('LA','Ladakh'),
('LD','Lakshadweep'),
('PY','Puducherry');

INSERT INTO SeasonLOV (Code,Description) VALUES 
('WINTER','Winter'),
('SUMMER','Summer'),
('MONSOON','Monsoon'),
('AUTUMN','Autumn');

CREATE TABLE IF NOT EXISTS SeasonRegionCalendar (
    -- static
    -- admin populated/curated table
    RegionCode NVARCHAR(10) NOT NULL,
    SeasonCode NVARCHAR(10) NOT NULL,
    TypicalStartMonth INTEGER,
    TypicalEndMonth INTEGER,
    Notes TEXT,
    PRIMARY KEY (RegionCode, SeasonCode),
    FOREIGN KEY (RegionCode) REFERENCES RegionLov(Code),
    FOREIGN KEY (SeasonCode) REFERENCES SeasonLov(Code)
);

/*
1. Create season and region lov in generic
2. Seed heir values
3. Create SeasonRegionCalendar
4. Create a scrip that crosses bothe and creats Season regioan calendar
5. Seach for each state or eregion and get the satart and end month, fill in
*/

CREATE TABLE IF NOT EXISTS Farm (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER,
    Name NVARCHAR(30) NOT NULL,
    Address TEXT,
    City NVARCHAR(20),
    State NVARCHAR(10), -- changed
    Latitude DECIMAL(11,8),
    Longitude DECIMAL(11,8),
    TotalCultivableArea FLOAT,
    landUnit NVARCHAR(10),
    OwnershipProofPath TEXT,
    IsDefault INTEGER DEFAULT 0,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (landUnit) REFERENCES LandAreaUnitLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (State) REFERENCES RegionLov(Code) ON DELETE SET NULL -- added
);

CREATE TABLE IF NOT EXISTS Crop (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name NVARCHAR(50) NOT NULL,
    CropTypeId INTEGER,
    VarietyId INTEGER,
    FarmId INTEGER,
    FarmerId INTEGER,
    -- LandPrepDate DATETIME, --move CropStages
    -- SowingDate DATETIME, --move CropStages
    ExpectedGrowthDurationDays INTEGER,  -- for caching
    CultivatedArea FLOAT,
    CultivatedAreaUnit NVARCHAR(10),
    CultivatedAreaInAcre FLOAT,
    InitialSoilCondition TEXT,
    InitialNotes TEXT,
    HealthStatus NVARCHAR(10), -- changed length 
    CurrentStage NVARCHAR(10), -- changed length
    -- HarvestReadinessInd INTEGER DEFAULT 0, -- move to HarvestCycleInstance
    -- HarvestReadinessPercentage DECIMAL(5,2), -- move to HarvestCycleInstance
    -- ListingId INTEGER, -- move to Produce
    -- EstdHarvestDate DATE, --move CropStages 
    -- ActualHarvestDate DATE, --move CropStages
    -- ActualYield FLOAT, -- move to HarvestCycleInstance
    -- HarvestNote TEXT,  -- move to HarvestCycleInstance
    CreatedUser INTEGER,
    UpdatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (CropTypeId) REFERENCES CropType(Id) ON DELETE SET NULL,
    FOREIGN KEY (VarietyId) REFERENCES CropVariety(Id) ON DELETE SET NULL,
    FOREIGN KEY (FarmId) REFERENCES Farm(Id) ON DELETE SET NULL,
    FOREIGN KEY (HealthStatus) REFERENCES HealthStatusLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (CurrentStage) REFERENCES CropStagesLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (CultivatedAreaUnit) REFERENCES LandAreaUnitLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (FarmerId) REFERENCES Users(Id) ON DELETE SET NULL
    -- FOREIGN KEY (ListingId) REFERENCES CropListing(Id) ON DELETE SET NULL -- move to Produce
);


CREATE TABLE IF NOT EXISTS CropLifecycleDefinition (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        CropTypeId INTEGER NOT NULL,
        CropVarietyId Integer NOT NULL,
        Season NVARCHAR(10), -- changed | add an ALL option as well
        Region NVARCHAR(10), -- changed | add an ALL option as well; in UI add a fufnctioanlity to repeat table creation for multiple regions with same data(sith childs)
        PhaseType NVARCHAR(15) DEFAULT 'FULL', -- new | se below
        CreatedUser INTEGER,
        UpdatedUser INTEGER,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (CropTypeId) REFERENCES CropType(Id) ON DELETE RESTRICT,
        FOREIGN KEY (CropVarietyId) REFERENCES CropVariety(Id) ON DELETE RESTRICT,
        FOREIGN KEY (Season) REFERENCES SeasonLov(Code) ON DELETE SET NULL, -- changed
        FOREIGN KEY (Region) REFERENCES RegionLov(Code) ON DELETE SET NULL -- changed
);

-- PhaseType COLUMN
-- 'FULL'          -> annual crops: one instance covers the whole lifecycle
-- 'ESTABLISHMENT' -> perennial: first instance only, planting -> first bearing
-- 'RECURRING'     -> perennial: every instance after that

CREATE TABLE IF NOT EXISTS CropLifeCycleStages (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropLifecycleDefinitionId INTEGER,
    Stage NVARCHAR(10) NOT NULL, -- changed Name
    StageOrder INTEGER NOT NULL,
    MinDaysFromPreviousStage INTEGER NOT NULL,
    MaxDaysFromPreviousStage INTEGER NOT NULL,
    Description TEXT,
    FOREIGN KEY (CropLifecycleDefinitionId) REFERENCES CropLifecycleDefinition(Id) ON DELETE CASCADE,
    FOREIGN KEY (Stage) REFERENCES CropStagesLov(Code) ON DELETE SET NULL -- changed Name
);


--new
CREATE TABLE IF NOT EXISTS HarvestCycleInstance (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropId INTEGER NOT NULL,
    CropLifecycleDefinitionId INTEGER NOT NULL,
    CycleLabel NVARCHAR(20),            -- e.g. '2026' or '2026-27'
    StartDate DATE,                      -- when this cycle's tracked stages begin
    CurrentStage NVARCHAR(10),
    Status NVARCHAR(20) DEFAULT 'ACTIVE' CHECK (Status IN ('ACTIVE','COMPLETED','SKIPPED')) NOT NULL,-- ACTIVE / COMPLETED / SKIPPED
    HarvestReadinessInd INTEGER DEFAULT 0,
    HarvestReadinessPercentage DECIMAL(5,2),
    EstdHarvestDate DATE, -- just for caching
    ActualHarvestDate DATE, -- will be on the crop stages, do i need it? kinda redundant
    ActualYield FLOAT,
    HarvestNote TEXT,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE CASCADE,
    FOREIGN KEY (CropLifecycleDefinitionId) REFERENCES CropLifecycleDefinition(Id),
    FOREIGN KEY (CurrentStage) REFERENCES CropStagesLov(Code)
);


-- new
CREATE TABLE IF NOT EXISTS CropStages (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropId INTEGER,
    StageName NVARCHAR(10) NOT NULL,
    HarvestCycleInstanceId INTEGER, -- NULLABLE | Optional
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
)


-- new
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

CREATE TABLE IF NOT EXISTS CropListing (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        -- CropId INTEGER, -- removed
        ProduceId INTEGER NOT NULL,
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
        -- FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE SET NULL, -- removed
        FOREIGN KEY (ProduceId) REFERENCES Produce(Id) ON DELETE RESTRICT,
        FOREIGN KEY (Unit) REFERENCES CropUnitLov(Code) ON DELETE SET NULL
    );

--------------------
/**

*/

