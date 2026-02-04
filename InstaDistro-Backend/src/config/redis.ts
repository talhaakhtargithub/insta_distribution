import Redis from 'ioredis';
import { envConfig } from './env';
import { logger } from './logger';

/**
 * Redis Configuration for Bull Queue
 */

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number | null;
  enableReadyCheck?: boolean;
  retryStrategy?: (times: number) => number | null;
}

export const redisConfig: RedisConfig = {
  host: envConfig.REDIS_HOST || 'localhost',
  port: envConfig.REDIS_PORT || 6379,
  password: envConfig.REDIS_PASSWORD,
  db: envConfig.REDIS_DB || 0,
  maxRetriesPerRequest: null, // Required for Bull
  enableReadyCheck: false, // Recommended for Bull
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// Redis connection URL (alternative format)
export const redisUrl = envConfig.REDIS_URL || `redis://${redisConfig.host}:${redisConfig.port}`;

/**
 * Shared Redis Client Instance
 * Use this for general Redis operations (caching, state management, etc.)
 */
export const redisClient = new Redis({
  host: envConfig.REDIS_HOST || 'localhost',
  port: envConfig.REDIS_PORT || 6379,
  password: envConfig.REDIS_PASSWORD,
  db: envConfig.REDIS_DB || 0,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  lazyConnect: false,
});

// Redis connection event handlers
redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('error', (error) => {
  logger.error('Redis client error', { error });
});

redisClient.on('close', () => {
  logger.warn('Redis client connection closed');
});

redisClient.on('reconnecting', () => {
  logger.info('Redis client reconnecting...');
});
