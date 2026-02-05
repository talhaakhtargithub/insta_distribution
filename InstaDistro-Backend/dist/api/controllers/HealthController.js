"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const HealthMonitor_1 = __importDefault(require("../../services/health/HealthMonitor"));
const MetricsCollector_1 = __importDefault(require("../../services/health/MetricsCollector"));
const AlertManager_1 = __importDefault(require("../../services/health/AlertManager"));
const HealthMonitorJob_1 = require("../../jobs/HealthMonitorJob");
const logger_1 = require("../../config/logger");
// ============================================
// HEALTH CONTROLLER
// ============================================
class HealthController {
    /**
     * GET /api/health/account/:id
     * Get health report for a specific account
     */
    async getAccountHealth(req, res) {
        try {
            const { id } = req.params;
            const report = await HealthMonitor_1.default.monitorAccount(id);
            res.json({
                success: true,
                data: report
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting account health', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * POST /api/health/account/:id/monitor
     * Queue background monitoring for an account
     */
    async queueAccountMonitoring(req, res) {
        try {
            const { id } = req.params;
            const userId = req.body.userId || req.user?.id;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const job = await (0, HealthMonitorJob_1.queueAccountMonitoring)(id, userId);
            res.json({
                success: true,
                data: {
                    jobId: job.id,
                    message: 'Account monitoring queued'
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error queuing account monitoring', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * GET /api/health/swarm
     * Get health overview for all user's accounts
     */
    async getSwarmHealth(req, res) {
        try {
            const userId = req.query.userId || req.user?.id;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const report = await HealthMonitor_1.default.monitorSwarm(userId);
            res.json({
                success: true,
                data: report
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting swarm health', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * POST /api/health/swarm/monitor
     * Queue background swarm monitoring
     */
    async queueSwarmMonitoring(req, res) {
        try {
            const userId = req.body.userId || req.user?.id;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const job = await (0, HealthMonitorJob_1.queueSwarmMonitoring)(userId);
            res.json({
                success: true,
                data: {
                    jobId: job.id,
                    message: 'Swarm monitoring queued'
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error queuing swarm monitoring', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * GET /api/health/alerts
     * Get active alerts for user
     */
    async getAlerts(req, res) {
        try {
            const userId = req.query.userId || req.user?.id;
            const unacknowledgedOnly = req.query.unacknowledgedOnly === 'true';
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const alerts = await AlertManager_1.default.getActiveAlerts(userId, unacknowledgedOnly);
            res.json({
                success: true,
                data: {
                    alerts,
                    count: alerts.length
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting alerts', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * GET /api/health/alerts/account/:id
     * Get alerts for a specific account
     */
    async getAccountAlerts(req, res) {
        try {
            const { id } = req.params;
            const limit = parseInt(req.query.limit) || 50;
            const alerts = await AlertManager_1.default.getAccountAlerts(id, limit);
            res.json({
                success: true,
                data: {
                    alerts,
                    count: alerts.length
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting account alerts', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * POST /api/health/alerts/:id/acknowledge
     * Acknowledge an alert
     */
    async acknowledgeAlert(req, res) {
        try {
            const { id } = req.params;
            await AlertManager_1.default.acknowledgeAlert(id);
            res.json({
                success: true,
                message: 'Alert acknowledged'
            });
        }
        catch (error) {
            logger_1.logger.error('Error acknowledging alert', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * POST /api/health/alerts/:id/resolve
     * Resolve an alert
     */
    async resolveAlert(req, res) {
        try {
            const { id } = req.params;
            const { resolution } = req.body;
            await AlertManager_1.default.resolveAlert(id, resolution);
            res.json({
                success: true,
                message: 'Alert resolved'
            });
        }
        catch (error) {
            logger_1.logger.error('Error resolving alert', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * GET /api/health/alerts/stats
     * Get alert statistics
     */
    async getAlertStats(req, res) {
        try {
            const userId = req.query.userId || req.user?.id;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const stats = await AlertManager_1.default.getAlertStats(userId);
            res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting alert stats', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * GET /api/health/reports/daily
     * Get daily health report
     */
    async getDailyReport(req, res) {
        try {
            const userId = req.query.userId || req.user?.id;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const report = await HealthMonitor_1.default.generateDailyReport(userId);
            res.json({
                success: true,
                data: report
            });
        }
        catch (error) {
            logger_1.logger.error('Error generating daily report', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * POST /api/health/reports/daily/queue
     * Queue daily report generation
     */
    async queueDailyReport(req, res) {
        try {
            const userId = req.body.userId || req.user?.id;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const job = await (0, HealthMonitorJob_1.queueDailyReport)(userId);
            res.json({
                success: true,
                data: {
                    jobId: job.id,
                    message: 'Daily report generation queued'
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error queuing daily report', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * GET /api/health/reports/weekly
     * Get weekly health report
     */
    async getWeeklyReport(req, res) {
        try {
            const userId = req.query.userId || req.user?.id;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const report = await HealthMonitor_1.default.generateWeeklyReport(userId);
            res.json({
                success: true,
                data: report
            });
        }
        catch (error) {
            logger_1.logger.error('Error generating weekly report', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * POST /api/health/reports/weekly/queue
     * Queue weekly report generation
     */
    async queueWeeklyReport(req, res) {
        try {
            const userId = req.body.userId || req.user?.id;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const job = await (0, HealthMonitorJob_1.queueWeeklyReport)(userId);
            res.json({
                success: true,
                data: {
                    jobId: job.id,
                    message: 'Weekly report generation queued'
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error queuing weekly report', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * GET /api/health/metrics/:accountId
     * Get detailed metrics for an account
     */
    async getAccountMetrics(req, res) {
        try {
            const { accountId } = req.params;
            const days = parseInt(req.query.days) || 30;
            const [metrics, history, dailyAggregates, weeklyAggregates] = await Promise.all([
                MetricsCollector_1.default.collectAccountMetrics(accountId),
                MetricsCollector_1.default.getMetricsHistory(accountId, days),
                MetricsCollector_1.default.getDailyAggregates(accountId, 7),
                MetricsCollector_1.default.getWeeklyAggregates(accountId, 4)
            ]);
            res.json({
                success: true,
                data: {
                    current: metrics,
                    history,
                    daily: dailyAggregates,
                    weekly: weeklyAggregates
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting account metrics', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}
exports.HealthController = HealthController;
exports.default = new HealthController();
