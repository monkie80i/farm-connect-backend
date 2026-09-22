const express = require('express');
const db = require('../db');

const router = express.Router();

function isReadOnlySql(sql) {
    const normalized = sql.trim().replace(/;\s*$/, '');
    if (!normalized) return false;
    if (normalized.includes(';')) return false;

    const keyword = normalized
        .replace(/^\s*(?:\/\/.*\n|--.*\n|\/\*[\s\S]*?\*\/\s*)*/, '')
        .trim()
        .split(/\s+/)[0]
        .toUpperCase();

    return ['SELECT', 'WITH', 'PRAGMA', 'EXPLAIN'].includes(keyword);
}

router.post('/', (req, res) => {
    const sql = typeof req.body?.sql === 'string' ? req.body.sql.trim() : '';

    if (!sql) {
        return res.status(400).json({ error: 'SQL query is required.' });
    }

    if (!isReadOnlySql(sql)) {
        return res.status(400).json({
            error: 'Only read-only SELECT, WITH, PRAGMA, and EXPLAIN queries are allowed.'
        });
    }

    try {
        const statement = db.prepare(sql);
        const rows = statement.reader ? statement.all() : [];
        const columns = rows.length ? Object.keys(rows[0]) : statement.columns().map(c => c.name);

        res.json({
            columns,
            rows,
            rowCount: rows.length
        });
    } catch (error) {
        console.error('Query execution failed:', error);
        res.status(400).json({ error: error.message || 'Failed to execute query.' });
    }
});

module.exports = router;
