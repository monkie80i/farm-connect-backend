const db = require('../db');

db.exec(`
INSERT INTO UserRolesLov (Code, Description) VALUES
('FARMER', 'Farmer user'),
('BUYER', 'Buyer user'),
('ADMIN', 'System administrator');

INSERT INTO IdProofTypesLov (Code, Description) VALUES
('AADHAR', 'Aadhar Card'),
('PAN', 'PAN Card'),
('DL', 'Driving License'),
('VOTER', 'Voter ID'),
('PASS', 'Passport');

INSERT INTO PaymentMethodsLov (Code, Description) VALUES
('UPI', 'UPI Payment'),
('BANK', 'Bank Transfer'),
('COD', 'Cash on Delivery'),
('CARD', 'Credit/Debit Card');

INSERT INTO HealthStatusLov (Code, Description) VALUES
('HLTY', 'Healthy'),
('MINOR', 'Minor Issue'),
('RISK', 'At Risk'),
('CRIT', 'Critical'),
('HARV', 'Harvested');

INSERT INTO CropStagesLov (Code, Description) VALUES
('LAND', 'Land Preparation'),
('SOW', 'Sowing'),
('GERM', 'Germination'),
('GROW', 'Vegetative Growth'),
('FLOW', 'Flowering'),
('FRUIT', 'Fruiting'),
('MAT', 'Maturity'),
('HARW', 'Harvest Window');

INSERT INTO HealthLogSeverityLov (Code, Description) VALUES
('LOW', 'Low Severity'),
('MED', 'Medium Severity'),
('HIGH', 'High Severity');

INSERT INTO GroupVisibilityStatusLov (Code, Description) VALUES
('FORM', 'Forming'),
('OPEN', 'Open for Orders'),
('CLOS', 'Closed'),
('EXP', 'Expired');

INSERT INTO OrderStatusLov (Code, Description) VALUES
('PEND', 'Pending'),
('NEGO', 'Negotiating'),
('CONF', 'Confirmed'),
('REJ', 'Rejected'),
('CANC', 'Cancelled'),
('PAID', 'Paid'),
('FULF', 'Fulfilled');

INSERT INTO DisputeTypesLov (Code, Description) VALUES
('QUAL', 'Quality Issue'),
('QTY', 'Quantity Mismatch'),
('PAY', 'Payment Issue'),
('DEL', 'Delivery Delay'),
('OTHR', 'Other');

INSERT INTO DisputeStatusLov (Code, Description) VALUES
('OPEN', 'Open'),
('CLMD', 'Claimed'),
('RES', 'Resolved'),
('REJ', 'Rejected');

INSERT INTO LandAreaUnitLov (Code, Description) VALUES
('ACRE', 'Acre'),
('HA', 'Hectare'),
('SQM', 'Square Meter');

INSERT INTO ListingStatus (Code, Description) VALUES
('DRAFT', 'Draft'),
('ACTIVE', 'Active'),
('CLOSED', 'Closed'),
('SOLD', 'Sold Out'),
('EXP', 'Expired');

INSERT INTO CropUnitLov (Code, Description) VALUES
('KG', 'Kilogram'),
('QTL', 'Quintal'),
('TON', 'Metric Ton');

INSERT INTO OrderStageLov (Code, Description) VALUES
('REQ', 'Order Requested'),
('NEGO', 'Negotiation'),
('CONF', 'Order Confirmed'),
('PAY', 'Payment Pending'),
('SHIP', 'Out for Delivery'),
('COMP', 'Completed');

INSERT INTO DeliveryOptionLov (Code, Description) VALUES
('PICK', 'Self Pickup'),
('DELIV', 'Farmer Delivery'),
('THIRD', 'Third-party Logistics');

INSERT INTO HealthWarningTypeLov (Code, Description) VALUES
('DELAY', 'Stage Delay'),
('REPISS', 'Repeated Issues'),
('MON', 'Monitoring Gap');

INSERT INTO HealthSeverityLov (Code, Description) VALUES
('INFO', 'Informational'),
('WARN', 'Warning'),
('CRIT', 'Critical');

INSERT INTO AlertPriorityLov (Code, Description) VALUES
('LOW', 'Low Priority'),
('MED', 'Medium Priority'),
('HIGH', 'High Priority');

INSERT INTO NotificationTypeLov (Code, Description) VALUES
('ORDER', 'Order Update'),
('GROUP', 'Group Update'),
('HEALTH', 'Health Alert'),
('DISP', 'Dispute Update'),
('PAY', 'Payment Update'),
('SYS', 'System Notification');

INSERT INTO NotificationPriorityLov (Code, Description) VALUES
('INFO', 'Informational'),
('ACTION', 'Action Required'),
('URGENT', 'Urgent');

INSERT INTO CropStageCaps (StageName,Cap) VALUES
    ('LAND',0.6),
    ('SOW',0.6),
    ('GERM',0.6),
    ('GROW',0.75),
    ('FLOW',0.85),
    ('FRUIT',0.95),
    ('MAT',1.0),
    ('HARW',1.0);

`);