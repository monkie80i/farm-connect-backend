/*
this utility is for migrations
1. Migrations files containing sql changes that need to be applied on the DB
2. They should be put inside ./migrations folder with proper naming 
  > DDMMYYY_HHMM(AM/PM)_00000(prev + 1)_any_user_friendly_name.sql 
3. To run migrations
  > node migrations.js --help
*/
const fs = require('fs');
const path = require('path');
const db = require('./db');
const migrationsDir = path.join(__dirname,'migrations');
const LOVs  = require("./generic-lookup-tables");
let genericLookupList = LOVs.map(row => row.toString().trim());

const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');
const { finished } = require('node:stream');

// Generic lookup tables start here
function getCurrentLOVsFromDatabase () {
  const query = `
        SELECT m.name AS table_name
        FROM sqlite_master m
        WHERE m.type = 'table'
        AND (
            SELECT GROUP_CONCAT(p.name)
            FROM pragma_table_info(m.name) p
        ) = 'Code,Description'
    `;

  const rows = db.prepare(query).all();
  return rows.map(row => row.table_name.toString().trim());
}

function displayDanglingLOVs(danglingLovs) {
  console.log("The following tables doe not exist in the 'generic-lookup-tables.js', but exists in the DB:")
  danglingLovs.forEach((element,index) => {
    console.log(`${index+1}. ${element}`);
  });
}

function killTables(danglingLovs) {
  for (const tableName of danglingLovs) {
    db.exec(`drop table ${tableName}`);
  }
}

function createNewLOVs(newLovs) {

  const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

  // validating
  for (const tableName of newLovs) {
    if (!IDENTIFIER.test(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }
  }

  console.log(`Creating ${newLovs.length} new look up tables...\n..\n.`);

  for (const tableName of newLovs) {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
            Code NVARCHAR(10) PRIMARY KEY,
            Description TEXT NOT NULL
        );
    `).run();
  }

  console.log("New Lookup Tables created:\n");
  newLovs.forEach((element,index) => {
    console.log(`\t${index+1}. ${element}`);
  });
  console.log(`\n`);
}

async function promptToDeleteDanglingTables(tables) {
  const rl = readline.createInterface({ input, output });
  try {
    const option = await rl.question('\nDo you want to delete these?? (y/n) ');

    if(option.toString().trim().toLowerCase() === "y") {
      killTables(tables);
      console.log("\nTables deleted successfully");
    }

  } catch (error) {
    console.log(error);
  } finally {
    rl.close();
  }
}

async function runGenericLookupTablesMigrations () {
  const currentLovTables = getCurrentLOVsFromDatabase();
  const newLookupTables = genericLookupList.filter(element => !currentLovTables.includes(element)) ;
  const danglingLovs = currentLovTables.filter(element => !genericLookupList.includes(element)) ;
  
  if(danglingLovs.length > 0) {
    displayDanglingLOVs(danglingLovs);
    await promptToDeleteDanglingTables(danglingLovs);
  }

  if(newLookupTables.length > 0) {
    createNewLOVs(newLookupTables);
  } else {
    console.log("No new Generic Look Up tables to migrate.\n");
  }

}
// Generic Lookup ends here

// Normal migrations start here
function createMigrationsTable() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `).run();
}

function getExecutedMigrations() {
  return db.prepare(`SELECT name FROM migrations`).all().map(m => m.name);
}

function getMigrationStatus() {
    const files = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

    const executed = getExecutedMigrations();
    const pending = files.filter(file => !executed.includes(file));

    return {
      files: files,
      executed: executed,
      pending: pending
    };
}

function displayMigrationStatus() {
  const {executed,pending} = getMigrationStatus();
  
  if(executed.length > 0) {
    console.log("Completed:")
    executed.forEach((file,index) => console.log(`\t${index+1}. ${file}`));
  } else {
    console.log("No Migrations Applied");
  }

  if(pending.length > 0) {
    console.log("Pending:")
    pending.forEach((file,index) => console.log(`\t${index+1}. ${file}`));
  } else {
    console.log("No pending migrations.");
  }
  
}

function runNormalMigrations() {
  createMigrationsTable();
  const {files,executed,pending} = getMigrationStatus();

  if(pending.length < 1) {
    console.log("Migrations Upto date.");
    return;
  }

  for (const file of pending) {
    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    db.exec(sql);
    db.prepare(`INSERT INTO migrations (name) VALUES (?)`).run(file);
  }

  console.log('Migrations complete for the following files');
  pending.forEach( (file,index) => {console.log(`\t${index+1}. ${file}`)});
  return;
}
// Normal migrations end here


async function migrate(inputArg) {

  switch(inputArg) {
    case("--generic"):
    case("-g"): 
      await runGenericLookupTablesMigrations();
      // console.log("generic"); 
      break;
    case("--main"):
    case("-m"): 
      runNormalMigrations();
      // console.log("main");
      break;
    case("--all"):
    case("-a"):
    case("none"):
      // console.log("all");
      await runGenericLookupTablesMigrations(); 
      runNormalMigrations();
      break;
    case("--status"):
    case("-s"):
      displayMigrationStatus();
      break;
    case("--help"):
    case("-h"):
      console.log(`
        help:
        <no argument>      =>     migrate both (default)
        --generic | -g     =>     migrate generic lookup tables only
        --main    | -m     =>     migrate main tables only
        --all     | -a     =>     migrate both
        --status  | -s     =>     show migration status/state
        --help    | -h     =>     help
      `);
      break;
    default:
      console.log("invalid argument");
  }
}

(() => { 
  const inputArg = process.argv.slice(2).length > 0 ? process.argv.slice(2).pop().toString().trim(): "none"; 
  migrate(inputArg);
})();


module.exports = {
  migrate,
};



