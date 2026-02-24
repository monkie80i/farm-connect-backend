const db = require("../db");

db.pragma('foreign_keys = OFF');

db.exec(`
BEGIN TRANSACTION;
----------------------------------------------------
-- USERS (2 Farmers + 2 Buyers)
----------------------------------------------------
INSERT INTO Users 
(UserName, FirstName, LastName, PasswordHash, Email, PhoneCode, Phone, DateOfBirth, Role, IsEmailVerified, IsPhoneVerified, IsActive)
VALUES
('farmer_rahim','Rahim','Koya','hash1','rahim@test.com','+91','9876500011','1990-03-12','FARMER',1,1,1),
('farmer_salim','Salim','Khan','hash2','salim@test.com','+91','9876500022','1988-07-21','FARMER',1,1,1),
('buyer_anas','Anas','Ali','hash3','anas@test.com','+91','9876500033','1995-01-05','BUYER',1,1,1),
('buyer_faris','Faris','Hassan','hash4','faris@test.com','+91','9876500044','1996-09-18','BUYER',1,1,1);

----------------------------------------------------
-- USER PROFILE
----------------------------------------------------
INSERT INTO UserProfile (UserId, Address, City, State, UPIId)
VALUES
(1,'Green Villa, Kuthuparamba','Kannur','Kerala','rahim@upi'),
(2,'Palm Farm House, Taliparamba','Kannur','Kerala','salim@upi'),
(3,'Skyline Apartment','Kozhikode','Kerala','anas@upi'),
(4,'Sea View Residency','Kochi','Kerala','faris@upi');

----------------------------------------------------
-- PAYMENT METHODS (Farmers)
----------------------------------------------------
INSERT INTO UserPaymentMethod (UserId, PaymentMethod)
VALUES
(1,'UPI'),
(1,'BANK_TRANSFER'),
(2,'UPI'),
(2,'CASH');

----------------------------------------------------
-- BUYER ADDRESSES
----------------------------------------------------
INSERT INTO BuyerAddress (UserId, Address, City, State, IsDefault)
VALUES
(3,'Flat 2B, City Tower','Kozhikode','Kerala',1),
(3,'Office Street 12','Kozhikode','Kerala',0),
(4,'Marine Drive Building','Kochi','Kerala',1),
(4,'Warehouse Road 5','Ernakulam','Kerala',0);

----------------------------------------------------
-- FARMS
----------------------------------------------------
INSERT INTO Farm (UserId, Name, Address, City, State, Latitude, Longitude, TotalCultivableArea, IsDefault)
VALUES
(1,'Rahim Banana Farm','Mattanur Road','Kannur','Kerala',11.8745,75.3704,2.5,1),
(2,'Salim Mixed Farm','Taliparamba Village','Kannur','Kerala',12.0416,75.3550,3.2,1);

----------------------------------------------------
-- CROP TYPES
----------------------------------------------------
INSERT INTO CropType (CropName, ScientificName, IsPerennial)
VALUES
('Banana','Musa acuminata',1),
('Coconut','Cocos nucifera',1),
('Pepper','Piper nigrum',1),
('Tomato','Solanum lycopersicum',0),
('Chilli','Capsicum annuum',0),
('Ginger','Zingiber officinale',0);

----------------------------------------------------
-- FARM CROP TYPES (each farm multiple crops)
----------------------------------------------------
-- Rahim Farm (FarmId = 1)
INSERT INTO FarmCropTypes (FarmId, CropTypeId) VALUES (1,1);
INSERT INTO FarmCropTypes (FarmId, CropTypeId) VALUES (1,3);
INSERT INTO FarmCropTypes (FarmId, CropTypeId) VALUES (1,4);

-- Salim Farm (FarmId = 2)
INSERT INTO FarmCropTypes (FarmId, CropTypeId) VALUES (2,2);
INSERT INTO FarmCropTypes (FarmId, CropTypeId) VALUES (2,3);
INSERT INTO FarmCropTypes (FarmId, CropTypeId) VALUES (2,6);

COMMIT;
`);

db.pragma('foreign_keys = ON');

// Output all tables
console.log("\n========================================");
console.log("USERS TABLE");
console.log("========================================");
console.log(db.prepare("SELECT * FROM Users").all());

console.log("\n========================================");
console.log("USER PROFILE TABLE");
console.log("========================================");
console.log(db.prepare("SELECT * FROM UserProfile").all());

console.log("\n========================================");
console.log("USER PAYMENT METHOD TABLE");
console.log("========================================");
console.log(db.prepare("SELECT * FROM UserPaymentMethod").all());

console.log("\n========================================");
console.log("BUYER ADDRESS TABLE");
console.log("========================================");
console.log(db.prepare("SELECT * FROM BuyerAddress").all());

console.log("\n========================================");
console.log("FARM TABLE");
console.log("========================================");
console.log(db.prepare("SELECT * FROM Farm").all());

console.log("\n========================================");
console.log("CROP TYPE TABLE");
console.log("========================================");
console.log(db.prepare("SELECT * FROM CropType").all());

console.log("\n========================================");
console.log("FARM CROP TYPES TABLE");
console.log("========================================");
console.log(db.prepare("SELECT * FROM FarmCropTypes").all());

console.log("\n========================================");

