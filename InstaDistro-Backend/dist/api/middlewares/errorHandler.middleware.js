"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = exports.ApiError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
exports.notFoundHandler = notFoundHandler;
const logger_1 = require("../../config/logger");
const responses_1 = require("../../types/responses");
// ============================================
// LEGACY ERROR CLASSES (Backwards Compatibility)
// ============================================
class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403);
    }
}
exports.ForbiddenError = ForbiddenError;
// Re-export new error class for convenience
var responses_2 = require("../../types/responses");
Object.defineProperty(exports, "ApiError", { enumerable: true, get: function () { return responses_2.ApiError; } });
Object.defineProperty(exports, "ErrorCode", { enumerable: true, get: function () { return responses_2.ErrorCode; } });
// ============================================
// ERROR HANDLER MIDDLEWARE
// ============================================
function errorHandler(err, req, res, _next) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    // Get request ID from request
    const requestId = req.requestId || 'unknown';
    // Default error values
    let statusCode = 500;
    let errorCode = responses_1.ErrorCode.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let details = undefined;
    // Handle new ApiError instances (preferred)
    if (err instanceof responses_1.ApiError) {
        statusCode = err.statusCode;
        errorCode = err.code;
        message = err.message;
        details = err.details;
    }
    // Handle legacy AppError instances (backwards compatibility)
    else if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        // Map status codes to error codes
        if (err instanceof ValidationError) {
            errorCode = responses_1.ErrorCode.VALIDATION_ERROR;
        }
        else if (err instanceof NotFoundError) {
            errorCode = responses_1.ErrorCode.UNKNOWN_ERROR; // Generic not found
        }
        else if (err instanceof UnauthorizedError) {
            errorCode = responses_1.ErrorCode.UNAUTHORIZED;
        }
        else if (err instanceof ForbiddenError) {
            errorCode = responses_1.ErrorCode.FORBIDDEN;
        }
    }
    // Handle unknown errors
    else {
        // Check for specific error patterns
        if (err.message?.includes('not found')) {
            statusCode = 404;
            errorCode = responses_1.ErrorCode.UNKNOWN_ERROR;
        }
        else if (err.message?.includes('validation')) {
            statusCode = 400;
            errorCode = responses_1.ErrorCode.VALIDATION_ERROR;
        }
        else if (err.message?.includes('unauthorized') || err.message?.includes('authentication')) {
            statusCode = 401;
            errorCode = responses_1.ErrorCode.UNAUTHORIZED;
        }
        message = err.message || 'An unexpected error occurred';
    }
    // Log error (with sanitized request data)
    logger_1.logger.error('Request error', {
        requestId,
        error: {
            code: errorCode,
            message: err.message,
            stack: err.stack,
            statusCode,
        },
        request: {
            method: req.method,
            path: req.path,
            query: (0, logger_1.sanitizeSensitiveData)(req.query),
            body: (0, logger_1.sanitizeSensitiveData)(req.body),
            ip: req.ip,
            userAgent: req.get('user-agent'),
        },
    });
    // Create standard error response
    const errorResponse = (0, responses_1.createErrorResponse)(errorCode, message, requestId, isDevelopment ? { stack: err.stack, ...details } : details);
    // Send error response
    res.status(statusCode).json(errorResponse);
}
// ============================================
// ASYNC HANDLER WRAPPER
// ============================================
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// ============================================
// NOT FOUND HANDLER
// ============================================
function notFoundHandler(req, res, _next) {
    const requestId = req.requestId || 'unknown';
    logger_1.logger.warn('Route not found', {
        requestId,
        method: req.method,
        path: req.path,
        ip: req.ip,
    });
    const errorResponse = (0, responses_1.createErrorResponse)(responses_1.ErrorCode.UNKNOWN_ERROR, `Route ${req.method} ${req.path} not found`, requestId, {
        availableEndpoints: [
            'GET /',
            'GET /health',
            'GET /api/accounts',
            'GET /api/health/swarm',
            'GET /api/proxies',
            'GET /api/schedules',
        ],
    });
    res.status(404).json(errorResponse);
}
