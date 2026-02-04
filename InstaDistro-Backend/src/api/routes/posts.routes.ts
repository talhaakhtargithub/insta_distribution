import { Router } from 'express';
import { postController } from '../controllers/PostController';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authMiddleware);

/**
 * POST /api/posts/immediate
 * Post immediately to Instagram (no scheduling)
 */
router.post('/immediate', postController.postImmediate.bind(postController));

/**
 * POST /api/posts/verify-account
 * Verify Instagram account credentials and login
 */
router.post('/verify-account', postController.verifyAccount.bind(postController));

/**
 * GET /api/posts/history
 * Get posting history for a user
 */
router.get('/history', postController.getHistory.bind(postController));

export default router;
