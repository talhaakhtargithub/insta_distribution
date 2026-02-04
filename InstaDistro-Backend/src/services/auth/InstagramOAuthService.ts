import axios from 'axios';
import { envConfig } from '../../config/env';
import { logger } from '../../config/logger';

/**
 * Instagram OAuth Service
 *
 * Handles Instagram OAuth flow for business accounts
 * This allows users to authenticate via "Login with Instagram" instead of username/password
 *
 * Prerequisites:
 * 1. Facebook App created at developers.facebook.com
 * 2. Instagram Basic Display API configured
 * 3. Valid OAuth redirect URI configured
 *
 * Flow:
 * 1. User clicks "Login with Instagram"
 * 2. Redirect to Instagram OAuth URL
 * 3. User authorizes app
 * 4. Instagram redirects back with code
 * 5. Exchange code for access token
 * 6. Get Instagram user info
 * 7. Save account to database
 */

export interface InstagramOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface InstagramOAuthResult {
  success: boolean;
  accessToken?: string;
  userId?: string;
  username?: string;
  accountType?: string;
  error?: string;
}

export class InstagramOAuthService {
  private config: InstagramOAuthConfig;
  private authUrl = 'https://api.instagram.com/oauth/authorize';
  private tokenUrl = 'https://api.instagram.com/oauth/access_token';
  private graphApiUrl = 'https://graph.instagram.com';

  constructor(config?: InstagramOAuthConfig) {
    // Use environment variables or passed config
    this.config = config || {
      clientId: process.env.INSTAGRAM_CLIENT_ID || '',
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3000/api/auth/instagram/callback',
    };

    if (!this.config.clientId || !this.config.clientSecret) {
      logger.warn('Instagram OAuth not configured. Set INSTAGRAM_CLIENT_ID and INSTAGRAM_CLIENT_SECRET in .env');
    }
  }

  /**
   * Get Instagram OAuth authorization URL
   * User should be redirected to this URL to start OAuth flow
   */
  getAuthorizationUrl(state?: string): string {
    if (!this.config.clientId) {
      throw new Error('Instagram OAuth not configured');
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'user_profile,user_media',
      response_type: 'code',
      ...(state && { state }), // Optional state parameter for CSRF protection
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * Called after user authorizes and Instagram redirects back with code
   */
  async exchangeCodeForToken(code: string): Promise<InstagramOAuthResult> {
    try {
      logger.info('Exchanging Instagram OAuth code for access token');

      const response = await axios.post(
        this.tokenUrl,
        {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: this.config.redirectUri,
          code,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, user_id } = response.data;

      logger.info(`Instagram OAuth token obtained for user ${user_id}`);

      // Get user info
      const userInfo = await this.getUserInfo(access_token, user_id);

      return {
        success: true,
        accessToken: access_token,
        userId: user_id.toString(),
        username: userInfo.username,
        accountType: userInfo.account_type,
      };
    } catch (error: any) {
      logger.error('Instagram OAuth token exchange failed:', error.response?.data || error.message);

      return {
        success: false,
        error: error.response?.data?.error_message || error.message || 'Token exchange failed',
      };
    }
  }

  /**
   * Get Instagram user info using access token
   */
  async getUserInfo(accessToken: string, userId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.graphApiUrl}/${userId}`, {
        params: {
          fields: 'id,username,account_type,media_count',
          access_token: accessToken,
        },
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to get Instagram user info:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Exchange short-lived token for long-lived token (60 days)
   * Recommended to call this immediately after getting short-lived token
   */
  async getLongLivedToken(shortLivedToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    try {
      const response = await axios.get(`${this.graphApiUrl}/access_token`, {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: this.config.clientSecret,
          access_token: shortLivedToken,
        },
      });

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in, // Seconds (60 days = 5184000)
      };
    } catch (error: any) {
      logger.error('Failed to get long-lived token:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Refresh long-lived token (extends expiration)
   * Should be called before token expires
   */
  async refreshToken(accessToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    try {
      const response = await axios.get(`${this.graphApiUrl}/refresh_access_token`, {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: accessToken,
        },
      });

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error: any) {
      logger.error('Failed to refresh token:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Validate if access token is still valid
   */
  async validateToken(accessToken: string, userId: string): Promise<boolean> {
    try {
      await this.getUserInfo(accessToken, userId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if Instagram OAuth is configured
   */
  isConfigured(): boolean {
    return !!(this.config.clientId && this.config.clientSecret);
  }
}

export const instagramOAuthService = new InstagramOAuthService();
