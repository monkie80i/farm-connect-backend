OrderStatusLov
ACTIVE	Active Fulfillment
CANCELLED	Cancelled
FAILED	Failed
FULFILLED	Fulfillment Completed
NEW	New
PLACED	Order Placed

OrderLineItemStatusLov
ACTIVE	Active
FAILED	Failed
FULFILLED	Fulfilled
RETURNED	Returned

OrderDeliveryStatusLov
DELIVERED	Delivery completed
EN_ROUTE	On the Way
FAILED	Failed
INACTIVE	Inactive
PREPARING	Preparing
READY	Ready for Pickup
RETURNING	Returning to Origin
RE_ATTEMPT	Re-attempting


OrderStatusReasonLov
StatusCode	ReasonCode	Description
FAILED	FAILED_1	COD Payment Failure.
PLACED	PLACED_1	Payment completed and Order placed.
PLACED	PLACED_2	Order placed with COD. Payment Not Complete.
CANCELLED	CANCEL_1	Manually Cancelled.

OrderLineItemStatusReasonsLov
no reasons yet



OrderDeliveryStatusReasonsLov
StatusCode	ReasonCode	Description
FAILED	FAILED_1	Delivery attempt failed
FAILED	FAILED_2	Delivery failed and return process also failed.
