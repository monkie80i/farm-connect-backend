const fs = require('node:fs');

var DEBUG = true;
var DEBUG_CONSOLE = true;
var DEBUG_FILE = false;
var TRANSACTION_ID = null;


const log = (...args) => {
  if (DEBUG && DEBUG_CONSOLE) console.log(...args);
  if(DEBUG && DEBUG_FILE) {
    try {
      fs.writeFileSync('config.json', JSON.stringify({ status: 'ok' }));
    //   console.log('Sync write complete.');
    } catch (err) {
      console.error(err);
    }
  } 
  
};

module.exports = {
    log
};