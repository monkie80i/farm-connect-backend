# SQL Query Breakdown — Crop & Group Listings

---

## Overall Structure

The query is split into **two halves joined by `UNION ALL`**, wrapped with sorting and pagination at the end. Think of it as two separate queries whose results are stacked into one list.

```
[ Half 1: Individual Listings ]
        UNION ALL
[ Half 2: Group Listings     ]
        ORDER BY + LIMIT/OFFSET
```

---

## Half 1 — Individual Crop Listings

### SELECT Columns

```sql
'CROP' AS ListingType
```
Hardcodes the string `'CROP'` as a label so you can tell in the result which rows came from `CropListing`.

```sql
cl.Id AS ListingId,
cl.CropId,
ct.CropName,
cv.VarietyName
```
Basic identifiers — the listing ID, which crop it belongs to, and the crop's type and variety names (pulled from joined tables).

```sql
cl.AvailableQuantity AS Quantity,
cl.PricePerUnit,
cl.Unit,
cl.AvailabilityDate,
cl.IsNegotiable,
cl.MinimumOrderQuantity
```
The core commercial details of the listing — how much is available, at what price, and any order constraints.

```sql
NULL AS GroupName,
NULL AS GroupStatus,
NULL AS NumberOfParticipants
```
These columns only make sense for group listings, so they are filled with `NULL` here to keep the column structure consistent across both halves of the `UNION ALL`.

```sql
cl.CreatedDate,
cl.UpdatedDate
```
Timestamps, used later for sorting.

---

### FROM + JOINs

```sql
FROM CropListing cl
JOIN Crop c ON c.Id = cl.CropId
JOIN CropType ct ON ct.Id = c.CropTypeId
LEFT JOIN CropVariety cv ON cv.Id = c.VarietyId
```

| Join | Type | Reason |
|---|---|---|
| `Crop` | `INNER JOIN` | Every listing must have a crop — no crop means invalid row |
| `CropType` | `INNER JOIN` | Needed to get the crop type name |
| `CropVariety` | `LEFT JOIN` | Variety is optional; a crop may not have one assigned, so we use LEFT JOIN to avoid dropping those rows |

---

### WHERE

```sql
WHERE
    (:cropTypeId IS NULL OR c.CropTypeId = :cropTypeId)
    AND (:cropVarietyId IS NULL OR c.VarietyId = :cropVarietyId)
    AND (:listingFilter = 'ALL' OR :listingFilter = 'INDIVIDUAL')
```

Three independent filters, all must pass:

- **`:cropTypeId`** — if you pass a value, only that crop type comes through; pass `NULL` to skip this filter
- **`:cropVarietyId`** — same idea, filter by variety or skip it
- **`:listingFilter`** — if the caller passes `'GROUP'`, this condition fails (`'GROUP' = 'ALL'` is false, `'GROUP' = 'INDIVIDUAL'` is false), so the entire first half returns zero rows and effectively disappears from the result

---

## Half 2 — Group Listings

### SELECT Columns

```sql
'GROUP' AS ListingType
```
Hardcodes `'GROUP'` as the label for these rows.

```sql
gl.Id AS ListingId,
gl.CropId,
ct.CropName,
cv.VarietyName
```
Same identifiers as before, but sourced from `GroupListing`.

```sql
gl.TotalRequiredQuantity AS Quantity,
gl.PricePerUnit,
gl.Unit,
gl.GroupAvailabilityDate AS AvailabilityDate,
NULL AS IsNegotiable,
gl.MinRequiredQuantity AS MinimumOrderQuantity
```
Commercial details mapped to the same column names as Half 1:

| GroupListing Column | Maps To | Reason |
|---|---|---|
| `TotalRequiredQuantity` | `Quantity` | Equivalent concept across both listing types |
| `GroupAvailabilityDate` | `AvailabilityDate` | Same concept, different column name |
| `MinRequiredQuantity` | `MinimumOrderQuantity` | Minimum threshold to place an order |
| `NULL` | `IsNegotiable` | Group listings don't have this concept |

```sql
gl.Name AS GroupName,
gl.Status AS GroupStatus,
gl.NumberOfParticipants
```
Group-specific columns that were `NULL` in Half 1 — now they carry actual values.

```sql
gl.CreatedDate,
gl.UpdatedDate
```
Same timestamps as Half 1.

---

### FROM + JOINs

```sql
FROM GroupListing gl
JOIN Crop c ON c.Id = gl.CropId
JOIN CropType ct ON ct.Id = c.CropTypeId
LEFT JOIN CropVariety cv ON cv.Id = c.VarietyId
```
Identical join pattern as Half 1, just starting from `GroupListing` instead of `CropListing`.

---

### WHERE

```sql
WHERE
    gl.Status = 'OPEN'
    AND (:cropTypeId IS NULL OR c.CropTypeId = :cropTypeId)
    AND (:cropVarietyId IS NULL OR c.VarietyId = :cropVarietyId)
    AND (:listingFilter = 'ALL' OR :listingFilter = 'GROUP')
```

- **`gl.Status = 'OPEN'`** — hardcoded business rule; only open group listings are ever shown. The other statuses (`FORM`, `CLOS`, `EXP`) are always excluded
- **`:cropTypeId` / `:cropVarietyId`** — same optional filters as Half 1
- **`:listingFilter`** — mirror of the logic in Half 1; if `'INDIVIDUAL'` is passed, this whole half returns zero rows

---

## Sorting and Pagination

```sql
ORDER BY
    CASE WHEN :sortBy = 'UpdatedDate' THEN UpdatedDate ELSE CreatedDate END DESC
```

Sorts the combined result. If you pass `'UpdatedDate'`, it sorts by `UpdatedDate`; anything else (including `'CreatedDate'`) falls into the `ELSE` and sorts by `CreatedDate`. Always descending — newest first.

```sql
LIMIT :limit OFFSET :offset
```

Standard pagination:

| Parameter | Purpose | Example |
|---|---|---|
| `:limit` | Number of rows per page | `20` |
| `:offset` | Where in the full result to start | `0` for page 1, `20` for page 2 |

> **Example:** Page 3 with 20 items per page → `LIMIT 20 OFFSET 40`

---

## Parameters Summary

| Parameter | Type | Accepted Values | Purpose |
|---|---|---|---|
| `:cropTypeId` | Integer or NULL | Any valid `CropType.Id`, or `NULL` | Filter by crop type |
| `:cropVarietyId` | Integer or NULL | Any valid `CropVariety.Id`, or `NULL` | Filter by crop variety |
| `:listingFilter` | String | `'ALL'`, `'INDIVIDUAL'`, `'GROUP'` | Controls which halves of the UNION execute |
| `:sortBy` | String | `'CreatedDate'`, `'UpdatedDate'` | Sort column |
| `:limit` | Integer | Any positive integer | Page size |
| `:offset` | Integer | Any non-negative integer | Page start position |

---

## listingFilter Behaviour

| `:listingFilter` Value | Individual Listings (CROP) | Group Listings (GROUP) |
|---|---|---|
| `'ALL'` | ✅ Included | ✅ Included |
| `'INDIVIDUAL'` | ✅ Included | ❌ Excluded |
| `'GROUP'` | ❌ Excluded | ✅ Included |