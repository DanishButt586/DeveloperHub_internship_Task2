const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
};

const errorHandler = (error, _req, res, _next) => {
    const statusCode = error.statusCode || 500;

    const payload = {
        success: false,
        message: error.message || "Internal server error.",
    };

    if (error.code) {
        payload.code = error.code;
    }

    if (error.details) {
        payload.details = error.details;
    }

    res.status(statusCode).json(payload);
};

module.exports = {
    notFoundHandler,
    errorHandler,
};
