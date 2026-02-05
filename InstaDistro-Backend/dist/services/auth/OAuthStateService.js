"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.oauthStateService = exports.OAuthStateService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const redis_1 = require("../../config/redis");
const logger_1 = require("../../config/logger");
/**
 * OAuth State Service
 * Manages OAuth state tokens for CSRF protection
 */
class OAuthStateService {
    STATE_PREFIX = 'oauth:state:';
    STATE_TTL = 600; // 10 minutes
    /**
     * Generate a cryptographically secure random state token
     */
    generateState() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    /**
     * Store state token in Redis with TTL
     * Associates state with metadata for validation
     */
    async storeState(state, metadata) {
        try {
            const key = `${this.STATE_PREFIX}${state}`;
            const value = JSON.stringify(metadata);
            await redis_1.redisClient.setex(key, this.STATE_TTL, value);
            logger_1.logger.debug('OAuth state stored', { state: state.substring(0, 8) + '...', provider: metadata.provider });
        }
        catch (error) {
            logger_1.logger.error('Failed to store OAuth state', { error });
            throw new Error('Failed to store OAuth state');
        }
    }
    /**
     * Validate state token and retrieve metadata
     * Returns metadata if valid, null if invalid/expired
     */
    async validateState(state) {
        try {
            const key = `${this.STATE_PREFIX}${state}`;
            const value = await redis_1.redisClient.get(key);
            if (!value) {
                logger_1.logger.warn('OAuth state validation failed: state not found or expired', {
                    state: state.substring(0, 8) + '...'
                });
                return null;
            }
            // Delete state after validation (one-time use)
            await redis_1.redisClient.del(key);
            const metadata = JSON.parse(value);
            logger_1.logger.debug('OAuth state validated successfully', {
                state: state.substring(0, 8) + '...',
                provider: metadata.provider
            });
            return metadata;
        }
        catch (error) {
            logger_1.logger.error('Failed to validate OAuth state', { error });
            return null;
        }
    }
    /**
     * Clean up expired state tokens (called periodically)
     * Redis TTL handles this automatically, but this can be used for manual cleanup
     */
    async cleanupExpiredStates() {
        try {
            const pattern = `${this.STATE_PREFIX}*`;
            const keys = await redis_1.redisClient.keys(pattern);
            let deletedCount = 0;
            for (const key of keys) {
                const ttl = await redis_1.redisClient.ttl(key);
                if (ttl === -1) {
                    // No TTL set, delete it
                    await redis_1.redisClient.del(key);
                    deletedCount++;
                }
            }
            if (deletedCount > 0) {
                logger_1.logger.info('Cleaned up expired OAuth states', { count: deletedCount });
            }
            return deletedCount;
        }
        catch (error) {
            logger_1.logger.error('Failed to cleanup OAuth states', { error });
            return 0;
        }
    }
}
exports.OAuthStateService = OAuthStateService;
exports.oauthStateService = new OAuthStateService();
