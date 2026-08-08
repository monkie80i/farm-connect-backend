const express = require('express');
const path = require('path');
const db = require('../db');
const LOVs = require('../generic-lookup-tables');
const router = express.Router();
const lookupTableSet = new Set(LOVs);

function quoteIdentifier(identifier) {
    // SQLite identifiers are safely quoted by doubling embedded quotes.
    return `"${String(identifier).replace(/"/g, '""')}"`;
}

function getAllTableNames() {
    return db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    `).all().map(row => row.name);
}

function getExistingTableNames() {
    return new Set(getAllTableNames());
}

function getTableColumns(tableName) {
    return db.prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`).all();
}

function getForeignKeys(tableName) {
    return db.prepare(`PRAGMA foreign_key_list(${quoteIdentifier(tableName)})`).all();
}

function getReferencedBy(tableName) {
    const result = [];

    for (const sourceTable of getAllTableNames()) {
        if (sourceTable === tableName) continue;

        const foreignKeys = getForeignKeys(sourceTable);

        for (const fk of foreignKeys) {
            if (fk.table === tableName) {
                result.push({
                    table: sourceTable,
                    from: fk.from,
                    to: fk.to,
                    onUpdate: fk.on_update,
                    onDelete: fk.on_delete,
                    match: fk.match,
                    id: fk.id,
                    seq: fk.seq
                });
            }
        }
    }

    return result;
}

function assertExistingTable(tableName) {
    if (!tableName || !getExistingTableNames().has(tableName)) {
        const error = new Error(`Table '${tableName}' does not exist.`);
        error.statusCode = 404;
        throw error;
    }
}

function getLookupData(tableName) {
    assertExistingTable(tableName);

    if (!lookupTableSet.has(tableName)) {
        const error = new Error(`'${tableName}' is not a lookup table.`);
        error.statusCode = 400;
        throw error;
    }

    const columns = getTableColumns(tableName);
    const columnNames = new Set(columns.map(column => column.name));

    if (!columnNames.has('Code') || !columnNames.has('Description')) {
        const error = new Error(`Lookup table '${tableName}' must contain Code and Description columns.`);
        error.statusCode = 500;
        throw error;
    }

    return db.prepare(`
        SELECT "Code", "Description"
        FROM ${quoteIdentifier(tableName)}
        ORDER BY "Code"
    `).all();
}

// GET /api/v1/tables
router.get('/', (req, res) => {
    try {
        const tables = getAllTableNames();

        res.json({
            mainTables: tables.filter(table => !lookupTableSet.has(table)),
            lookupTables: tables.filter(table => lookupTableSet.has(table))
        });
    } catch (error) {
        console.error('Failed to get table list:', error);
        res.status(500).json({ error: 'Failed to get database tables.' });
    }
});

// GET /api/v1/tables/schema/:tableName
router.get('/schema/:tableName', (req, res) => {
    try {
        const tableName = req.params.tableName;
        assertExistingTable(tableName);

        if (lookupTableSet.has(tableName)) {
            const error = new Error(`'${tableName}' is a lookup table.`);
            error.statusCode = 400;
            throw error;
        }

        const foreignKeys = getForeignKeys(tableName);

        res.json({
            tableName,
            columns: getTableColumns(tableName),
            foreignKeys: foreignKeys.map(fk => ({
                id: fk.id,
                seq: fk.seq,
                table: fk.table,
                from: fk.from,
                to: fk.to,
                onUpdate: fk.on_update,
                onDelete: fk.on_delete,
                match: fk.match
            })),
            referencedBy: getReferencedBy(tableName)
        });
    } catch (error) {
        console.error(`Failed to get schema for '${req.params.tableName}':`, error);
        res.status(error.statusCode || 500).json({
            error: error.statusCode ? error.message : 'Failed to get table schema.'
        });
    }
});

// GET /api/v1/tables/lookup/:tableName
router.get('/lookup/:tableName', (req, res) => {
    try {
        const tableName = req.params.tableName;

        res.json({
            tableName,
            rows: getLookupData(tableName)
        });
    } catch (error) {
        console.error(`Failed to get lookup '${req.params.tableName}':`, error);
        res.status(error.statusCode || 500).json({
            error: error.statusCode ? error.message : 'Failed to get lookup data.'
        });
    }
});

module.exports = router;
