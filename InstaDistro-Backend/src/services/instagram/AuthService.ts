import { PrivateApiClient } from './PrivateApiClient';
import { GraphApiClient } from './GraphApiClient';
import { accountService } from '../swarm/AccountService';
import { logger } from '../../config/logger';

/**
 * Instagram Authentication Service
 *
 * Handles authentication for both Personal and Business accounts:
 * - Login flow (username/password for personal, token for business)
 * - Session management and token refresh
 * - 2FA challenge handling
 * - Checkpoint challenge handling
 * - Session health checking
 */

export interface AuthenticationResult {
  success: boolean;
  authenticated?: boolean;
  sessionToken?: string;
  error?: string;
  challengeRequired?: boolean;
  challengeType?: '2fa' | 'checkpoint' | 'unknown';
  challengeUrl?: string;
  accountInfo?: {
    username: string;
    fullName?: string;
    followerCount?: number;
    followingCount?: number;
    profilePicUrl?: string;
  };
}

export interface SessionVerificationResult {
  valid: boolean;
  error?: string;
  needsRefresh?: boolean;
}

export class AuthService {
  /**
   * Authenticate an Instagram account
   * Auto-detects account type and uses appropriate method
   */
  async authenticate(accountId: string): Promise<AuthenticationResult> {
    try {
      const account = await accountService.getAccountById(accountId);

      if (!account) {
        return {
          success: false,
          error: 'Account not found',
        };
      }

      logger.info(`Authenticating account ${account.username} (${account.account_type})`);

      // Business accounts with access token
      if (account.account_type === 'business' && account.access_token) {
        return await this.authenticateBusinessAccount(account);
      }

      // Personal accounts with username/password
      if (account.account_type === 'personal') {
        return await this.authenticatePersonalAccount(account);
      }

      return {
        success: false,
        error: 'Account type not supported or missing credentials',
      };
    } catch (error: any) {
      logger.error(`Authentication failed for account ${accountId}:`, error);
      return {
        success: false,
        error: error.message || 'Authentication failed',
      };
    }
  }

  /**
   * Authenticate personal account using username/password
   */
  private async authenticatePersonalAccount(account: any): Promise<AuthenticationResult> {
    try {
      // Check if we have a valid session token
      if (account.session_token) {
        const verification = await this.verifyPersonalSession(account);
        if (verification.valid) {
          logger.info(`Existing session valid for ${account.username}`);
          return {
            success: true,
            authenticated: true,
            sessionToken: account.session_token,
          };
        }
      }

      // No valid session, need to login
      const password = await accountService.getAccountPassword(account.id);
      if (!password) {
        return {
          success: false,
          error: 'Password not found for account',
        };
      }

      const client = new PrivateApiClient(account.username);
      const loginResult = await client.login(password);

      if (!loginResult.success) {
        // Check for specific error types
        if (loginResult.error?.includes('challenge_required')) {
          logger.warn(`Challenge required for ${account.username}`);
          return {
            success: false,
            authenticated: false,
            challengeRequired: true,
            challengeType: 'checkpoint',
            error: 'Instagram requires verification. Please verify your account in the Instagram app.',
          };
        }

        if (loginResult.error?.includes('two_factor_required')) {
          logger.warn(`2FA required for ${account.username}`);
          return {
            success: false,
            authenticated: false,
            challengeRequired: true,
            challengeType: '2fa',
            error: 'Two-factor authentication required',
          };
        }

        return {
          success: false,
          authenticated: false,
          error: loginResult.error,
        };
      }

      // Get account info
      const userInfo = await client.getUserInfo();

      // Update account in database
      await accountService.updateAccount(account.id, {
        session_token: loginResult.sessionToken,
        is_authenticated: true,
        last_auth_check: new Date().toISOString(),
        instagram_user_id: userInfo.userId,
        profile_pic_url: userInfo.profilePicUrl,
        follower_count: userInfo.followerCount,
        account_status: 'active',
      });

      logger.info(`Successfully authenticated ${account.username}`);

      return {
        success: true,
        authenticated: true,
        sessionToken: loginResult.sessionToken,
        accountInfo: {
          username: userInfo.username,
          fullName: userInfo.fullName,
          followerCount: userInfo.followerCount,
          followingCount: userInfo.followingCount,
          profilePicUrl: userInfo.profilePicUrl,
        },
      };
    } catch (error: any) {
      logger.error(`Personal account authentication failed for ${account.username}:`, error);

      // Update account status
      await accountService.updateAccount(account.id, {
        is_authenticated: false,
        account_status: 'error',
        last_auth_check: new Date().toISOString(),
      });

      return {
        success: false,
        authenticated: false,
        error: error.message || 'Authentication failed',
      };
    }
  }

  /**
   * Authenticate business account using access token
   */
  private async authenticateBusinessAccount(account: any): Promise<AuthenticationResult> {
    try {
      if (!account.access_token || !account.instagram_user_id) {
        return {
          success: false,
          error: 'Missing access token or Instagram user ID',
        };
      }

      const client = new GraphApiClient(account.access_token, account.instagram_user_id);

      // Validate token
      const isValid = await client.validateToken();

      if (!isValid) {
        logger.warn(`Access token invalid for ${account.username}`);

        // Mark as unauthenticated
        await accountService.updateAccount(account.id, {
          is_authenticated: false,
          account_status: 'error',
          last_auth_check: new Date().toISOString(),
        });

        return {
          success: false,
          authenticated: false,
          error: 'Access token expired or invalid. Please re-authenticate.',
        };
      }

      // Get account info
      const accountInfo = await client.getAccountInfo();

      // Update account in database
      await accountService.updateAccount(account.id, {
        is_authenticated: true,
        last_auth_check: new Date().toISOString(),
        profile_pic_url: accountInfo.profile_picture_url,
        follower_count: accountInfo.followers_count,
        account_status: 'active',
      });

      logger.info(`Successfully validated token for ${account.username}`);

      return {
        success: true,
        authenticated: true,
        accountInfo: {
          username: accountInfo.username,
          followerCount: accountInfo.followers_count,
          profilePicUrl: accountInfo.profile_picture_url,
        },
      };
    } catch (error: any) {
      logger.error(`Business account authentication failed for ${account.username}:`, error);

      // Update account status
      await accountService.updateAccount(account.id, {
        is_authenticated: false,
        account_status: 'error',
        last_auth_check: new Date().toISOString(),
      });

      return {
        success: false,
        authenticated: false,
        error: error.message || 'Authentication failed',
      };
    }
  }

  /**
   * Verify if a personal account's session is still valid
   */
  async verifyPersonalSession(account: any): Promise<SessionVerificationResult> {
    try {
      if (!account.session_token) {
        return { valid: false, error: 'No session token' };
      }

      const client = new PrivateApiClient(account.username);
      const restored = await client.restoreSession(account.session_token);

      if (!restored) {
        return { valid: false, error: 'Session restoration failed' };
      }

      const isValid = await client.isSessionValid();

      if (!isValid) {
        return { valid: false, needsRefresh: true };
      }

      return { valid: true };
    } catch (error: any) {
      logger.error(`Session verification failed for ${account.username}:`, error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Refresh a personal account's session
   */
  async refreshSession(accountId: string): Promise<AuthenticationResult> {
    try {
      logger.info(`Refreshing session for account ${accountId}`);

      const account = await accountService.getAccountById(accountId);

      if (!account) {
        return {
          success: false,
          error: 'Account not found',
        };
      }

      // For personal accounts, we need to re-login
      if (account.account_type === 'personal') {
        return await this.authenticatePersonalAccount(account);
      }

      // For business accounts, session refresh not needed (long-lived tokens)
      // But we can validate the token
      if (account.account_type === 'business') {
        return await this.authenticateBusinessAccount(account);
      }

      return {
        success: false,
        error: 'Unsupported account type',
      };
    } catch (error: any) {
      logger.error(`Session refresh failed for account ${accountId}:`, error);
      return {
        success: false,
        error: error.message || 'Session refresh failed',
      };
    }
  }

  /**
   * Handle 2FA challenge (placeholder for future implementation)
   */
  async handle2FAChallenge(accountId: string, code: string): Promise<AuthenticationResult> {
    try {
      const account = await accountService.getAccountById(accountId);

      if (!account) {
        return {
          success: false,
          error: 'Account not found',
        };
      }

      // TODO: Implement 2FA code submission
      // This requires extending PrivateApiClient to handle 2FA challenges

      logger.warn(`2FA handling not yet implemented for ${account.username}`);

      return {
        success: false,
        error: '2FA handling not yet implemented. Please disable 2FA on the Instagram account.',
      };
    } catch (error: any) {
      logger.error(`2FA challenge handling failed:`, error);
      return {
        success: false,
        error: error.message || '2FA challenge failed',
      };
    }
  }

  /**
   * Handle checkpoint challenge (placeholder for future implementation)
   */
  async handleCheckpointChallenge(accountId: string): Promise<AuthenticationResult> {
    try {
      const account = await accountService.getAccountById(accountId);

      if (!account) {
        return {
          success: false,
          error: 'Account not found',
        };
      }

      // TODO: Implement checkpoint challenge handling
      // For now, user must verify in Instagram app

      logger.warn(`Checkpoint challenge for ${account.username} - user must verify in app`);

      return {
        success: false,
        error: 'Instagram requires verification. Please open Instagram app and complete the verification process.',
        challengeRequired: true,
        challengeType: 'checkpoint',
      };
    } catch (error: any) {
      logger.error(`Checkpoint challenge handling failed:`, error);
      return {
        success: false,
        error: error.message || 'Checkpoint challenge failed',
      };
    }
  }

  /**
   * Check health of all accounts and refresh sessions if needed
   * Should be run periodically (e.g., every 6 hours)
   */
  async checkAccountsHealth(userId: string): Promise<{
    checked: number;
    refreshed: number;
    failed: number;
  }> {
    try {
      const accounts = await accountService.getAccountsByUserId(userId);

      let checked = 0;
      let refreshed = 0;
      let failed = 0;

      for (const account of accounts) {
        checked++;

        try {
          // Check last auth time
          const lastCheck = account.last_auth_check
            ? new Date(account.last_auth_check)
            : new Date(0);

          const hoursSinceLastCheck = (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60);

          // Refresh if more than 6 hours since last check
          if (hoursSinceLastCheck > 6) {
            logger.info(`Refreshing session for ${account.username} (${hoursSinceLastCheck.toFixed(1)}h since last check)`);

            const result = await this.refreshSession(account.id);

            if (result.success) {
              refreshed++;
            } else {
              failed++;
              logger.warn(`Failed to refresh ${account.username}: ${result.error}`);
            }
          }
        } catch (error: any) {
          failed++;
          logger.error(`Health check failed for ${account.username}:`, error);
        }
      }

      logger.info(`Account health check complete: ${checked} checked, ${refreshed} refreshed, ${failed} failed`);

      return { checked, refreshed, failed };
    } catch (error: any) {
      logger.error('Account health check failed:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
