Phase 2.3 Group Selling
Farmer Group Listing Creation
Farmer Group Listing Details
Farmer Groups Listing


Buyer Requirement List Crud
List
Create
Edit and extend date
Delete
View pledges
Accept pledges
Confirm pledges
Farmer Group Requirement List and Detail ( to pledge )
Farmer Group Listing Details
View
pledging
Farmer Groups Listing

let Buyer Request = Bulk order Request

Flow
1. Buyer Creates a Bulk order request
2. farmers can search the bulk order requests
3. Farmer opens the bulk request and sees details
4. he can see, whoo has been pledged and who has been accepted
5. he can also pledge with quantity
6. Buyer can see who all pledged and choose the ones interested and full fill

Bulk order request life cycel
1. Created - ACTIVE - Availabel for farmers to see, and pledge
2. Created - DRAFT - will complete filling later and can beactive lated, only viewable for buyer
3. Once buyer accepets pledge - CONFIRMED - Craete Group listing with participants
4. EXPIRED - If the requiremtn not met by the expiry date
5. WITHDRAWN -  if the buyer is no longer interested

when reopening after expiery
- Status EXPIRED -> OPEN transition on manual extend (new PledgeDeadline) is just an UpdatedDate write;

## Tables / Migrations
- `00019_phase_2.3.sql`


## APIs
1. Search Bulk Requests
2. Create Bulk Request
3. Detail Bulk Request
4. Update Bulk Request
4. Create Pledge
5. Delete Pledge
7. Group Listing Search
8. Group Listing Details

## UI

1. Search Bulk Requests (common)
2. Create Bulk Request ( Buyer )
3. Detail Bulk Request ( Common ) - pledging flow, confrim flow - re open flow
4. Update Bulk Request ( Buyer )





