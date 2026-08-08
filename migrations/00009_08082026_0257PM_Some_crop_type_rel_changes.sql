-- 1.
INSERT INTO GrowthDurationLov (Code,Description) VALUES ('ANNUAL','Annual'),('BIENNIAL','Biennial'),('PERENNIAL','Perinnial');
-- ANNUAL	Completes lifecycle in one season; replanted every cycle
-- BIENNIAL	Takes two growing seasons to complete lifecycle (vegetative in year 1, flowering/seed in year 2)
-- PERENNIAL - grows for ever kinda
-------------------------------------------
-- 2.
ALTER TABLE Crop ADD COLUMN isLifeCycleEnded INTEGER DEFAULT 0;

----------------------------------------------------------------
-- 3.
ALTER TABLE CropType RENAME TO CropType_old;

CREATE TABLE IF NOT EXISTS CropType (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropName NVARCHAR(50) NOT NULL UNIQUE COLLATE NOCASE, -- changed
    ScientificName NVARCHAR(100),
    -- IsPerennial INTEGER DEFAULT 0, -- removed
    GrowthDurationType NVARCHAR(10) NOT NULL DEFAULT 'ANNUAL', -- new
    IsActive INTEGER DEFAULT 1, -- added
    CreatedUser INTEGER,
    UpdatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (GrowthDurationType) REFERENCES GrowthDurationLov(Code) ON DELETE SET NULL
);

INSERT INTO CropType 
(
    Id,
    CropName,
    ScientificName,
    CreatedUser,
    UpdatedUser,
    CreatedDate,
    UpdatedDate
)
SELECT 
    Id,
    CropName,
    ScientificName,
    CreatedUser,
    UpdatedUser,
    CreatedDate,
    UpdatedDate
FROM CropType_old;

DROP TABLE CropType_old;

----------------------------------------------------------------
-- 4.

ALTER TABLE FarmCropTypes RENAME TO FarmCropTypes_old;

CREATE TABLE IF NOT EXISTS FarmCropTypes (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    FarmId INTEGER NOT NULL, -- changed
    CropTypeId INTEGER NOT NULL, -- changed
    FOREIGN KEY (FarmId) REFERENCES Farm(Id) ON DELETE CASCADE,
    FOREIGN KEY (CropTypeId) REFERENCES CropType(Id) ON DELETE CASCADE,
    UNIQUE(FarmId, CropTypeId)
);

INSERT INTO FarmCropTypes (
    Id,
    FarmId,
    CropTypeId
) SELECT 
    Id,
    FarmId,
    CropTypeId
FROM FarmCropTypes_old;

DROP TABLE FarmCropTypes_old;
------------------------------------------------------------------
-- 5.

ALTER TABLE CropVariety RENAME TO CropVariety_old;

Create TABLE IF NOT EXISTS CropVariety (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropTypeId INTEGER NOT NULL,
    VarietyName NVARCHAR(50) NOT NULL,
    MaturityMinDays INTEGER NOT NULL, -- changed
    MaturityMaxDays INTEGER NOT NULL, -- changed
    YieldPerAcre FLOAT NOT NULL, -- changed
    ShelfLifeDays INTEGER,
    IsHybrid INTEGER DEFAULT 0,
    Notes TEXT,
    IsActive INTEGER DEFAULT 1, -- new
    CreatedUser INTEGER,
    UpdatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (CropTypeId) REFERENCES CropType(Id) ON DELETE RESTRICT -- change
);

INSERT INTO CropVariety (
    Id,
    CropTypeId,
    VarietyName,
    MaturityMinDays,
    MaturityMaxDays,
    YieldPerAcre,
    ShelfLifeDays,
    IsHybrid,
    Notes,
    CreatedUser,
    UpdatedUser,
    CreatedDate,
    UpdatedDate
) SELECT 
    Id,
    CropTypeId,
    VarietyName,
    MaturityMinDays,
    MaturityMaxDays,
    YieldPerAcre,
    ShelfLifeDays,
    IsHybrid,
    Notes,
    CreatedUser,
    UpdatedUser,
    CreatedDate,
    UpdatedDate
FROM CropVariety_old;

DROP TABLE CropVariety_old;

-------------------------------------------------------------------------------------
-- 6.

ALTER TABLE CropLifeCycleStages RENAME TO CropLifeCycleStages_old;

CREATE TABLE IF NOT EXISTS CropLifeCycleStages (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropLifecycleDefinitionId INTEGER,
    Stage NVARCHAR(10) NOT NULL,
    StageOrder INTEGER NOT NULL,
    MinDaysFromPreviousStage INTEGER NOT NULL,
    MaxDaysFromPreviousStage INTEGER NOT NULL,
    Description TEXT,
    UpdatedUser INTEGER,
    UpdatedDate DATETIME,
    FOREIGN KEY (CropLifecycleDefinitionId) REFERENCES CropLifecycleDefinition(Id) ON DELETE CASCADE,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (Stage) REFERENCES CropStagesLov(Code) ON DELETE SET NULL
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
    Stage,
    StageOrder,
    MinDaysFromPreviousStage,
    MaxDaysFromPreviousStage,
    Description
FROM CropLifeCycleStages_old;

DROP TABLE CropLifeCycleStages_old;
--------------------------------------------------------
-- FIN.