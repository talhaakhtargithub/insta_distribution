"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = exports.redisUrl = exports.redisConfig = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
const logger_1 = require("./logger");
exports.redisConfig = {
    host: env_1.envConfig.REDIS_HOST || 'localhost',
    port: env_1.envConfig.REDIS_PORT || 6379,
    password: env_1.envConfig.REDIS_PASSWORD,
    db: env_1.envConfig.REDIS_DB || 0,
    maxRetriesPerRequest: null, // Required for Bull
    enableReadyCheck: false, // Recommended for Bull
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
};
// Redis connection URL (alternative format)
exports.redisUrl = env_1.envConfig.REDIS_URL || `redis://${exports.redisConfig.host}:${exports.redisConfig.port}`;
/**
 * Shared Redis Client Instance
 * Use this for general Redis operations (caching, state management, etc.)
 */
exports.redisClient = new ioredis_1.default({
    host: env_1.envConfig.REDIS_HOST || 'localhost',
    port: env_1.envConfig.REDIS_PORT || 6379,
    password: env_1.envConfig.REDIS_PASSWORD,
    db: env_1.envConfig.REDIS_DB || 0,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    lazyConnect: false,
});
// Redis connection event handlers
exports.redisClient.on('connect', () => {
    logger_1.logger.info('Redis client connected');
});
exports.redisClient.on('error', (error) => {
    logger_1.logger.error('Redis client error', { error });
});
exports.redisClient.on('close', () => {
    logger_1.logger.warn('Redis client connection closed');
});
exports.redisClient.on('reconnecting', () => {
    logger_1.logger.info('Redis client reconnecting...');
});
