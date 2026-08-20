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