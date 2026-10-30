There are 2 statuses related to Line Item
1. Status 
2. StatusReason
3. DeliveryStatus
4. DeliveryStatusReason

DeliveryStatus
DELIVERED	Delivery completed
EN_ROUTE	On the Way
FAILED	Failed
INACTIVE	Inactive
PREPARING	Preparing
READY	Ready for Pickup
RETURNING	Returning to Origin
RE_ATTEMPT	Re-attempting

OrderLineItemStatusLov

ACTIVE	Active
FAILED	Failed
FULFILLED	Fulfilled
RETURNED	Returned

NEW New - add

OrderLineItemStatusReasonsLov
none



OrderDeliveryStatusReasonsLov
StatusCode	ReasonCode	Description
FAILED	FAILED_1	Delivery attempt failed
FAILED	FAILED_2	Delivery failed and return process also failed.
--
INACTIVE    INACTIVE_1  Newly Created
RETURNING   RETURNING_1     Unable To Locate
RETURNING   RETURNING_2     Refused to accept Due to quality Issue
RETURNING   RETURNING_3     Refused Payment


we need to be able to update both for a line Item 

wwhat all status are for the farmer?
waht all status are for the admin?

should it be a modal of a permanent part of the screen?

aslo for some statuses, extra things need to be computed

let the main status be set automatically
Let the delivery status be the one set by farmer ,and main status et automatically



EN_ROUTE	On the Way
FAILED	Failed
INACTIVE	Inactive
PREPARING	Preparing
READY	Ready for Pickup
RETURNING	Returning to Origin
RE_ATTEMPT	Re-attempting

