"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postController = exports.PostController = void 0;
const PostingService_1 = require("../../services/instagram/PostingService");
const PostJob_1 = require("../../jobs/PostJob");
const database_1 = require("../../config/database");
const logger_1 = require("../../config/logger");
class PostController {
    /**
     * POST /api/posts/immediate
     * Post immediately to Instagram (no scheduling, synchronous)
     */
    async postImmediate(req, res) {
        try {
            const { accountId, mediaPath, mediaType, caption, hashtags, coverImagePath, } = req.body;
            // Validation
            if (!accountId || !mediaPath || !mediaType) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'accountId, mediaPath, and mediaType are required',
                });
            }
            if (!['photo', 'video'].includes(mediaType)) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'mediaType must be "photo" or "video"',
                });
            }
            logger_1.logger.info(`Posting to Instagram for account ${accountId}`);
            // Post to Instagram directly (synchronous)
            const result = await PostingService_1.postingService.post({
                accountId,
                mediaPath,
                mediaType,
                caption,
                hashtags,
                coverImagePath,
            });
            if (!result.success) {
                return res.status(400).json({
                    error: 'Post Failed',
                    message: result.error || 'Failed to post to Instagram',
                });
            }
            logger_1.logger.info(`Successfully posted to Instagram: ${result.mediaId}`);
            res.json({
                success: true,
                message: 'Posted to Instagram successfully',
                mediaId: result.mediaId,
                postedAt: result.postedAt,
            });
        }
        catch (error) {
            logger_1.logger.error('Post immediate error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to post',
            });
        }
    }
    /**
     * POST /api/posts/queue
     * Queue a post for background processing
     */
    async queuePost(req, res) {
        try {
            const userId = req.headers['x-user-id'] || 'user_1';
            const { accountId, mediaPath, mediaType, caption, hashtags, coverImagePath, scheduledFor, priority, metadata, } = req.body;
            // Validation
            if (!accountId || !mediaPath || !mediaType) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'accountId, mediaPath, and mediaType are required',
                });
            }
            if (!['photo', 'video'].includes(mediaType)) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'mediaType must be "photo" or "video"',
                });
            }
            const jobData = {
                userId,
                accountId,
                mediaPath,
                mediaType,
                caption,
                hashtags,
                coverImagePath,
                scheduledFor,
                priority,
                metadata,
            };
            const job = await (0, PostJob_1.queuePost)(jobData);
            logger_1.logger.info(`Queued post job ${job.id} for account ${accountId}`);
            res.status(202).json({
                success: true,
                message: scheduledFor ? 'Post scheduled successfully' : 'Post queued for processing',
                jobId: job.id,
                scheduledFor,
                estimatedProcessingTime: scheduledFor || 'Within 1 minute',
            });
        }
        catch (error) {
            logger_1.logger.error('Queue post error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to queue post',
            });
        }
    }
    /**
     * POST /api/posts/batch
     * Queue multiple posts for batch distribution
     */
    async queueBatch(req, res) {
        try {
            const userId = req.headers['x-user-id'] || 'user_1';
            const { posts, distributionId } = req.body;
            if (!posts || !Array.isArray(posts) || posts.length === 0) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'posts array is required and must not be empty',
                });
            }
            // Add userId and distributionId to each post
            const jobsData = posts.map((post, index) => ({
                userId,
                accountId: post.accountId,
                mediaPath: post.mediaPath,
                mediaType: post.mediaType || 'video',
                caption: post.caption,
                hashtags: post.hashtags,
                coverImagePath: post.coverImagePath,
                scheduledFor: post.scheduledFor,
                priority: post.priority || 5,
                distributionId,
                metadata: post.metadata,
            }));
            const jobs = await (0, PostJob_1.queueBatchPosts)(jobsData);
            logger_1.logger.info(`Queued ${jobs.length} posts for batch distribution`);
            res.status(202).json({
                success: true,
                message: `Queued ${jobs.length} posts for processing`,
                jobIds: jobs.map((j) => j.id),
                distributionId,
                totalPosts: jobs.length,
            });
        }
        catch (error) {
            logger_1.logger.error('Queue batch error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to queue batch posts',
            });
        }
    }
    /**
     * GET /api/posts/:id/status
     * Get status of a queued post
     */
    async getPostStatus(req, res) {
        try {
            const { id } = req.params;
            const status = await (0, PostJob_1.getPostJobStatus)(id);
            if (status.status === 'not_found') {
                return res.status(404).json({
                    error: 'Not Found',
                    message: 'Post job not found',
                });
            }
            res.json({
                jobId: id,
                ...status,
            });
        }
        catch (error) {
            logger_1.logger.error('Get post status error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to get status',
            });
        }
    }
    /**
     * DELETE /api/posts/:id
     * Cancel a queued post
     */
    async cancelPost(req, res) {
        try {
            const { id } = req.params;
            const cancelled = await (0, PostJob_1.cancelPost)(id);
            if (!cancelled) {
                return res.status(400).json({
                    error: 'Cannot Cancel',
                    message: 'Post cannot be cancelled (already processing or completed)',
                });
            }
            res.json({
                success: true,
                message: 'Post cancelled successfully',
                jobId: id,
            });
        }
        catch (error) {
            logger_1.logger.error('Cancel post error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to cancel post',
            });
        }
    }
    /**
     * POST /api/posts/:id/retry
     * Retry a failed post
     */
    async retryPost(req, res) {
        try {
            const { id } = req.params;
            const job = await (0, PostJob_1.retryPost)(id);
            if (!job) {
                return res.status(400).json({
                    error: 'Cannot Retry',
                    message: 'Post cannot be retried (not in failed state)',
                });
            }
            res.json({
                success: true,
                message: 'Post retry initiated',
                jobId: id,
            });
        }
        catch (error) {
            logger_1.logger.error('Retry post error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to retry post',
            });
        }
    }
    /**
     * GET /api/posts/queue/stats
     * Get queue statistics
     */
    async getQueueStats(req, res) {
        try {
            const stats = await (0, PostJob_1.getPostQueueStats)();
            res.json({
                queue: 'instagram-posts',
                stats,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.logger.error('Get queue stats error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to get queue stats',
            });
        }
    }
    /**
     * GET /api/posts/pending
     * Get all pending posts for the user
     */
    async getPendingPosts(req, res) {
        try {
            const userId = req.headers['x-user-id'] || 'user_1';
            const jobs = await (0, PostJob_1.getPendingPosts)(userId);
            res.json({
                pending: jobs.map((job) => ({
                    jobId: job.id,
                    accountId: job.data.accountId,
                    mediaType: job.data.mediaType,
                    scheduledFor: job.data.scheduledFor,
                    priority: job.data.priority,
                    createdAt: job.timestamp,
                })),
                total: jobs.length,
            });
        }
        catch (error) {
            logger_1.logger.error('Get pending posts error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to get pending posts',
            });
        }
    }
    /**
     * POST /api/posts/verify-account
     * Verify Instagram account credentials and login
     */
    async verifyAccount(req, res) {
        try {
            const { accountId } = req.body;
            if (!accountId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'accountId is required',
                });
            }
            logger_1.logger.info(`Verifying account ${accountId}`);
            const result = await PostingService_1.postingService.verifyAccount(accountId);
            if (!result.success) {
                return res.status(400).json({
                    error: 'Verification Failed',
                    message: result.error || 'Failed to verify account',
                });
            }
            res.json({
                success: true,
                message: 'Account verified successfully',
                accountInfo: result.accountInfo,
            });
        }
        catch (error) {
            logger_1.logger.error('Verify account error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Verification failed',
            });
        }
    }
    /**
     * GET /api/posts/history
     * Get posting history for a user
     */
    async getHistory(req, res) {
        try {
            const userId = req.headers['x-user-id'] || 'user_1';
            const { accountId, status } = req.query;
            // Validate and sanitize pagination parameters
            const limit = Math.min(Math.max(1, parseInt(req.query.limit || '50', 10)), 100);
            const offset = Math.max(0, parseInt(req.query.offset || '0', 10));
            let query = `
        SELECT 
          pr.id,
          pr.account_id,
          a.username,
          pr.status,
          pr.result_data,
          pr.post_id,
          pr.error_message,
          pr.posted_at,
          pr.created_at
        FROM post_results pr
        LEFT JOIN accounts a ON pr.account_id = a.id
        WHERE pr.user_id = $1
      `;
            const params = [userId];
            let paramIndex = 2;
            if (accountId) {
                query += ` AND pr.account_id = $${paramIndex}`;
                params.push(accountId);
                paramIndex++;
            }
            if (status) {
                query += ` AND pr.status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }
            query += ` ORDER BY pr.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);
            const result = await database_1.pool.query(query, params);
            // Get total count
            let countQuery = `SELECT COUNT(*) FROM post_results WHERE user_id = $1`;
            const countParams = [userId];
            if (accountId) {
                countQuery += ` AND account_id = $2`;
                countParams.push(accountId);
            }
            const countResult = await database_1.pool.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0].count, 10);
            res.json({
                posts: result.rows,
                pagination: {
                    total,
                    limit: Number(limit),
                    offset: Number(offset),
                    hasMore: Number(offset) + result.rows.length < total,
                },
            });
        }
        catch (error) {
            logger_1.logger.error('Get history error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to get history',
            });
        }
    }
}
exports.PostController = PostController;
exports.postController = new PostController();
