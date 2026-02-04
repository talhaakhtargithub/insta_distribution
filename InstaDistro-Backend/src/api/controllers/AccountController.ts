import { Request, Response } from 'express';
import { accountService } from '../../services/swarm/AccountService';

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

      // Remove encrypted password from response
      const { encrypted_password, ...accountData } = account;

      res.status(201).json({
        message: 'Account created successfully',
        account: accountData,
      });
    } catch (error: any) {
      console.error('Create account error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to create account',
      });
    }
  }

  /**
   * GET /api/accounts
   * Get all accounts for the authenticated user
   */
  async getAccounts(req: Request, res: Response) {
    try {
      // Get user ID from JWT (placeholder)
      const userId = req.headers['x-user-id'] as string || 'user_1';

      // Optional filter by state
      const state = req.query.state as string;

      let accounts;
      if (state) {
        accounts = await accountService.getAccountsByState(userId, state);
      } else {
        accounts = await accountService.getAccountsByUserId(userId);
      }

      // Remove encrypted passwords from response
      const accountsData = accounts.map(({ encrypted_password, ...account }) => account);

      res.json({
        count: accountsData.length,
        accounts: accountsData,
      });
    } catch (error: any) {
      console.error('Get accounts error:', error);
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
      console.error('Get account error:', error);
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

      // Remove encrypted password from response
      const { encrypted_password, ...accountData } = account;

      res.json({
        message: 'Account updated successfully',
        account: accountData,
      });
    } catch (error: any) {
      console.error('Update account error:', error);
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

      res.json({
        message: 'Account deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete account error:', error);
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

      res.json({
        message: 'Bulk import completed',
        imported: result.success.length,
        failed: result.failed.length,
        success: result.success.map(({ encrypted_password, ...account }) => account),
        failures: result.failed,
      });
    } catch (error: any) {
      console.error('Bulk import error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to import accounts',
      });
    }
  }

  /**
   * POST /api/accounts/:id/verify
   * Verify Instagram credentials for an account
   */
  async verifyAccount(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const account = await accountService.getAccountById(id);

      if (!account) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Account not found',
        });
      }

      // TODO: Integrate with Instagram API to verify credentials
      // For now, return placeholder response

      res.json({
        message: 'Account verification not yet implemented',
        account_id: id,
        verified: false,
        note: 'Instagram API integration pending',
      });
    } catch (error: any) {
      console.error('Verify account error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to verify account',
      });
    }
  }

  /**
   * GET /api/accounts/stats/swarm
   * Get swarm dashboard statistics
   */
  async getSwarmStats(req: Request, res: Response) {
    try {
      // Get user ID from JWT (placeholder)
      const userId = req.headers['x-user-id'] as string || 'user_1';

      const stats = await accountService.getSwarmStats(userId);

      res.json({
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Get swarm stats error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to fetch statistics',
      });
    }
  }
}

export const accountController = new AccountController();
