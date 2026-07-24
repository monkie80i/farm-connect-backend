const jwt = require("jsonwebtoken");
const { errorResponse } = require("../responses/api.responses");

const authorization = (req,res,next) => {
    const header = req.headers["authorization"];

    // console.log(req.headers)
    if(!header) {
        return errorResponse(res,"no authorization header",401);

    }

    const token = header.split(' ')[1];

    try {
        const decoded = jwt.verify(token,'SUPER_SECRET_KEY');
        req.user = decoded;
        next();
    } catch (error) {
        return errorResponse(res,"invalid token",401);
    }


}

module.exports = {
    authorization
}
