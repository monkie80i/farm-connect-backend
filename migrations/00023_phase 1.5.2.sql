DROP TABLE Negotiation;
CREATE TABLE IF NOT EXISTS Negotiations (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    ListingId INTEGER,
    InitialPrice FLOAT,
    CurrentPrice FLOAT,
    FinalPrice FLOAT,
    IsAccepted INTEGER DEFAULT 0,
    AcceptedBy INTEGER,
    IsActive INTEGER DEFAULT 1,
    Status NVARCHAR(10) DEFAULT 'ACTIVE',
    StatusReason NVARCHAR(30),
    CreatedUser INTEGER,
    UpdatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (AcceptedBy) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (ListingId) REFERENCES CropListing(Id) ON DELETE RESTRICT,
    FOREIGN KEY (Status) REFERENCES NegotationStatusLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (Status, StatusReason) REFERENCES NegotationStatusReasonLov(StatusCode, ReasonCode) ON DELETE RESTRICT
);

DROP TABLE NegotiationHistory;

CREATE TABLE IF NOT EXISTS NegotiationHistory (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    NegotiationId INTEGER NOT NULL,
    Price FLOAT NOT NULL,
    Quantity FLOAT NOT NULL,
    IsAccepted INTEGER DEFAULT 0,
    CreatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (NegotiationId) REFERENCES Negotiations(Id) ON DELETE SET NULL
);



DROP TABLE Orders;
CREATE TABLE IF NOT EXISTS Orders (
    -- IMPORTANT!:NO COD for GROUP SELLING , COS it complicates things
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    BuyerId INTEGER NOT NULL, 
    Status NVARCHAR(10), 
    StatusReason NVARCHAR(30),
    TotalAmount FLOAT, -- new
    DeliveryAddressId INTEGER NOT NULL, 
    DeliveryOption NVARCHAR(20) NOT NULL,
    PaymentMethod NVARCHAR(20) NOT NULL,
    PaymentStatus NVARCHAR(10) NOT NULL,
    PaymentStatusReason NVARCHAR(30),
    ExpiresIn DATETIME, -- can use this in sql datetime('now', '+2 hours', '+30 minutes')
    CreatedUser INTEGER NOT NULL,
    UpdatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (BuyerId) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (DeliveryAddressId) REFERENCES BuyerAddress(Id) ON DELETE RESTRICT,
    FOREIGN KEY (Status) REFERENCES OrderStatusLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (Status, StatusReason) REFERENCES OrderStatusReasonLov(StatusCode, ReasonCode) ON DELETE RESTRICT,
    FOREIGN KEY (DeliveryOption) REFERENCES DeliveryOptionLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (PaymentMethod) REFERENCES PaymentMethodsLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (PaymentStatus) REFERENCES OrderPaymentStatusLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (PaymentStatus, PaymentStatusReason) REFERENCES OrderPaymentStatusReasonLov(StatusCode, ReasonCode) ON DELETE RESTRICT
); 

DROP TABLE OrderLineItems;
-- NEW
CREATE TABLE IF NOT EXISTS OrderLineItems (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    ListingEntityType NVARCHAR(1) CHECK (ListingEntityType IN ('I', 'G')) NOT NULL,
    ListingId INTEGER,
    GroupId INTEGER,
    ListerId INTEGER,
    Quantity FLOAT NOT NULL,
    DeliveryStatus NVARCHAR(10) NOT NULL,
    DeliveryStatusReason NVARCHAR(30),
    Status NVARCHAR(10) NOT NULL,
    StatusReason NVARCHAR(30),
    IsNegotiated INTEGER DEFAULT 0, 
    NegotiationId INTEGER,
    Amount FLOAT,
    EstimatedDeliveryDate DATE,
    ActualDeliveryDate DATE,
    DeliveryAttemptCount INTEGER,
    FOREIGN KEY (GroupId) REFERENCES GroupListing(Id) ON DELETE SET NULL,
    FOREIGN KEY (ListingId) REFERENCES CropListing(Id) ON DELETE SET NULL,
    FOREIGN KEY (ListerId) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (NegotiationId) REFERENCES Negotiations(Id) ON DELETE SET NULL,
    FOREIGN KEY (DeliveryStatus) REFERENCES OrderDeliveryStatusLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (DeliveryStatus, DeliveryStatusReason) REFERENCES OrderDeliveryStatusReasonsLov(StatusCode, ReasonCode) ON DELETE RESTRICT,
    FOREIGN KEY (Status) REFERENCES OrderLineItemStatusLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (Status, StatusReason) REFERENCES OrderLineItemStatusReasonsLov(StatusCode, ReasonCode) ON DELETE RESTRICT,
    CONSTRAINT chk_at_least_one_contact 
    CHECK (ListingId IS NOT NULL OR GroupId IS NOT NULL)
);





-- OrderLineItemStatusReasonsLov - no values for now, can add later
DROP TABLE OrderStatusHistory;
CREATE TABLE IF NOT EXISTS OrderStatusHistory (
    HistoryId    INTEGER PRIMARY KEY AUTOINCREMENT,
    OrderId      INTEGER NOT NULL,
    StatusColumn VARCHAR(30) NOT NULL,   -- 'Status','PaymentStatus'
    StatusCode   VARCHAR(30) NOT NULL,
    ChangedAt    DATETIME DEFAULT CURRENT_TIMESTAMP,
    ChangedBy    INTEGER NULL,
    FOREIGN KEY (ChangedBy) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE RESTRICT
);


DROP TABLE OrderLineItemStatusHistory;
CREATE TABLE IF NOT EXISTS OrderLineItemStatusHistory (
    HistoryId    INTEGER PRIMARY KEY AUTOINCREMENT,
    LineItemId      INTEGER NOT NULL,
    StatusColumn VARCHAR(30) NOT NULL,   -- 'Status','DeliveryStatus'
    StatusCode   VARCHAR(30) NOT NULL,
    ChangedAt    DATETIME DEFAULT CURRENT_TIMESTAMP,
    ChangedBy    INTEGER NULL,
    FOREIGN KEY (ChangedBy) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (LineItemId) REFERENCES OrderLineItems(Id) ON DELETE RESTRICT
);

