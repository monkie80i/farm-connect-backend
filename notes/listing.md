# Questions #

Whena crop reaches the harvest stage we , mark the stage and create a Produce with the available details.
A crop if perinnial can have multiple cycles and hence multiple harvest, hence multiple produces.
Using this procude we create a listing.
this listing gets shown in a common parketplace as an item/product.
when creating a listing, it can be for the full produce on any amount less.
- So should we allow multiple listing creation from singel produce, how to and wher to track the 
amount / deducted amounts?

Now that the listing is in the market place. byuers can place orders.
Buyer can place order for any amout greater than MOQ.
- that causes a problem, what if the buyer leaves like a tiny amount left and that goes stagnant?
- also how and where to track the balance amounts.


Also there is another way of listing to the Market place, Group Lisitng.
This is for multiple farmers can come together to furllfill a larger amount.
- Should this show up in the normal market place?
- who is the initiator farmer or buyer? and what is the flow like?
- how are farmers added? on invitation TO or request FROM the farmer?
- how should the communication be?
- does the farmers have to be same variety as well or just crop type has to be same?
For this the Ordering has to be max amount and no less, for obvious reasons.


SO for Orders
It can be direct or negotiated.
A buyer sees a listing, either buys on price or sends negotiation request.
They go back and forth. 
- Once Seller accepts, should order be auto created?
all other negtiation are closed.
- not sure at which stage to allow negotiation.
- Not sure to include negotitation for Group listings
- is this fine or anything i am missing completely?

- Should group listing and normal listing be a same screen ? which was my inital concept, but now it seems like it shoudln't be.
- Should the same Order Table Handle Normal Listing and Group lsitng?
- What should the Orders strucure be?
- I am not allowing multiple products in one order for simplification, since the whole thing is bulk produce and differnt seller need to satify the order. Should I allow?


this is the current table strucure, recommend changes wherever needed

-----------------------
# Answers #
Group selling
- Buyer initiated
- buyer posts a request on the platfore, with price. If farmers willing, they can bite. Else buyer can deactivete it.
- no negotiations
- first an interested farmer shows interest'Pledged', he can backout, unitl the buyer confirms. if the buyer confirmed, he cannot backout.
- we can use a field to show if the farmer has defaulted or not on the User table itself, DefaultCounts
- 



Listing quantity tracking
listing - add remaining quantity
Produce - add remaining quantity

Stagnent remainder proble
orderQty >= MOQ OR orderQty == remaining quantity 
WITHDRAWN status distinct from SOLD_OUT, 
with the option for a farmer to manually pull a stalled listing.

Group listing
- Same variety, not just same crop type, is required
- Group listings should be full-amount-only orders (no partial).
- No negotiation for group listings.

Negotiations
- needs a quantity field
- Accepted negotiations should auto-create the order transactionally
- Only other negotiations whose quantity now exceeds the updated remaining quantity should auto-close — 
    not a blanket   close. 
- Negotiation should be gated on listing status being active with quantity remaining.

Orders- keep as is

Group Lising II
Recommendation — a two-stage commitment lifecycle: 
1buyer posts a requirement at a fixed price (sidesteps future-price negotiation entirely, since farmers self-select in or out) → farmers pledge quantity (non-binding) → once pledges hit the required threshold, the requirement becomes ready for confirmation → buyer must confirm within a deadline, at which point a GroupListing and Order are created transactionally, pre-linked to that buyer (not reopened to the marketplace) → if the buyer doesn't confirm in time, or the threshold is never met, the requirement expires and pledges are released with nothing lost on either side. On enforcement: Explicitly flagged that real enforcement (contracts, escrow, legal recourse) is out of scope for a solo v1 build. The realistic v1 answer is soft accountability — tracking fulfilled vs. defaulted commitments per user as a visible reliability signal, not a punitive mechanism.


Manual deadline extenstion, if Buyer wants
NO group admin
ListingEntityType = 'G' orders, I'd make ListerId nullable and let GroupId be the sole source of truth

Defaulted count per user of reliablity

Pledge eligibility, only if you have the capablity
notifications for who hasnt planted yet,
if there is an existing crop or future crop and the harvest date is on or before the needed date, then they can pledge
requires a real Crop row to exist (any early stage is fine, doesn't need to be far along)








----------------------------------
# Schema Changes #

## Produce ##
To track what is left in produce
```
ALTER TABLE Produce ADD COLUMN RemainingQuantity FLOAT;
```
- initialize = Quantity on insert; decrement transactionally when a CropListing is created; 
- increment back when a listing is withdrawn/cancelled

## CropListing ##
Split "what was listed" from "what's left in this listing"
```
ALTER TABLE CropListing RENAME COLUMN AvailableQuantity TO ListedQuantity;
ALTER TABLE CropListing ADD COLUMN RemainingQuantity FLOAT;
ALTER TABLE CropListing ADD COLUMN Status NVARCHAR(20);

```
- FK Status -> new ListingStatusLov (ACTIVE, PARTIALLY_FULFILLED, SOLD_OUT, WITHDRAWN, EXPIRED)

## Negotiatiosn ##

```
ALTER TABLE Negotiation ADD COLUMN Quantity FLOAT;
```

## Users ##
For enforcing reliablity
- add to Users, or a separate UserReliabilityStats table if you don't want to touch Users
```
ALTER TABLE Users ADD COLUMN FulfilledCommitments INTEGER DEFAULT 0;
ALTER TABLE Users ADD COLUMN DefaultedCommitments INTEGER DEFAULT 0;
```

## New Tables ##

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



Where should quality be entered?


