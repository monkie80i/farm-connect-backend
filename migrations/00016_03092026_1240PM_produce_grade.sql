INSERT INTO ProduceQualityLov (Code,Description) VALUES 
('GRADE_1','Grade 1 - Premium'),
('GRADE_2','Grade 2 - Good'),
('GRADE_3','Grade 3 - Fair'),
('GRADE_4','Grade 4 - Ordinary');


DROP TABLE IF EXISTS Produce;
CREATE TABLE IF NOT EXISTS Produce (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropId INTEGER,              -- nullable: standalone produce allowed
    FarmerId INTEGER NOT NULL,
    CropTypeId INTEGER,          -- required if CropId is NULL, so it's still classifiable
    HarvestCycleInstanceId INTEGER,  -- nullable, same reasoning as CropId being nullable
    Quantity FLOAT,
    RemainingQuantity FLOAT, -- new
    QualityGrade NVARCHAR(10),
    HarvestDate DATE,
    Notes TEXT,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE SET NULL,
    FOREIGN KEY (FarmerId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (QualityGrade) REFERENCES ProduceQualityLov(Code) ON DELETE RESTRICT, -- new
    FOREIGN KEY (HarvestCycleInstanceId) REFERENCES HarvestCycleInstance(Id) ON DELETE SET NULL
);