DROP TABLE OrderDisputeChat;
DROP TABLE OrderDispute;

CREATE INDEX IX_File_Entity ON File (EntityType, EntityId);

CREATE TABLE OrderDispute (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    OrderLineItemId INTEGER NOT NULL,
    DisputeType NVARCHAR(10) NOT NULL,
    DisputeTypeDesc TEXT,
    Status NVARCHAR(10) NOT NULL DEFAULT 'OPEN',
    Description TEXT NOT NULL,
    AssignedAdminId INTEGER,
    AdminVerdict TEXT,
    AdminInternalNotes TEXT,
    CreatedUser INTEGER NOT NULL,
    UpdatedUser INTEGER,
    CreatedDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME,
    FOREIGN KEY (OrderLineItemId) REFERENCES OrderLineItems(Id) ON DELETE RESTRICT,
    FOREIGN KEY (DisputeType) REFERENCES DisputeTypesLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (Status) REFERENCES DisputeStatusLov(Code) ON DELETE RESTRICT,
    FOREIGN KEY (AssignedAdminId) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (CreatedUser) REFERENCES Users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (UpdatedUser) REFERENCES Users(Id) ON DELETE RESTRICT
);

CREATE INDEX IX_OrderDispute_LineItem ON OrderDispute (OrderLineItemId);

CREATE UNIQUE INDEX UX_OrderDispute_ActivePerLineItem
    ON OrderDispute (OrderLineItemId)
    WHERE Status IN ('OPEN','CLMD');

CREATE TABLE OrderDisputeChat (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    DisputeId INTEGER NOT NULL,
    SentBy INTEGER NOT NULL,
    Message TEXT NOT NULL,
    IsInternal INTEGER NOT NULL DEFAULT 0 CHECK (IsInternal IN (0,1)),
    SentDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (DisputeId) REFERENCES OrderDispute(Id) ON DELETE CASCADE,
    FOREIGN KEY (SentBy) REFERENCES Users(Id) ON DELETE RESTRICT
);

CREATE INDEX IX_OrderDisputeChat_Dispute ON OrderDisputeChat (DisputeId, SentDate);