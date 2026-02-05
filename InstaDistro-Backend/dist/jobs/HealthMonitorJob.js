"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthMonitorQueue = void 0;
exports.scheduleAutoMonitoring = scheduleAutoMonitoring;
exports.queueAccountMonitoring = queueAccountMonitoring;
exports.queueSwarmMonitoring = queueSwarmMonitoring;
exports.queueDailyReport = queueDailyReport;
exports.queueWeeklyReport = queueWeeklyReport;
const bull_1 = __importDefault(require("bull"));
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const HealthMonitor_1 = __importDefault(require("../services/health/HealthMonitor"));
// ============================================
// HEALTH MONITOR QUEUE
// ============================================
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
exports.healthMonitorQueue = new bull_1.default('health-monitor', {
    redis: {
        host: REDIS_HOST,
        port: REDIS_PORT
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 60000 // 1 minute
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500 // Keep last 500 failed jobs
    }
});
// ============================================
// JOB PROCESSOR
// ============================================
exports.healthMonitorQueue.process('monitor-account', async (job) => {
    const { accountId, userId } = job.data;
    logger_1.logger.info(`[HealthMonitor] Monitoring account ${accountId} for user ${userId}`);
    try {
        const report = await HealthMonitor_1.default.monitorAccount(accountId);
        logger_1.logger.info(`[HealthMonitor] Account ${accountId} health: ${report.scoreBreakdown.overall}/100 (${report.scoreBreakdown.category})`);
        if (report.alerts.length > 0) {
            logger_1.logger.info(`[HealthMonitor] Account ${accountId} has ${report.alerts.length} active alerts`);
        }
        return {
            success: true,
            accountId,
            healthScore: report.scoreBreakdown.overall,
            category: report.scoreBreakdown.category,
            alertCount: report.alerts.length,
            timestamp: new Date()
        };
    }
    catch (error) {
        logger_1.logger.error(`[HealthMonitor] Error monitoring account ${accountId}:`, error);
        throw error;
    }
});
exports.healthMonitorQueue.process('monitor-swarm', async (job) => {
    const { userId } = job.data;
    logger_1.logger.info(`[HealthMonitor] Monitoring swarm for user ${userId}`);
    try {
        const report = await HealthMonitor_1.default.monitorSwarm(userId);
        logger_1.logger.info(`[HealthMonitor] Swarm health: ${report.overallHealth.avgScore.toFixed(1)}/100 (${report.overallHealth.category})`);
        logger_1.logger.info(`[HealthMonitor] ${report.overallHealth.healthyAccounts} healthy, ${report.overallHealth.criticalAccounts} critical`);
        logger_1.logger.info(`[HealthMonitor] Active alerts: ${report.activeAlerts.length}`);
        return {
            success: true,
            userId,
            avgHealthScore: report.overallHealth.avgScore,
            totalAccounts: report.swarmMetrics.totalAccounts,
            healthyAccounts: report.overallHealth.healthyAccounts,
            criticalAccounts: report.overallHealth.criticalAccounts,
            activeAlerts: report.activeAlerts.length,
            timestamp: new Date()
        };
    }
    catch (error) {
        logger_1.logger.error(`[HealthMonitor] Error monitoring swarm for user ${userId}:`, error);
        throw error;
    }
});
exports.healthMonitorQueue.process('daily-report', async (job) => {
    const { userId } = job.data;
    logger_1.logger.info(`[HealthMonitor] Generating daily report for user ${userId}`);
    try {
        const report = await HealthMonitor_1.default.generateDailyReport(userId);
        logger_1.logger.info(`[HealthMonitor] Daily report generated: ${report.summary}`);
        // In production, you would send this report via email or notification
        // await emailService.sendDailyReport(userId, report);
        return {
            success: true,
            userId,
            date: report.date,
            summary: report.summary,
            newAlerts: report.newAlerts.length,
            problemAccounts: report.problemAccounts.length,
            timestamp: new Date()
        };
    }
    catch (error) {
        logger_1.logger.error(`[HealthMonitor] Error generating daily report for user ${userId}:`, error);
        throw error;
    }
});
exports.healthMonitorQueue.process('weekly-report', async (job) => {
    const { userId } = job.data;
    logger_1.logger.info(`[HealthMonitor] Generating weekly report for user ${userId}`);
    try {
        const report = await HealthMonitor_1.default.generateWeeklyReport(userId);
        logger_1.logger.info(`[HealthMonitor] Weekly report generated: ${report.summary}`);
        // In production, you would send this report via email or notification
        // await emailService.sendWeeklyReport(userId, report);
        return {
            success: true,
            userId,
            weekStart: report.weekStart,
            weekEnd: report.weekEnd,
            summary: report.summary,
            topPerformers: report.topPerformers.length,
            problemAccounts: report.problemAccounts.length,
            timestamp: new Date()
        };
    }
    catch (error) {
        logger_1.logger.error(`[HealthMonitor] Error generating weekly report for user ${userId}:`, error);
        throw error;
    }
});
// ============================================
// JOB SCHEDULING
// ============================================
/**
 * Schedule automatic health monitoring for all active users
 * Run every 6 hours
 */
async function scheduleAutoMonitoring() {
    const client = await database_1.pool.connect();
    try {
        // Get all active users
        const usersQuery = await client.query('SELECT DISTINCT user_id FROM accounts WHERE account_status = $1', ['active']);
        const users = usersQuery.rows;
        logger_1.logger.info(`[HealthMonitor] Scheduling auto-monitoring for ${users.length} users`);
        for (const user of users) {
            // Schedule swarm monitoring every 6 hours
            await exports.healthMonitorQueue.add('monitor-swarm', { userId: user.user_id }, {
                repeat: {
                    cron: '0 */6 * * *' // Every 6 hours
                },
                jobId: `monitor-swarm-${user.user_id}` // Prevent duplicates
            });
            // Schedule daily report at 9 AM
            await exports.healthMonitorQueue.add('daily-report', { userId: user.user_id }, {
                repeat: {
                    cron: '0 9 * * *' // Daily at 9 AM
                },
                jobId: `daily-report-${user.user_id}`
            });
            // Schedule weekly report every Monday at 9 AM
            await exports.healthMonitorQueue.add('weekly-report', { userId: user.user_id }, {
                repeat: {
                    cron: '0 9 * * 1' // Mondays at 9 AM
                },
                jobId: `weekly-report-${user.user_id}`
            });
        }
        logger_1.logger.info(`[HealthMonitor] Auto-monitoring scheduled for ${users.length} users`);
    }
    catch (error) {
        logger_1.logger.error('[HealthMonitor] Error scheduling auto-monitoring:', error);
    }
    finally {
        client.release();
    }
}
/**
 * Queue monitoring for a specific account
 */
async function queueAccountMonitoring(accountId, userId) {
    return exports.healthMonitorQueue.add('monitor-account', { accountId, userId });
}
/**
 * Queue swarm monitoring for a user
 */
async function queueSwarmMonitoring(userId) {
    return exports.healthMonitorQueue.add('monitor-swarm', { userId });
}
/**
 * Queue daily report generation
 */
async function queueDailyReport(userId) {
    return exports.healthMonitorQueue.add('daily-report', { userId });
}
/**
 * Queue weekly report generation
 */
async function queueWeeklyReport(userId) {
    return exports.healthMonitorQueue.add('weekly-report', { userId });
}
// ============================================
// EVENT LISTENERS
// ============================================
exports.healthMonitorQueue.on('completed', (job, result) => {
    logger_1.logger.info(`[HealthMonitor] Job ${job.id} (${job.name}) completed:`, result);
});
exports.healthMonitorQueue.on('failed', (job, err) => {
    logger_1.logger.error(`[HealthMonitor] Job ${job?.id} (${job?.name}) failed:`, err.message);
});
exports.healthMonitorQueue.on('error', (error) => {
    logger_1.logger.error('[HealthMonitor] Queue error:', error);
});
// ============================================
// EXPORTS
// ============================================
exports.default = exports.healthMonitorQueue;
