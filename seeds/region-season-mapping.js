const db = require("../db");

(() => {

    const seasons = db.prepare("SELECT * FROM SeasonLOV;").all().filter(p => p.Code !== "YEARROUND");
    // console.log(seasons);

    const regions = db.prepare("SELECT * FROM RegionLOV;").all().filter(p => p.Code !== "ALLOVER");

    
    // console.log(regions);
    const x = {
        'WINTER': { start : "DEC", end: "FEB"},
        'SUMMER': { start : "MAR", end: "MAY"},
        'MONSOON': { start : "JUNE", end: "SEPT"},
        'AUTUMN': { start : "OCT", end: "NOV"},
    }

    const rows = [];
    regions.forEach((region) => {
        seasons.forEach((season) => {
            const row = {
                RegionCode: region.Code,
                SeasonCode: season.Code,
                start: x[season.Code]["start"],
                end: x[season.Code]["end"]
            }
            rows.push(row);
        });
    });
    const sql = `INSERT INTO SeasonRegionCalendar (RegionCode,SeasonCode,TypicalStartMonth,TypicalEndMonth) VALUES (?,?,?,?)`;

    // db.transaction(() => {
    //     rows.forEach((row) => {
    //         db.prepare(sql).run(row.RegionCode,row.SeasonCode,row.start,row.end);
    //     });
    // })();
    

    // console.log(rows.length);
    // console.log(rows[0]);

    console.log(db.prepare('SELECT * FROM SeasonRegionCalendar').all());

})();
