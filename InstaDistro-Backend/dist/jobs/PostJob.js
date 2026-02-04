"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postQueue = void 0;
exports.queuePost = queuePost;
exports.queueBatchPosts = queueBatchPosts;
exports.getPostJobStatus = getPostJobStatus;
exports.cancelPost = cancelPost;
exports.retryPost = retryPost;
exports.getPostQueueStats = getPostQueueStats;
exports.pausePostQueue = pausePostQueue;
exports.resumePostQueue = resumePostQueue;
exports.getPendingPosts = getPendingPosts;
exports.cleanCompletedJobs = cleanCompletedJobs;
const bull_1 = __importDefault(require("bull"));
const PostingService_1 = require("../services/instagram/PostingService");
const AccountService_1 = require("../services/swarm/AccountService");
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const env_1 = require("../config/env");
// ============================================
// Queue Setup
// ============================================
const postQueue = new bull_1.default('instagram-posts', {
    redis: {
        host: env_1.envConfig.REDIS_HOST || 'localhost',
        port: env_1.envConfig.REDIS_PORT || 6379,
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 30000, // 30 seconds initial delay
        },
        removeOnComplete: 100,
        removeOnFail: 500,
        timeout: 5 * 60 * 1000, // 5 minute timeout
    },
});
exports.postQueue = postQueue;
// ============================================
// Job Processor
// ============================================
postQueue.process(async (job) => {
    const { userId, accountId, mediaPath, mediaType, caption, hashtags, coverImagePath, distributionId } = job.data;
    logger_1.logger.info(`Processing post job ${job.id} for account ${accountId}`, {
        mediaType,
        distributionId,
        attempt: job.attemptsMade + 1,
    });
    try {
        // Check if scheduled for future
        if (job.data.scheduledFor) {
            const scheduledTime = new Date(job.data.scheduledFor);
            const now = new Date();
            if (scheduledTime > now) {
                const delayMs = scheduledTime.getTime() - now.getTime();
                logger_1.logger.info(`Post job ${job.id} delayed for ${delayMs}ms`);
                await job.moveToDelayed(Date.now() + delayMs);
                return { delayed: true, scheduledFor: job.data.scheduledFor };
            }
        }
        // Verify account is still valid
        const account = await AccountService_1.accountService.getAccountById(accountId);
        if (!account) {
            throw new Error(`Account ${accountId} not found`);
        }
        if (account.account_status === 'suspended' || account.account_status === 'error') {
            throw new Error(`Account ${accountId} is ${account.account_status}`);
        }
        // Execute the post
        const postOptions = {
            accountId,
            mediaPath,
            mediaType,
            caption,
            hashtags,
            coverImagePath,
        };
        const result = await PostingService_1.postingService.post(postOptions);
        // Record result in database
        const postResult = {
            success: result.success,
            postId: job.id?.toString(),
            mediaId: result.mediaId,
            error: result.error,
            executedAt: new Date().toISOString(),
            accountId,
        };
        await recordPostResult(userId, accountId, postResult, job.data);
        // Update account last post time
        if (result.success) {
            await AccountService_1.accountService.updateAccount(accountId, {
                last_engagement_at: new Date().toISOString(),
            });
        }
        logger_1.logger.info(`Post job ${job.id} completed`, {
            success: result.success,
            mediaId: result.mediaId,
            accountId,
        });
        return postResult;
    }
    catch (error) {
        logger_1.logger.error(`Post job ${job.id} failed`, {
            error: error.message,
            accountId,
            attempt: job.attemptsMade + 1,
        });
        // Record failure
        const failResult = {
            success: false,
            postId: job.id?.toString(),
            error: error.message,
            errorCode: error.code || 'UNKNOWN_ERROR',
            retryable: isRetryableError(error),
            executedAt: new Date().toISOString(),
            accountId,
        };
        await recordPostResult(userId, accountId, failResult, job.data);
        // Determine if we should retry
        if (!isRetryableError(error)) {
            // Non-retryable error - mark as failed
            throw new Error(`Non-retryable error: ${error.message}`);
        }
        throw error; // Let Bull retry
    }
});
// ============================================
// Helper Functions
// ============================================
/**
 * Determine if an error is retryable
 */
function isRetryableError(error) {
    const nonRetryableErrors = [
        'Account not found',
        'Account is suspended',
        'Account is banned',
        'Invalid media',
        'Media too large',
        'Unsupported media type',
        'Account not authenticated',
    ];
    const retryableErrors = [
        'Rate limit',
        'Network error',
        'Timeout',
        'Connection refused',
        'ECONNRESET',
        'ETIMEDOUT',
    ];
    const errorMessage = error.message?.toLowerCase() || '';
    // Check for non-retryable first
    for (const phrase of nonRetryableErrors) {
        if (errorMessage.includes(phrase.toLowerCase())) {
            return false;
        }
    }
    // Check for retryable
    for (const phrase of retryableErrors) {
        if (errorMessage.includes(phrase.toLowerCase())) {
            return true;
        }
    }
    // Default to retryable for unknown errors
    return true;
}
/**
 * Record post result to database
 */
async function recordPostResult(userId, accountId, result, jobData) {
    try {
        await database_1.pool.query(`INSERT INTO post_results (
        account_id, user_id, schedule_id, status, result_data,
        post_id, error_message, posted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
            accountId,
            userId,
            jobData.distributionId || null,
            result.success ? 'success' : 'failed',
            JSON.stringify({
                mediaType: jobData.mediaType,
                mediaPath: jobData.mediaPath,
                caption: jobData.caption,
                hashtags: jobData.hashtags,
                mediaId: result.mediaId,
                metadata: jobData.metadata,
            }),
            result.mediaId || null,
            result.error || null,
            result.success ? result.executedAt : null,
        ]);
    }
    catch (error) {
        logger_1.logger.error('Failed to record post result:', error);
    }
}
// ============================================
// Public API
// ============================================
/**
 * Queue a post for processing
 */
async function queuePost(data) {
    const job = await postQueue.add(`post-${data.accountId}-${Date.now()}`, data, {
        priority: data.priority || 5,
        delay: data.scheduledFor
            ? Math.max(0, new Date(data.scheduledFor).getTime() - Date.now())
            : 0,
    });
    logger_1.logger.info(`Queued post job ${job.id} for account ${data.accountId}`);
    return job;
}
/**
 * Queue multiple posts for batch distribution
 */
async function queueBatchPosts(posts) {
    const jobs = [];
    for (const post of posts) {
        const job = await queuePost(post);
        jobs.push(job);
    }
    logger_1.logger.info(`Queued ${jobs.length} posts for batch distribution`);
    return jobs;
}
/**
 * Get job status
 */
async function getPostJobStatus(jobId) {
    const job = await postQueue.getJob(jobId);
    if (!job) {
        return { status: 'not_found', progress: 0 };
    }
    const state = await job.getState();
    const progress = job.progress();
    if (state === 'completed') {
        return {
            status: 'completed',
            progress: 100,
            result: job.returnvalue,
        };
    }
    if (state === 'failed') {
        return {
            status: 'failed',
            progress: 0,
            failedReason: job.failedReason,
        };
    }
    return {
        status: state,
        progress,
    };
}
/**
 * Cancel a queued post
 */
async function cancelPost(jobId) {
    const job = await postQueue.getJob(jobId);
    if (!job) {
        return false;
    }
    const state = await job.getState();
    if (state === 'waiting' || state === 'delayed') {
        await job.remove();
        logger_1.logger.info(`Cancelled post job ${jobId}`);
        return true;
    }
    return false;
}
/**
 * Retry a failed post
 */
async function retryPost(jobId) {
    const job = await postQueue.getJob(jobId);
    if (!job) {
        return null;
    }
    const state = await job.getState();
    if (state === 'failed') {
        await job.retry();
        logger_1.logger.info(`Retrying post job ${jobId}`);
        return job;
    }
    return null;
}
/**
 * Get queue statistics
 */
async function getPostQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        postQueue.getWaitingCount(),
        postQueue.getActiveCount(),
        postQueue.getCompletedCount(),
        postQueue.getFailedCount(),
        postQueue.getDelayedCount(),
    ]);
    return {
        waiting,
        active,
        completed,
        failed,
        delayed,
    };
}
/**
 * Pause the post queue
 */
async function pausePostQueue() {
    await postQueue.pause();
    logger_1.logger.info('Post queue paused');
}
/**
 * Resume the post queue
 */
async function resumePostQueue() {
    await postQueue.resume();
    logger_1.logger.info('Post queue resumed');
}
/**
 * Get all pending posts for a user
 */
async function getPendingPosts(userId) {
    const allJobs = await postQueue.getJobs(['waiting', 'delayed', 'active']);
    return allJobs.filter((job) => job.data.userId === userId);
}
/**
 * Clear all completed jobs
 */
async function cleanCompletedJobs() {
    await postQueue.clean(0, 'completed');
    logger_1.logger.info('Cleaned completed jobs from post queue');
}
// ============================================
// Event Listeners
// ============================================
postQueue.on('completed', (job, result) => {
    logger_1.logger.info(`Post job ${job.id} completed successfully`, {
        accountId: job.data.accountId,
        success: result?.success,
        mediaId: result?.mediaId,
    });
});
postQueue.on('failed', (job, error) => {
    logger_1.logger.error(`Post job ${job.id} failed`, {
        accountId: job.data.accountId,
        error: error.message,
        attempts: job.attemptsMade,
    });
});
postQueue.on('stalled', (job) => {
    logger_1.logger.warn(`Post job ${job.id} stalled`, {
        accountId: job.data.accountId,
    });
});
postQueue.on('progress', (job, progress) => {
    logger_1.logger.debug(`Post job ${job.id} progress: ${progress}%`);
});
