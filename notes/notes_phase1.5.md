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
