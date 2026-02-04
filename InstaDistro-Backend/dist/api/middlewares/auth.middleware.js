"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthMiddleware = exports.authMiddleware = void 0;
const logger_1 = require("../../config/logger");
const authMiddleware = (req, res, next) => {
    try {
        // TODO: Implement JWT token verification
        // const token = req.headers.authorization?.split(' ')[1];
        // if (!token) {
        //   res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
        //   return;
        // }
        // const decoded = jwt.verify(token, JWT_SECRET);
        // (req as AuthenticatedRequest).user = decoded;
        // For now, just pass through
        // In development, we use x-user-id header
        next();
    }
    catch (error) {
        logger_1.logger.error('Auth middleware error:', error);
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
