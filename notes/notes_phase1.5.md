###### Phase 1.5
1. Checkout Flow / Order Creation
2. Farmer Order List
3. Farmer Order Details
4. Buyer Order List
5. Buyer order Details
6. Buyer Negotiations list
7. Buyer negotioants details
8. Farmer Negotiations list (per crop?)
9. Farmer Negotiaon Details
10. Negotiation Flows
11. Farmer Negotioation Accept Flow


## Schema Changes
### Negotiatiosn

```
ALTER TABLE Negotiation ADD COLUMN Quantity FLOAT;
```

### Users
For enforcing reliablity
- add to Users, or a separate UserReliabilityStats table if you don't want to touch Users
```
ALTER TABLE Users ADD COLUMN FulfilledCommitments INTEGER DEFAULT 0;
ALTER TABLE Users ADD COLUMN DefaultedCommitments INTEGER DEFAULT 0;
```


## New Tables

### Buyer Requirements ###

New table since from now on buyer is the one initiaing the request

```

CREATE TABLE IF NOT EXISTS BuyerRequirement (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    BuyerId INTEGER NOT NULL,
    CropTypeId INTEGER NOT NULL,
    VarietyId INTEGER NOT NULL,        -- same-variety rule applies here too, for the same reason as GroupListing
    RequiredQuantity FLOAT NOT NULL,
    Unit NVARCHAR(10),
    OfferedPricePerUnit FLOAT NOT NULL, -- fixed at posting; no renegotiation
    DeliveryLocation TEXT,
    NeededByDate DATE,
    PledgeDeadline DATE,                -- window for farmers to reach threshold
    ConfirmationDeadline DATE,          -- window for buyer to confirm once threshold met
    CommittedQuantity FLOAT DEFAULT 0,  -- running total, updated on each pledge
    Status NVARCHAR(20),                -- OPEN, THRESHOLD_MET, CONFIRMED, EXPIRED, CANCELLED
    GroupListingId INTEGER,             -- set once converted, links to existing table
    MinLeadDays INTEGER;                -- snapshot of ExpectedGrowthDurationDays at creation, for display/validation
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (BuyerId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (CropTypeId) REFERENCES CropType(Id),
    FOREIGN KEY (VarietyId) REFERENCES CropVariety(Id),
    FOREIGN KEY (GroupListingId) REFERENCES GroupListing(Id) ON DELETE SET NULL
);
```
when reopening after expiery
- Status EXPIRED -> OPEN transition on manual extend (new PledgeDeadline) is just an UpdatedDate write;


### Require Pledge ###
From the Farmer:
```

CREATE TABLE IF NOT EXISTS RequirementPledge (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    RequirementId INTEGER NOT NULL,
    FarmerId INTEGER NOT NULL,
    CropId INTEGER,                     -- which harvest they're pledging from
    PledgedQuantity FLOAT NOT NULL,
    Status NVARCHAR(20),                -- PLEDGED, WITHDRAWN, CONFIRMED, DEFAULTED
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (RequirementId) REFERENCES BuyerRequirement(Id) ON DELETE CASCADE,
    FOREIGN KEY (FarmerId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (CropId) REFERENCES Crop(Id) ON DELETE SET NULL
);

```