"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountController = exports.AccountController = void 0;
const AccountService_1 = require("../../services/swarm/AccountService");
const AuthService_1 = require("../../services/instagram/AuthService");
const logger_1 = require("../../config/logger");
const CacheService_1 = require("../../services/cache/CacheService");
const pagination_1 = require("../../utils/pagination");
const performance_1 = require("../../utils/performance");
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
            // Get user ID from JWT (attached by auth middleware)
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'User ID not found in token',
                });
            }
            const account = await AccountService_1.accountService.createAccount({
                user_id: userId,
                username,
                password,
                account_type: accountType,
                proxy_id: proxyId,
            });
            // Invalidate user's account caches
            await CacheService_1.cacheService.invalidateUser(userId);
            // Remove encrypted password from response
            const { encrypted_password, ...accountData } = account;
            res.status(201).json({
                message: 'Account created successfully',
                account: accountData,
            });
        }
        catch (error) {
            logger_1.logger.error('Create account error', { error: error.message, stack: error.stack });
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
    async getAccounts(req, res) {
        const tracker = new performance_1.PerformanceTracker();
        try {
            // Get user ID from JWT (placeholder)
            const userId = req.headers['x-user-id'] || 'user_1';
            // Optional filter by state
            const state = req.query.state;
            // Parse pagination params
            const { cursor, limit } = (0, pagination_1.parseCursorPaginationParams)(req.query);
            tracker.checkpoint('params-parsed');
            // Build cache key
            const cacheKey = CacheService_1.cacheService.key(state ? CacheService_1.CacheNamespace.ACCOUNTS_LIST : CacheService_1.CacheNamespace.ACCOUNTS_LIST, userId, state || 'all', cursor || 'initial', limit.toString());
            // Try to get from cache
            const cached = await CacheService_1.cacheService.get(cacheKey);
            if (cached) {
                tracker.checkpoint('cache-hit');
                tracker.logSummary('GET /api/accounts [cached]');
                return res.json(cached);
            }
            tracker.checkpoint('cache-miss');
            // Fetch from database
            let accounts;
            if (state) {
                accounts = await AccountService_1.accountService.getAccountsByState(userId, state);
            }
            else {
                accounts = await AccountService_1.accountService.getAccountsByUserId(userId);
            }
            tracker.checkpoint('accounts-fetched');
            // Remove encrypted passwords from response
            const accountsData = accounts.map(({ encrypted_password, ...account }) => account);
            // Create paginated response
            const response = (0, pagination_1.createCursorPaginatedResponse)(accountsData, limit);
            tracker.checkpoint('response-created');
            // Cache the response
            await CacheService_1.cacheService.set(cacheKey, response, CacheService_1.CacheTTL.MEDIUM);
            tracker.checkpoint('response-cached');
            tracker.logSummary('GET /api/accounts');
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error('Get accounts error', { error: error.message, stack: error.stack });
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
            logger_1.logger.error('Get account error', { error: error.message, stack: error.stack });
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
            // Invalidate account-specific caches
            await CacheService_1.cacheService.invalidateAccount(id);
            // Remove encrypted password from response
            const { encrypted_password, ...accountData } = account;
            res.json({
                message: 'Account updated successfully',
                account: accountData,
            });
        }
        catch (error) {
            logger_1.logger.error('Update account error', { error: error.message, stack: error.stack });
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
            // Invalidate account-specific caches
            await CacheService_1.cacheService.invalidateAccount(id);
            res.json({
                message: 'Account deleted successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Delete account error', { error: error.message, stack: error.stack });
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
            // Invalidate user's account caches after bulk import
            if (result.success.length > 0) {
                await CacheService_1.cacheService.invalidateUser(userId);
            }
            res.json({
                message: 'Bulk import completed',
                imported: result.success.length,
                failed: result.failed.length,
                success: result.success.map(({ encrypted_password, ...account }) => account),
                failures: result.failed,
            });
        }
        catch (error) {
            logger_1.logger.error('Bulk import error', { error: error.message, stack: error.stack });
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
    async getSwarmStats(req, res) {
        const tracker = new performance_1.PerformanceTracker();
        try {
            // Get user ID from JWT (placeholder)
            const userId = req.headers['x-user-id'] || 'user_1';
            // Use cache-aside pattern with getOrSet
            const stats = await CacheService_1.cacheService.getOrSet(CacheService_1.cacheService.key(CacheService_1.CacheNamespace.HEALTH_SWARM, userId), async () => await AccountService_1.accountService.getSwarmStats(userId), CacheService_1.CacheTTL.SHORT // 5 minutes - stats can be slightly stale
            );
            tracker.checkpoint('stats-fetched');
            const response = {
                stats,
                timestamp: new Date().toISOString(),
            };
            tracker.logSummary('GET /api/accounts/stats/swarm');
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error('Get swarm stats error', { error: error.message, stack: error.stack });
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
            logger_1.logger.info('Verifying account', { accountId: id });
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
            logger_1.logger.error('Verify account error', { error: error.message, stack: error.stack });
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
            logger_1.logger.info('Refreshing session for account', { accountId: id });
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
            logger_1.logger.error('Refresh session error', { error: error.message, stack: error.stack });
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
            logger_1.logger.info('Running health check for user', { userId });
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
            logger_1.logger.error('Health check error', { error: error.message, stack: error.stack });
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
            logger_1.logger.info('Submitting 2FA code for account', { accountId: id });
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
            logger_1.logger.error('2FA challenge error', { error: error.message, stack: error.stack });
            res.status(500).json({
                error: 'Server Error',
                message: error.message || '2FA verification failed',
            });
        }
    }
}
exports.AccountController = AccountController;
exports.accountController = new AccountController();
