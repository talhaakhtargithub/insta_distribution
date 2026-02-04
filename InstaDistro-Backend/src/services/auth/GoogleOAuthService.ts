import { OAuth2Client } from 'google-auth-library';
import { logger } from '../../config/logger';

/**
 * Google OAuth Service
 *
 * Handles Google OAuth 2.0 authentication for app user login
 * Users can sign into the app using their Google account
 */

export interface GoogleUserInfo {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

export interface GoogleAuthResult {
  success: boolean;
  userInfo?: GoogleUserInfo;
  error?: string;
}

export class GoogleOAuthService {
  private client: OAuth2Client;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

    this.client = new OAuth2Client(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );

    if (!this.clientId || !this.clientSecret) {
      logger.warn('Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
    }
  }

  /**
   * Get Google OAuth authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const url = this.client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state || Math.random().toString(36).substring(7),
      prompt: 'consent', // Force consent to get refresh token
    });

    return url;
  }

  /**
   * Exchange authorization code for tokens and get user info
   */
  async authenticateWithCode(code: string): Promise<GoogleAuthResult> {
    try {
      logger.info('Exchanging Google OAuth code for tokens');

      // Exchange code for tokens
      const { tokens } = await this.client.getToken(code);
      this.client.setCredentials(tokens);

      // Verify ID token and get user info
      if (!tokens.id_token) {
        return {
          success: false,
          error: 'No ID token received from Google',
        };
      }

      const ticket = await this.client.verifyIdToken({
        idToken: tokens.id_token,
        audience: this.clientId,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        return {
          success: false,
          error: 'Failed to get user info from Google',
        };
      }

      const userInfo: GoogleUserInfo = {
        sub: payload.sub,
        email: payload.email!,
        email_verified: payload.email_verified || false,
        name: payload.name,
        given_name: payload.given_name,
        family_name: payload.family_name,
        picture: payload.picture,
        locale: payload.locale,
      };

      logger.info(`Google OAuth successful for user: ${userInfo.email}`);

      return {
        success: true,
        userInfo,
      };
    } catch (error: any) {
      logger.error('Google OAuth authentication failed:', error);
      return {
        success: false,
        error: error.message || 'Google authentication failed',
      };
    }
  }

  /**
   * Verify Google ID token directly (for mobile apps)
   * Mobile apps can use Google Sign-In SDK and send ID token directly
   */
  async verifyIdToken(idToken: string): Promise<GoogleAuthResult> {
    try {
      logger.info('Verifying Google ID token');

      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        return {
          success: false,
          error: 'Failed to verify ID token',
        };
      }

      const userInfo: GoogleUserInfo = {
        sub: payload.sub,
        email: payload.email!,
        email_verified: payload.email_verified || false,
        name: payload.name,
        given_name: payload.given_name,
        family_name: payload.family_name,
        picture: payload.picture,
        locale: payload.locale,
      };

      logger.info(`ID token verified for user: ${userInfo.email}`);

      return {
        success: true,
        userInfo,
      };
    } catch (error: any) {
      logger.error('ID token verification failed:', error);
      return {
        success: false,
        error: error.message || 'Token verification failed',
      };
    }
  }

  /**
   * Check if Google OAuth is configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Get configuration status
   */
  getStatus(): {
    configured: boolean;
    clientId?: string;
    redirectUri?: string;
  } {
    return {
      configured: this.isConfigured(),
      clientId: this.clientId ? `${this.clientId.substring(0, 20)}...` : undefined,
      redirectUri: this.redirectUri,
    };
  }
}

export const googleOAuthService = new GoogleOAuthService();
