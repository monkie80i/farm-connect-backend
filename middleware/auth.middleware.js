const jwt = require("jsonwebtoken");

const authorization = (req,res,next) => {
    const header = req.headers["authorization"];

    // console.log(req.headers)
    if(!header) {
        return res.status(404).json({ message: "no authorization header", data: null });
    }

    const token = header.split(' ')[1];

    try {
        const decoded = jwt.verify(token,'SUPER_SECRET_KEY');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(404).json({ message: "invalid token", data: null });
    }


}

module.exports = {
    authorization
}
