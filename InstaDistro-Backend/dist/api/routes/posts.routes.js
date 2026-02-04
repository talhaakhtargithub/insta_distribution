"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PostController_1 = require("../controllers/PostController");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
/**
 * All routes require authentication
 */
router.use(auth_middleware_1.authMiddleware);
// ============================================
// Immediate Posting (Synchronous)
// ============================================
/**
 * POST /api/posts/immediate
 * Post immediately to Instagram (synchronous, waits for result)
 */
router.post('/immediate', PostController_1.postController.postImmediate.bind(PostController_1.postController));
// ============================================
// Queue-based Posting (Asynchronous)
// ============================================
/**
 * POST /api/posts/queue
 * Queue a post for background processing
 */
router.post('/queue', PostController_1.postController.queuePost.bind(PostController_1.postController));
/**
 * POST /api/posts/batch
 * Queue multiple posts for batch distribution
 */
router.post('/batch', PostController_1.postController.queueBatch.bind(PostController_1.postController));
/**
 * GET /api/posts/queue/stats
 * Get queue statistics
 */
router.get('/queue/stats', PostController_1.postController.getQueueStats.bind(PostController_1.postController));
/**
 * GET /api/posts/pending
 * Get all pending posts for the user
 */
router.get('/pending', PostController_1.postController.getPendingPosts.bind(PostController_1.postController));
// ============================================
// Job Management
// ============================================
/**
 * GET /api/posts/:id/status
 * Get status of a queued post
 */
router.get('/:id/status', PostController_1.postController.getPostStatus.bind(PostController_1.postController));
/**
 * DELETE /api/posts/:id
 * Cancel a queued post
 */
router.delete('/:id', PostController_1.postController.cancelPost.bind(PostController_1.postController));
/**
 * POST /api/posts/:id/retry
 * Retry a failed post
 */
router.post('/:id/retry', PostController_1.postController.retryPost.bind(PostController_1.postController));
// ============================================
// Account Verification
// ============================================
/**
 * POST /api/posts/verify-account
 * Verify Instagram account credentials and login
 */
router.post('/verify-account', PostController_1.postController.verifyAccount.bind(PostController_1.postController));
// ============================================
// History
// ============================================
/**
 * GET /api/posts/history
 * Get posting history for a user
 * Query params: accountId, status, limit, offset
 */
router.get('/history', PostController_1.postController.getHistory.bind(PostController_1.postController));
exports.default = router;
