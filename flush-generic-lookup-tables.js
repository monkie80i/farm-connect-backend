const fs = require('node:fs');
const LOVs = require('./generic-lookup-tables');
const db = require('./db');

const getAllRows = (tableName) => {
    const stmnt = `SELECT * FROM ${tableName}`;
    const result = db.prepare(stmnt).all();
    return result;
}

(() => {
    try {
        let content = `GENERIC TABLE / LOVS \n`;
        const reasonsLov = [
            'NegotationStatusReasonLov',
            'OrderDeliveryStatusReasonsLov',
            'OrderLineItemStatusReasonsLov',
            'OrderPaymentStatusReasonLov',
            'OrderStatusReasonLov',
        ];

        const allTables = [...LOVs,...reasonsLov];

        allTables.map(t => ({name:t,rows:getAllRows(t)}))
        .forEach((obj) => {
            const tableData = obj.rows.map(r => JSON.stringify(r)).join(" \n");
            content = content + `\n\n ${obj.name} \n ${tableData}`;
        });

        console.log(content)
        // fs.writeFileSync('generic.sql', 'Synchronous content', 'utf8');
        console.log('File written successfully!');
    } catch (err) {
        console.error(err);
    }
})();

