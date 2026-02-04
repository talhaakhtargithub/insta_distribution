import { Router } from 'express';
import { warmupController } from '../controllers/WarmupController';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// All warmup routes require authentication
router.use(authMiddleware);

/**
 * Warmup Protocol Routes
 */

// Get warmup protocol details
router.get('/protocol', warmupController.getProtocol);

// Start warmup for an account
router.post('/start/:accountId', warmupController.startWarmup);

// Get warmup progress for an account
router.get('/progress/:accountId', warmupController.getProgress);

// Get tasks for specific day
router.get('/tasks/:accountId/:day', warmupController.getTasksForDay);

// Pause warmup
router.post('/pause/:accountId', warmupController.pauseWarmup);

// Resume warmup
router.post('/resume/:accountId', warmupController.resumeWarmup);

// Skip warmup and force to ACTIVE (risky!)
router.post('/skip-to-active/:accountId', warmupController.skipToActive);

// Get all accounts in warmup
router.get('/accounts', warmupController.getAccountsInWarmup);

// Get warmup statistics
router.get('/stats', warmupController.getStats);

// Manually trigger warmup task processing (admin/testing)
router.post('/process-now', warmupController.processNow);

export default router;
