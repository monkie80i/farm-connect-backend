## 1. Disable foreign key checks & start a transaction ##
```
PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;
```
## 2. Rename the current table to a backup name ##
```
ALTER TABLE orders RENAME TO orders_old;
```
## 3. Create the new table with the Foreign Key constraint ##
```
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    amount REAL,
    FOREIGN KEY(customer_id) REFERENCES customers(id)
);
```
## 4. Copy the data from the old table to the new table ##
```
INSERT INTO orders (id, customer_id, amount)
SELECT id, customer_id, amount FROM orders_old;
```
## 5. Drop the old backup table ##
```
DROP TABLE orders_old;
```
## 6. Commit transaction & re-enable foreign keys ##
```
COMMIT;
PRAGMA foreign_keys = ON;
```
