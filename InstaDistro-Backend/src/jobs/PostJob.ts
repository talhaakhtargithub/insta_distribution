import Queue, { Job } from 'bull';
import { postingService, PostOptions } from '../services/instagram/PostingService';
import { accountService } from '../services/swarm/AccountService';
import { pool } from '../config/database';
import { logger } from '../config/logger';
import { envConfig } from '../config/env';
import { JobType, getJobOptionsByType, jobMonitor } from '../utils/jobQueue';

/**
 * Post Job Processor
 *
 * Handles background posting to Instagram:
 * - Processes post requests from queue
 * - Handles photo and video uploads
 * - Implements retry logic with exponential backoff
 * - Updates post_results table
 * - Supports batch posting for distribution
 */

// ============================================
// Types
// ============================================

export interface PostJobData {
    userId: string;
    accountId: string;
    mediaPath: string;
    mediaType: 'photo' | 'video';
    caption?: string;
    hashtags?: string[];
    coverImagePath?: string; // For videos
    distributionId?: string; // If part of a distribution
    scheduledFor?: string; // ISO date string
    priority?: number;
    metadata?: {
        variationId?: string;
        originalContentId?: string;
        groupId?: string;
    };
}

export interface PostJobResult {
    success: boolean;
    postId?: string;
    mediaId?: string;
    instagramUrl?: string;
    error?: string;
    errorCode?: string;
    retryable?: boolean;
    executedAt: string;
    accountId: string;
}

// ============================================
// Queue Setup
// ============================================

const postQueue = new Queue<PostJobData>('instagram-posts', {
    redis: {
        host: envConfig.REDIS_HOST || 'localhost',
        port: envConfig.REDIS_PORT || 6379,
    },
    // Use job-specific options from jobQueue utils instead of defaults
    defaultJobOptions: getJobOptionsByType(JobType.POST_PUBLISH),
});

// ============================================
// Job Processor
// ============================================

postQueue.process(async (job: Job<PostJobData>) => {
    const { userId, accountId, mediaPath, mediaType, caption, hashtags, coverImagePath, distributionId } = job.data;

    // Record job started
    jobMonitor.recordJobStarted(JobType.POST_PUBLISH);

    logger.info(`Processing post job ${job.id} for account ${accountId}`, {
        mediaType,
        distributionId,
        attempt: job.attemptsMade + 1,
    });

    try {
        // Note: Scheduling is handled at queue time via delay option
        // If the job is processing, it means the scheduled time has passed

        // Verify account is still valid
        const account = await accountService.getAccountById(accountId);
        if (!account) {
            throw new Error(`Account ${accountId} not found`);
        }

        if (account.account_status === 'suspended' || account.account_status === 'error') {
            throw new Error(`Account ${accountId} is ${account.account_status}`);
        }

        // Execute the post
        const postOptions: PostOptions = {
            accountId,
            mediaPath,
            mediaType,
            caption,
            hashtags,
            coverImagePath,
        };

        const result = await postingService.post(postOptions);

        // Record result in database
        const postResult: PostJobResult = {
            success: result.success,
            postId: job.id?.toString(),
            mediaId: result.mediaId,
            error: result.error,
            executedAt: new Date().toISOString(),
            accountId,
        };

        await recordPostResult(userId, accountId, postResult, job.data);

        // Update account status on successful post
        if (result.success) {
            // Success is recorded in post_results table
            // Account timestamp is managed by database triggers
            logger.debug(`Post successful for account ${accountId}`);
        }

        logger.info(`Post job ${job.id} completed`, {
            success: result.success,
            mediaId: result.mediaId,
            accountId,
        });

        // Record job completed
        if (result.success) {
            jobMonitor.recordJobComplete(JobType.POST_PUBLISH);
        } else {
            jobMonitor.recordJobFailed(JobType.POST_PUBLISH);
        }

        return postResult;
    } catch (error: any) {
        logger.error(`Post job ${job.id} failed`, {
            error: error.message,
            accountId,
            attempt: job.attemptsMade + 1,
        });

        // Record failure
        const failResult: PostJobResult = {
            success: false,
            postId: job.id?.toString(),
            error: error.message,
            errorCode: error.code || 'UNKNOWN_ERROR',
            retryable: isRetryableError(error),
            executedAt: new Date().toISOString(),
            accountId,
        };

        await recordPostResult(userId, accountId, failResult, job.data);

        // Record job failed
        jobMonitor.recordJobFailed(JobType.POST_PUBLISH);

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
function isRetryableError(error: any): boolean {
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
async function recordPostResult(
    userId: string,
    accountId: string,
    result: PostJobResult,
    jobData: PostJobData
): Promise<void> {
    try {
        await pool.query(
            `INSERT INTO post_results (
        account_id, user_id, schedule_id, status, result_data,
        post_id, error_message, posted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
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
            ]
        );
    } catch (error) {
        logger.error('Failed to record post result:', error);
    }
}

// ============================================
// Public API
// ============================================

/**
 * Queue a post for processing
 */
export async function queuePost(data: PostJobData): Promise<Job<PostJobData>> {
    const job = await postQueue.add(
        `post-${data.accountId}-${Date.now()}`,
        data,
        {
            priority: data.priority || 5,
            delay: data.scheduledFor
                ? Math.max(0, new Date(data.scheduledFor).getTime() - Date.now())
                : 0,
        }
    );

    logger.info(`Queued post job ${job.id} for account ${data.accountId}`);
    return job;
}

/**
 * Queue multiple posts for batch distribution
 */
export async function queueBatchPosts(posts: PostJobData[]): Promise<Job<PostJobData>[]> {
    const jobs: Job<PostJobData>[] = [];

    for (const post of posts) {
        const job = await queuePost(post);
        jobs.push(job);
    }

    logger.info(`Queued ${jobs.length} posts for batch distribution`);
    return jobs;
}

/**
 * Get job status
 */
export async function getPostJobStatus(jobId: string): Promise<{
    status: string;
    progress: number;
    result?: PostJobResult;
    failedReason?: string;
}> {
    const job = await postQueue.getJob(jobId);

    if (!job) {
        return { status: 'not_found', progress: 0 };
    }

    const state = await job.getState();
    const progress = job.progress() as number;

    if (state === 'completed') {
        return {
            status: 'completed',
            progress: 100,
            result: job.returnvalue as PostJobResult,
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
export async function cancelPost(jobId: string): Promise<boolean> {
    const job = await postQueue.getJob(jobId);

    if (!job) {
        return false;
    }

    const state = await job.getState();
    if (state === 'waiting' || state === 'delayed') {
        await job.remove();
        logger.info(`Cancelled post job ${jobId}`);
        return true;
    }

    return false;
}

/**
 * Retry a failed post
 */
export async function retryPost(jobId: string): Promise<Job<PostJobData> | null> {
    const job = await postQueue.getJob(jobId);

    if (!job) {
        return null;
    }

    const state = await job.getState();
    if (state === 'failed') {
        await job.retry();
        logger.info(`Retrying post job ${jobId}`);
        return job;
    }

    return null;
}

/**
 * Get queue statistics
 */
export async function getPostQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
}> {
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
export async function pausePostQueue(): Promise<void> {
    await postQueue.pause();
    logger.info('Post queue paused');
}

/**
 * Resume the post queue
 */
export async function resumePostQueue(): Promise<void> {
    await postQueue.resume();
    logger.info('Post queue resumed');
}

/**
 * Get all pending posts for a user
 */
export async function getPendingPosts(userId: string): Promise<Job<PostJobData>[]> {
    const allJobs = await postQueue.getJobs(['waiting', 'delayed', 'active']);
    return allJobs.filter((job) => job.data.userId === userId);
}

/**
 * Clear all completed jobs
 */
export async function cleanCompletedJobs(): Promise<void> {
    await postQueue.clean(0, 'completed');
    logger.info('Cleaned completed jobs from post queue');
}

// ============================================
// Event Listeners
// ============================================

postQueue.on('completed', (job, result) => {
    logger.info(`Post job ${job.id} completed successfully`, {
        accountId: job.data.accountId,
        success: result?.success,
        mediaId: result?.mediaId,
    });
});

postQueue.on('failed', (job, error) => {
    logger.error(`Post job ${job.id} failed`, {
        accountId: job.data.accountId,
        error: error.message,
        attempts: job.attemptsMade,
    });
});

postQueue.on('stalled', (job) => {
    logger.warn(`Post job ${job.id} stalled`, {
        accountId: job.data.accountId,
    });
});

postQueue.on('progress', (job, progress) => {
    logger.debug(`Post job ${job.id} progress: ${progress}%`);
});

// ============================================
// Export
// ============================================

export { postQueue };
