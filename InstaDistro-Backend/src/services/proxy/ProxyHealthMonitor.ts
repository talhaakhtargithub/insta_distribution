import ProxyService, { ProxyConfig, ProxyHealthStatus, ProxyTestResult } from './ProxyService';

// ============================================
// TYPES
// ============================================

export interface HealthCheckResult {
  proxyId: string;
  status: ProxyHealthStatus;
  responseTime: number;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export interface HealthCheckReport {
  userId: string;
  totalProxies: number;
  healthyProxies: number;
  unhealthyProxies: number;
  results: HealthCheckResult[];
  avgResponseTime: number;
  successRate: number;
  timestamp: Date;
}

// ============================================
// PROXY HEALTH MONITOR
// ============================================

export class ProxyHealthMonitor {

  /**
   * Check health of a single proxy
   */
  async checkProxyHealth(proxy: ProxyConfig): Promise<HealthCheckResult> {
    console.log(`[ProxyHealth] Checking health for proxy ${proxy.id} (${proxy.host}:${proxy.port})`);

    const testResult = await ProxyService.testProxy(proxy);

    // Determine health status based on response time and success
    let healthStatus: ProxyHealthStatus;

    if (!testResult.success) {
      // Failed - mark as failing or dead based on error count
      const errorRate = proxy.requestCount > 0
        ? proxy.errorCount / proxy.requestCount
        : 1;

      if (errorRate > 0.8 || proxy.errorCount > 10) {
        healthStatus = 'dead';
      } else {
        healthStatus = 'failing';
      }
    } else {
      // Success - determine based on response time
      if (testResult.responseTime < 2000) {
        healthStatus = 'healthy';
      } else if (testResult.responseTime < 5000) {
        healthStatus = 'slow';
      } else {
        healthStatus = 'failing';
      }
    }

    // Update proxy health in database
    await ProxyService.updateProxyHealth(
      proxy.id,
      healthStatus,
      testResult.responseTime,
      testResult.success
    );

    console.log(`[ProxyHealth] Proxy ${proxy.id} health: ${healthStatus} (${testResult.responseTime}ms)`);

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
  async checkAllProxiesHealth(userId: string): Promise<HealthCheckReport> {
    console.log(`[ProxyHealth] Checking health for all proxies of user ${userId}`);

    const proxies = await ProxyService.getProxiesByUser(userId, false);

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
    const results = await Promise.all(
      proxies.map(proxy => this.checkProxyHealth(proxy))
    );

    // Calculate statistics
    const healthyProxies = results.filter(r => r.status === 'healthy' || r.status === 'slow').length;
    const unhealthyProxies = results.filter(r => r.status === 'failing' || r.status === 'dead').length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const successRate = (results.filter(r => r.success).length / results.length) * 100;

    console.log(`[ProxyHealth] Health check complete: ${healthyProxies}/${proxies.length} healthy`);

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
  async autoDisableFailingProxies(userId: string): Promise<number> {
    const proxies = await ProxyService.getProxiesByUser(userId, true);
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
      if (
        (errorRate > 80 && proxy.requestCount >= 10) ||
        (proxy.healthStatus === 'dead' && proxy.requestCount >= 5) ||
        proxy.errorCount > 50
      ) {
        console.log(`[ProxyHealth] Auto-disabling proxy ${proxy.id} (error rate: ${errorRate.toFixed(1)}%)`);

        await ProxyService.updateProxy(proxy.id, { isActive: false });
        disabledCount++;
      }
    }

    if (disabledCount > 0) {
      console.log(`[ProxyHealth] Auto-disabled ${disabledCount} failing proxies for user ${userId}`);
    }

    return disabledCount;
  }

  /**
   * Get proxies that need health check
   * (haven't been checked in the last 15 minutes)
   */
  async getProxiesNeedingCheck(userId: string): Promise<ProxyConfig[]> {
    const proxies = await ProxyService.getProxiesByUser(userId, true);
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
  async getProxyPerformanceMetrics(proxyId: string): Promise<{
    requestCount: number;
    errorCount: number;
    successRate: number;
    avgResponseTime: number;
    uptime: number;
  }> {
    const proxy = await ProxyService.getProxyById(proxyId);

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
  async resetProxyMetrics(proxyId: string): Promise<void> {
    const { pool } = require('../../config/database');
    const client = await pool.connect();

    try {
      await client.query(
        `UPDATE proxy_configs
         SET request_count = 0,
             error_count = 0,
             health_status = 'healthy',
             last_health_check = NULL
         WHERE id = $1`,
        [proxyId]
      );

      console.log(`[ProxyHealth] Reset metrics for proxy ${proxyId}`);

    } finally {
      client.release();
    }
  }

  /**
   * Get health trend for a proxy
   * (comparing current health to historical performance)
   */
  async getProxyHealthTrend(proxyId: string): Promise<{
    current: ProxyHealthStatus;
    trend: 'improving' | 'stable' | 'declining';
    recommendation: string;
  }> {
    const proxy = await ProxyService.getProxyById(proxyId);

    if (!proxy) {
      throw new Error('Proxy not found');
    }

    // Calculate trend based on error rate
    const errorRate = proxy.requestCount > 0
      ? (proxy.errorCount / proxy.requestCount) * 100
      : 0;

    let trend: 'improving' | 'stable' | 'declining';
    let recommendation: string;

    if (proxy.healthStatus === 'dead') {
      trend = 'declining';
      recommendation = 'Disable this proxy and investigate connection issues';
    } else if (proxy.healthStatus === 'failing') {
      trend = 'declining';
      recommendation = 'Monitor closely. Consider rotating or replacing if issues persist';
    } else if (proxy.healthStatus === 'slow') {
      if (errorRate < 10) {
        trend = 'stable';
        recommendation = 'Performance is acceptable but could be improved';
      } else {
        trend = 'declining';
        recommendation = 'Investigate performance issues';
      }
    } else {
      // Healthy
      if (errorRate < 5) {
        trend = 'stable';
        recommendation = 'Proxy is performing well';
      } else {
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

export default new ProxyHealthMonitor();
