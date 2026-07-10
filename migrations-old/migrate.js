const fs = require('fs');
const path = require('path');
const db = require('../db');

const migrationsDir = path.join(__dirname);

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

function runMigrations() {
  createMigrationsTable();

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  const executed = getExecutedMigrations();

  for (const file of files) {
    if (!executed.includes(file)) {
      console.log(`Running migration: ${file}`);

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      db.exec(sql);

      db.prepare(`INSERT INTO migrations (name) VALUES (?)`).run(file);
    }
  }

  console.log('Migrations complete.');
}

runMigrations();