import { redisClient } from '../../config/redis';
import { logger } from '../../config/logger';

/**
 * Cache Service
 * Provides Redis-based caching with TTL support
 * Phase 7: Performance Optimization
 */

export class CacheService {
  /**
   * Get cached value by key
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null; // Fail gracefully, don't block the request
    }
  }

  /**
   * Set cached value with TTL (in seconds)
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache set error', { key, error });
      // Fail gracefully
    }
  }

  /**
   * Delete cached value
   */
  async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error('Cache delete error', { key, error });
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length === 0) return 0;

      await redisClient.del(...keys);
      return keys.length;
    } catch (error) {
      logger.error('Cache delete pattern error', { pattern, error });
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error });
      return false;
    }
  }

  /**
   * Get or set pattern: Get from cache, or execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
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
  async invalidateUser(userId: string): Promise<void> {
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

    logger.debug('Invalidated user cache', { userId });
  }

  /**
   * Invalidate cache by account ID
   */
  async invalidateAccount(accountId: string): Promise<void> {
    const patterns = [
      `account:${accountId}`,
      `account:health:${accountId}`,
      `account:warmup:${accountId}`,
      `posts:account:${accountId}:*`,
    ];

    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }

    logger.debug('Invalidated account cache', { accountId });
  }

  /**
   * Generate cache key with namespace
   */
  key(namespace: string, ...parts: string[]): string {
    return `${namespace}:${parts.join(':')}`;
  }
}

// Cache TTL constants (in seconds)
export const CacheTTL = {
  VERY_SHORT: 60, // 1 minute
  SHORT: 300, // 5 minutes
  MEDIUM: 900, // 15 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

// Cache key namespaces
export const CacheNamespace = {
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
} as const;

export const cacheService = new CacheService();
