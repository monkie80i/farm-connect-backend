INSERT INTO CropStageObservationTypesLov (Code,Description) VALUES 
('AUTO','Automatic'),
('MANUAL','Mannual'),
('ESTM','Estimated');


DROP TABLE IF EXISTS CropStages;
CREATE TABLE IF NOT EXISTS CropStages (
    -- can be attached to a cropId directly or HarvestCycleInstanceId not both
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropId INTEGER,
    StageName NVARCHAR(10) NOT NULL,
    HarvestCycleInstanceId INTEGER,
    -- ObservationType NVARCHAR(20) DEFAULT 'AUTO' CHECK (ObservationType IN ('MANUAL','AUTO')) NOT NULL,-- removed
    ObservationType NVARCHAR(10) DEFAUlT 'AUTO' NOT NULL, -- new
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