// "healthStatus": null,
//         "currentStage": null,

const db = require("../db");

db.exec(`
    UPDATE Crop SET
    HealthStatus = 'MINOR',CurrentStage = 'HARW'
    WHERE Id = 11;
`);




