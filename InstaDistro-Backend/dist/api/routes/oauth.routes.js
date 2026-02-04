"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const OAuthController_1 = require("../controllers/OAuthController");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
/**
 * Public routes (no auth required)
 */
/**
 * GET /api/auth/providers
 * Get list of available OAuth providers
 */
router.get('/providers', OAuthController_1.oauthController.getProviders.bind(OAuthController_1.oauthController));
/**
 * GET /api/auth/instagram/authorize
 * Get Instagram OAuth authorization URL
 * Client should redirect user to this URL
 */
router.get('/instagram/authorize', OAuthController_1.oauthController.instagramAuthorize.bind(OAuthController_1.oauthController));
/**
 * GET /api/auth/instagram/callback
 * Instagram OAuth callback endpoint
 * Instagram redirects here after user authorizes
 */
router.get('/instagram/callback', OAuthController_1.oauthController.instagramCallback.bind(OAuthController_1.oauthController));
/**
 * GET /api/auth/google/authorize
 * Get Google OAuth authorization URL
 * Client should redirect user to this URL
 */
router.get('/google/authorize', OAuthController_1.oauthController.googleAuthorize.bind(OAuthController_1.oauthController));
/**
 * GET /api/auth/google/callback
 * Google OAuth callback endpoint
 * Google redirects here after user authorizes
 */
router.get('/google/callback', OAuthController_1.oauthController.googleCallback.bind(OAuthController_1.oauthController));
/**
 * POST /api/auth/google/verify
 * Verify Google ID token (for mobile apps)
 */
router.post('/google/verify', OAuthController_1.oauthController.googleVerifyToken.bind(OAuthController_1.oauthController));
/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', OAuthController_1.oauthController.refreshToken.bind(OAuthController_1.oauthController));
/**
 * Protected routes (require authentication)
 */
router.use(auth_middleware_1.authMiddleware);
/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', OAuthController_1.oauthController.getCurrentUser.bind(OAuthController_1.oauthController));
/**
 * POST /api/auth/instagram/refresh-token
 * Refresh Instagram OAuth token
 */
router.post('/instagram/refresh-token', OAuthController_1.oauthController.refreshInstagramToken.bind(OAuthController_1.oauthController));
exports.default = router;
