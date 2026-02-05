"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.distributionQueue = void 0;
const bull_1 = __importDefault(require("bull"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const PostingService_1 = require("../services/instagram/PostingService");
const distributionQueue = new bull_1.default('instagram-distribution', {
    redis: { host: env_1.envConfig.REDIS_HOST || 'localhost', port: env_1.envConfig.REDIS_PORT || 6379 },
    defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 30000 }, removeOnComplete: 200, removeOnFail: 500, timeout: 600000 },
});
exports.distributionQueue = distributionQueue;
distributionQueue.process(async (job) => {
    const { distributionId, accountId, mediaPath, mediaType, caption, hashtags } = job.data;
    logger_1.logger.info('Processing distribution job ' + job.id + ' for ' + accountId);
    try {
        const result = await PostingService_1.postingService.post({ accountId, mediaPath, mediaType, caption, hashtags });
        if (!result.success)
            throw new Error(result.error || 'Post failed');
        logger_1.logger.info('Distribution post OK: ' + accountId + ' mediaId=' + result.mediaId);
        return result;
    }
    catch (error) {
        logger_1.logger.error('Distribution job failed: ' + accountId + ' — ' + error.message);
        throw error;
    }
});
distributionQueue.on('completed', (job) => logger_1.logger.info('Dist job ' + job.id + ' done'));
distributionQueue.on('failed', (job, err) => logger_1.logger.error('Dist job ' + job.id + ' failed: ' + err.message));
distributionQueue.on('stalled', (job) => logger_1.logger.warn('Dist job ' + job.id + ' stalled'));
