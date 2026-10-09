INSERT INTO NegotationStatusLov (Code,Description) VALUES 
('ACTIVE','Active'),
('CLOSED','Closed'),
('ORDER_NEW','Order Created'),
('SATISFIED','Satisfied'), --Associated order successfully progressed through the required confirmation stage 
('CANCELLED','Cancelled Manually');

CREATE TABLE IF NOT EXISTS NegotationStatusReasonLov (
    StatusCode  NVARCHAR(10) NOT NULL,
    ReasonCode  NVARCHAR(30) NOT NULL,         
    Description NVARCHAR(200) NOT NULL,
    PRIMARY KEY (StatusCode, ReasonCode),
    FOREIGN KEY (StatusCode) REFERENCES NegotationStatusLov(Code) ON DELETE RESTRICT
);

INSERT INTO NegotationStatusReasonLov (StatusCode,ReasonCode,Description) VALUES 
('CLOSED','CLOSED_1','Closed because another negotiation won the order.'),
('CLOSED','CLOSED_2','Closed because the associated order failed due to payment failure.'),
('CLOSED','CLOSED_3','Closed because the associated order failed due to payment window expiry.'),
('CLOSED','CLOSED_4','Closed because the associated order was manually cancelled');

CREATE TABLE IF NOT EXISTS Negotiation (
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

CREATE TABLE IF NOT EXISTS NegotiationHistory (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    NegotiationId INTEGER NOT NULL,
    Price FLOAT NOT NULL,
    Quantity FLOAT NOT NULL,
    IsAccepted INTEGER DEFAULT 0,
    CreatedUser INTEGER,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (NegotiationId) REFERENCES Negotiation(Id) ON DELETE SET NULL
);


DELETE FROM OrderStatusLov;
INSERT INTO OrderStatusLov (Code,Description) VALUES 
('NEW', 'New'),
('FAILED', 'Failed'),
('PLACED', 'Order Placed'),
('ACTIVE', 'Active Fulfillment'),
('CANCELLED', 'Cancelled'),
('FULFILLED', 'Fulfillment Completed'); -- end of Lifecycle

CREATE TABLE IF NOT EXISTS OrderStatusReasonLov (
    StatusCode  NVARCHAR(10) NOT NULL,
    ReasonCode  NVARCHAR(30) NOT NULL,         
    Description NVARCHAR(200) NOT NULL,
    PRIMARY KEY (StatusCode, ReasonCode),
    FOREIGN KEY (StatusCode) REFERENCES OrderStatusLov(Code) ON DELETE RESTRICT
);

INSERT INTO OrderStatusReasonLov (StatusCode,ReasonCode,Description) VALUES 
('FAILED','FAILED_1','COD Payment Failure.'),
('PLACED','PLACED_1','Payment completed and Order placed.'),
('PLACED','PLACED_2','Order placed with COD. Payment Not Complete.'),
('CANCELLED','CANCEL_1','Manually Cancelled.');


INSERT INTO OrderPaymentStatusLov (Code,Description) VALUES 
('PENDING','Pending'),
('FAILED','Failed'),
('COMPLETE','Complete'),
('RETRY','Retry');

CREATE TABLE IF NOT EXISTS OrderPaymentStatusReasonLov (
    StatusCode  NVARCHAR(10) NOT NULL,
    ReasonCode  NVARCHAR(30) NOT NULL,         
    Description NVARCHAR(200) NOT NULL,
    PRIMARY KEY (StatusCode, ReasonCode),
    FOREIGN KEY (StatusCode) REFERENCES OrderPaymentStatusLov(Code) ON DELETE RESTRICT
);

INSERT INTO OrderPaymentStatusReasonLov (StatusCode,ReasonCode,Description) VALUES 
('FAILED','FAILED_1','Failed Due to Payment Window Expiry'),
('FAILED','FAILED_2','Failed Due to Payment Attempt Failure'),
('FAILED','FAILED_3','Buyer Defaulted on payment at COD');

INSERT INTO OrderDeliveryStatusLov (Code,Description) VALUES 
('INACTIVE','Inactive'), -- not started
('PREPARING','Preparing'),
('READY','Ready for Pickup'),
('EN_ROUTE','On the Way'),
('RE_ATTEMPT','Re-attempting'),
('FAILED','Failed'),
('RETURNING', 'Returning to Origin'),
('DELIVERED','Delivery completed');

CREATE TABLE IF NOT EXISTS OrderDeliveryStatusReasonsLov (
    StatusCode  NVARCHAR(10) NOT NULL,
    ReasonCode  NVARCHAR(30) NOT NULL,         
    Description NVARCHAR(200) NOT NULL,
    PRIMARY KEY (StatusCode, ReasonCode),
    FOREIGN KEY (StatusCode) REFERENCES OrderDeliveryStatusLov(Code) ON DELETE RESTRICT
);

INSERT INTO OrderDeliveryStatusReasonsLov (StatusCode,ReasonCode,Description) VALUES 
('FAILED','FAILED_1','Delivery attempt failed'),
('FAILED','FAILED_2','Delivery failed and return process also failed.');


/*
MOVED TO LINE ITEM:
    ListingEntityType NVARCHAR(1) CHECK (ListingEntityType IN ('I', 'G')) NOT NULL,
    ListingId INTEGER,
    GroupId INTEGER,
    ListerId INTEGER, -- there are multiple for group listing
    Quantity FLOAT NOT NULL,
    IsNegotiated INTEGER DEFAULT 0, -- move to line item
    NegotiationId INTEGER, -- move to line item
    FinalPrice FLOAT, -- move to line Item - Change to 'Amount'
    EstimatedFulfillmentDate DATE,  -- move to line item
    ActualFulfillmentDate DATE,  -- move to line item
    FOREIGN KEY (GroupId) REFERENCES GroupListing(Id) ON DELETE SET NULL,
    FOREIGN KEY (ListingId) REFERENCES CropListing(Id) ON DELETE SET NULL,
    FOREIGN KEY (ListerId) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (NegotiationId) REFERENCES Negotiation(Id) ON DELETE SET NULL
*/
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
    FOREIGN KEY (NegotiationId) REFERENCES Negotiation(Id) ON DELETE SET NULL,
    FOREIGN KEY (DeliveryStatus) REFERENCES OrderDeliveryStatusLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (DeliveryStatus, DeliveryStatusReason) REFERENCES OrderDeliveryStatusReasonsLov(StatusCode, ReasonCode) ON DELETE RESTRICT,
    FOREIGN KEY (Status) REFERENCES OrderLineItemStatusLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (Status, StatusReason) REFERENCES OrderLineItemStatusReasonsLov(StatusCode, ReasonCode) ON DELETE RESTRICT,
    CONSTRAINT chk_at_least_one_contact 
    CHECK (ListingId IS NOT NULL OR GroupId IS NOT NULL)
);

INSERT INTO OrderLineItemStatusLov (Code,Description) VALUES 
('ACTIVE','Active'),
('RETURNED','Returned'),
('FULFILLED','Fulfilled'),
('FAILED','Failed');


CREATE TABLE IF NOT EXISTS OrderLineItemStatusReasonsLov (
    StatusCode  NVARCHAR(10) NOT NULL,
    ReasonCode  NVARCHAR(30) NOT NULL,         
    Description NVARCHAR(200) NOT NULL,
    PRIMARY KEY (StatusCode, ReasonCode),
    FOREIGN KEY (StatusCode) REFERENCES OrderLineItemStatusLov(Code) ON DELETE RESTRICT
);

-- OrderLineItemStatusReasonsLov - no values for now, can add later

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

