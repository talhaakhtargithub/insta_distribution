"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisUrl = exports.redisConfig = void 0;
const env_1 = require("./env");
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
