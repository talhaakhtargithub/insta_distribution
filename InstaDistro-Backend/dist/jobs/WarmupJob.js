"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.warmupQueue = void 0;
exports.scheduleWarmupTaskProcessing = scheduleWarmupTaskProcessing;
exports.startWarmupScheduler = startWarmupScheduler;
exports.getWarmupQueueStats = getWarmupQueueStats;
exports.processWarmupTasksNow = processWarmupTasksNow;
const bull_1 = __importDefault(require("bull"));
const redis_1 = require("../config/redis");
const logger_1 = require("../config/logger");
const WarmupAutomation_1 = require("../services/swarm/WarmupAutomation");
const database_1 = require("../config/database");
const instagram_private_api_1 = require("instagram-private-api");
// Create Bull queue for warmup tasks
exports.warmupQueue = new bull_1.default('warmup-tasks', {
    redis: redis_1.redisConfig,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 60000, // Start with 1 minute delay
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});
/**
 * Process warmup task
 */
exports.warmupQueue.process(async (job) => {
    const { taskId, accountId, taskType, targetCount } = job.data;
    logger_1.logger.info(`Processing warmup task ${taskId}: ${taskType} x${targetCount} for account ${accountId}`);
    try {
        // Mark task as in progress
        await WarmupAutomation_1.warmupAutomationService.startTask(taskId);
        // Get account details
        const accountResult = await database_1.pool.query('SELECT * FROM accounts WHERE id = $1', [accountId]);
        if (accountResult.rows.length === 0) {
            throw new Error('Account not found');
        }
        const account = accountResult.rows[0];
        // Check if account is paused
        if (account.account_state === 'PAUSED') {
            logger_1.logger.info(`Account ${accountId} is paused, skipping task`);
            return { success: false, completed: 0, error: 'Account paused' };
        }
        // Execute the warmup action
        const result = await executeWarmupAction(account, taskType, targetCount);
        // Update task with result
        if (result.success) {
            await WarmupAutomation_1.warmupAutomationService.completeTask(taskId, result.completed);
            logger_1.logger.info(`Completed warmup task ${taskId}: ${result.completed}/${targetCount}`);
        }
        else {
            await WarmupAutomation_1.warmupAutomationService.failTask(taskId, result.error || 'Unknown error');
            logger_1.logger.error(`Failed warmup task ${taskId}: ${result.error}`);
        }
        return result;
    }
    catch (error) {
        logger_1.logger.error(`Error processing warmup task ${taskId}:`, error);
        // Mark task as failed
        await WarmupAutomation_1.warmupAutomationService.failTask(taskId, error.message);
        throw error;
    }
});
/**
 * Execute warmup action based on task type
 */
async function executeWarmupAction(account, taskType, targetCount) {
    try {
        // Check authentication
        if (!account.is_authenticated || !account.session_token) {
            return {
                success: false,
                completed: 0,
                error: 'Account not authenticated',
            };
        }
        // Initialize Instagram client
        const ig = new instagram_private_api_1.IgApiClient();
        ig.state.generateDevice(account.username);
        // Restore session
        try {
            await ig.state.deserialize(account.session_token);
        }
        catch (sessionError) {
            return {
                success: false,
                completed: 0,
                error: 'Invalid session, re-authentication required',
            };
        }
        let completed = 0;
        // Execute action based on type
        switch (taskType) {
            case 'follow':
                completed = await executeFollowAction(ig, targetCount);
                break;
            case 'like':
                completed = await executeLikeAction(ig, targetCount);
                break;
            case 'comment':
                completed = await executeCommentAction(ig, targetCount);
                break;
            case 'watch_story':
                completed = await executeWatchStoryAction(ig, targetCount);
                break;
            case 'story':
                completed = await executePostStoryAction(ig, targetCount, account);
                break;
            case 'post':
                completed = await executePostFeedAction(ig, targetCount, account);
                break;
            default:
                return {
                    success: false,
                    completed: 0,
                    error: `Unknown task type: ${taskType}`,
                };
        }
        return {
            success: true,
            completed,
        };
    }
    catch (error) {
        logger_1.logger.error(`Error executing warmup action ${taskType}:`, error);
        return {
            success: false,
            completed: 0,
            error: error.message || 'Action execution failed',
        };
    }
}
/**
 * Execute follow action
 */
async function executeFollowAction(ig, targetCount) {
    let completed = 0;
    try {
        // Get explore feed (discover accounts to follow)
        const exploreFeed = ig.feed.discover();
        const items = await exploreFeed.items();
        for (let i = 0; i < Math.min(targetCount, items.length); i++) {
            try {
                const userId = items[i].user?.pk || items[i].pk;
                // Follow user
                await ig.friendship.create(userId);
                completed++;
                // Random delay between 30s - 90s to appear human
                await randomDelay(30, 90);
            }
            catch (error) {
                logger_1.logger.warn(`Failed to follow user:`, error);
                // Continue to next user
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Error in executeFollowAction:', error);
    }
    return completed;
}
/**
 * Execute like action
 */
async function executeLikeAction(ig, targetCount) {
    let completed = 0;
    try {
        // Get timeline feed
        const timelineFeed = ig.feed.timeline();
        const items = await timelineFeed.items();
        for (let i = 0; i < Math.min(targetCount, items.length); i++) {
            try {
                const mediaId = items[i].id;
                // Like media
                await ig.media.like({
                    mediaId,
                    moduleInfo: {
                        module_name: 'feed_timeline',
                    },
                    d: 0,
                });
                completed++;
                // Random delay between 20s - 60s
                await randomDelay(20, 60);
            }
            catch (error) {
                logger_1.logger.warn(`Failed to like media:`, error);
                // Continue to next media
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Error in executeLikeAction:', error);
    }
    return completed;
}
/**
 * Execute comment action
 */
async function executeCommentAction(ig, targetCount) {
    let completed = 0;
    // Generic comments that appear natural
    const comments = [
        'Nice! 👍',
        'Love this! ❤️',
        'Amazing! ✨',
        'Great post! 🔥',
        'Beautiful! 😍',
        'Awesome! 💯',
        '🔥🔥🔥',
        'So cool! 😎',
        'Incredible! 🙌',
        'Perfect! ⭐',
    ];
    try {
        // Get timeline feed
        const timelineFeed = ig.feed.timeline();
        const items = await timelineFeed.items();
        for (let i = 0; i < Math.min(targetCount, items.length); i++) {
            try {
                const mediaId = items[i].id;
                // Random comment
                const comment = comments[Math.floor(Math.random() * comments.length)];
                // Post comment
                await ig.media.comment({
                    mediaId,
                    text: comment,
                });
                completed++;
                // Longer delay for comments (60s - 180s)
                await randomDelay(60, 180);
            }
            catch (error) {
                logger_1.logger.warn(`Failed to comment on media:`, error);
                // Continue to next media
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Error in executeCommentAction:', error);
    }
    return completed;
}
/**
 * Execute watch story action
 */
async function executeWatchStoryAction(ig, targetCount) {
    let completed = 0;
    try {
        // Get story tray (stories from followed accounts)
        const storyTray = await ig.feed.reelsMedia({ userIds: [] }).items();
        for (let i = 0; i < Math.min(targetCount, storyTray.length); i++) {
            try {
                const story = storyTray[i];
                // Mark story as seen
                await ig.story.seen([story]);
                completed++;
                // Random delay between 10s - 30s
                await randomDelay(10, 30);
            }
            catch (error) {
                logger_1.logger.warn(`Failed to watch story:`, error);
                // Continue to next story
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Error in executeWatchStoryAction:', error);
    }
    return completed;
}
/**
 * Execute post story action
 *
 * NOTE: Story posting requires actual image/video content.
 * For production use, integrate with your content library or template system.
 * This implementation creates a simple solid-color PNG as a placeholder.
 */
async function executePostStoryAction(ig, targetCount, account) {
    let completed = 0;
    try {
        for (let i = 0; i < targetCount; i++) {
            try {
                // Create a minimal 1x1 pixel PNG (transparent)
                // In production, replace with actual story content from your media library
                const minimalPng = Buffer.from([
                    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
                    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
                    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
                    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
                    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
                    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
                    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
                    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
                    0x42, 0x60, 0x82,
                ]);
                // Post the story
                await ig.publish.story({
                    file: minimalPng,
                });
                logger_1.logger.info(`Posted warmup story ${i + 1}/${targetCount} for account ${account.username}`);
                completed++;
                // Random delay between stories (5 min - 15 min)
                await randomDelay(300, 900);
            }
            catch (error) {
                logger_1.logger.warn(`Failed to post story for ${account.username}:`, error.message);
                // Continue with next story
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Error in executePostStoryAction:', error);
    }
    return completed;
}
/**
 * Execute post feed action
 *
 * NOTE: Feed posting requires actual image/video content.
 * For production use, integrate with your content library or media templates.
 * This implementation creates a simple solid-color image as a placeholder.
 */
async function executePostFeedAction(ig, targetCount, account) {
    let completed = 0;
    try {
        // Warmup captions for feed posts
        const warmupCaptions = [
            'Starting fresh 🌱',
            'New journey begins ✨',
            'Building something great 💪',
            'One step at a time 🎯',
            'Growing every day 🌟',
            'Progress over perfection 📈',
            'Making moves 🚀',
            'Stay focused 💫',
        ];
        for (let i = 0; i < targetCount; i++) {
            try {
                // Create a minimal 1x1 pixel PNG (solid color)
                // In production, replace with actual feed content from your media library
                const minimalPng = Buffer.from([
                    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
                    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
                    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
                    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
                    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
                    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
                    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
                    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
                    0x42, 0x60, 0x82,
                ]);
                const caption = warmupCaptions[i % warmupCaptions.length];
                // Post to feed
                const result = await ig.publish.photo({
                    file: minimalPng,
                    caption,
                });
                logger_1.logger.info(`Posted warmup feed post ${i + 1}/${targetCount} for account ${account.username}, media ID: ${result.media.id}`);
                completed++;
                // Long delay between feed posts (1 hour - 3 hours)
                await randomDelay(3600, 10800);
            }
            catch (error) {
                logger_1.logger.warn(`Failed to post to feed for ${account.username}:`, error.message);
                // Continue with next post
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Error in executePostFeedAction:', error);
    }
    return completed;
}
/**
 * Random delay in seconds
 */
async function randomDelay(minSeconds, maxSeconds) {
    const delayMs = (Math.random() * (maxSeconds - minSeconds) + minSeconds) * 1000;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
}
/**
 * Schedule warmup task processing
 * Runs every 5 minutes to check for due tasks
 */
async function scheduleWarmupTaskProcessing() {
    try {
        logger_1.logger.info('Checking for due warmup tasks...');
        // Get tasks that are due
        const dueTasks = await WarmupAutomation_1.warmupAutomationService.getDueTasks(50);
        logger_1.logger.info(`Found ${dueTasks.length} due warmup tasks`);
        // Add each task to the queue
        for (const task of dueTasks) {
            const jobData = {
                taskId: task.id,
                accountId: task.account_id,
                taskType: task.task_type,
                targetCount: task.target_count,
            };
            await exports.warmupQueue.add(jobData, {
                jobId: task.id, // Prevent duplicate jobs
                priority: task.day, // Earlier days have higher priority
            });
        }
        logger_1.logger.info(`Queued ${dueTasks.length} warmup tasks for processing`);
    }
    catch (error) {
        logger_1.logger.error('Error scheduling warmup task processing:', error);
    }
}
/**
 * Start automatic warmup task scheduler
 * Checks for due tasks every 5 minutes
 */
function startWarmupScheduler() {
    logger_1.logger.info('Starting warmup task scheduler (runs every 5 minutes)');
    // Run immediately on start
    scheduleWarmupTaskProcessing();
    // Then run every 5 minutes
    setInterval(scheduleWarmupTaskProcessing, 5 * 60 * 1000);
}
/**
 * Get warmup queue statistics
 */
async function getWarmupQueueStats() {
    const waiting = await exports.warmupQueue.getWaitingCount();
    const active = await exports.warmupQueue.getActiveCount();
    const completed = await exports.warmupQueue.getCompletedCount();
    const failed = await exports.warmupQueue.getFailedCount();
    const delayed = await exports.warmupQueue.getDelayedCount();
    return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + delayed,
    };
}
/**
 * Manually trigger warmup task processing (for testing)
 */
async function processWarmupTasksNow() {
    await scheduleWarmupTaskProcessing();
}
// Event listeners for monitoring
exports.warmupQueue.on('completed', (job, result) => {
    logger_1.logger.info(`Warmup job ${job.id} completed: ${JSON.stringify(result)}`);
});
exports.warmupQueue.on('failed', (job, error) => {
    logger_1.logger.error(`Warmup job ${job.id} failed:`, error);
});
exports.warmupQueue.on('error', (error) => {
    logger_1.logger.error('Warmup queue error:', error);
});
logger_1.logger.info('Warmup job processor initialized');
