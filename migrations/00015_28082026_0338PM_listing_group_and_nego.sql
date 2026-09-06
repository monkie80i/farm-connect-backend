INSERT INTO ListingStatusLov (Code,Description) VALUES 
('ACTIVE','Active'),
('PARTIAL','Partially Fullfilled'),
('SOLD_OUT','Sold Out'),
('WITHDRAWN','Withdrawn'),
('EXPIRED','Expired');


ALTER TABLE Produce ADD COLUMN RemainingQuantity FLOAT;

DROP TABLE CropListing;

CREATE TABLE IF NOT EXISTS CropListing (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    ProduceId INTEGER NOT NULL, -- new
    -- AvailableQuantity FLOAT, -- Removed
    ListedQuantity FLOAT, -- new
    RemainingQuantity FLOAT, --  new
    Status NVARCHAR(10), -- new
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
    FOREIGN KEY (Unit) REFERENCES CropUnitLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (Status) REFERENCES ListingStatusLov(Code) ON DELETE RESTRICT
);



