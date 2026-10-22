DROP TABLE OrderLineItems;
DROP TABLE OrderLineItemStatusHistory;

CREATE TABLE IF NOT EXISTS OrderLineItems (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    OrderId INTEGER NOT NULL, -- NEW
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
    FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE CASCADE, -- NEW
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

