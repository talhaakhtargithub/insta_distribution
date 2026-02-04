import { Request, Response } from 'express';
import { instagramOAuthService } from '../../services/auth/InstagramOAuthService';
import { googleOAuthService } from '../../services/auth/GoogleOAuthService';
import { userService } from '../../services/auth/UserService';
import { jwtService } from '../../services/auth/JwtService';
import { accountService } from '../../services/swarm/AccountService';
import { logger } from '../../config/logger';

/**
 * OAuth Controller
 * Handles OAuth flows for Instagram (and potentially other providers)
 */
export class OAuthController {
  /**
   * GET /api/auth/instagram/authorize
   * Redirect user to Instagram OAuth authorization page
   */
  async instagramAuthorize(req: Request, res: Response) {
    try {
      if (!instagramOAuthService.isConfigured()) {
        return res.status(503).json({
          error: 'OAuth Not Configured',
          message: 'Instagram OAuth is not configured. Please set INSTAGRAM_CLIENT_ID and INSTAGRAM_CLIENT_SECRET.',
        });
      }

      // Generate random state for CSRF protection
      const state = Math.random().toString(36).substring(7);

      // Store state in session or temporary storage
      // For now, we'll pass it as query param and validate later
      const authUrl = instagramOAuthService.getAuthorizationUrl(state);

      logger.info('Redirecting user to Instagram OAuth authorization');

      // Return URL to client (mobile app will open in browser)
      res.json({
        success: true,
        authUrl,
        state,
      });
    } catch (error: any) {
      logger.error('Instagram OAuth authorize error:', error);
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
  async instagramCallback(req: Request, res: Response) {
    try {
      const { code, state, error, error_description } = req.query;

      // Handle OAuth errors
      if (error) {
        logger.warn(`Instagram OAuth error: ${error} - ${error_description}`);
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

      logger.info('Received Instagram OAuth callback, exchanging code for token');

      // Exchange code for access token
      const result = await instagramOAuthService.exchangeCodeForToken(code);

      if (!result.success) {
        return res.status(400).json({
          error: 'Token Exchange Failed',
          message: result.error || 'Failed to exchange code for token',
        });
      }

      // Get long-lived token (60 days instead of 1 hour)
      let finalAccessToken = result.accessToken!;
      try {
        const longLivedToken = await instagramOAuthService.getLongLivedToken(result.accessToken!);
        finalAccessToken = longLivedToken.accessToken;
        logger.info('Successfully obtained long-lived token');
      } catch (error) {
        logger.warn('Failed to get long-lived token, using short-lived token');
      }

      // Create account in database
      const userId = req.headers['x-user-id'] as string || 'user_1';
      const account = await accountService.createAccount({
        user_id: userId,
        username: result.username!,
        account_type: 'business', // OAuth is only for business accounts
        access_token: finalAccessToken,
        instagram_user_id: result.userId!,
        is_authenticated: true,
      });

      logger.info(`Instagram account ${result.username} added via OAuth`);

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
    } catch (error: any) {
      logger.error('Instagram OAuth callback error:', error);
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
  async refreshInstagramToken(req: Request, res: Response) {
    try {
      const { accountId } = req.body;

      if (!accountId) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'accountId is required',
        });
      }

      logger.info(`Refreshing Instagram token for account ${accountId}`);

      const account = await accountService.getAccountById(accountId);

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
      const refreshedToken = await instagramOAuthService.refreshToken(account.access_token);

      // Update account with new token
      await accountService.updateAccount(accountId, {
        access_token: refreshedToken.accessToken,
        last_auth_check: new Date().toISOString(),
      });

      logger.info(`Instagram token refreshed for account ${accountId}`);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        expiresIn: refreshedToken.expiresIn,
      });
    } catch (error: any) {
      logger.error('Refresh token error:', error);
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
  async getProviders(req: Request, res: Response) {
    try {
      const providers = {
        instagram: {
          enabled: instagramOAuthService.isConfigured(),
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
    } catch (error: any) {
      logger.error('Get providers error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to get providers',
      });
    }
  }

  /**
   * GET /api/auth/google/authorize
   * Get Google OAuth authorization URL
   */
  async googleAuthorize(req: Request, res: Response) {
    try {
      if (!googleOAuthService.isConfigured()) {
        return res.status(503).json({
          error: 'OAuth Not Configured',
          message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
        });
      }

      // Generate random state for CSRF protection
      const state = Math.random().toString(36).substring(7);

      const authUrl = googleOAuthService.getAuthorizationUrl(state);

      logger.info('Redirecting user to Google OAuth authorization');

      // Return URL to client (mobile app will open in browser)
      res.json({
        success: true,
        authUrl,
        state,
      });
    } catch (error: any) {
      logger.error('Google OAuth authorize error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to generate authorization URL',
      });
    }
  }

  /**
   * GET /api/auth/google/callback
   * Handle Google OAuth callback
   */
  async googleCallback(req: Request, res: Response) {
    try {
      const { code, state, error, error_description } = req.query;

      // Handle OAuth errors
      if (error) {
        logger.warn(`Google OAuth error: ${error} - ${error_description}`);
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

      logger.info('Received Google OAuth callback, exchanging code for tokens');

      // Exchange code for tokens and get user info
      const result = await googleOAuthService.authenticateWithCode(code);

      if (!result.success || !result.userInfo) {
        return res.status(400).json({
          error: 'Authentication Failed',
          message: result.error || 'Failed to authenticate with Google',
        });
      }

      // Find or create user in database
      const user = await userService.findOrCreateFromGoogle(result.userInfo);

      // Generate JWT tokens
      const tokens = jwtService.generateTokenPair({
        userId: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        provider: 'google',
      });

      logger.info(`Google OAuth successful for user: ${user.email}`);

      // Return tokens and user info
      res.json({
        success: true,
        message: 'Google authentication successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          email_verified: user.email_verified,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
      });
    } catch (error: any) {
      logger.error('Google OAuth callback error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to process OAuth callback',
      });
    }
  }

  /**
   * POST /api/auth/google/verify
   * Verify Google ID token (for mobile apps)
   */
  async googleVerifyToken(req: Request, res: Response) {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'ID token is required',
        });
      }

      logger.info('Verifying Google ID token');

      // Verify ID token
      const result = await googleOAuthService.verifyIdToken(idToken);

      if (!result.success || !result.userInfo) {
        return res.status(400).json({
          error: 'Verification Failed',
          message: result.error || 'Failed to verify ID token',
        });
      }

      // Find or create user in database
      const user = await userService.findOrCreateFromGoogle(result.userInfo);

      // Generate JWT tokens
      const tokens = jwtService.generateTokenPair({
        userId: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        provider: 'google',
      });

      logger.info(`Google ID token verified for user: ${user.email}`);

      // Return tokens and user info
      res.json({
        success: true,
        message: 'Google authentication successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          email_verified: user.email_verified,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
      });
    } catch (error: any) {
      logger.error('Google token verification error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to verify token',
      });
    }
  }

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Refresh token is required',
        });
      }

      logger.info('Refreshing access token');

      // Verify refresh token
      const payload = jwtService.verifyRefreshToken(refreshToken);

      // Generate new access token
      const newAccessToken = jwtService.generateAccessToken(payload);

      logger.info(`Token refreshed for user: ${payload.email}`);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        accessToken: newAccessToken,
        expiresIn: jwtService['parseExpiry'](jwtService['jwtExpiry']),
      });
    } catch (error: any) {
      logger.error('Token refresh error:', error);
      res.status(401).json({
        error: 'Unauthorized',
        message: error.message || 'Failed to refresh token',
      });
    }
  }

  /**
   * GET /api/auth/me
   * Get current user profile
   */
  async getCurrentUser(req: Request, res: Response) {
    try {
      // User ID should be set by auth middleware
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const user = await userService.findById(userId);

      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          email_verified: user.email_verified,
          created_at: user.created_at,
          last_login: user.last_login,
        },
      });
    } catch (error: any) {
      logger.error('Get current user error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to get user profile',
      });
    }
  }
}

export const oauthController = new OAuthController();
