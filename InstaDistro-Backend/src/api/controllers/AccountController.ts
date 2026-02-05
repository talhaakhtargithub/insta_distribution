import { Request, Response } from 'express';
import { accountService } from '../../services/swarm/AccountService';
import { authService } from '../../services/instagram/AuthService';
import { logger } from '../../config/logger';
import { cacheService, CacheTTL, CacheNamespace } from '../../services/cache/CacheService';
import { parseCursorPaginationParams, createCursorPaginatedResponse } from '../../utils/pagination';
import { PerformanceTracker } from '../../utils/performance';

export class AccountController {
  /**
   * POST /api/accounts
   * Create a new account
   */
  async createAccount(req: Request, res: Response) {
    try {
      const { username, password, accountType, proxyId } = req.body;

      // Validation
      if (!username || !password) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Username and password are required',
        });
      }

      if (!accountType || !['personal', 'business'].includes(accountType)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'accountType must be either "personal" or "business"',
        });
      }

      // Get user ID from JWT (for now, using a placeholder)
      // In production, extract from JWT token: req.user.id
      const userId = req.headers['x-user-id'] as string || 'user_1';

      const account = await accountService.createAccount({
        user_id: userId,
        username,
        password,
        account_type: accountType,
        proxy_id: proxyId,
      });

      // Invalidate user's account caches
      await cacheService.invalidateUser(userId);

      // Remove encrypted password from response
      const { encrypted_password, ...accountData } = account;

      res.status(201).json({
        message: 'Account created successfully',
        account: accountData,
      });
    } catch (error: any) {
      logger.error('Create account error', { error: error.message, stack: error.stack });
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to create account',
      });
    }
  }

  /**
   * GET /api/accounts
   * Get all accounts for the authenticated user
   * Supports cursor-based pagination and caching
   */
  async getAccounts(req: Request, res: Response) {
    const tracker = new PerformanceTracker();

    try {
      // Get user ID from JWT (placeholder)
      const userId = req.headers['x-user-id'] as string || 'user_1';

      // Optional filter by state
      const state = req.query.state as string;

      // Parse pagination params
      const { cursor, limit } = parseCursorPaginationParams(req.query);
      tracker.checkpoint('params-parsed');

      // Build cache key
      const cacheKey = cacheService.key(
        state ? CacheNamespace.ACCOUNTS_LIST : CacheNamespace.ACCOUNTS_LIST,
        userId,
        state || 'all',
        cursor || 'initial',
        limit.toString()
      );

      // Try to get from cache
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) {
        tracker.checkpoint('cache-hit');
        tracker.logSummary('GET /api/accounts [cached]');
        return res.json(cached);
      }

      tracker.checkpoint('cache-miss');

      // Fetch from database
      let accounts;
      if (state) {
        accounts = await accountService.getAccountsByState(userId, state);
      } else {
        accounts = await accountService.getAccountsByUserId(userId);
      }
      tracker.checkpoint('accounts-fetched');

      // Remove encrypted passwords from response
      const accountsData = accounts.map(({ encrypted_password, ...account }) => account);

      // Create paginated response
      const response = createCursorPaginatedResponse(accountsData as any[], limit);
      tracker.checkpoint('response-created');

      // Cache the response
      await cacheService.set(cacheKey, response, CacheTTL.MEDIUM);
      tracker.checkpoint('response-cached');

      tracker.logSummary('GET /api/accounts');
      res.json(response);
    } catch (error: any) {
      logger.error('Get accounts error', { error: error.message, stack: error.stack });
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to fetch accounts',
      });
    }
  }

  /**
   * GET /api/accounts/:id
   * Get a single account by ID
   */
  async getAccountById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const account = await accountService.getAccountById(id);

      if (!account) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Account not found',
        });
      }

      // Remove encrypted password from response
      const { encrypted_password, ...accountData } = account;

      res.json({ account: accountData });
    } catch (error: any) {
      logger.error('Get account error', { error: error.message, stack: error.stack });
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to fetch account',
      });
    }
  }

  /**
   * PUT /api/accounts/:id
   * Update an existing account
   */
  async updateAccount(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const account = await accountService.updateAccount(id, updates);

      // Invalidate account-specific caches
      await cacheService.invalidateAccount(id);

      // Remove encrypted password from response
      const { encrypted_password, ...accountData } = account;

      res.json({
        message: 'Account updated successfully',
        account: accountData,
      });
    } catch (error: any) {
      logger.error('Update account error', { error: error.message, stack: error.stack });
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to update account',
      });
    }
  }

  /**
   * DELETE /api/accounts/:id
   * Delete an account
   */
  async deleteAccount(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await accountService.deleteAccount(id);

      // Invalidate account-specific caches
      await cacheService.invalidateAccount(id);

      res.json({
        message: 'Account deleted successfully',
      });
    } catch (error: any) {
      logger.error('Delete account error', { error: error.message, stack: error.stack });
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to delete account',
      });
    }
  }

  /**
   * POST /api/accounts/bulk-import
   * Bulk import accounts from CSV/JSON
   */
  async bulkImport(req: Request, res: Response) {
    try {
      const { accounts } = req.body;

      if (!Array.isArray(accounts) || accounts.length === 0) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'accounts array is required and must not be empty',
        });
      }

      // Get user ID from JWT (placeholder)
      const userId = req.headers['x-user-id'] as string || 'user_1';

      const result = await accountService.bulkImport(userId, accounts);

      // Invalidate user's account caches after bulk import
      if (result.success.length > 0) {
        await cacheService.invalidateUser(userId);
      }

      res.json({
        message: 'Bulk import completed',
        imported: result.success.length,
        failed: result.failed.length,
        success: result.success.map(({ encrypted_password, ...account }) => account),
        failures: result.failed,
      });
    } catch (error: any) {
      logger.error('Bulk import error', { error: error.message, stack: error.stack });
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to import accounts',
      });
    }
  }

  /**
   * GET /api/accounts/stats/swarm
   * Get swarm dashboard statistics
   * Cached for performance
   */
  async getSwarmStats(req: Request, res: Response) {
    const tracker = new PerformanceTracker();

    try {
      // Get user ID from JWT (placeholder)
      const userId = req.headers['x-user-id'] as string || 'user_1';

      // Use cache-aside pattern with getOrSet
      const stats = await cacheService.getOrSet(
        cacheService.key(CacheNamespace.HEALTH_SWARM, userId),
        async () => await accountService.getSwarmStats(userId),
        CacheTTL.SHORT // 5 minutes - stats can be slightly stale
      );
      tracker.checkpoint('stats-fetched');

      const response = {
        stats,
        timestamp: new Date().toISOString(),
      };

      tracker.logSummary('GET /api/accounts/stats/swarm');
      res.json(response);
    } catch (error: any) {
      logger.error('Get swarm stats error', { error: error.message, stack: error.stack });
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to fetch statistics',
      });
    }
  }

  /**
   * POST /api/accounts/:id/verify
   * Verify Instagram account credentials and authenticate
   */
  async verifyAccount(req: Request, res: Response) {
    try {
      const { id } = req.params;

      logger.info('Verifying account', { accountId: id });

      const result = await authService.authenticate(id);

      if (!result.success) {
        return res.status(400).json({
          error: 'Verification Failed',
          message: result.error || 'Failed to verify account',
          challengeRequired: result.challengeRequired,
          challengeType: result.challengeType,
        });
      }

      res.json({
        success: true,
        message: 'Account verified successfully',
        authenticated: result.authenticated,
        accountInfo: result.accountInfo,
      });
    } catch (error: any) {
      logger.error('Verify account error', { error: error.message, stack: error.stack });
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Verification failed',
      });
    }
  }

  /**
   * POST /api/accounts/:id/refresh-session
   * Refresh account session/token
   */
  async refreshSession(req: Request, res: Response) {
    try {
      const { id } = req.params;

      logger.info('Refreshing session for account', { accountId: id });

      const result = await authService.refreshSession(id);

      if (!result.success) {
        return res.status(400).json({
          error: 'Refresh Failed',
          message: result.error || 'Failed to refresh session',
        });
      }

      res.json({
        success: true,
        message: 'Session refreshed successfully',
        authenticated: result.authenticated,
      });
    } catch (error: any) {
      logger.error('Refresh session error', { error: error.message, stack: error.stack });
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Session refresh failed',
      });
    }
  }

  /**
   * POST /api/accounts/health-check
   * Check health of all accounts and refresh sessions
   */
  async healthCheck(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string || 'user_1';

      logger.info('Running health check for user', { userId });

      const result = await authService.checkAccountsHealth(userId);

      res.json({
        success: true,
        message: 'Health check completed',
        checked: result.checked,
        refreshed: result.refreshed,
        failed: result.failed,
      });
    } catch (error: any) {
      logger.error('Health check error', { error: error.message, stack: error.stack });
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Health check failed',
      });
    }
  }

  /**
   * POST /api/accounts/:id/2fa-challenge
   * Submit 2FA code for account verification
   */
  async submit2FACode(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          error: 'Validation Error',
          message: '2FA code is required',
        });
      }

      logger.info('Submitting 2FA code for account', { accountId: id });

      const result = await authService.handle2FAChallenge(id, code);

      if (!result.success) {
        return res.status(400).json({
          error: '2FA Verification Failed',
          message: result.error || 'Failed to verify 2FA code',
        });
      }

      res.json({
        success: true,
        message: '2FA verification successful',
        authenticated: result.authenticated,
      });
    } catch (error: any) {
      logger.error('2FA challenge error', { error: error.message, stack: error.stack });
      res.status(500).json({
        error: 'Server Error',
        message: error.message || '2FA verification failed',
      });
    }
  }
}

export const accountController = new AccountController();
