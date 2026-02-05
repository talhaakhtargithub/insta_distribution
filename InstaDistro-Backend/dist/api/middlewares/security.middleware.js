"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateInput = exports.validateFileType = exports.validateRequestSize = exports.validateApiKey = exports.sanitizeInput = exports.corsOptions = exports.securityHeaders = void 0;
const helmet_1 = __importDefault(require("helmet"));
/**
 * Security middleware configuration
 * Phase 6: Enhanced security hardening
 */
// Helmet configuration for comprehensive security headers
exports.securityHeaders = (0, helmet_1.default)({
    // Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            fontSrc: ["'self'", 'https:', 'data:'],
            formAction: ["'self'"],
            frameAncestors: ["'none'"], // Equivalent to X-Frame-Options: DENY
            imgSrc: ["'self'", 'data:', 'https:'],
            objectSrc: ["'none'"],
            scriptSrc: ["'self'"],
            scriptSrcAttr: ["'none'"],
            styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
            upgradeInsecureRequests: [],
        },
    },
    // HTTP Strict Transport Security (HSTS)
    hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true,
    },
    // Prevent MIME type sniffing
    noSniff: true,
    // Prevent clickjacking
    frameguard: {
        action: 'deny',
    },
    // Hide X-Powered-By header
    hidePoweredBy: true,
    // XSS Protection (legacy but still useful for older browsers)
    xssFilter: true,
    // Referrer Policy
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
    },
    // Permissions Policy (formerly Feature Policy)
    permittedCrossDomainPolicies: {
        permittedPolicies: 'none',
    },
    // DNS Prefetch Control
    dnsPrefetchControl: {
        allow: false,
    },
    // Download Options (IE8+)
    ieNoOpen: true,
    // Cross-Origin-Embedder-Policy
    crossOriginEmbedderPolicy: false, // Set to true if you don't need to load cross-origin resources
    // Cross-Origin-Opener-Policy
    crossOriginOpenerPolicy: {
        policy: 'same-origin',
    },
    // Cross-Origin-Resource-Policy
    crossOriginResourcePolicy: {
        policy: 'same-origin',
    },
    // Origin-Agent-Cluster
    originAgentCluster: true,
});
/**
 * CORS configuration
 */
exports.corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin)
            return callback(null, true);
        // Allowed origins
        const allowedOrigins = [
            'http://localhost:8081', // React Native web
            'http://localhost:19006', // Expo web
            'exp://localhost:8081', // Expo mobile
            'http://192.168.1.1:8081', // Local network (update with actual IP)
            process.env.FRONTEND_URL, // Production frontend URL
        ].filter(Boolean);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
};
/**
 * Request sanitization middleware
 * Prevents XSS and NoSQL injection
 */
const sanitizeInput = (req, res, next) => {
    // Sanitize request body
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }
    // Sanitize query parameters
    if (req.query) {
        req.query = sanitizeObject(req.query);
    }
    next();
};
exports.sanitizeInput = sanitizeInput;
/**
 * Recursively sanitize object
 */
function sanitizeObject(obj) {
    if (typeof obj === 'string') {
        // Remove potential XSS patterns
        return obj
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    }
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    if (obj !== null && typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                // Prevent prototype pollution
                if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                    continue;
                }
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }
    return obj;
}
/**
 * API key validation middleware (for future use)
 */
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'API key is required',
        });
    }
    // TODO: Validate API key against database
    // For now, just accept any key in development
    if (process.env.NODE_ENV === 'production' && apiKey !== process.env.API_KEY) {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid API key',
        });
    }
    next();
};
exports.validateApiKey = validateApiKey;
/**
 * Request size validation middleware
 * Prevents large payloads from overwhelming the server
 */
const validateRequestSize = (maxSizeBytes = 10 * 1024 * 1024) => {
    return (req, res, next) => {
        const contentLength = req.headers['content-length'];
        if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
            return res.status(413).json({
                success: false,
                error: {
                    code: 'PAYLOAD_TOO_LARGE',
                    message: `Request payload exceeds maximum size of ${maxSizeBytes / 1024 / 1024}MB`,
                    requestId: req.requestId,
                    timestamp: new Date().toISOString(),
                },
            });
        }
        next();
    };
};
exports.validateRequestSize = validateRequestSize;
/**
 * File type validation middleware
 * Validates uploaded file types against whitelist
 */
const validateFileType = (allowedMimeTypes) => {
    return (req, res, next) => {
        const reqWithFile = req;
        if (!reqWithFile.file && !reqWithFile.files) {
            return next();
        }
        const files = reqWithFile.file ? [reqWithFile.file] : reqWithFile.files;
        for (const file of files) {
            if (!allowedMimeTypes.includes(file.mimetype)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_FILE_TYPE',
                        message: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
                        requestId: reqWithFile.requestId,
                        timestamp: new Date().toISOString(),
                    },
                });
            }
        }
        next();
    };
};
exports.validateFileType = validateFileType;
/**
 * Enhanced input validation middleware
 * Validates common input patterns and lengths
 */
const validateInput = (req, res, next) => {
    const errors = [];
    // Validate string lengths
    const validateStringLength = (obj, path = '') => {
        if (typeof obj === 'string') {
            if (obj.length > 10000) {
                errors.push(`${path || 'Field'} exceeds maximum length of 10000 characters`);
            }
        }
        else if (Array.isArray(obj)) {
            if (obj.length > 1000) {
                errors.push(`${path || 'Array'} exceeds maximum length of 1000 items`);
            }
            obj.forEach((item, index) => validateStringLength(item, `${path}[${index}]`));
        }
        else if (obj !== null && typeof obj === 'object') {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    validateStringLength(obj[key], path ? `${path}.${key}` : key);
                }
            }
        }
    };
    if (req.body) {
        validateStringLength(req.body);
    }
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Input validation failed',
                details: { errors },
                requestId: req.requestId,
                timestamp: new Date().toISOString(),
            },
        });
    }
    next();
};
exports.validateInput = validateInput;
