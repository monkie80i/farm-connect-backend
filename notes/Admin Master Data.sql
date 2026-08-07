Admin Master Data 



CREATE TABLE IF NOT EXISTS CropStagesLov (
            Code NVARCHAR(10) PRIMARY KEY,
            Description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS CropType (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        CropName NVARCHAR(50) NOT NULL,
        ScientificName NVARCHAR(100),
        IsPerennial INTEGER DEFAULT 0,
        CreatedUser INTEGER,
        UpdatedUser INTEGER,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL
    );

Create TABLE IF NOT EXISTS CropVariety (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        CropTypeId INTEGER NOT NULL,
        VarietyName NVARCHAR(50) NOT NULL,
        MaturityMinDays INTEGER,
        MaturityMaxDays INTEGER,
        YieldPerAcre FLOAT,
        ShelfLifeDays INTEGER,
        IsHybrid INTEGER DEFAULT 0,
        Notes TEXT,
        CreatedUser INTEGER,
        UpdatedUser INTEGER,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (CropTypeId) REFERENCES CropType(Id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS CropLifecycleDefinition (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        CropTypeId INTEGER,
        CropVarietyId Integer,
        Season NVARCHAR(100),
        Region NVARCHAR(100),
        CreatedUser INTEGER,
        UpdatedUser INTEGER,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (CropTypeId) REFERENCES CropType(Id) ON DELETE CASCADE,
        FOREIGN KEY (CropVarietyId) REFERENCES CropVariety(Id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS CropLifeCycleStages (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        CropLifecycleDefinitionId INTEGER,
        StageName NVARCHAR(100) NOT NULL,
        StageOrder INTEGER NOT NULL,
        MinDaysFromPreviousStage INTEGER NOT NULL,
        MaxDaysFromPreviousStage INTEGER NOT NULL,
        Description TEXT,
        FOREIGN KEY (CropLifecycleDefinitionId) REFERENCES CropLifecycleDefinition(Id) ON DELETE CASCADE,
        FOREIGN KEY (StageName) REFERENCES CropStagesLov(Code) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS CropStageCaps (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        StageName NVARCHAR(20) NOT NULL,
        Cap FLOAT NOT NULL,
        CreatedUser INTEGER,
        UpdatedUser INTEGER,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME,
        FOREIGN KEY (StageName) REFERENCES CropStagesLov(Code) ON DELETE SET NULL,
        FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE SET NULL
    );




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

