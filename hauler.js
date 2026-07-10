/**********************
This utility is for hauling i.e Loading and dumping data, provided the tabls already exist
1. to use this program
    > node hauler.js --help
2. Dump data will appear in ./exports
3. Data to be loaded should be placed inside ./imports folder in json fomat.
*************************/

const fs = require('fs');
const path = require('path');
const db = require('./db');

function diagnoseForeignKeyFailure(dump) {
  // Use a scratch copy so we don't touch the real db
  const scratchPath = path.join(__dirname, 'exports', `_diagnose_${Date.now()}.sqlite`);
  fs.copyFileSync(db.name, scratchPath); // db.name is the current db file path in better-sqlite3

  const Database = require('better-sqlite3');
  const scratch = new Database(scratchPath);
  scratch.pragma('foreign_keys = OFF'); // load everything first, unchecked

  for (const [table, rows] of Object.entries(dump)) {
    if (!rows.length) continue;
    const columns = Object.keys(rows[0]);
    const stmt = scratch.prepare(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(c => '@' + c).join(', ')})`
    );
    for (const row of rows) {
      try {
        stmt.run(row);
      } catch (e) {
        console.error(`Insert failed on ${table}, row:`, row, e.message);
      }
    }
  }

  // Now that everything is loaded (even the bad rows), ask SQLite exactly which FKs are broken
  const violations = scratch.pragma('foreign_key_check');
  for (const v of violations) {
    console.error(
      `FK violation: table="${v.table}" rowid=${v.rowid} references table="${v.parent}" (via fkid=${v.fkid})`
    );

    // Show the actual offending row's data for that table
    const badRow = dump[v.table].find((r, i) => i === v.rowid - 1) || 
                    scratch.prepare(`SELECT * FROM ${v.table} WHERE rowid = ?`).get(v.rowid);
    console.error('  Offending row:', badRow);
  }
  console.log("Validation completed without errors.");
  scratch.close();
  fs.unlinkSync(scratchPath); // clean up scratch file
}

function dumpData() {

  // 1. Get all table names (excluding sqlite's internal tables)
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
    .all()
    .map(row => row.name);

  // 2. For each table, pull all rows and store under { tableName: [ {col: val, ...}, ... ] }
  const dump = {};
  for (const table of tables) {
    dump[table] = db.prepare(`SELECT * FROM ${table}`).all();
  }

  // 3. Write to /exports/data_dump_<timestamp>.json
  const exportsDir = path.join(__dirname, 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(exportsDir, `data_dump_${timestamp}.json`);

  fs.writeFileSync(filePath, JSON.stringify(dump, null, 2), 'utf-8');
  console.log(`Dump written to ${filePath}`);

  return filePath;
}

function loadData(dumpFilePath) {
  // Read and parse the dump file
  try {
    const raw = fs.readFileSync(dumpFilePath, 'utf-8');
    const dump = JSON.parse(raw);
    // console.log(dump);

    diagnoseForeignKeyFailure(dump);

    db.pragma('foreign_keys = ON');

    const loadAll = db.transaction(() => {
        // Defer FK checks until commit, so insert order across tables doesn't matter
        db.pragma('defer_foreign_keys = ON');

        for (const [table, rows] of Object.entries(dump)) {
        if (!rows.length) continue;

        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(c => '@' + c).join(', ');
        const stmt = db.prepare(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
        );

        for (const row of rows) {
            stmt.run(row);
        }
        }
    });

    loadAll(); // throws + rolls back automatically if any FK is violated at commit

    console.log(`Loaded data from ${dumpFilePath}`);
  } catch (error) {
    console.log("er",error)
  }
  
}


function validateLoadData(dumpFilePath) {
    try {
        const raw = fs.readFileSync(dumpFilePath, 'utf-8');
        const dump = JSON.parse(raw);
        diagnoseForeignKeyFailure(dump);
    } catch (error) {
        console.log("er",error)
    }
}


async function haul(inputArg,filename) {
    const filePath = filename ? path.join(__dirname, 'imports', filename): null

    switch(inputArg) {
        case("--load-data"):
        case("-l"): 
            if(!filePath) {
                console.log("file path required");
                return;
            }
            loadData(filePath);
            break;
        case("--dump-data"):
        case("-d"): 
            dumpData();
            break;
        case("--validate-only"):
        case("-v"): 
            if(!filePath) {
                console.log("file path required");
                return;
            }
            validateLoadData(filePath);
            break;
        case("--help"):
        case("-h"):
            console.log(`
                haul <argument1> <argument2>
                help:
                <no argument>      =>     invalid
                --load | -l        =>     migrate generic lookup tables only
                    <filename>       => Argument 2 is the input file name , it shoudl be in folder imports
                --dump    | -d     =>     dump to exports/filename (auto generated)
                --help    | -h     =>     help
            `);
            break;
        default:
        console.log("invalid argument");
    }
}

(() => { 
    if(process.argv.slice(2).length > 0) {
        const arg1 = process.argv.slice(2)[0] ? process.argv.slice(2)[0].toString().trim(): null ;
        const arg2 = process.argv.slice(2)[1] ? process.argv.slice(2)[1].toString().trim(): null ;
        haul(arg1,arg2);
    } else {
        console.log("Invalid argument , please use --help or -h for more info.");
    }

})();


module.exports = { haul, dumpData, loadData };

