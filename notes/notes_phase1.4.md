# Phase 1.4
Features to be implemented

###### Features
1. Crop Listing Create (Farmer/Owner)
2. Crop Lising Search (Farmer/Owner)
3. Crop Listing Details (Farmer/Owner) [ preview ]
4. Market place (Buyer)
5. Crop Details (Buyer)


## So Far
A farmer can add a crop, and go through to Harvest, record yeild, condtion etc.
A produce is not created

## Next
1. Need to create a produce on harvest.  (`Done`)
2. Create a Create Lising Screeen
    * farmer Selects an Available Produce
    * Select how much quantity they wan to list
    * and other Details
    * Create
3. A Listing Search Screen (Farmer)
    * where farmer can Search their existing Listings
    * Filters - `Crop Name`,`Crop Type`,`Listing Status`
    * Table - `Crop Name`,`Total Quantity`,`Remaining Qty`,`Price`,`Created Date`
4. Crop Listing Details: (Preview of what a Buayer Sees)
    * `Crop Name`, `Crop Type`, `Crop Variety`, `Harvest Date`
    * `Listing Quantity`, `MOQ`, `Created User`, `Created Date`
    * `Images`
5. Market Place
    * Where Buyers can see listed produce
    * Search bar - Seaches Contatining Texts
    * Filters -  `Crop Types`, `Quality`
    * Sort By - `Newest`, `Price Low to Hight`, `Price High to Low`, `Quantity Available`
    * Each Item Shows
        * Fields - `Crop Type`, `Crop Name`, `Crop Variety Name`, `Price and Unit`, `Available Quanitity`, `MOQ`,` Max   Availablity`,` Sold By`.
        * Images
        * Buttons - `Add to Cart`, `Buy Now`, `Negotiate`
6. Crop Details: Same as `4.`

----------------------------------
## Schema Changes

### Produce
To track what is left in produce
```
ALTER TABLE Produce ADD COLUMN RemainingQuantity FLOAT;
```
- initialize = Quantity on insert; decrement transactionally when a CropListing is created; 
- increment back when a listing is withdrawn/cancelled


### CropListing
Split "what was listed" from "what's left in this listing"
```
ALTER TABLE CropListing RENAME COLUMN AvailableQuantity TO ListedQuantity;
ALTER TABLE CropListing ADD COLUMN RemainingQuantity FLOAT;
ALTER TABLE CropListing ADD COLUMN Status NVARCHAR(20);

```
- FK Status -> new ListingStatusLov (ACTIVE, PARTIALLY_FULFILLED, SOLD_OUT, WITHDRAWN, EXPIRED)
    - ACTIVE -  When Created and not expired or sold out yet
    - PARTIALLY_FULFILLED - (obsolete)
    - SOLD_OUT -  in accordance with saled
    - EXPIRED - use update , mark as expired
    - WITHDRAWN - User set (with quanity)
------
## NEW LOVs

### ProduceQualityLov
- Grade 1 (Special / Premium): Represents the highest quality tier with maximum purity, optimum size/color, lowest moisture content, and zero adulteration. Oils labeled as "Grade-1" fall into this category.
- Grade 2 (Good): High-quality produce that meets strong standard criteria but may have minor natural variations compared to Grade 1.
- Grade 3 (Fair): Average quality suitable for standard market consumption, meeting all necessary health and safety thresholds.
- Grade 4 (Ordinary)

### ListingStatusLov
- ACTIVE, PARTIALLY_FULFILLED, SOLD_OUT, WITHDRAWN, EXPIRED



/// auto sold out at remaining qutnatity = 0