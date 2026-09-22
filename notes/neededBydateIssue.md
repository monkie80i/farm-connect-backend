Both of these are the same underlying issue as the `NeededByDate` bound we solved earlier — you're just discovering the second half of it. Growth duration gave you a *minimum* lead time; perishability now gives you a *maximum* one. Together they define a valid harvest-to-delivery window per crop, and the buyer's request needs to fit inside it.

## 1. Window instead of a single date

Yes — a single `NeededByDate` doesn't make sense once you accept that different farmers' crops will hit harvest on different days. Replace it with a range the buyer can live with:

| Field Name | Data Type | Size | Constraints | Description |
|---|---|---|---|---|
| DeliveryWindowStart | DATE | – | NOT NULL | Earliest date buyer can accept delivery |
| DeliveryWindowEnd | DATE | – | NOT NULL | Latest date buyer can accept delivery |

(Drop `NeededByDate`, these two replace it.) `MinLeadDays` still does its job unchanged — `DeliveryWindowStart >= today + MinLeadDays` is still the feasibility floor at request-creation time.

## 2. The 70%-shelf-life rule — add the missing input, then it's just arithmetic

You're right that this matters, and the reasoning is sound — a buyer isn't just checking "is it harvested," they're checking "will it still be sellable when it reaches me." But right now there's no shelf-life data anywhere in the schema to check it against. Add it where `ExpectedGrowthDurationDays` already lives — at the variety level, cached onto `Crop` the same way you're already doing for growth duration:

| Field Name | Data Type | Size | Constraints | Description |
|---|---|---|---|---|
| ShelfLifeDays (on CropVariety) | INTEGER | – | NULLABLE | Typical post-harvest shelf life under standard storage/transport |
| ShelfLifeDays (on Crop, cached) | INTEGER | – | NULLABLE | Copied from CropVariety at crop creation, avoids a join for validation |

The rule itself is a straightforward derived check, not a stored value:

```
days_since_harvest_at_delivery = PledgeDeliveryDate − EstdHarvestDate
valid if: days_since_harvest_at_delivery <= 0.30 × ShelfLifeDays
```

`EstdHarvestDate` already exists on `HarvestCycleInstance` for that farmer's crop — same source your yield-estimation service already reads from. No new prediction machinery, just a second consumer of data you already compute.

**One thing worth deciding, not deciding for you:** should the 70% threshold be a fixed platform-wide constant, or configurable per bulk request (some buyers might accept 50% remaining for something they'll process immediately; others might demand 90% for retail display)? I'd default to a hardcoded constant for v1 — it's a business risk-tolerance question, and per-request configurability is easy to bolt on later once you see whether one number actually fits all your buyers.

## 3. Different farmers, different stages — this resolves itself, don't force uniformity

This is the part that looks like a problem but isn't, once you validate **per pledge** rather than per request. You already have `PledgeDeliveryDate` sitting on `BulkRequestPledge` — that's the farmer's own self-declared commitment, based on wherever *their* crop actually is. So the check at pledge time is simply:

```
PledgeDeliveryDate must fall within [DeliveryWindowStart, DeliveryWindowEnd]
AND
PledgeDeliveryDate − EstdHarvestDate <= 0.30 × ShelfLifeDays
```

A farmer whose crop is three weeks from harvest and one whose crop is three days from harvest can both pledge to the same `BulkRequest` — each is validated against their *own* projected harvest date, not forced onto a shared stage. If a farmer's crop can't produce a delivery date that satisfies both constraints, the system should reject the pledge at submission with a clear reason ("too early for window" or "would arrive stale"), rather than silently accepting something the buyer would later reject.

This is also why the buyer's window matters as a *width*, not just placement — a window that's too narrow relative to natural harvest spread across your farmer base will quietly reject most pledges. That's worth a soft warning at request-creation time (e.g. "this window may be narrow for this crop type based on typical harvest variance"), but I'd treat that as a v2 refinement, not a v1 blocker.

**Flagging one open question:** does the buyer need deliveries to *cluster* (e.g. all arriving within a few days of each other, for one coordinated pickup), or is any spread within the window fine because deliveries trickle in independently? That's a logistics-coordination question that sits outside the data model — worth deciding before you build the fulfillment/pickup side, but it doesn't change anything above.