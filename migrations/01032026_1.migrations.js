const db = require("../db");

db.exec(`
    ALTER TABLE GroupRequests ADD Decission NVARCHAR(10);
    ALTER TABLE GroupRequests DROP IsAccepted; 
`);