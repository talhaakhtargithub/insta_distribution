"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyQueue = void 0;
exports.scheduleProxyHealthChecks = scheduleProxyHealthChecks;
exports.queueHealthCheck = queueHealthCheck;
exports.queueAutoRotation = queueAutoRotation;
exports.queueProxyTest = queueProxyTest;
const bull_1 = __importDefault(require("bull"));
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const ProxyHealthMonitor_1 = __importDefault(require("../services/proxy/ProxyHealthMonitor"));
const ProxyRotationManager_1 = __importDefault(require("../services/proxy/ProxyRotationManager"));
const ProxyService_1 = __importDefault(require("../services/proxy/ProxyService"));
// ============================================
// PROXY QUEUE
// ============================================
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
exports.proxyQueue = new bull_1.default('proxy-management', {
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
        removeOnComplete: 100,
        removeOnFail: 500
    }
});
// ============================================
// JOB PROCESSORS
// ============================================
exports.proxyQueue.process('health-check', async (job) => {
    const { userId } = job.data;
    logger_1.logger.info(`[ProxyJob] Running health check for user ${userId}`);
    try {
        const report = await ProxyHealthMonitor_1.default.checkAllProxiesHealth(userId);
        logger_1.logger.info(`[ProxyJob] Health check complete: ${report.healthyProxies}/${report.totalProxies} healthy`);
        // Auto-disable failing proxies
        const disabledCount = await ProxyHealthMonitor_1.default.autoDisableFailingProxies(userId);
        return {
            success: true,
            userId,
            totalProxies: report.totalProxies,
            healthyProxies: report.healthyProxies,
            unhealthyProxies: report.unhealthyProxies,
            avgResponseTime: report.avgResponseTime,
            successRate: report.successRate,
            disabledCount,
            timestamp: new Date()
        };
    }
    catch (error) {
        logger_1.logger.error(`[ProxyJob] Error in health check for user ${userId}:`, error);
        throw error;
    }
});
exports.proxyQueue.process('auto-rotate', async (job) => {
    const { userId } = job.data;
    logger_1.logger.info(`[ProxyJob] Running auto-rotation for user ${userId}`);
    try {
        const results = await ProxyRotationManager_1.default.autoRotateProxies(userId);
        logger_1.logger.info(`[ProxyJob] Auto-rotation complete: ${results.length} proxies rotated`);
        return {
            success: true,
            userId,
            rotationCount: results.length,
            rotations: results,
            timestamp: new Date()
        };
    }
    catch (error) {
        logger_1.logger.error(`[ProxyJob] Error in auto-rotation for user ${userId}:`, error);
        throw error;
    }
});
exports.proxyQueue.process('proxy-test', async (job) => {
    const { proxyId } = job.data;
    logger_1.logger.info(`[ProxyJob] Testing proxy ${proxyId}`);
    try {
        const proxy = await ProxyService_1.default.getProxyById(proxyId);
        if (!proxy) {
            throw new Error(`Proxy ${proxyId} not found`);
        }
        const result = await ProxyHealthMonitor_1.default.checkProxyHealth(proxy);
        logger_1.logger.info(`[ProxyJob] Proxy ${proxyId} test complete: ${result.status} (${result.responseTime}ms)`);
        return {
            success: true,
            proxyId,
            status: result.status,
            responseTime: result.responseTime,
            testSuccess: result.success,
            error: result.error,
            timestamp: new Date()
        };
    }
    catch (error) {
        logger_1.logger.error(`[ProxyJob] Error testing proxy ${proxyId}:`, error);
        throw error;
    }
});
// ============================================
// JOB SCHEDULING
// ============================================
/**
 * Schedule automatic proxy health checks for all active users
 * Run every 15 minutes
 */
async function scheduleProxyHealthChecks() {
    const client = await database_1.pool.connect();
    try {
        // Get all users with proxies
        const usersQuery = await client.query('SELECT DISTINCT user_id FROM proxy_configs WHERE is_active = true');
        const users = usersQuery.rows;
        logger_1.logger.info(`[ProxyJob] Scheduling health checks for ${users.length} users`);
        for (const user of users) {
            // Schedule health check every 15 minutes
            await exports.proxyQueue.add('health-check', { userId: user.user_id }, {
                repeat: {
                    cron: '*/15 * * * *' // Every 15 minutes
                },
                jobId: `health-check-${user.user_id}` // Prevent duplicates
            });
            // Schedule auto-rotation every hour
            await exports.proxyQueue.add('auto-rotate', { userId: user.user_id }, {
                repeat: {
                    cron: '0 * * * *' // Every hour
                },
                jobId: `auto-rotate-${user.user_id}`
            });
        }
        logger_1.logger.info(`[ProxyJob] Scheduled health checks and auto-rotation for ${users.length} users`);
    }
    catch (error) {
        logger_1.logger.error('[ProxyJob] Error scheduling proxy jobs:', error);
    }
    finally {
        client.release();
    }
}
/**
 * Queue health check for a specific user
 */
async function queueHealthCheck(userId) {
    return exports.proxyQueue.add('health-check', { userId });
}
/**
 * Queue auto-rotation for a user
 */
async function queueAutoRotation(userId) {
    return exports.proxyQueue.add('auto-rotate', { userId });
}
/**
 * Queue proxy test
 */
async function queueProxyTest(proxyId) {
    return exports.proxyQueue.add('proxy-test', { proxyId });
}
// ============================================
// EVENT LISTENERS
// ============================================
exports.proxyQueue.on('completed', (job, result) => {
    logger_1.logger.info(`[ProxyJob] Job ${job.id} (${job.name}) completed:`, result);
});
exports.proxyQueue.on('failed', (job, err) => {
    logger_1.logger.error(`[ProxyJob] Job ${job?.id} (${job?.name}) failed:`, err.message);
});
exports.proxyQueue.on('error', (error) => {
    logger_1.logger.error('[ProxyJob] Queue error:', error);
});
// ============================================
// EXPORTS
// ============================================
exports.default = exports.proxyQueue;
