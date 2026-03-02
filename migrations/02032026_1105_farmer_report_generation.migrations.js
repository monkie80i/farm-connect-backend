const db = require("../db");

db.exec(`

    CREATE TABLE IF NOT EXISTS ReportGenerationStatusLov (
        Code NVARCHAR(10) PRIMARY KEY,
        Description TEXT NOT NULL
    );

    INSERT INTO ReportGenerationStatusLov (Code,Description) VALUES 
    ('NEW','New'),
    ('PROCESSING','Processing'),
    ('COMPLETE','Complete');

    Create TABLE IF NOT EXISTS ReprotType (
        Code NVARCHAR(10) PRIMARY KEY,
        Description TEXT,
        UserRole NVARCHAR(10),
        FOREIGN KEY (UserRole) REFERENCES UserRolesLov(Code) ON DELETE SET NULL
    );

    INSERT INTO ReprotType (Code,Description, UserRole) VALUES
    ('CWY','Crop Wise Yeild','FARMER'),
    ('OAS','Order and Sales','FARMER'),
    ('GSP','Group Selling Participants','FARMER');

    CREATE TABLE IF NOT EXISTS ReportGenerationTracker (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        ReportOwnerRole NVARCHAR(10) NOT NULL,
        UserId INTEGER,
        ReportType NVARCHAR(10),
        StartDate DATE,
        EndDate DATE,
        FileName TEXT,
        FileExtension NVARCHAR(10),
        FilePath TEXT,
        Status NVARCHAR(10),
        CreatedDate DATE DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATE,
        FOREIGN KEY (ReportOwnerRole) REFERENCES UserRolesLov(Code) ON DELETE SET NULL,
        FOREIGN KEY (UserId) REFERENCES User(Id) ON DELETE SET NULL,
        FOREIGN KEY (Status) REFERENCES ReportGenerationStatusLov(Code) ON DELETE SET NULL
    );
`);