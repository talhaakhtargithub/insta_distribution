"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthMiddleware = exports.authMiddleware = void 0;
const JwtService_1 = require("../../services/auth/JwtService");
const logger_1 = require("../../config/logger");
const authMiddleware = (req, res, next) => {
    try {
        // Extract token from Authorization header (Bearer token)
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            // Fall back to x-user-id header for development/backward compatibility
            const userId = req.headers['x-user-id'];
            if (userId) {
                req.user = {
                    userId,
                    email: 'dev@example.com',
                    provider: 'email',
                };
                return next();
            }
            res.status(401).json({
                error: 'Unauthorized',
                message: 'No authentication token provided',
            });
            return;
        }
        // Check if it's a Bearer token
        if (!authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid token format. Use "Bearer <token>"',
            });
            return;
        }
        // Extract token
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        // Verify token
        const payload = JwtService_1.jwtService.verifyAccessToken(token);
        // Attach user info to request
        req.user = {
            userId: payload.userId,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            provider: payload.provider,
        };
        next();
    }
    catch (error) {
        logger_1.logger.error('Auth middleware error:', error.message);
        if (error.message === 'Token expired') {
            res.status(401).json({
                error: 'Token Expired',
                message: 'Access token has expired. Please refresh your token.',
            });
            return;
        }
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired token',
        });
    }
};
exports.authMiddleware = authMiddleware;
/**
 * Optional authentication middleware
 * Attaches user if token exists, but doesn't require it
 */
const optionalAuthMiddleware = (req, res, next) => {
    try {
        // TODO: Same as above, but don't reject if token missing
        next();
    }
    catch (error) {
        // Just continue without user
        next();
    }
};
exports.optionalAuthMiddleware = optionalAuthMiddleware;
