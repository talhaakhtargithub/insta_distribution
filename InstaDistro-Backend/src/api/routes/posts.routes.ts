import { Router } from 'express';
import { postController } from '../controllers/PostController';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authMiddleware);

// ============================================
// Immediate Posting (Synchronous)
// ============================================

/**
 * POST /api/posts/immediate
 * Post immediately to Instagram (synchronous, waits for result)
 */
router.post('/immediate', postController.postImmediate.bind(postController));

// ============================================
// Queue-based Posting (Asynchronous)
// ============================================

/**
 * POST /api/posts/queue
 * Queue a post for background processing
 */
router.post('/queue', postController.queuePost.bind(postController));

/**
 * POST /api/posts/batch
 * Queue multiple posts for batch distribution
 */
router.post('/batch', postController.queueBatch.bind(postController));

/**
 * GET /api/posts/queue/stats
 * Get queue statistics
 */
router.get('/queue/stats', postController.getQueueStats.bind(postController));

/**
 * GET /api/posts/pending
 * Get all pending posts for the user
 */
router.get('/pending', postController.getPendingPosts.bind(postController));

// ============================================
// Job Management
// ============================================

/**
 * GET /api/posts/:id/status
 * Get status of a queued post
 */
router.get('/:id/status', postController.getPostStatus.bind(postController));

/**
 * DELETE /api/posts/:id
 * Cancel a queued post
 */
router.delete('/:id', postController.cancelPost.bind(postController));

/**
 * POST /api/posts/:id/retry
 * Retry a failed post
 */
router.post('/:id/retry', postController.retryPost.bind(postController));

// ============================================
// Account Verification
// ============================================

/**
 * POST /api/posts/verify-account
 * Verify Instagram account credentials and login
 */
router.post('/verify-account', postController.verifyAccount.bind(postController));

// ============================================
// History
// ============================================

/**
 * GET /api/posts/history
 * Get posting history for a user
 * Query params: accountId, status, limit, offset
 */
router.get('/history', postController.getHistory.bind(postController));

export default router;

