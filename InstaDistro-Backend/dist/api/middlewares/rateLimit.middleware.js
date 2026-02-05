"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadLimiter = exports.bulkImportLimiter = exports.createAccountLimiter = exports.authLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const responses_1 = require("../../types/responses");
/**
 * Rate limiting middleware to prevent abuse
 * Phase 6: Enhanced with tiered limits and standard error responses
 */
// Create standard rate limit handler
const createRateLimitHandler = (message) => {
    return (req, res) => {
        const rateLimit = req.rateLimit;
        const resetTime = rateLimit?.resetTime ? new Date(rateLimit.resetTime) : undefined;
        const errorResponse = (0, responses_1.createErrorResponse)(responses_1.ErrorCode.RATE_LIMIT_EXCEEDED, message, req.requestId || 'unknown', {
            limit: rateLimit?.limit,
            remaining: 0,
            resetTime: resetTime?.toISOString(),
            retryAfter: rateLimit?.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : undefined,
        });
        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', rateLimit?.limit || 0);
        res.setHeader('X-RateLimit-Remaining', 0);
        if (resetTime) {
            res.setHeader('X-RateLimit-Reset', Math.floor(resetTime.getTime() / 1000));
        }
        res.status(429).json(errorResponse);
    };
};
// Tiered rate limiter: Different limits for authenticated vs anonymous users
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: (req) => {
        // Check if user is authenticated (has valid JWT token)
        const isAuthenticated = req.user !== undefined;
        // Authenticated users get higher limits
        return isAuthenticated ? 300 : 100;
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: true, // Also include X-RateLimit-* headers for backwards compatibility
    handler: createRateLimitHandler('You have exceeded the API rate limit. Please try again later.'),
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health';
    },
});
// Strict rate limiter for authentication endpoints
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 auth attempts per 15 minutes
    skipSuccessfulRequests: true, // Don't count successful requests
    standardHeaders: true,
    legacyHeaders: true,
    handler: createRateLimitHandler('Too many authentication attempts. Please try again later.'),
});
// Account creation rate limiter
exports.createAccountLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 account creations per hour
    standardHeaders: true,
    legacyHeaders: true,
    handler: createRateLimitHandler('Too many accounts created from this IP. Please try again later.'),
});
// Bulk import rate limiter
exports.bulkImportLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 bulk imports per hour
    standardHeaders: true,
    legacyHeaders: true,
    handler: createRateLimitHandler('Too many bulk import requests. Please try again later.'),
});
// Upload rate limiter (for media uploads)
exports.uploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: (req) => {
        const isAuthenticated = req.user !== undefined;
        return isAuthenticated ? 100 : 20; // Authenticated users can upload more
    },
    standardHeaders: true,
    legacyHeaders: true,
    handler: createRateLimitHandler('Too many upload requests. Please try again later.'),
});
