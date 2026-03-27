const db = require("../db");
console.log(db.prepare(`SELECT * FROM Crop WHERE CropTypeId=1 AND FarmerId != 1;`).all());

    