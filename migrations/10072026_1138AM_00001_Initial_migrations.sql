CREATE TABLE IF NOT EXISTS Users (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        UserName NVARCHAR(50) NOT NULL UNIQUE,
        FirstName NVARCHAR(30) NOT NULL,
        LastName NVARCHAR(30) NOT NULL,
        PasswordHash TEXT NOT NULL,
        Email NVARCHAR(256) NOT NULL UNIQUE,
        PhoneCode NVARCHAR(5),
        Phone NVARCHAR(15),
        DateOfBirth DATE NOT NULL,
        Role NVARCHAR(10) NOT NULL,
        IsEmailVerified INTEGER DEFAULT 0,
        IsPhoneVerified INTEGER DEFAULT 0,
        IsVerificationFilled INTEGER DEFAULT 0,
        IsAdminVerified INTEGER DEFAULT 0,
        IsActive INTEGER DEFAULT 1,
        IsAdmin INTEGER DEFAULT 0,
        IsBanned INTEGER DEFAULT 0,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdateDate DATETIME,
        FOREIGN KEY (Role) REFERENCES UserRolesLov(Code) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS UserProfile (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        UserId INTEGER,
        DisplayPicturePath TEXT,
        Address TEXT,
        City NVARCHAR(20),
        State NVARCHAR(20),
        IdProofType NVARCHAR(10),
        IdProofPath TEXT,
        IdProofExtension NVARCHAR(10),
        UPIId TEXT,
        CreatedUser INTEGER,
        UpdatedUser INTEGER,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
        FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE CASCADE,
        FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE CASCADE,
        FOREIGN KEY (IdProofType) REFERENCES IdProofTypesLov(Code) ON DELETE SET NULL
    );

    -- insertDelete
    CREATE TABLE IF NOT EXISTS UserPaymentMethod ( 
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        UserId INTEGER,
        PaymentMethod NVARCHAR(20),
        FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
        FOREIGN KEY (PaymentMethod) REFERENCES PaymentMethodsLov(Code) ON DELETE CASCADE,
        UNIQUE(UserId, PaymentMethod)
    );

    CREATE TABLE IF NOT EXISTS BuyerAddress (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        UserId INTEGER,
        Address TEXT,
        City NVARCHAR(20),
        State NVARCHAR(20),
        IsDefault INTEGER DEFAULT 0,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Farm (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        UserId INTEGER,
        Name NVARCHAR(30) NOT NULL,
        Address TEXT,
        City NVARCHAR(20),
        State NVARCHAR(20),
        Latitude DECIMAL(11,8),
        Longitude DECIMAL(11,8),
        TotalCultivableArea FLOAT,
        landUnit NVARCHAR(10),
        OwnershipProofPath TEXT,
        IsDefault INTEGER DEFAULT 0,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
        FOREIGN KEY (landUnit) REFERENCES LandAreaUnitLov(Code) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS CropType (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        CropName NVARCHAR(50) NOT NULL,
        ScientificName NVARCHAR(100),
        IsPerennial INTEGER DEFAULT 0,
        CreatedUser INTEGER,
        UpdatedUser INTEGER,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL
    );

    -- insertDelete
    CREATE TABLE IF NOT EXISTS FarmCropTypes (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        FarmId INTEGER,
        CropTypeId INTEGER,
        FOREIGN KEY (FarmId) REFERENCES Farm(Id) ON DELETE CASCADE,
        FOREIGN KEY (CropTypeId) REFERENCES CropType(Id) ON DELETE CASCADE,
        UNIQUE(FarmId, CropTypeId)
    );

    Create TABLE IF NOT EXISTS CropVariety (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        CropTypeId INTEGER NOT NULL,
        VarietyName NVARCHAR(50) NOT NULL,
        MaturityMinDays INTEGER,
        MaturityMaxDays INTEGER,
        YieldPerAcre FLOAT,
        ShelfLifeDays INTEGER,
        IsHybrid INTEGER DEFAULT 0,
        Notes TEXT,
        CreatedUser INTEGER,
        UpdatedUser INTEGER,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (CropTypeId) REFERENCES CropType(Id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS Crop (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Name NVARCHAR(50) NOT NULL,
        CropTypeId INTEGER,
        VarietyId INTEGER,
        FarmId INTEGER,
        FarmerId INTEGER,
        LandPrepDate DATETIME,
        SowingDate DATETIME,
        ExpectedGrowthDurationDays INTEGER,
        CultivatedArea FLOAT,
        CultivatedAreaUnit NVARCHAR(10),
        CultivatedAreaInAcre FLOAT,
        InitialSoilCondition TEXT,
        InitialNotes TEXT,
        HealthStatus NVARCHAR(20),
        CurrentStage NVARCHAR(20),
        HarvestReadinessInd INTEGER DEFAULT 0,
        HarvestReadinessPercentage DECIMAL(5,2),
        ListingId INTEGER,
        EstdHarvestDate DATE,
        ActualHarvestDate DATE,
        ActualYield FLOAT,
        HarvestNote TEXT,
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
        FOREIGN KEY (FarmerId) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (ListingId) REFERENCES CropListing(Id) ON DELETE SET NULL
    );

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

    CREATE TABLE IF NOT EXISTS CropListing (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        CropId INTEGER,
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
        FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE SET NULL,
        FOREIGN KEY (Unit) REFERENCES CropUnitLov(Code) ON DELETE SET NULL
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

    /* from farmer to Group Admin*/
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

    CREATE TABLE IF NOT EXISTS OrderTracker (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        OrderId INTEGER,
        Stage NVARCHAR(20),
        StartDate DATETIME,
        EndDate DATETIME,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE SET NULL,
        FOREIGN KEY (Stage) REFERENCES OrderStageLov(Code) ON DELETE SET NULL
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

    CREATE TABLE IF NOT EXISTS NegotiationHistory (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        NegotiationId INTEGER,
        Price FLOAT,
        Quantity FLOAT,
        IsAccepted INTEGER DEFAULT 0,
        CreatedUser INTEGER,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (NegotiationId) REFERENCES Negotiation(Id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS OrderDispute (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        OrderId INTEGER,
        DisputeType NVARCHAR(20),
        Status NVARCHAR(20),
        Description TEXT,
        AgainstUserId INTEGER,
        InternalNotes TEXT,
        AdminVerdict TEXT,
        AssignedAdminId INTEGER,
        LastOpenedById INTEGER,
        CreatedUser INTEGER,
        UpdatedUser INTEGER,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE SET NULL,
        FOREIGN KEY (DisputeType) REFERENCES DisputeTypesLov(Code) ON DELETE SET NULL,
        FOREIGN KEY (Status) REFERENCES DisputeStatusLov(Code) ON DELETE SET NULL,
        FOREIGN KEY (AgainstUserId) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (AssignedAdminId) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (LastOpenedById) REFERENCES Users(Id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS OrderDisputeChat (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        DisputeId INTEGER,
        SentBy INTEGER,
        Message TEXT,
        SentDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (DisputeId) REFERENCES OrderDispute(Id) ON DELETE SET NULL,
        FOREIGN KEY (SentBy) REFERENCES Users(Id) ON DELETE SET NULL
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

    CREATE TABLE IF NOT EXISTS File (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        FileName TEXT NOT NULL,
        FileNameOriginal TEXT NOT NULL,
        FilePath TEXT NOT NULL,
        FileBasePath TEXT NOT NULL,
        EntityType NVARCHAR(50) NOT NULL,
        EntityId INTEGER,
        CreatedUser INTEGER,
        UpdatedUser INTEGER,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS Notification (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Title NVARCHAR(200) NOT NULL,
        Recipient INTEGER,
        NotificationType NVARCHAR(20),
        Message TEXT,
        EntityType NVARCHAR(100),
        EntityId INTEGER,
        ActionUrl TEXT,
        Priority NVARCHAR(20),
        IsViewed INTEGER DEFAULT 0,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (Recipient) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (Priority) REFERENCES NotificationPriorityLov(Code) ON DELETE SET NULL,
        FOREIGN KEY (NotificationType) REFERENCES NotificationTypeLov(Code) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS OrderAlert (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Title NVARCHAR(200) NOT NULL,
        Recipient INTEGER,
        NotificationType NVARCHAR(20),
        OrderId INTEGER,
        ActionUrl TEXT,
        Priority NVARCHAR(20),
        IsViewed INTEGER DEFAULT 0,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (Priority) REFERENCES AlertPriorityLov(Code) ON DELETE SET NULL,
        FOREIGN KEY (NotificationType) REFERENCES NotificationTypeLov(Code) ON DELETE SET NULL,
        FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS CropLifecycleDefinition (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        CropTypeId INTEGER,
        CropVarietyId Integer,
        Season NVARCHAR(100),
        Region NVARCHAR(100),
        CreatedUser INTEGER,
        UpdatedUser INTEGER,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (CropTypeId) REFERENCES CropType(Id) ON DELETE CASCADE,
        FOREIGN KEY (CropVarietyId) REFERENCES CropVariety(Id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS CropLifeCycleStages (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        CropLifecycleDefinitionId INTEGER,
        StageName NVARCHAR(100) NOT NULL,
        StageOrder INTEGER NOT NULL,
        MinDaysFromPreviousStage INTEGER NOT NULL,
        MaxDaysFromPreviousStage INTEGER NOT NULL,
        Description TEXT,
        FOREIGN KEY (CropLifecycleDefinitionId) REFERENCES CropLifecycleDefinition(Id) ON DELETE CASCADE,
        FOREIGN KEY (StageName) REFERENCES CropStagesLov(Code) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS CropStageProgress (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        CropId INTEGER NOT NULL,
        StageName NVARCHAR(20) NOT NULL,
        StageOrder INTEGER NOT NULL,
        EstStartDate DATE,
        EstEndDate DATE,
        ActualStartDate DATE,
        ActualEndDate DATE,
        Notes TEXT,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE CASCADE,
        FOREIGN KEY (StageName) REFERENCES CropStagesLov(Code) ON DELETE SET NULL,
        UNIQUE(CropId, StageName)
    );

    CREATE TABLE IF NOT EXISTS CropStageCaps (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        StageName NVARCHAR(20) NOT NULL,
        Cap FLOAT NOT NULL,
        CreatedUser INTEGER,
        UpdatedUser INTEGER,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (StageName) REFERENCES CropStagesLov(Code) ON DELETE SET NULL,
        FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL
    );

    Create TABLE IF NOT EXISTS ReprotType (
        Code NVARCHAR(10) PRIMARY KEY,
        Description TEXT,
        UserRole NVARCHAR(10),
        FOREIGN KEY (UserRole) REFERENCES UserRolesLov(Code) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS ReportGenerationTracker (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        ReportOwnerRole NVARCHAR(10) NOT NULL,
        UserId INTEGER,
        ReportType NVARCHAR(10),
        StartDate DATE,
        EndDate DATE,
        FileName TEXT,
        FileExtension NVARCHAR(10),
        FilePath TEXT,
        Status NVARCHAR(10),
        CreatedDate DATE DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATE,
        FOREIGN KEY (ReportOwnerRole) REFERENCES UserRolesLov(Code) ON DELETE SET NULL,
        FOREIGN KEY (UserId) REFERENCES User(Id) ON DELETE SET NULL,
        FOREIGN KEY (Status) REFERENCES ReportGenerationStatusLov(Code) ON DELETE SET NULL
    );