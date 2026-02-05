"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeSensitiveData = exports.logError = exports.requestLogger = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const env_1 = require("./env");
/**
 * Winston Logger Configuration
 */
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json());
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
        msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
}));
// Create logger instance
exports.logger = winston_1.default.createLogger({
    level: env_1.envConfig.isDevelopment() ? 'debug' : 'info',
    format: logFormat,
    defaultMeta: { service: 'insta-swarm-api' },
    transports: [
        // Write all logs to console
        new winston_1.default.transports.Console({
            format: consoleFormat,
        }),
        // Write all logs with level 'error' to error.log
        new winston_1.default.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Write all logs to combined.log
        new winston_1.default.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
    exceptionHandlers: [
        new winston_1.default.transports.File({ filename: 'logs/exceptions.log' }),
    ],
    rejectionHandlers: [
        new winston_1.default.transports.File({ filename: 'logs/rejections.log' }),
    ],
});
// Create logs directory if it doesn't exist
const fs_1 = __importDefault(require("fs"));
if (!fs_1.default.existsSync('logs')) {
    fs_1.default.mkdirSync('logs');
}
/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    // Log request
    exports.logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
    // Log response
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
        exports.logger.log(logLevel, 'Request completed', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
        });
    });
    next();
};
exports.requestLogger = requestLogger;
/**
 * Error logging helper
 */
const logError = (error, context) => {
    exports.logger.error('Error occurred', {
        message: error.message,
        stack: error.stack,
        ...context,
    });
};
exports.logError = logError;
/**
 * Sanitize sensitive data from objects before logging
 * Redacts passwords, tokens, secrets, keys, and other sensitive fields
 */
const sanitizeSensitiveData = (obj) => {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    // Sensitive field names to redact (case-insensitive)
    const sensitiveFields = [
        'password',
        'passwd',
        'pwd',
        'token',
        'accesstoken',
        'refreshtoken',
        'access_token',
        'refresh_token',
        'secret',
        'apikey',
        'api_key',
        'key',
        'authorization',
        'auth',
        'credential',
        'credentials',
        'cookie',
        'session',
        'csrf',
        'xsrf',
        'private',
        'privatekey',
        'private_key',
        'encryptionkey',
        'encryption_key',
    ];
    const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };
    for (const key in sanitized) {
        const lowerKey = key.toLowerCase();
        // Check if field name matches sensitive patterns
        const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));
        if (isSensitive) {
            // Redact the value
            sanitized[key] = '[REDACTED]';
        }
        else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            // Recursively sanitize nested objects
            sanitized[key] = (0, exports.sanitizeSensitiveData)(sanitized[key]);
        }
    }
    return sanitized;
};
exports.sanitizeSensitiveData = sanitizeSensitiveData;
exports.default = exports.logger;
