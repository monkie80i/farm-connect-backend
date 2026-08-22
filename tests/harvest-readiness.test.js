const { updateHarvestReadiness, recomputeAllActiveReadiness}= require("../services/harvest-readiness.services");
const db = require('../db');

function main() {
    try {
        console.log("Start")
        recomputeAllActiveReadiness(db);
        console.log("stop")

    } catch (error) {
        console.log(error)
    }
}   

main();