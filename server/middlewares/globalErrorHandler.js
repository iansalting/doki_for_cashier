import config from "../config/config.js";

const globalErrorHandler = (err, req, res, next) => {
    const statusCode = err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";

    return res.status(statusCode).json({
        status: statusCode,
        message: message,
        errorStack: config.nodeEnv === "development" ? err.stack : ""
    });
};



export default globalErrorHandler;
