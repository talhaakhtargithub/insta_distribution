"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyHealthMonitor = void 0;
const ProxyService_1 = __importDefault(require("./ProxyService"));
const logger_1 = require("../../config/logger");
// ============================================
// PROXY HEALTH MONITOR
// ============================================
class ProxyHealthMonitor {
    /**
     * Check health of a single proxy
     */
    async checkProxyHealth(proxy) {
        logger_1.logger.debug('Checking health for proxy', { proxyId: proxy.id, host: proxy.host, port: proxy.port });
        const testResult = await ProxyService_1.default.testProxy(proxy);
        // Determine health status based on response time and success
        let healthStatus;
        if (!testResult.success) {
            // Failed - mark as failing or dead based on error count
            const errorRate = proxy.requestCount > 0
                ? proxy.errorCount / proxy.requestCount
                : 1;
            if (errorRate > 0.8 || proxy.errorCount > 10) {
                healthStatus = 'dead';
            }
            else {
                healthStatus = 'failing';
            }
        }
        else {
            // Success - determine based on response time
            if (testResult.responseTime < 2000) {
                healthStatus = 'healthy';
            }
            else if (testResult.responseTime < 5000) {
                healthStatus = 'slow';
            }
            else {
                healthStatus = 'failing';
            }
        }
        // Update proxy health in database
        await ProxyService_1.default.updateProxyHealth(proxy.id, healthStatus, testResult.responseTime, testResult.success);
        logger_1.logger.debug('Proxy health check result', {
            proxyId: proxy.id,
            healthStatus,
            responseTime: testResult.responseTime
        });
        return {
            proxyId: proxy.id,
            status: healthStatus,
            responseTime: testResult.responseTime,
            success: testResult.success,
            error: testResult.error,
            timestamp: new Date()
        };
    }
    /**
     * Check health of all proxies for a user
     */
    async checkAllProxiesHealth(userId) {
        logger_1.logger.info('Checking health for all proxies', { userId });
        const proxies = await ProxyService_1.default.getProxiesByUser(userId, false);
        if (proxies.length === 0) {
            return {
                userId,
                totalProxies: 0,
                healthyProxies: 0,
                unhealthyProxies: 0,
                results: [],
                avgResponseTime: 0,
                successRate: 0,
                timestamp: new Date()
            };
        }
        // Check all proxies in parallel
        const results = await Promise.all(proxies.map(proxy => this.checkProxyHealth(proxy)));
        // Calculate statistics
        const healthyProxies = results.filter(r => r.status === 'healthy' || r.status === 'slow').length;
        const unhealthyProxies = results.filter(r => r.status === 'failing' || r.status === 'dead').length;
        const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
        const successRate = (results.filter(r => r.success).length / results.length) * 100;
        logger_1.logger.info('Proxy health check complete', {
            userId,
            healthyProxies,
            totalProxies: proxies.length
        });
        return {
            userId,
            totalProxies: proxies.length,
            healthyProxies,
            unhealthyProxies,
            results,
            avgResponseTime,
            successRate,
            timestamp: new Date()
        };
    }
    /**
     * Auto-disable proxies that are consistently failing
     */
    async autoDisableFailingProxies(userId) {
        const proxies = await ProxyService_1.default.getProxiesByUser(userId, true);
        let disabledCount = 0;
        for (const proxy of proxies) {
            // Calculate error rate
            const errorRate = proxy.requestCount > 0
                ? (proxy.errorCount / proxy.requestCount) * 100
                : 0;
            // Disable if:
            // 1. Error rate > 80% AND at least 10 requests
            // 2. Marked as dead AND at least 5 requests
            // 3. Has more than 50 errors
            if ((errorRate > 80 && proxy.requestCount >= 10) ||
                (proxy.healthStatus === 'dead' && proxy.requestCount >= 5) ||
                proxy.errorCount > 50) {
                logger_1.logger.warn('Auto-disabling failing proxy', {
                    proxyId: proxy.id,
                    errorRate: errorRate.toFixed(1)
                });
                await ProxyService_1.default.updateProxy(proxy.id, { isActive: false });
                disabledCount++;
            }
        }
        if (disabledCount > 0) {
            logger_1.logger.info('Auto-disabled failing proxies', { userId, count: disabledCount });
        }
        return disabledCount;
    }
    /**
     * Get proxies that need health check
     * (haven't been checked in the last 15 minutes)
     */
    async getProxiesNeedingCheck(userId) {
        const proxies = await ProxyService_1.default.getProxiesByUser(userId, true);
        const now = Date.now();
        const checkInterval = 15 * 60 * 1000; // 15 minutes
        return proxies.filter(proxy => {
            if (!proxy.lastHealthCheck) {
                return true; // Never checked
            }
            const timeSinceLastCheck = now - proxy.lastHealthCheck.getTime();
            return timeSinceLastCheck >= checkInterval;
        });
    }
    /**
     * Monitor proxy performance metrics
     */
    async getProxyPerformanceMetrics(proxyId) {
        const proxy = await ProxyService_1.default.getProxyById(proxyId);
        if (!proxy) {
            throw new Error('Proxy not found');
        }
        const successRate = proxy.requestCount > 0
            ? ((proxy.requestCount - proxy.errorCount) / proxy.requestCount) * 100
            : 0;
        // Calculate uptime (percentage of time proxy was healthy in last checks)
        const uptime = proxy.healthStatus === 'healthy' || proxy.healthStatus === 'slow' ? 100 : 0;
        return {
            requestCount: proxy.requestCount,
            errorCount: proxy.errorCount,
            successRate,
            avgResponseTime: proxy.avgResponseTime || 0,
            uptime
        };
    }
    /**
     * Reset proxy health metrics
     */
    async resetProxyMetrics(proxyId) {
        const { pool } = require('../../config/database');
        const client = await pool.connect();
        try {
            await client.query(`UPDATE proxy_configs
         SET request_count = 0,
             error_count = 0,
             health_status = 'healthy',
             last_health_check = NULL
         WHERE id = $1`, [proxyId]);
            logger_1.logger.debug('Reset metrics for proxy', { proxyId });
        }
        finally {
            client.release();
        }
    }
    /**
     * Get health trend for a proxy
     * (comparing current health to historical performance)
     */
    async getProxyHealthTrend(proxyId) {
        const proxy = await ProxyService_1.default.getProxyById(proxyId);
        if (!proxy) {
            throw new Error('Proxy not found');
        }
        // Calculate trend based on error rate
        const errorRate = proxy.requestCount > 0
            ? (proxy.errorCount / proxy.requestCount) * 100
            : 0;
        let trend;
        let recommendation;
        if (proxy.healthStatus === 'dead') {
            trend = 'declining';
            recommendation = 'Disable this proxy and investigate connection issues';
        }
        else if (proxy.healthStatus === 'failing') {
            trend = 'declining';
            recommendation = 'Monitor closely. Consider rotating or replacing if issues persist';
        }
        else if (proxy.healthStatus === 'slow') {
            if (errorRate < 10) {
                trend = 'stable';
                recommendation = 'Performance is acceptable but could be improved';
            }
            else {
                trend = 'declining';
                recommendation = 'Investigate performance issues';
            }
        }
        else {
            // Healthy
            if (errorRate < 5) {
                trend = 'stable';
                recommendation = 'Proxy is performing well';
            }
            else {
                trend = 'stable';
                recommendation = 'Good performance with minor issues';
            }
        }
        return {
            current: proxy.healthStatus,
            trend,
            recommendation
        };
    }
}
exports.ProxyHealthMonitor = ProxyHealthMonitor;
exports.default = new ProxyHealthMonitor();
