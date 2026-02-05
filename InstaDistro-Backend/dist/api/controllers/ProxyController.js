"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyController = void 0;
const ProxyService_1 = __importDefault(require("../../services/proxy/ProxyService"));
const ProxyHealthMonitor_1 = __importDefault(require("../../services/proxy/ProxyHealthMonitor"));
const ProxyRotationManager_1 = __importDefault(require("../../services/proxy/ProxyRotationManager"));
const logger_1 = require("../../config/logger");
// ============================================
// PROXY CONTROLLER
// ============================================
class ProxyController {
    /**
     * POST /api/proxies
     * Create a new proxy
     */
    async createProxy(req, res) {
        try {
            const { userId, type, host, port, username, password, country, city } = req.body;
            // Validation
            if (!userId || !type || !host || !port) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: userId, type, host, port'
                });
            }
            if (!['residential', 'datacenter', 'mobile'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid proxy type. Must be: residential, datacenter, or mobile'
                });
            }
            const proxy = await ProxyService_1.default.createProxy(userId, type, host, port, username, password, country, city);
            res.status(201).json({
                success: true,
                data: proxy
            });
        }
        catch (error) {
            logger_1.logger.error('Error creating proxy', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * GET /api/proxies
     * Get all proxies for a user
     */
    async getProxies(req, res) {
        try {
            const userId = req.query.userId || req.user?.id;
            const activeOnly = req.query.activeOnly === 'true';
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const proxies = await ProxyService_1.default.getProxiesByUser(userId, activeOnly);
            res.json({
                success: true,
                data: {
                    proxies,
                    count: proxies.length
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting proxies', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * GET /api/proxies/:id
     * Get proxy by ID
     */
    async getProxyById(req, res) {
        try {
            const { id } = req.params;
            const proxy = await ProxyService_1.default.getProxyById(id);
            if (!proxy) {
                return res.status(404).json({
                    success: false,
                    error: 'Proxy not found'
                });
            }
            res.json({
                success: true,
                data: proxy
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting proxy', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * PUT /api/proxies/:id
     * Update proxy configuration
     */
    async updateProxy(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;
            const proxy = await ProxyService_1.default.updateProxy(id, updates);
            res.json({
                success: true,
                data: proxy
            });
        }
        catch (error) {
            logger_1.logger.error('Error updating proxy', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * DELETE /api/proxies/:id
     * Delete proxy
     */
    async deleteProxy(req, res) {
        try {
            const { id } = req.params;
            await ProxyService_1.default.deleteProxy(id);
            res.json({
                success: true,
                message: 'Proxy deleted successfully'
            });
        }
        catch (error) {
            logger_1.logger.error('Error deleting proxy', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * POST /api/proxies/:id/test
     * Test proxy connection
     */
    async testProxy(req, res) {
        try {
            const { id } = req.params;
            const proxy = await ProxyService_1.default.getProxyById(id);
            if (!proxy) {
                return res.status(404).json({
                    success: false,
                    error: 'Proxy not found'
                });
            }
            const testResult = await ProxyService_1.default.testProxy(proxy);
            res.json({
                success: true,
                data: testResult
            });
        }
        catch (error) {
            logger_1.logger.error('Error testing proxy', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * POST /api/proxies/:id/assign/:accountId
     * Assign proxy to account
     */
    async assignProxy(req, res) {
        try {
            const { id, accountId } = req.params;
            await ProxyService_1.default.assignProxyToAccount(id, accountId);
            res.json({
                success: true,
                message: 'Proxy assigned successfully'
            });
        }
        catch (error) {
            logger_1.logger.error('Error assigning proxy', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * POST /api/proxies/unassign/:accountId
     * Unassign proxy from account
     */
    async unassignProxy(req, res) {
        try {
            const { accountId } = req.params;
            await ProxyService_1.default.unassignProxyFromAccount(accountId);
            res.json({
                success: true,
                message: 'Proxy unassigned successfully'
            });
        }
        catch (error) {
            logger_1.logger.error('Error unassigning proxy', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * GET /api/proxies/stats
     * Get proxy statistics
     */
    async getStats(req, res) {
        try {
            const userId = req.query.userId || req.user?.id;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const stats = await ProxyService_1.default.getProxyStats(userId);
            res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting proxy stats', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * POST /api/proxies/health/check
     * Check health of all proxies
     */
    async checkHealth(req, res) {
        try {
            const userId = req.body.userId || req.user?.id;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const report = await ProxyHealthMonitor_1.default.checkAllProxiesHealth(userId);
            res.json({
                success: true,
                data: report
            });
        }
        catch (error) {
            logger_1.logger.error('Error checking proxy health', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * POST /api/proxies/:id/health/check
     * Check health of specific proxy
     */
    async checkProxyHealth(req, res) {
        try {
            const { id } = req.params;
            const proxy = await ProxyService_1.default.getProxyById(id);
            if (!proxy) {
                return res.status(404).json({
                    success: false,
                    error: 'Proxy not found'
                });
            }
            const result = await ProxyHealthMonitor_1.default.checkProxyHealth(proxy);
            res.json({
                success: true,
                data: result
            });
        }
        catch (error) {
            logger_1.logger.error('Error checking proxy health', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * POST /api/proxies/rotate/:accountId
     * Rotate proxy for specific account
     */
    async rotateProxy(req, res) {
        try {
            const { accountId } = req.params;
            const userId = req.body.userId || req.user?.id;
            const strategy = req.body.strategy || { type: 'least-loaded' };
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const result = await ProxyRotationManager_1.default.rotateProxyForAccount(accountId, userId, strategy);
            res.json({
                success: true,
                data: result
            });
        }
        catch (error) {
            logger_1.logger.error('Error rotating proxy', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * POST /api/proxies/rotate/auto
     * Auto-rotate proxies based on usage
     */
    async autoRotate(req, res) {
        try {
            const userId = req.body.userId || req.user?.id;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const results = await ProxyRotationManager_1.default.autoRotateProxies(userId);
            res.json({
                success: true,
                data: {
                    rotations: results,
                    count: results.length
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error auto-rotating proxies', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * POST /api/proxies/rotate/group/:groupId
     * Rotate proxies for all accounts in a group
     */
    async rotateGroupProxies(req, res) {
        try {
            const { groupId } = req.params;
            const userId = req.body.userId || req.user?.id;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const results = await ProxyRotationManager_1.default.rotateGroupProxies(groupId, userId);
            res.json({
                success: true,
                data: {
                    rotations: results,
                    count: results.length
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error rotating group proxies', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * GET /api/proxies/rotation/stats
     * Get rotation statistics
     */
    async getRotationStats(req, res) {
        try {
            const userId = req.query.userId || req.user?.id;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const stats = await ProxyRotationManager_1.default.getRotationStats(userId);
            res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting rotation stats', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * GET /api/proxies/:id/performance
     * Get proxy performance metrics
     */
    async getProxyPerformance(req, res) {
        try {
            const { id } = req.params;
            const metrics = await ProxyHealthMonitor_1.default.getProxyPerformanceMetrics(id);
            res.json({
                success: true,
                data: metrics
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting proxy performance', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * GET /api/proxies/:id/trend
     * Get proxy health trend
     */
    async getProxyTrend(req, res) {
        try {
            const { id } = req.params;
            const trend = await ProxyHealthMonitor_1.default.getProxyHealthTrend(id);
            res.json({
                success: true,
                data: trend
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting proxy trend', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}
exports.ProxyController = ProxyController;
exports.default = new ProxyController();
