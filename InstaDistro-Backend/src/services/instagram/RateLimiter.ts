import Redis from 'ioredis';
import { envConfig } from '../../config/env';
import { logger } from '../../config/logger';
import { AccountAction } from '../../types/errors';

// ============================================
// Rate Limit Configuration
// ============================================

interface RateLimitWindow {
  hourly: number;
  daily: number;
}

const RATE_LIMITS: Record<string, Record<string, RateLimitWindow>> = {
  personal: {
    [AccountAction.POST]:    { hourly: 1,  daily: 5   },
    [AccountAction.LIKE]:    { hourly: 15, daily: 100 },
    [AccountAction.COMMENT]: { hourly: 10, daily: 50  },
    [AccountAction.FOLLOW]:  { hourly: 20, daily: 100 },
    [AccountAction.DM]:      { hourly: 10, daily: 50  },
  },
  business: {
    [AccountAction.POST]:    { hourly: 2,  daily: 15  },
    [AccountAction.LIKE]:    { hourly: 20, daily: 150 },
    [AccountAction.COMMENT]: { hourly: 15, daily: 80  },
    [AccountAction.FOLLOW]:  { hourly: 30, daily: 150 },
    [AccountAction.DM]:      { hourly: 15, daily: 80  },
  },
};

/** Accounts created within this many days get 50% of normal limits */
const NEW_ACCOUNT_DAYS = 30;
const NEW_ACCOUNT_MULTIPLIER = 0.5;

// ============================================
// RateLimiter — Redis-backed per-account tracking
// ============================================

export class RateLimiter {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: envConfig.REDIS_HOST || 'localhost',
      port: envConfig.REDIS_PORT || 6379,
      password: envConfig.REDIS_PASSWORD,
      db: envConfig.REDIS_DB || 0,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
    });
  }

  // --- Key helpers ---

  private key(accountId: string, action: AccountAction, window: 'hourly' | 'daily'): string {
    return `ratelimit:${accountId}:${action}:${window}`;
  }

  private getEffectiveLimits(
    accountType: string,
    action: AccountAction,
    createdAt?: Date
  ): RateLimitWindow {
    const typeKey = accountType === 'business' ? 'business' : 'personal';
    const limits = RATE_LIMITS[typeKey]?.[action] || { hourly: 1, daily: 5 };

    const isNew = createdAt
      ? (Date.now() - createdAt.getTime()) / 86400000 < NEW_ACCOUNT_DAYS
      : false;

    if (isNew) {
      return {
        hourly: Math.max(1, Math.floor(limits.hourly * NEW_ACCOUNT_MULTIPLIER)),
        daily:  Math.max(1, Math.floor(limits.daily  * NEW_ACCOUNT_MULTIPLIER)),
      };
    }
    return limits;
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Check if an account is allowed to post right now
   */
  async canPost(
    accountId: string,
    accountType: string = 'personal',
    createdAt?: Date
  ): Promise<{ allowed: boolean; reason?: string; retryAfter?: number }> {
    return this.checkLimit(accountId, AccountAction.POST, accountType, createdAt);
  }

  /**
   * Generic rate-limit check for any action
   */
  async checkLimit(
    accountId: string,
    action: AccountAction,
    accountType: string = 'personal',
    createdAt?: Date
  ): Promise<{ allowed: boolean; reason?: string; retryAfter?: number }> {
    const limits = this.getEffectiveLimits(accountType, action, createdAt);

    const [hourlyRaw, dailyRaw] = await Promise.all([
      this.redis.get(this.key(accountId, action, 'hourly')),
      this.redis.get(this.key(accountId, action, 'daily')),
    ]);

    const hourly = parseInt(hourlyRaw || '0', 10);
    const daily  = parseInt(dailyRaw  || '0', 10);

    if (hourly >= limits.hourly) {
      const ttl = await this.redis.ttl(this.key(accountId, action, 'hourly'));
      return {
        allowed: false,
        reason: `Hourly ${action} limit reached (${limits.hourly}/hr)`,
        retryAfter: Math.max(0, ttl),
      };
    }

    if (daily >= limits.daily) {
      const ttl = await this.redis.ttl(this.key(accountId, action, 'daily'));
      return {
        allowed: false,
        reason: `Daily ${action} limit reached (${limits.daily}/day)`,
        retryAfter: Math.max(0, ttl),
      };
    }

    return { allowed: true };
  }

  /**
   * Record that an action was successfully performed
   */
  async recordAction(accountId: string, action: AccountAction): Promise<void> {
    const pipeline = this.redis.pipeline();

    pipeline.incr(this.key(accountId, action, 'hourly'));
    pipeline.expire(this.key(accountId, action, 'hourly'), 3600);   // 1 h

    pipeline.incr(this.key(accountId, action, 'daily'));
    pipeline.expire(this.key(accountId, action, 'daily'), 86400);  // 24 h

    await pipeline.exec();
    logger.debug(`Rate limit: recorded ${action} for ${accountId}`);
  }

  /**
   * Get remaining quota for an account + action
   */
  async getRemainingQuota(
    accountId: string,
    action: AccountAction,
    accountType: string = 'personal',
    createdAt?: Date
  ): Promise<{
    hourlyRemaining: number;
    dailyRemaining: number;
    hourlyLimit: number;
    dailyLimit: number;
  }> {
    const limits = this.getEffectiveLimits(accountType, action, createdAt);

    const [hourlyRaw, dailyRaw] = await Promise.all([
      this.redis.get(this.key(accountId, action, 'hourly')),
      this.redis.get(this.key(accountId, action, 'daily')),
    ]);

    return {
      hourlyRemaining: Math.max(0, limits.hourly - parseInt(hourlyRaw || '0', 10)),
      dailyRemaining:  Math.max(0, limits.daily  - parseInt(dailyRaw  || '0', 10)),
      hourlyLimit:     limits.hourly,
      dailyLimit:      limits.daily,
    };
  }

  /**
   * Seconds until each window resets for the given action
   */
  async getResetTime(
    accountId: string,
    action: AccountAction
  ): Promise<{ hourlyResetIn: number; dailyResetIn: number }> {
    const [h, d] = await Promise.all([
      this.redis.ttl(this.key(accountId, action, 'hourly')),
      this.redis.ttl(this.key(accountId, action, 'daily')),
    ]);
    return {
      hourlyResetIn: Math.max(0, h),
      dailyResetIn:  Math.max(0, d),
    };
  }

  /**
   * Manually clear quota for an account (all actions or a specific one)
   */
  async resetQuota(accountId: string, action?: AccountAction): Promise<void> {
    const actions = action ? [action] : Object.values(AccountAction);
    const keys: string[] = [];
    for (const act of actions) {
      keys.push(this.key(accountId, act, 'hourly'));
      keys.push(this.key(accountId, act, 'daily'));
    }
    if (keys.length > 0) await this.redis.del(...keys);
    logger.info(`Rate limit quota reset for ${accountId}${action ? ` (${action})` : ''}`);
  }

  async close(): Promise<void> {
    await this.redis.disconnect();
  }
}

export const rateLimiter = new RateLimiter();
