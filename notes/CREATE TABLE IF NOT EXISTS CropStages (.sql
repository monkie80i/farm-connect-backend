CREATE TABLE IF NOT EXISTS CropStages (
    -- can be attached to a cropId directly or HarvestCycleInstanceId not both
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropId INTEGER,
    StageName NVARCHAR(10) NOT NULL,
    StageOrder INTEGER NOT NULL, -- new
    HarvestCycleInstanceId INTEGER,
    EstimatedMinDate DATE NOT NULL, -- new
    EstimatedMaxDate DATE NOT NULL, -- new
    ObservationType NVARCHAR(20) DEFAULT 'AUTO' CHECK (ObservationType IN ('MANUAL','AUTO')) NOT NULL,
    ObservedDate DATETIME,
    Notes TEXT, -- new
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