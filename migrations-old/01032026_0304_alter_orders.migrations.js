const db = require("../db");

db.exec(`
    DROP TABLE Orders;
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
`);

// added to V2