

DROP INDEX IF EXISTS UX_OrderDispute_ActivePerLineItem;

DELETE FROM DisputeTypesLov;
DELETE FROM DisputeStatusLov;

INSERT INTO DisputeTypesLov (Code,Description) VALUES 
('DELAY','Delivery Delay'),
('PAYMENT','Payment Issue'),
('QUANTITY','Quantity Mismatch/Issue'),
('QUALITY','Quality Issue');

INSERT INTO DisputeStatusLov (Code,Description) VALUES 
('NEW','New'),
('ACTIVE','Active'),
('REJECT','Rejected'),
('RESOLVED','RES');

CREATE UNIQUE INDEX UX_OrderDispute_ActivePerLineItem
    ON OrderDispute (OrderLineItemId)
    WHERE Status IN ('NEW','ACTIVE');

UPDATE OrderDispute SET Status = 'NEW';