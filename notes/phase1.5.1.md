ListingStatusLov
---------------------
1. ACTIVE	Active
2. EXPIRED	Expired
3. SOLD_OUT	Sold Out
4. WITHDRAWN	Withdrawn

| Code        | Description |
| ----------- | ----------- |
| `ACTIVE`    | Active      |
| `EXPIRED`   | Expired     |
| `SOLD_OUT`  | Sold Out    |
| `WITHDRAWN` | Withdrawn   |



New Table
NegotationStatusLov
------------------
1. ACTIVE Active
2. FAILED_1  | CLOSED_BY_ANOTHER_NEGO_WIN OR FAILED_TO_MAKE_A_DEAL_SOMEONE_ELSE_WON - FAILED_1
3. FAILED_2 | CLOSED_BY_PAYMENT_FAILED | failed_to_complete_order - 
4. FAILED_3 | MANUAL_CANCELLATION_OF_ORDER
5. CANCELLED | 
6. ORDER_CREATED Order Crated After negotiation | OR CONFIRMED OR CHOSEN - 
7. ORDER_SATISFIED | OR COMPELETED_TILL_ORDER ie Order went to a stage tille CONFIRMED_1 or CONFIRMED_2


| Code        | Description                                                                                |
| ----------- | ------------------------------------------------------------------------------------------ |
| `ACTIVE`    | Negotiation is active and ongoing                                                          |
| `FAILED_1`  | Closed because another negotiation won the order                                           |
| `FAILED_2`  | Closed because the associated order failed due to payment failure or payment window expiry |
| `FAILED_3`  | Closed because the associated order was manually cancelled                                 |
| `CANCELLED` | Negotiation manually cancelled before an order was created                                 |
| `ORDER_NEW` | An order was created as a result of the negotiation                                        |
| `SATISFIED` | Associated order successfully progressed through the required confirmation stage           |


FAILURE CODE



OrderStatusLov
------------------
1. NEW New
2. PAYMENT_FAIL_CLOSED | CLOSED_BY_PAYMENT_FAILED
3. CONFIRMED_1 | Payment Complete and Order Placed
4. CONFIRMED_2 | Order Placed but payment COD, payment not done yet
5. MANUAL_CANCELLATION | manually canelled by clicking a button


| Code         | Description                                                   |
| ------------ | ------------------------------------------------------------- |
| `NEW`        | New order; awaiting payment/confirmation                      |
| `PAY_FAIL`   | Order closed because payment failed or payment window expired |
| `CONFIRMED1` | Payment completed and order placed                            |
| `CONFIRMED2` | Order placed with COD; payment not yet received               |
| `MAN_CANCEL` | Order manually cancelled                                      |

Conrfirmed Code
Failure Code

OrderDeliveryStatusLov
------------------
INACTIVE
PREPARING FOR DELIVERY
EN ROUTE
DELIVERY ATTEMPT FAILED
RE ATTEMPT DELIVERY
RETURNING DELIVERY FAILED
DELIVERY COMPLETE

| Code          | Description                                    |
| ------------- | ---------------------------------------------- |
| `INACTIVE`    | Delivery has not started or is not applicable  |
| `PREPARING`   | Preparing order for delivery                   |
| `EN_ROUTE`    | Order is en route for delivery                 |
| `ATT_FAILED`  | Delivery attempt failed                        |
| `RE_ATTEMPT`  | Delivery will be attempted again               |
| `RETURN_FAIL` | Delivery failed and return process also failed |
| `DELIVERED`   | Delivery completed successfully                |


OrderPaymentStatusLov
------------------
1. PENDING_PAYMENT Pending Payment
2. PAYMENT_FAILED |Failed_to_make_payment | PAYMENT_WINDOW_EXPIRED
3. PAYMENT_COMPLETE
4. PAYMENT_RETRY | Payment Failed Once and has option to Retry


| Code       | Description                                          |
| ---------- | ---------------------------------------------------- |
| `PENDING`  | Payment is pending                                   |
| `FAILED`   | Payment failed or payment window expired             |
| `COMPLETE` | Payment completed                                    |
| `RETRY`    | Payment failed previously and payment can be retried |



ADD Order Column OrderExpiresIn timestatp?
ADD Order Column PaymentFailureCount
Delivery Address


ADD CropListing Column OrderExpieryTime in hrs



STATUS Cdes
ID Int
Table TEXT
StatusCode which is linked to
Code VARCHAR 20
Description TEXT

Unique Table and Code




CREATE TABLE MyTableStatusLov (
    StatusId    INT PRIMARY KEY,
    StatusCode  VARCHAR(20) NOT NULL UNIQUE,   -- e.g. FAILED, CONFIRMED, PENDING
    Description VARCHAR(200)
);

CREATE TABLE MyTableReasonLov (
    StatusId    INT NOT NULL REFERENCES MyTableStatusLov(StatusId),
    ReasonCode  VARCHAR(30) NOT NULL,          -- e.g. PAYMENT_FAILURE, TIMEOUT
    Description VARCHAR(200),
    PRIMARY KEY (StatusId, ReasonCode)
);

CREATE TABLE MyTable (
    ...
    StatusId   INT NOT NULL REFERENCES MyTableStatusLov(StatusId),
    ReasonCode VARCHAR(30),
    FOREIGN KEY (StatusId, ReasonCode) REFERENCES MyTableReasonLov(StatusId, ReasonCode)
);