-- -------------------------------------------------
-- Listing new Field , NegotiationTicketLifetime in hrs

ALTER TABLE CropListing ADD COLUMN OrderTicketLifeTime INTEGER DEFAULT 1;

-- -------------------------------------------------
INSERT INTO NegotationStatusLov (Code,Description) VALUES 
('TICKET','Ticket Raised');

-- -------------------------------------------------
-- New Table OrderTickets 
-- (Id, NegotiationId,HistoryId,ExpiryTime,Status,CreatedUser,UpdatedUser,CreatedTime,UpdatedTime)

INSERT INTO OrderTicketStatusLov (Code,Description) VALUES 
('ACTIVE','Active'),
('COMPLETE','Complete'),
('EXPIRED','Expired'),
('DELETED','Deleted');


CREATE TABLE IF NOT EXISTS OrderTickets (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    NegotiationHistoryId INTEGER NOT NULL,
    ExpiryTime DATETIME NOT NULL,
    Status NVARCHAR(10) DEFAULT 'ACTIVE',
    CreatedUser INTEGER,
    UpdatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (Status) REFERENCES OrderTicketStatusLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (NegotiationHistoryId) REFERENCES NegotiationHistory(Id) ON DELETE RESTRICT
);

-- -------------------------------------------------
-- Add Ticket Id to Order?

DROP TABLE Orders;
DROP TABLE OrderLineItems;
DROP TABLE OrderStatusHistory;
DROP TABLE OrderLineItemStatusHistory;


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
    OrderTicketId INTEGER,
    Amount FLOAT,
    EstimatedDeliveryDate DATE,
    ActualDeliveryDate DATE,
    DeliveryAttemptCount INTEGER,
    FOREIGN KEY (GroupId) REFERENCES GroupListing(Id) ON DELETE SET NULL,
    FOREIGN KEY (ListingId) REFERENCES CropListing(Id) ON DELETE SET NULL,
    FOREIGN KEY (ListerId) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (NegotiationId) REFERENCES Negotiations(Id) ON DELETE SET NULL,
    FOREIGN KEY (OrderTicketId) REFERENCES OrderTickets(Id) ON DELETE SET NULL,
    FOREIGN KEY (DeliveryStatus) REFERENCES OrderDeliveryStatusLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (DeliveryStatus, DeliveryStatusReason) REFERENCES OrderDeliveryStatusReasonsLov(StatusCode, ReasonCode) ON DELETE RESTRICT,
    FOREIGN KEY (Status) REFERENCES OrderLineItemStatusLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (Status, StatusReason) REFERENCES OrderLineItemStatusReasonsLov(StatusCode, ReasonCode) ON DELETE RESTRICT,
    CONSTRAINT chk_at_least_one_contact 
    CHECK (ListingId IS NOT NULL OR GroupId IS NOT NULL)
);


CREATE TABLE IF NOT EXISTS OrderStatusHistory (
    Id    INTEGER PRIMARY KEY AUTOINCREMENT,
    OrderId      INTEGER NOT NULL,
    StatusColumn VARCHAR(30) NOT NULL,   -- 'Status','PaymentStatus'
    StatusCode   VARCHAR(30) NOT NULL,
    ChangedAt    DATETIME DEFAULT CURRENT_TIMESTAMP,
    ChangedBy    INTEGER NULL,
    FOREIGN KEY (ChangedBy) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE RESTRICT
);


CREATE TABLE IF NOT EXISTS OrderLineItemStatusHistory (
    Id    INTEGER PRIMARY KEY AUTOINCREMENT,
    LineItemId      INTEGER NOT NULL,
    StatusColumn VARCHAR(30) NOT NULL,   -- 'Status','DeliveryStatus'
    StatusCode   VARCHAR(30) NOT NULL,
    ChangedAt    DATETIME DEFAULT CURRENT_TIMESTAMP,
    ChangedBy    INTEGER NULL,
    FOREIGN KEY (ChangedBy) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (LineItemId) REFERENCES OrderLineItems(Id) ON DELETE RESTRICT
);

-- -------------------------------------------------
-- PaymentAttempts(id,user,amount, time, status, data, errorstring,createdDate)

CREATE TABLE IF NOT EXISTS PaymentLogs (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    Amount FLOAT NOT NULL,
    Status VARCHAR(20) CHECK (Status IN ('SUCCESS','FAILURE')) NOT NULL,
    Data TEXT,
    ErrorString TEXT,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- -------------------------------------------------
--Add COD default count on User
ALTER TABLE Users ADD COLUMN CODDefaultCounter DEFAULT 0;
