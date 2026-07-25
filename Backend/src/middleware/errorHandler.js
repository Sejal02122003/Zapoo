import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || err.status;
    let message = err.message || 'Server Error';
    const requestId = req.requestId || '-';

    // Mongoose CastError (e.g. invalid ObjectId format)
    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }

    // Mongoose ValidationError
    if (err.name === 'ValidationError' && !err.statusCode) {
        statusCode = 400;
    }

    if (!statusCode || statusCode < 100 || statusCode > 599) {
        statusCode = 500;
    }

    logger.error(
        `[${requestId}] ${req.method} ${req.originalUrl} ${statusCode} - ${err.name || 'Error'} - ${message}`
    );
    if (config.nodeEnv === 'development' && err.stack) {
        logger.error(`[${requestId}] ${err.stack}`);
    }

    res.status(statusCode).json({
        success: false,
        message: message,
        error: message
    });
};

export default errorHandler;
