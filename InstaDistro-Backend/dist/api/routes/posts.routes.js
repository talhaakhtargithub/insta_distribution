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
/**
 * POST /api/posts/immediate
 * Post immediately to Instagram (no scheduling)
 */
router.post('/immediate', PostController_1.postController.postImmediate.bind(PostController_1.postController));
/**
 * POST /api/posts/verify-account
 * Verify Instagram account credentials and login
 */
router.post('/verify-account', PostController_1.postController.verifyAccount.bind(PostController_1.postController));
/**
 * GET /api/posts/history
 * Get posting history for a user
 */
router.get('/history', PostController_1.postController.getHistory.bind(PostController_1.postController));
exports.default = router;
