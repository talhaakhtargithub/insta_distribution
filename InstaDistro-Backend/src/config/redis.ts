import { envConfig } from './env';

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
