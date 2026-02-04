"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountController = exports.AccountController = void 0;
const AccountService_1 = require("../../services/swarm/AccountService");
const AuthService_1 = require("../../services/instagram/AuthService");
class AccountController {
    /**
     * POST /api/accounts
     * Create a new account
     */
    async createAccount(req, res) {
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
            const userId = req.headers['x-user-id'] || 'user_1';
            const account = await AccountService_1.accountService.createAccount({
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
        }
        catch (error) {
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
    async getAccounts(req, res) {
        try {
            // Get user ID from JWT (placeholder)
            const userId = req.headers['x-user-id'] || 'user_1';
            // Optional filter by state
            const state = req.query.state;
            let accounts;
            if (state) {
                accounts = await AccountService_1.accountService.getAccountsByState(userId, state);
            }
            else {
                accounts = await AccountService_1.accountService.getAccountsByUserId(userId);
            }
            // Remove encrypted passwords from response
            const accountsData = accounts.map(({ encrypted_password, ...account }) => account);
            res.json({
                count: accountsData.length,
                accounts: accountsData,
            });
        }
        catch (error) {
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
    async getAccountById(req, res) {
        try {
            const { id } = req.params;
            const account = await AccountService_1.accountService.getAccountById(id);
            if (!account) {
                return res.status(404).json({
                    error: 'Not Found',
                    message: 'Account not found',
                });
            }
            // Remove encrypted password from response
            const { encrypted_password, ...accountData } = account;
            res.json({ account: accountData });
        }
        catch (error) {
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
    async updateAccount(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;
            const account = await AccountService_1.accountService.updateAccount(id, updates);
            // Remove encrypted password from response
            const { encrypted_password, ...accountData } = account;
            res.json({
                message: 'Account updated successfully',
                account: accountData,
            });
        }
        catch (error) {
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
    async deleteAccount(req, res) {
        try {
            const { id } = req.params;
            await AccountService_1.accountService.deleteAccount(id);
            res.json({
                message: 'Account deleted successfully',
            });
        }
        catch (error) {
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
    async bulkImport(req, res) {
        try {
            const { accounts } = req.body;
            if (!Array.isArray(accounts) || accounts.length === 0) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'accounts array is required and must not be empty',
                });
            }
            // Get user ID from JWT (placeholder)
            const userId = req.headers['x-user-id'] || 'user_1';
            const result = await AccountService_1.accountService.bulkImport(userId, accounts);
            res.json({
                message: 'Bulk import completed',
                imported: result.success.length,
                failed: result.failed.length,
                success: result.success.map(({ encrypted_password, ...account }) => account),
                failures: result.failed,
            });
        }
        catch (error) {
            console.error('Bulk import error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to import accounts',
            });
        }
    }
    /**
     * GET /api/accounts/stats/swarm
     * Get swarm dashboard statistics
     */
    async getSwarmStats(req, res) {
        try {
            // Get user ID from JWT (placeholder)
            const userId = req.headers['x-user-id'] || 'user_1';
            const stats = await AccountService_1.accountService.getSwarmStats(userId);
            res.json({
                stats,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('Get swarm stats error:', error);
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
    async verifyAccount(req, res) {
        try {
            const { id } = req.params;
            console.log(`Verifying account ${id}`);
            const result = await AuthService_1.authService.authenticate(id);
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
        }
        catch (error) {
            console.error('Verify account error:', error);
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
    async refreshSession(req, res) {
        try {
            const { id } = req.params;
            console.log(`Refreshing session for account ${id}`);
            const result = await AuthService_1.authService.refreshSession(id);
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
        }
        catch (error) {
            console.error('Refresh session error:', error);
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
    async healthCheck(req, res) {
        try {
            const userId = req.headers['x-user-id'] || 'user_1';
            console.log(`Running health check for user ${userId}`);
            const result = await AuthService_1.authService.checkAccountsHealth(userId);
            res.json({
                success: true,
                message: 'Health check completed',
                checked: result.checked,
                refreshed: result.refreshed,
                failed: result.failed,
            });
        }
        catch (error) {
            console.error('Health check error:', error);
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
    async submit2FACode(req, res) {
        try {
            const { id } = req.params;
            const { code } = req.body;
            if (!code) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: '2FA code is required',
                });
            }
            console.log(`Submitting 2FA code for account ${id}`);
            const result = await AuthService_1.authService.handle2FAChallenge(id, code);
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
        }
        catch (error) {
            console.error('2FA challenge error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || '2FA verification failed',
            });
        }
    }
}
exports.AccountController = AccountController;
exports.accountController = new AccountController();
