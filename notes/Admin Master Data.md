Admin Master Data:

1. CropStagesLov,GrowthDurationLov:
- Code NVARCHAR(10), PRIMARY KEY.
- Description TEXT, NOT NULL.

2. CropType
- Id: INTEGER ,PRIMARY KEY,AUTOINCREMENT,
- CropName:  NVARCHAR(50),NOT NULL,UNIQUE COLLATE NOCASE,
- ScientificName: NVARCHAR(100),
- GrowthDurationType: NVARCHAR(10),NOT NULL, DEFAULT 'ANNUAL', FK TO GrowthDurationLov(Code).
- IsActive: INTEGER DEFAULT 1,
- CreatedUser: INTEGER, FK to Users(Id),
- UpdatedUser: INTEGER, FK to Users(Id),
- CreatedDate: DATETIME,
- UpdatedDate: DATETIME,

3. CropVariety
- Id: INTEGER PRIMARY KEY AUTOINCREMENT,
- CropTypeId: INTEGER NOT NULL,CropType(Id).
- VarietyName: NVARCHAR(50) NOT NULL,
- MaturityMinDays: INTEGER NOT NULL,
- MaturityMaxDays: INTEGER NOT NULL,
- YieldPerAcre: FLOAT NOT NULL,
- ShelfLifeDays: INTEGER,
- IsHybrid: INTEGER DEFAULT 0,
- Notes: TEXT,
- IsActive: INTEGER DEFAULT 1,
- CreatedUser: INTEGER, FK to Users(Id),
- UpdatedUser: INTEGER, FK to Users(Id),
- CreatedDate: DATETIME DEFAULT CURRENT_TIMESTAMP,
- UpdatedDate: DATETIME,

4. CropLifecycleDefinition:
- Id: INTEGER PRIMARY KEY AUTOINCREMENT,
- CropTypeId: INTEGER NOT NULL, FK to CropType(Id).
- CropVarietyId: INTEGER NOT NULL, FK to CropVariety(Id).
- Season: NVARCHAR(10), FK to SeasonLov(Code).
- Region: NVARCHAR(10), FK to RegionLov(Code).
- PhaseType: NVARCHAR(15) DEFAULT 'FULL' CHECK (PhaseType IN ('FULL','ESTABLISHMENT','RECURRING')) NOT NULL, -- new
- CreatedUser: INTEGER, FK to Users(Id),
- UpdatedUser: INTEGER, FK to Users(Id),
- CreatedDate: DATETIME DEFAULT CURRENT_TIMESTAMP,
- UpdatedDate: DATETIME,


CropLifeCycleStages:
- Id: INTEGER PRIMARY KEY AUTOINCREMENT,
- CropLifecycleDefinitionId: INTEGER, FK to CropLifecycleDefinition(Id)
- Stage: NVARCHAR(10) NOT NULL,FK to CropStagesLov(Code).
- StageOrder: INTEGER NOT NULL,
- MinDaysFromPreviousStage: INTEGER NOT NULL,
- MaxDaysFromPreviousStage: INTEGER NOT NULL,
- Description: TEXT,

CropStageCaps:
- Id: INTEGER PRIMARY KEY AUTOINCREMENT,
- StageName: NVARCHAR(20), NOT NULL, FK to CropStagesLov(Code)
- Cap: FLOAT NOT NULL,
- CreatedUser: INTEGER, FK to Users(Id),
- UpdatedUser: INTEGER, FK to Users(Id),
- CreatedDate: DATETIME,
- UpdatedDate: DATETIME,





##########
Screens::
##########

------------------------
Crop Type Maintenance:
------------------------
Id - Input Number, Always Disabled.
CropName - Input Text , max len - 50,required, nothing more than normal spacing
ScientificName - Input Text, max len -100, nothing more than normal spacing, optional
IsPerennial - Input Checkbox, default false.
CreatedUser - Input Text, Always Disabled.
UpdatedUser - Input Text, Always Disabled.
CreatedDate - Input Text, Always Disabled.
UpdatedDate - Input Text, Always Disabled.
------------------------------------------

------------------------
Crop Variety Maintenance:
------------------------
Id - Input Number, Always Disabled.
CropType - Select Input, required, (shows CropName , holds Id - from CropTypes)
VarietyName - Input Text , max len - 50,required, nothing more than normal spacing
MaturityMinDays - Input Text/Number, required. No decimal. Only Positive Int.
MaturityMaxDays - Input Text/Number, required. No decimal. Only Positive Int.
YieldPerAcre - Input Number/Float, required. (**** check what is the value range )
ShelfLifeDays - Input Text/Number, required. No decimal. Only Positive Int.,
IsHybrid - Input Checkbox, default false.
Notes - Input TextArea, max len 300, optional.
CreatedUser - Input Text, Always Disabled.
UpdatedUser - Input Text, Always Disabled.
CreatedDate - Input Text, Always Disabled.
UpdatedDate - Input Text, Always Disabled.
-------------------------------------------
/**
Notes:
<input type="number" step="1" /> // step makes sure no decimal
<input type="text" inputmode="numeric" pattern="\d*" />

--inputmode="numeric": Brings up a number keyboard on mobile devices.
-- pattern="\d*": Allows only digits (no decimal points, letters, or symbols).
*/

--------------------------------------
Crop Lifecycle Definition Maintenance:
--------------------------------------
Id - Input Number, Always Disabled.
CropType - Select Input, required, (shows CropName , holds Id - from CropTypes).
CropVariety - Select Input, required, (shows VarietyName , holds Id - from CropVariety).
Season - Input Text , max len - 100,required, nothing more than normal spacing (**** shouldnt this be LOV).
Region - Input Text , max len - 100,required, nothing more than normal spacing (**** shouldnt this be LOV).
CreatedUser - Input Text, Always Disabled.
UpdatedUser - Input Text, Always Disabled.
CreatedDate - Input Text, Always Disabled.
UpdatedDate - Input Text, Always Disabled.
--------------------------------------------

--------------------
CropLifeCycleStages:
--------------------
Id - Only Display.
CropLifecycleDefinitionId - Implicit, Non Display(Id from CropLifecycleDefinition).
StageName - Select Input, required, (shows Description , holds Code - from CropStagesLov).
StageOrder - Input Text/Number, required. No decimal. Only Positive Int.
MinDaysFromPreviousStage - Input Text/Number, required. No decimal. Only Positive Int.
MaxDaysFromPreviousStage - Input Text/Number, required. No decimal. Only Positive Int.
Description -Input Text , max len - 200,required.
-------------------------------------------------

----------------------------
Crop Stage Caps Maintenance:
-----------------------------
Id - Input Number, Always Disabled.
StageName - Select Input, required, (shows Description , holds Code - from CropStagesLov).
Cap FLOAT NOT NULL,
CreatedUser - Input Text, Always Disabled.
UpdatedUser - Input Text, Always Disabled.
CreatedDate - Input Text, Always Disabled.
UpdatedDate - Input Text, Always Disabled.
------------------------------------------



/***
CropLifecycleDefinition
CropTypeId INTEGER,
        CropVarietyId Integer,

        Make both not null

*/

