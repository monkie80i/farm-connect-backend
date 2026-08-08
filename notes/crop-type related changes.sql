ALTER TABLE Crop ADD COLUMN isLifeCycleEnded INTEGER DEFAULT 0;

-- GrowthDurationLov
-- ANNUAL	Completes lifecycle in one season; replanted every cycle
-- BIENNIAL	Takes two growing seasons to complete lifecycle (vegetative in year 1, flowering/seed in year 2)
-- PERENNIAL - grows for ever kinda

CREATE TABLE IF NOT EXISTS CropType (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropName NVARCHAR(50) NOT NULL UNIQUE COLLATE NOCASE, -- changed
    ScientificName NVARCHAR(100),
    -- IsPerennial INTEGER DEFAULT 0, -- removed
    GrowthDurationType NVARCHAR(10) NOT NULL DEFAULT 'ANNUAL', -- added
    CreatedUser INTEGER,
    UpdatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    IsActive INTEGER DEFAULT 1, -- cchanded
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (GrowthDurationType) REFERENCES GrowthDurationLov(Code) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS FarmCropTypes (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    FarmId INTEGER NOT NULL, -- changed
    CropTypeId INTEGER NOT NULL, -- changed
    FOREIGN KEY (FarmId) REFERENCES Farm(Id) ON DELETE CASCADE,
    FOREIGN KEY (CropTypeId) REFERENCES CropType(Id) ON DELETE CASCADE,
    UNIQUE(FarmId, CropTypeId)
);

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
    IsActive INTEGER DEFAULT 1, -- changed
    CreatedUser INTEGER,
    UpdatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (CropTypeId) REFERENCES CropType(Id) ON DELETE RESTRICT -- change
);

ALTER TABLE CropLifeCycleStages ADD COLUMN UpdatedUser INTEGER REFERENCES Users(Id) ON DELETE SET NULL;
ALTER TABLE CropLifeCycleStages ADD COLUMN UpdatedDate DATETIME;
