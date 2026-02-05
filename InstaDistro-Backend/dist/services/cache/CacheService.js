"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheNamespace = exports.CacheTTL = exports.CacheService = void 0;
const redis_1 = require("../../config/redis");
const logger_1 = require("../../config/logger");
/**
 * Cache Service
 * Provides Redis-based caching with TTL support
 * Phase 7: Performance Optimization
 */
class CacheService {
    /**
     * Get cached value by key
     */
    async get(key) {
        try {
            const value = await redis_1.redisClient.get(key);
            if (!value)
                return null;
            return JSON.parse(value);
        }
        catch (error) {
            logger_1.logger.error('Cache get error', { key, error });
            return null; // Fail gracefully, don't block the request
        }
    }
    /**
     * Set cached value with TTL (in seconds)
     */
    async set(key, value, ttlSeconds = 300) {
        try {
            await redis_1.redisClient.setex(key, ttlSeconds, JSON.stringify(value));
        }
        catch (error) {
            logger_1.logger.error('Cache set error', { key, error });
            // Fail gracefully
        }
    }
    /**
     * Delete cached value
     */
    async del(key) {
        try {
            await redis_1.redisClient.del(key);
        }
        catch (error) {
            logger_1.logger.error('Cache delete error', { key, error });
        }
    }
    /**
     * Delete multiple keys matching a pattern
     */
    async delPattern(pattern) {
        try {
            const keys = await redis_1.redisClient.keys(pattern);
            if (keys.length === 0)
                return 0;
            await redis_1.redisClient.del(...keys);
            return keys.length;
        }
        catch (error) {
            logger_1.logger.error('Cache delete pattern error', { pattern, error });
            return 0;
        }
    }
    /**
     * Check if key exists
     */
    async exists(key) {
        try {
            const result = await redis_1.redisClient.exists(key);
            return result === 1;
        }
        catch (error) {
            logger_1.logger.error('Cache exists error', { key, error });
            return false;
        }
    }
    /**
     * Get or set pattern: Get from cache, or execute function and cache result
     */
    async getOrSet(key, fetchFn, ttlSeconds = 300) {
        // Try to get from cache
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }
        // Cache miss, fetch fresh data
        const fresh = await fetchFn();
        // Cache for next time
        await this.set(key, fresh, ttlSeconds);
        return fresh;
    }
    /**
     * Invalidate cache by user ID (clears all user-related caches)
     */
    async invalidateUser(userId) {
        const patterns = [
            `accounts:user:${userId}`,
            `accounts:list:${userId}:*`,
            `health:swarm:${userId}`,
            `schedules:user:${userId}:*`,
            `groups:user:${userId}:*`,
            `proxies:user:${userId}:*`,
        ];
        for (const pattern of patterns) {
            await this.delPattern(pattern);
        }
        logger_1.logger.debug('Invalidated user cache', { userId });
    }
    /**
     * Invalidate cache by account ID
     */
    async invalidateAccount(accountId) {
        const patterns = [
            `account:${accountId}`,
            `account:health:${accountId}`,
            `account:warmup:${accountId}`,
            `posts:account:${accountId}:*`,
        ];
        for (const pattern of patterns) {
            await this.delPattern(pattern);
        }
        logger_1.logger.debug('Invalidated account cache', { accountId });
    }
    /**
     * Generate cache key with namespace
     */
    key(namespace, ...parts) {
        return `${namespace}:${parts.join(':')}`;
    }
}
exports.CacheService = CacheService;
// Cache TTL constants (in seconds)
exports.CacheTTL = {
    VERY_SHORT: 60, // 1 minute
    SHORT: 300, // 5 minutes
    MEDIUM: 900, // 15 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400, // 24 hours
};
// Cache key namespaces
exports.CacheNamespace = {
    ACCOUNT: 'account',
    ACCOUNTS_LIST: 'accounts:list',
    HEALTH: 'health',
    HEALTH_SWARM: 'health:swarm',
    SCHEDULE: 'schedule',
    SCHEDULES_LIST: 'schedules:list',
    PROXY: 'proxy',
    PROXIES_LIST: 'proxies:list',
    GROUP: 'group',
    GROUPS_LIST: 'groups:list',
    WARMUP: 'warmup',
    STATS: 'stats',
};
exports.cacheService = new CacheService();
