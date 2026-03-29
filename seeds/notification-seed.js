const db = require("../db");


db.exec(`
    INSERT INTO Notification(
        Title,
        Recipient,
        NotificationType,
        Message,
        EntityType,
        EntityId,
        ActionUrl,
        Priority,
        IsViewed
    )
    VALUES 
    ('Notification 1',3,'ORDER','Lorem ipsum', 'Orders',3,'path/to/page','INFO',0),
    ('Notification 2',3,'ORDER','Lorem ipsum gen', 'Orders',3,'path/to/page2','INFO',1);

`);

const stmnt = db.prepare(`SELECT * FROM Notification;`).all();
console.log(stmnt);

// const stmnt = db.prepare(`SELECT * FROM Orders;`).all();
// console.log(stmnt);

/**
 * TABLE IF NOT EXISTS Notification (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Title NVARCHAR(200) NOT NULL,
        Recipient INTEGER,
        NotificationType NVARCHAR(20),
        Message TEXT,
        EntityType NVARCHAR(100),
        EntityId INTEGER,
        ActionUrl TEXT,
        Priority NVARCHAR(20),
        IsViewed INTEGER DEFAULT 0,
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (Recipient) REFERENCES Users(Id) ON DELETE SET NULL,
        FOREIGN KEY (Priority) REFERENCES NotificationPriorityLov(Code) ON DELETE SET NULL,
        FOREIGN KEY (NotificationType) REFERENCES NotificationTypeLov(Code) ON DELETE SET NULL
 */