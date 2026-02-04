"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oauthController = exports.OAuthController = void 0;
const InstagramOAuthService_1 = require("../../services/auth/InstagramOAuthService");
const AccountService_1 = require("../../services/swarm/AccountService");
const logger_1 = require("../../config/logger");
/**
 * OAuth Controller
 * Handles OAuth flows for Instagram (and potentially other providers)
 */
class OAuthController {
    /**
     * GET /api/auth/instagram/authorize
     * Redirect user to Instagram OAuth authorization page
     */
    async instagramAuthorize(req, res) {
        try {
            if (!InstagramOAuthService_1.instagramOAuthService.isConfigured()) {
                return res.status(503).json({
                    error: 'OAuth Not Configured',
                    message: 'Instagram OAuth is not configured. Please set INSTAGRAM_CLIENT_ID and INSTAGRAM_CLIENT_SECRET.',
                });
            }
            // Generate random state for CSRF protection
            const state = Math.random().toString(36).substring(7);
            // Store state in session or temporary storage
            // For now, we'll pass it as query param and validate later
            const authUrl = InstagramOAuthService_1.instagramOAuthService.getAuthorizationUrl(state);
            logger_1.logger.info('Redirecting user to Instagram OAuth authorization');
            // Return URL to client (mobile app will open in browser)
            res.json({
                success: true,
                authUrl,
                state,
            });
        }
        catch (error) {
            logger_1.logger.error('Instagram OAuth authorize error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to generate authorization URL',
            });
        }
    }
    /**
     * GET /api/auth/instagram/callback
     * Handle OAuth callback from Instagram
     * Instagram redirects here after user authorizes
     */
    async instagramCallback(req, res) {
        try {
            const { code, state, error, error_description } = req.query;
            // Handle OAuth errors
            if (error) {
                logger_1.logger.warn(`Instagram OAuth error: ${error} - ${error_description}`);
                return res.status(400).json({
                    error: 'OAuth Error',
                    message: error_description || 'Authorization failed',
                });
            }
            // Validate code parameter
            if (!code || typeof code !== 'string') {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'Authorization code is required',
                });
            }
            // TODO: Validate state parameter for CSRF protection
            // if (state !== storedState) { ... }
            logger_1.logger.info('Received Instagram OAuth callback, exchanging code for token');
            // Exchange code for access token
            const result = await InstagramOAuthService_1.instagramOAuthService.exchangeCodeForToken(code);
            if (!result.success) {
                return res.status(400).json({
                    error: 'Token Exchange Failed',
                    message: result.error || 'Failed to exchange code for token',
                });
            }
            // Get long-lived token (60 days instead of 1 hour)
            let finalAccessToken = result.accessToken;
            try {
                const longLivedToken = await InstagramOAuthService_1.instagramOAuthService.getLongLivedToken(result.accessToken);
                finalAccessToken = longLivedToken.accessToken;
                logger_1.logger.info('Successfully obtained long-lived token');
            }
            catch (error) {
                logger_1.logger.warn('Failed to get long-lived token, using short-lived token');
            }
            // Create account in database
            const userId = req.headers['x-user-id'] || 'user_1';
            const account = await AccountService_1.accountService.createAccount({
                user_id: userId,
                username: result.username,
                account_type: 'business', // OAuth is only for business accounts
                access_token: finalAccessToken,
                instagram_user_id: result.userId,
                is_authenticated: true,
            });
            logger_1.logger.info(`Instagram account ${result.username} added via OAuth`);
            // Return success response
            // In production, you might redirect to a success page or deep link back to mobile app
            res.json({
                success: true,
                message: 'Instagram account connected successfully',
                account: {
                    id: account.id,
                    username: account.username,
                    accountType: account.account_type,
                    instagramUserId: account.instagram_user_id,
                },
            });
        }
        catch (error) {
            logger_1.logger.error('Instagram OAuth callback error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to process OAuth callback',
            });
        }
    }
    /**
     * POST /api/auth/instagram/refresh-token
     * Refresh long-lived Instagram access token
     */
    async refreshInstagramToken(req, res) {
        try {
            const { accountId } = req.body;
            if (!accountId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'accountId is required',
                });
            }
            logger_1.logger.info(`Refreshing Instagram token for account ${accountId}`);
            const account = await AccountService_1.accountService.getAccountById(accountId);
            if (!account) {
                return res.status(404).json({
                    error: 'Not Found',
                    message: 'Account not found',
                });
            }
            if (account.account_type !== 'business' || !account.access_token) {
                return res.status(400).json({
                    error: 'Invalid Account',
                    message: 'Only business accounts with OAuth tokens can be refreshed',
                });
            }
            // Refresh token
            const refreshedToken = await InstagramOAuthService_1.instagramOAuthService.refreshToken(account.access_token);
            // Update account with new token
            await AccountService_1.accountService.updateAccount(accountId, {
                access_token: refreshedToken.accessToken,
                last_auth_check: new Date().toISOString(),
            });
            logger_1.logger.info(`Instagram token refreshed for account ${accountId}`);
            res.json({
                success: true,
                message: 'Token refreshed successfully',
                expiresIn: refreshedToken.expiresIn,
            });
        }
        catch (error) {
            logger_1.logger.error('Refresh token error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to refresh token',
            });
        }
    }
    /**
     * GET /api/auth/providers
     * Get available OAuth providers and their status
     */
    async getProviders(req, res) {
        try {
            const providers = {
                instagram: {
                    enabled: InstagramOAuthService_1.instagramOAuthService.isConfigured(),
                    name: 'Instagram',
                    description: 'Connect Instagram Business accounts via OAuth',
                    authUrl: '/api/auth/instagram/authorize',
                    accountType: 'business',
                },
                // Future: Add more providers
                // google: {
                //   enabled: false,
                //   name: 'Google',
                //   description: 'Sign in with Google account',
                // },
            };
            res.json({
                success: true,
                providers,
            });
        }
        catch (error) {
            logger_1.logger.error('Get providers error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to get providers',
            });
        }
    }
}
exports.OAuthController = OAuthController;
exports.oauthController = new OAuthController();
