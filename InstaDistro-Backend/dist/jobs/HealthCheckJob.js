"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheckQueue = void 0;
exports.scheduleHealthCheck = scheduleHealthCheck;
exports.checkAccountNow = checkAccountNow;
exports.checkAllAccountsNow = checkAllAccountsNow;
exports.cancelHealthCheck = cancelHealthCheck;
exports.getHealthCheckStats = getHealthCheckStats;
const bull_1 = __importDefault(require("bull"));
const AuthService_1 = require("../services/instagram/AuthService");
const AccountService_1 = require("../services/swarm/AccountService");
const logger_1 = require("../config/logger");
const env_1 = require("../config/env");
// Create Bull queue
const healthCheckQueue = new bull_1.default('health-check', {
    redis: {
        host: env_1.envConfig.REDIS_HOST || 'localhost',
        port: env_1.envConfig.REDIS_PORT || 6379,
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs
    },
});
exports.healthCheckQueue = healthCheckQueue;
/**
 * Process health check jobs
 */
healthCheckQueue.process(async (job) => {
    const { userId, accountId } = job.data;
    logger_1.logger.info(`Processing health check job for user ${userId}${accountId ? ` (account: ${accountId})` : ''}`);
    try {
        if (accountId) {
            // Check specific account
            const result = await AuthService_1.authService.authenticate(accountId);
            if (!result.success) {
                logger_1.logger.warn(`Health check failed for account ${accountId}: ${result.error}`);
                // Update account status
                await AccountService_1.accountService.updateAccount(accountId, {
                    account_status: 'error',
                    is_authenticated: false,
                });
                return {
                    success: false,
                    accountId,
                    error: result.error,
                };
            }
            logger_1.logger.info(`Health check passed for account ${accountId}`);
            return {
                success: true,
                accountId,
                authenticated: result.authenticated,
            };
        }
        else {
            // Check all accounts for user
            const result = await AuthService_1.authService.checkAccountsHealth(userId);
            logger_1.logger.info(`Health check completed for user ${userId}: ${result.checked} checked, ${result.refreshed} refreshed, ${result.failed} failed`);
            return {
                success: true,
                ...result,
            };
        }
    }
    catch (error) {
        logger_1.logger.error(`Health check job failed:`, error);
        throw error; // Let Bull retry
    }
});
/**
 * Schedule health check for a user
 * Runs every 6 hours
 */
async function scheduleHealthCheck(userId) {
    try {
        // Remove existing repeat jobs for this user
        const repeatableJobs = await healthCheckQueue.getRepeatableJobs();
        const existingJob = repeatableJobs.find((job) => job.name === `health-check-${userId}`);
        if (existingJob) {
            await healthCheckQueue.removeRepeatableByKey(existingJob.key);
            logger_1.logger.info(`Removed existing health check schedule for user ${userId}`);
        }
        // Schedule new job (every 6 hours)
        await healthCheckQueue.add(`health-check-${userId}`, { userId }, {
            repeat: {
                every: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
            },
        });
        logger_1.logger.info(`Scheduled health check for user ${userId} (every 6 hours)`);
    }
    catch (error) {
        logger_1.logger.error(`Failed to schedule health check for user ${userId}:`, error);
        throw error;
    }
}
/**
 * Run immediate health check for a specific account
 */
async function checkAccountNow(userId, accountId) {
    try {
        await healthCheckQueue.add(`health-check-${accountId}`, { userId, accountId }, {
            priority: 1, // High priority
        });
        logger_1.logger.info(`Queued immediate health check for account ${accountId}`);
    }
    catch (error) {
        logger_1.logger.error(`Failed to queue health check for account ${accountId}:`, error);
        throw error;
    }
}
/**
 * Run immediate health check for all user accounts
 */
async function checkAllAccountsNow(userId) {
    try {
        await healthCheckQueue.add(`health-check-all-${userId}`, { userId }, {
            priority: 2, // Medium priority
        });
        logger_1.logger.info(`Queued immediate health check for all accounts of user ${userId}`);
    }
    catch (error) {
        logger_1.logger.error(`Failed to queue health check for user ${userId}:`, error);
        throw error;
    }
}
/**
 * Cancel health check schedule for a user
 */
async function cancelHealthCheck(userId) {
    try {
        const repeatableJobs = await healthCheckQueue.getRepeatableJobs();
        const existingJob = repeatableJobs.find((job) => job.name === `health-check-${userId}`);
        if (existingJob) {
            await healthCheckQueue.removeRepeatableByKey(existingJob.key);
            logger_1.logger.info(`Cancelled health check schedule for user ${userId}`);
        }
    }
    catch (error) {
        logger_1.logger.error(`Failed to cancel health check for user ${userId}:`, error);
        throw error;
    }
}
/**
 * Get health check queue stats
 */
async function getHealthCheckStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        healthCheckQueue.getWaitingCount(),
        healthCheckQueue.getActiveCount(),
        healthCheckQueue.getCompletedCount(),
        healthCheckQueue.getFailedCount(),
        healthCheckQueue.getDelayedCount(),
    ]);
    return {
        waiting,
        active,
        completed,
        failed,
        delayed,
    };
}
// Event listeners for monitoring
healthCheckQueue.on('completed', (job, result) => {
    logger_1.logger.info(`Health check job ${job.id} completed:`, result);
});
healthCheckQueue.on('failed', (job, error) => {
    logger_1.logger.error(`Health check job ${job.id} failed:`, error.message);
});
healthCheckQueue.on('stalled', (job) => {
    logger_1.logger.warn(`Health check job ${job.id} stalled`);
});
