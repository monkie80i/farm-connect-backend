const successResponse = (res,data = null, message = "OK", code = 200) => {
    return res.status(code).json({
        success: true,
        message,
        data,
        errors: null
    });
}

const errorResponse = (res, message = "Server Error", code = 500, errors = null) => {
    return res.status(code).json({
        success: false,
        message,
        data: null,
        errors: errors
    });
    
}

const notFound  = (res, message = "Not Found!", code = 404, errors = null) => {
    return res.status(code).json({
        success: false,
        message,
        data: null,
        errors: errors
    });
}

module.exports = {
    successResponse,errorResponse,notFound
}