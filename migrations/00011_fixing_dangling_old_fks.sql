DROP TABLE IF EXISTS CropLifeCycleStages;
DROP TABLE IF EXISTS CropLifecycleDefinition;


CREATE TABLE CropLifecycleDefinition (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropTypeId INTEGER NOT NULL,
    CropVarietyId INTEGER NOT NULL,
    Season NVARCHAR(10),
    Region NVARCHAR(10),
    PhaseType NVARCHAR(15) DEFAULT 'FULL' CHECK (PhaseType IN ('FULL','ESTABLISHMENT','RECURRING')) NOT NULL,
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

CREATE UNIQUE INDEX UX_CropLifecycleDefinition_Variety_Region_Season_Phase
    ON CropLifecycleDefinition (CropVarietyId, Region, Season, PhaseType);

CREATE TABLE CropLifeCycleStages (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropLifecycleDefinitionId INTEGER,
    Stage NVARCHAR(10) NOT NULL,
    StageOrder INTEGER NOT NULL,
    MinDaysFromPreviousStage INTEGER NOT NULL,
    MaxDaysFromPreviousStage INTEGER NOT NULL,
    -- Description TEXT, -- i think this is un necessary
    UpdatedUser INTEGER,
    UpdatedDate DATETIME,
    FOREIGN KEY (CropLifecycleDefinitionId) REFERENCES CropLifecycleDefinition(Id) ON DELETE CASCADE,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (Stage) REFERENCES CropStagesLov(Code) ON DELETE SET NULL
);

DROP TABLE IF EXISTS Crop;

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
    HealthStatus NVARCHAR(10),
    CurrentStage NVARCHAR(10),
    isLifeCycleEnded INTEGER DEFAULT 0,
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
--------------------------------------------------------------
-- has crop_old ref
DROP TABLE IF EXISTS CropHealthLog;
DROP TABLE IF EXISTS GroupInvitation;
DROP TABLE IF EXISTS GroupListing;
DROP TABLE IF EXISTS GroupParticipants;
DROP TABLE IF EXISTS GroupRequests;
DROP TABLE IF EXISTS HealthAlert;
DROP TABLE IF EXISTS Negotiation;
DROP TABLE IF EXISTS GroupRequests;
DROP TABLE IF EXISTS GroupRequests;

CREATE TABLE IF NOT EXISTS CropHealthLog (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropId INTEGER,
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
    FOREIGN KEY (Severity) REFERENCES HealthLogSeverityLov(Code) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS GroupInvitation (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    GroupId INTEGER,
    InvitedUserId INTEGER,
    InvitedUserCropId INTEGER,
    Message TEXT,
    IsRead INTEGER DEFAULT 0,
    CreatedUser INTEGER,
    UpdatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (InvitedUserId) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (InvitedUserCropId) REFERENCES Crop(Id) ON DELETE SET NULL,
    FOREIGN KEY (GroupId) REFERENCES GroupListing(Id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS GroupListing (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name NVARCHAR(30) NOT NULL,
    CropId INTEGER,
    AdminContribution FLOAT,
    MinRequiredQuantity FLOAT,
    TotalRequiredQuantity FLOAT,
    TotalCombinedQuantity FLOAT,
    Status NVARCHAR(20),
    PricePerUnit FLOAT,
    Unit NVARCHAR(10),
    GroupAvailabilityDate DATE,
    StartDate DATE,
    FormingDate DATE,
    TerminationDate DATE,
    NumberOfParticipants INTEGER,
    CreatedUser INTEGER,
    UpdatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE SET NULL,
    FOREIGN KEY (Status) REFERENCES GroupVisibilityStatusLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (Unit) REFERENCES CropUnitLov(Code) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS GroupParticipants (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER,
    CropId INTEGER,
    GroupId INTEGER,
    ContributionQuantity FLOAT,
    contributingQuantityUnit NVARCHAR(10),
    JoinedDate DATETIME,
    UpdatedDate DATETIME,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE SET NULL,
    FOREIGN KEY (GroupId) REFERENCES GroupListing(Id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS GroupRequests (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    GroupId INTEGER,
    RequestingUserId INTEGER,
    RequestingUserCropId INTEGER,
    Message TEXT,
    ContributingQuantity FLOAT,
    ContributingQuantityUnit NVARCHAR(10),
    Decission NVARCHAR(10),
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (RequestingUserId) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (RequestingUserCropId) REFERENCES Crop(Id) ON DELETE SET NULL,
    FOREIGN KEY (GroupId) REFERENCES GroupListing(Id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS HealthAlert (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CropId INTEGER,
    StageAtTimeOfWarning NVARCHAR(10),
    WarningType NVARCHAR(20),
    Severity NVARCHAR(20),
    GeneratedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    IsViewed INTEGER DEFAULT 0,
    IsResolved INTEGER DEFAULT 0,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE SET NULL,
    FOREIGN KEY (StageAtTimeOfWarning) REFERENCES CropStagesLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (WarningType) REFERENCES HealthWarningTypeLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (Severity) REFERENCES HealthSeverityLov(Code) ON DELETE SET NULL
); 

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

-- link to CropListing_old
DROP TABLE IF EXISTS Orders;

CREATE TABLE IF NOT EXISTS Orders (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    ListingEntityType NVARCHAR(1) CHECK (ListingEntityType IN ('I', 'G')),
    ListingId INTEGER,
    GroupId INTEGER,
    ListerId INTEGER,
    BuyerId INTEGER,
    Quantity FLOAT,
    OrderStatus NVARCHAR(20),
    IsNegotiated INTEGER DEFAULT 0,
    NegotiationId INTEGER,
    FinalPrice FLOAT,
    EstimatedFulfillmentDate DATE,
    ActualFulfillmentDate DATE,
    DeliveryAddressId INTEGER,
    DeliveryOption NVARCHAR(20),
    PaymentMethod NVARCHAR(20),
    IsPaymentComplete INTEGER DEFAULT 0,
    CreatedUser INTEGER,
    UpdatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (BuyerId) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (DeliveryAddressId) REFERENCES BuyerAddress(Id) ON DELETE SET NULL,
    FOREIGN KEY (OrderStatus) REFERENCES OrderStatusLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (DeliveryOption) REFERENCES DeliveryOptionLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (PaymentMethod) REFERENCES PaymentMethodsLov(Code) ON DELETE SET NULL,
    FOREIGN KEY (GroupId) REFERENCES GroupListing(Id) ON DELETE SET NULL,
    FOREIGN KEY (ListingId) REFERENCES CropListing(Id) ON DELETE SET NULL,
    FOREIGN KEY (ListerId) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (NegotiationId) REFERENCES Negotiation(Id) ON DELETE SET NULL
); 

-- Finally
DROP TABLE IF EXISTS CropListing_old;

---- Type
DROP TABLE IF EXISTS ReprotType;

Create TABLE IF NOT EXISTS ReportType (
    Code NVARCHAR(10) PRIMARY KEY,
    Description TEXT,
    UserRole NVARCHAR(10),
    FOREIGN KEY (UserRole) REFERENCES UserRolesLov(Code) ON DELETE SET NULL
);

























