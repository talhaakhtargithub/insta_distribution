import { Router } from 'express';
import { oauthController } from '../controllers/OAuthController';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

/**
 * Public routes (no auth required)
 */

/**
 * GET /api/auth/providers
 * Get list of available OAuth providers
 */
router.get('/providers', oauthController.getProviders.bind(oauthController));

/**
 * GET /api/auth/instagram/authorize
 * Get Instagram OAuth authorization URL
 * Client should redirect user to this URL
 */
router.get('/instagram/authorize', oauthController.instagramAuthorize.bind(oauthController));

/**
 * GET /api/auth/instagram/callback
 * Instagram OAuth callback endpoint
 * Instagram redirects here after user authorizes
 */
router.get('/instagram/callback', oauthController.instagramCallback.bind(oauthController));

/**
 * GET /api/auth/google/authorize
 * Get Google OAuth authorization URL
 * Client should redirect user to this URL
 */
router.get('/google/authorize', oauthController.googleAuthorize.bind(oauthController));

/**
 * GET /api/auth/google/callback
 * Google OAuth callback endpoint
 * Google redirects here after user authorizes
 */
router.get('/google/callback', oauthController.googleCallback.bind(oauthController));

/**
 * POST /api/auth/google/verify
 * Verify Google ID token (for mobile apps)
 */
router.post('/google/verify', oauthController.googleVerifyToken.bind(oauthController));

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', oauthController.refreshToken.bind(oauthController));

/**
 * Protected routes (require authentication)
 */
router.use(authMiddleware);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', oauthController.getCurrentUser.bind(oauthController));

/**
 * POST /api/auth/instagram/refresh-token
 * Refresh Instagram OAuth token
 */
router.post('/instagram/refresh-token', oauthController.refreshInstagramToken.bind(oauthController));

export default router;
