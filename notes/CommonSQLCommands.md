1. Get column details (Data Types, Nullable, Keys):
- PRAGMA table_info(table_name);

2. This returns a structured table detailing column IDs, names, data types, NOT NULL constraints, default values, and primary key status.Get the original CREATE TABLE statement:
- SELECT sql FROM sqlite_schema WHERE name = 'table_name';

3. Get tables referencing this tables: replace your_table_name.

```SELECT name 
FROM sqlite_master 
WHERE type = 'table' 
  AND sql LIKE '%REFERENCES "your_table_name"%' 
  OR type = 'table' 
  AND sql LIKE '%REFERENCES your_table_name%';```

