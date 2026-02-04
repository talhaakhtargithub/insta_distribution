"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const WarmupController_1 = require("../controllers/WarmupController");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// All warmup routes require authentication
router.use(auth_middleware_1.authMiddleware);
/**
 * Warmup Protocol Routes
 */
// Get warmup protocol details
router.get('/protocol', WarmupController_1.warmupController.getProtocol);
// Start warmup for an account
router.post('/start/:accountId', WarmupController_1.warmupController.startWarmup);
// Get warmup progress for an account
router.get('/progress/:accountId', WarmupController_1.warmupController.getProgress);
// Get tasks for specific day
router.get('/tasks/:accountId/:day', WarmupController_1.warmupController.getTasksForDay);
// Pause warmup
router.post('/pause/:accountId', WarmupController_1.warmupController.pauseWarmup);
// Resume warmup
router.post('/resume/:accountId', WarmupController_1.warmupController.resumeWarmup);
// Skip warmup and force to ACTIVE (risky!)
router.post('/skip-to-active/:accountId', WarmupController_1.warmupController.skipToActive);
// Get all accounts in warmup
router.get('/accounts', WarmupController_1.warmupController.getAccountsInWarmup);
// Get warmup statistics
router.get('/stats', WarmupController_1.warmupController.getStats);
// Manually trigger warmup task processing (admin/testing)
router.post('/process-now', WarmupController_1.warmupController.processNow);
exports.default = router;
