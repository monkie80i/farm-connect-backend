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

----------------------------------------------------
-- CROP VARIETIES
----------------------------------------------------
-- Banana Varieties
INSERT INTO CropVariety (CropTypeId, VarietyName, MaturityMinDays, MaturityMaxDays, YieldPerAcre, ShelfLifeDays, IsHybrid, Notes, CreatedUser, CreatedDate)
VALUES
(1, 'Nendran Banana', 240, 300, 25, 14, 0, 'Popular Kerala variety, medium-sized bunches', 1, CURRENT_TIMESTAMP),
(1, 'Robusta Banana', 200, 270, 30, 10, 0, 'High yield variety, good for export', 1, CURRENT_TIMESTAMP),
(1, 'Poovan Banana', 180, 240, 20, 16, 0, 'Golden color, sweet variety', 1, CURRENT_TIMESTAMP);

-- Coconut Varieties
INSERT INTO CropVariety (CropTypeId, VarietyName, MaturityMinDays, MaturityMaxDays, YieldPerAcre, ShelfLifeDays, IsHybrid, Notes, CreatedUser, CreatedDate)
VALUES
(2, 'West Coast Tall', 2000, 2500, 12, 180, 0, 'High oil content variety', 1, CURRENT_TIMESTAMP),
(2, 'Dwarf Green', 1200, 1500, 15, 180, 0, 'Early bearing, compact growth', 1, CURRENT_TIMESTAMP),
(2, 'Hybrid Coconut', 1500, 1800, 18, 180, 1, 'Hybrid variant for better yield', 1, CURRENT_TIMESTAMP);

-- Pepper Varieties
INSERT INTO CropVariety (CropTypeId, VarietyName, MaturityMinDays, MaturityMaxDays, YieldPerAcre, ShelfLifeDays, IsHybrid, Notes, CreatedUser, CreatedDate)
VALUES
(3, 'Pippali', 210, 270, 0.8, 365, 0, 'Long pepper variety', 1, CURRENT_TIMESTAMP),
(3, 'Kalluvally', 200, 260, 1.0, 365, 0, 'High spice content', 1, CURRENT_TIMESTAMP);

-- Tomato Varieties
INSERT INTO CropVariety (CropTypeId, VarietyName, MaturityMinDays, MaturityMaxDays, YieldPerAcre, ShelfLifeDays, IsHybrid, Notes, CreatedUser, CreatedDate)
VALUES
(4, 'Arka Vikas', 60, 90, 50, 7, 0, 'High yielding variety', 1, CURRENT_TIMESTAMP),
(4, 'Pusa Ruby', 70, 100, 45, 6, 0, 'Large fruit size', 1, CURRENT_TIMESTAMP);

-- Chilli Varieties
INSERT INTO CropVariety (CropTypeId, VarietyName, MaturityMinDays, MaturityMaxDays, YieldPerAcre, ShelfLifeDays, IsHybrid, Notes, CreatedUser, CreatedDate)
VALUES
(5, 'Byadagi', 100, 150, 15, 30, 0, 'Medium pungent, export quality', 1, CURRENT_TIMESTAMP),
(5, 'Kashmiri', 110, 160, 12, 28, 0, 'Mild pungent, bright red', 1, CURRENT_TIMESTAMP);

-- Ginger Varieties
INSERT INTO CropVariety (CropTypeId, VarietyName, MaturityMinDays, MaturityMaxDays, YieldPerAcre, ShelfLifeDays, IsHybrid, Notes, CreatedUser, CreatedDate)
VALUES
(6, 'Suprabha', 270, 300, 20, 60, 0, 'High oleoresin content', 1, CURRENT_TIMESTAMP),
(6, 'Megha', 250, 290, 22, 60, 0, 'Disease resistant variety', 1, CURRENT_TIMESTAMP);

----------------------------------------------------
-- CROPS (for Farmer 1: Rahim - Farm 1)
----------------------------------------------------
-- Rahim's Banana Crop (using Nendran variety)
INSERT INTO Crop (Name, CropTypeId, VarietyId, FarmId, FarmerId, LandPrepDate, SowingDate, CurrentStage, HealthStatus, CultivatedArea, CultivatedAreaUnit, InitialSoilCondition, InitialNotes, HarvestReadinessInd, CreatedUser, CreatedDate)
VALUES
('Nendran Batch 2026-01', 1, 1, 1, 1, '2025-12-01', '2025-12-15', 'GROW', 'HLTY', 1.5, 'ACRE', 'Well-drained loamy soil with pH 6.5', 'Planted with proper spacing', 0, 1, CURRENT_TIMESTAMP);

-- Rahim's Pepper Crop (using Kalluvally variety)
INSERT INTO Crop (Name, CropTypeId, VarietyId, FarmId, FarmerId, LandPrepDate, SowingDate, CurrentStage, HealthStatus, CultivatedArea, CultivatedAreaUnit, InitialSoilCondition, InitialNotes, HarvestReadinessInd, CreatedUser, CreatedDate)
VALUES
('Kalluvally Pepper 2026-01', 3, 4, 1, 1, '2025-10-01', '2025-10-20', 'FLOW', 'HLTY', 0.8, 'ACRE', 'Slightly acidic soil, good drainage', 'Young climbing vines established', 0, 1, CURRENT_TIMESTAMP);

-- Rahim's Tomato Crop (using Arka Vikas variety)
INSERT INTO Crop (Name, CropTypeId, VarietyId, FarmId, FarmerId, LandPrepDate, SowingDate, CurrentStage, HealthStatus, CultivatedArea, CultivatedAreaUnit, InitialSoilCondition, InitialNotes, HarvestReadinessInd, CreatedUser, CreatedDate)
VALUES
('Arka Vikas Tomato 2026-01', 4, 8, 1, 1, '2026-01-05', '2026-01-15', 'GERM', 'HLTY', 0.5, 'ACRE', 'Fertile loamy soil', 'Seedlings transplanted', 0, 1, CURRENT_TIMESTAMP);

----------------------------------------------------
-- CROPS (for Farmer 2: Salim - Farm 2)
----------------------------------------------------
-- Salim's Coconut Crop (using West Coast Tall variety)
INSERT INTO Crop (Name, CropTypeId, VarietyId, FarmId, FarmerId, LandPrepDate, SowingDate, CurrentStage, HealthStatus, CultivatedArea, CultivatedAreaUnit, InitialSoilCondition, InitialNotes, HarvestReadinessInd, CreatedUser, CreatedDate)
VALUES
('West Coast Tall Coconut 2026', 2, 1, 2, 2, '2024-06-01', '2024-06-15', 'GROW', 'HLTY', 2.0, 'ACRE', 'Sandy loam with good drainage', 'Trees in productive stage', 0, 2, CURRENT_TIMESTAMP);

-- Salim's Pepper Crop (using Pippali variety)
INSERT INTO Crop (Name, CropTypeId, VarietyId, FarmId, FarmerId, LandPrepDate, SowingDate, CurrentStage, HealthStatus, CultivatedArea, CultivatedAreaUnit, InitialSoilCondition, InitialNotes, HarvestReadinessInd, CreatedUser, CreatedDate)
VALUES
('Pippali Pepper 2026-01', 3, 3, 2, 2, '2025-09-01', '2025-09-15', 'MAT', 'HLTY', 0.6, 'ACRE', 'High organic matter content', 'Vines flowering and fruiting', 0, 2, CURRENT_TIMESTAMP);

-- Salim's Ginger Crop (using Suprabha variety)
INSERT INTO Crop (Name, CropTypeId, VarietyId, FarmId, FarmerId, LandPrepDate, SowingDate, CurrentStage, HealthStatus, CultivatedArea, CultivatedAreaUnit, InitialSoilCondition, InitialNotes, HarvestReadinessInd, CreatedUser, CreatedDate)
VALUES
('Suprabha Ginger 2025-26', 6, 7, 2, 2, '2025-05-01', '2025-05-15', 'FRUIT', 'HLTY', 0.4, 'ACRE', 'Well-aerated loamy soil', 'Good rhizome development observed', 0, 2, CURRENT_TIMESTAMP);

----------------------------------------------------
-- CROP LIFECYCLE DEFINITIONS & STAGES
----------------------------------------------------

-- Banana Lifecycle (Nendran - CropVarietyId = 1)
INSERT INTO CropLifecycleDefinition (CropTypeId, CropVarietyId, Season, Region, CreatedUser, CreatedDate)
VALUES
(1, 1, 'Year-round', 'Kerala', 1, CURRENT_TIMESTAMP);

INSERT INTO CropLifeCycleStages (CropLifecycleDefinitionId, StageName, StageOrder, MinDaysFromPreviousStage, MaxDaysFromPreviousStage, Description)
VALUES
(1, 'LAND', 1, 0, 10, 'Land preparation with mulch and compost'),
(1, 'SOW', 2, 10, 15, 'Planted suckers at 2.5m x 2.5m spacing'),
(1, 'GERM', 3, 15, 30, 'Sucker sprouting and initial root development'),
(1, 'GROW', 4, 30, 120, 'Vegetative growth - leaves and pseudo-stem development'),
(1, 'FLOW', 5, 120, 180, 'Flowering and inflorescence emergence'),
(1, 'FRUIT', 6, 180, 240, 'Fruit development and bunch formation'),
(1, 'MAT', 7, 240, 270, 'Maturity - fruit maturation and coloring'),
(1, 'HARW', 8, 270, 300, 'Harvest window - fruit ready for picking');

-- Banana Lifecycle (Robusta - CropVarietyId = 2)
INSERT INTO CropLifecycleDefinition (CropTypeId, CropVarietyId, Season, Region, CreatedUser, CreatedDate)
VALUES
(1, 2, 'Year-round', 'Kerala', 1, CURRENT_TIMESTAMP);

INSERT INTO CropLifeCycleStages (CropLifecycleDefinitionId, StageName, StageOrder, MinDaysFromPreviousStage, MaxDaysFromPreviousStage, Description)
VALUES
(2, 'LAND', 1, 0, 10, 'Land preparation with compost'),
(2, 'SOW', 2, 10, 15, 'Planted tissue culture plantlets'),
(2, 'GERM', 3, 15, 25, 'Plantlet establishment and rooting'),
(2, 'GROW', 4, 25, 100, 'Rapid vegetative growth phase'),
(2, 'FLOW', 5, 100, 150, 'Flowering stage'),
(2, 'FRUIT', 6, 150, 210, 'Fruit development - faster variety'),
(2, 'MAT', 7, 210, 250, 'Maturity stage'),
(2, 'HARW', 8, 250, 270, 'Ready for harvest');

-- Coconut Lifecycle (West Coast Tall - CropVarietyId = 1)
INSERT INTO CropLifecycleDefinition (CropTypeId, CropVarietyId, Season, Region, CreatedUser, CreatedDate)
VALUES
(2, 4, 'Year-round', 'Kerala', 2, CURRENT_TIMESTAMP);

INSERT INTO CropLifeCycleStages (CropLifecycleDefinitionId, StageName, StageOrder, MinDaysFromPreviousStage, MaxDaysFromPreviousStage, Description)
VALUES
(3, 'LAND', 1, 0, 30, 'Land preparation - pit digging and filling'),
(3, 'SOW', 2, 30, 60, 'Seednut plantation in pits'),
(3, 'GERM', 3, 60, 180, 'Seednut germination - root and shoot development'),
(3, 'GROW', 4, 180, 1200, 'Vegetative growth - tree establishment'),
(3, 'FLOW', 5, 1200, 1800, 'Flowering stage in mature plants'),
(3, 'FRUIT', 6, 1800, 2200, 'Fruit development - nut maturation'),
(3, 'MAT', 7, 2200, 2400, 'Maturity - nuts ready for harvest'),
(3, 'HARW', 8, 2400, 2500, 'Harvest window');

-- Pepper Lifecycle (Kalluvally - CropVarietyId = 4)
INSERT INTO CropLifecycleDefinition (CropTypeId, CropVarietyId, Season, Region, CreatedUser, CreatedDate)
VALUES
(3, 4, 'Monsoon to Summer', 'Kerala', 1, CURRENT_TIMESTAMP);

INSERT INTO CropLifeCycleStages (CropLifecycleDefinitionId, StageName, StageOrder, MinDaysFromPreviousStage, MaxDaysFromPreviousStage, Description)
VALUES
(4, 'LAND', 1, 0, 15, 'Land preparation with organic matter'),
(4, 'SOW', 2, 15, 25, 'Cuttings planted on support structures'),
(4, 'GERM', 3, 25, 45, 'Cutting rooting and establishment'),
(4, 'GROW', 4, 45, 120, 'Vine growth along support - leaf development'),
(4, 'FLOW', 5, 120, 180, 'Flowering - white flowers appearing'),
(4, 'FRUIT', 6, 180, 200, 'Fruit flowering to maturation'),
(4, 'MAT', 7, 200, 240, 'Berries ripen - color change from green to red'),
(4, 'HARW', 8, 240, 260, 'Harvest ready - berries dried to black peppercorns');

-- Tomato Lifecycle (Arka Vikas - CropVarietyId = 8)
INSERT INTO CropLifecycleDefinition (CropTypeId, CropVarietyId, Season, Region, CreatedUser, CreatedDate)
VALUES
(4, 8, 'Oct-Feb (Winter)', 'Kerala', 1, CURRENT_TIMESTAMP);

INSERT INTO CropLifeCycleStages (CropLifecycleDefinitionId, StageName, StageOrder, MinDaysFromPreviousStage, MaxDaysFromPreviousStage, Description)
VALUES
(5, 'LAND', 1, 0, 12, 'Land preparation - beds formed with compost'),
(5, 'SOW', 2, 12, 18, 'Seedlings transplanted in field'),
(5, 'GERM', 3, 18, 35, 'Seedling establishment and root development'),
(5, 'GROW', 4, 35, 50, 'Vegetative growth - flowering begins'),
(5, 'FLOW', 5, 50, 60, 'Flowering - yellow flowers opening'),
(5, 'FRUIT', 6, 60, 75, 'Fruit development - green fruits growing'),
(5, 'MAT', 7, 75, 85, 'Maturity - fruits turning red'),
(5, 'HARW', 8, 85, 90, 'Harvest ready');

-- Ginger Lifecycle (Suprabha - CropVarietyId = 7)
INSERT INTO CropLifecycleDefinition (CropTypeId, CropVarietyId, Season, Region, CreatedUser, CreatedDate)
VALUES
(6, 7, 'May-Feb', 'Kerala', 2, CURRENT_TIMESTAMP);

INSERT INTO CropLifeCycleStages (CropLifecycleDefinitionId, StageName, StageOrder, MinDaysFromPreviousStage, MaxDaysFromPreviousStage, Description)
VALUES
(6, 'LAND', 1, 0, 20, 'Land preparation - beds with drainage'),
(6, 'SOW', 2, 20, 30, 'Seed rhizomes planted (20-25g pieces)'),
(6, 'GERM', 3, 30, 75, 'Rhizome germination and sprouting'),
(6, 'GROW', 4, 75, 150, 'Vegetative growth - leaf and aerial shoot development'),
(6, 'FLOW', 5, 150, 200, 'Flowering and flowering plant stage'),
(6, 'FRUIT', 6, 200, 270, 'Rhizome development and enlargement'),
(6, 'MAT', 7, 270, 285, 'Maturity - rhizome mature for harvest'),
(6, 'HARW', 8, 285, 300, 'Harvest window - ready for digging');
COMMIT;
`);

db.pragma('foreign_keys = ON');



