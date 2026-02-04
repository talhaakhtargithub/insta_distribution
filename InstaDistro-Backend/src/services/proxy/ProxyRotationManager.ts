import { pool } from '../../config/database';
import ProxyService, { ProxyConfig, ProxyType } from './ProxyService';
import { logger } from '../../config/logger';

// ============================================
// TYPES
// ============================================

export interface RotationStrategy {
  type: 'round-robin' | 'least-loaded' | 'geographic' | 'time-based' | 'health-based';
  interval?: number; // in hours
  conditions?: {
    maxRequestsPerProxy?: number;
    maxErrorRate?: number;
    minHealthScore?: number;
  };
}

export interface RotationResult {
  accountId: string;
  oldProxyId?: string;
  newProxyId: string;
  reason: string;
  timestamp: Date;
}

// ============================================
// PROXY ROTATION MANAGER
// ============================================

export class ProxyRotationManager {

  /**
   * Rotate proxy for a specific account
   */
  async rotateProxyForAccount(
    accountId: string,
    userId: string,
    strategy: RotationStrategy = { type: 'least-loaded' }
  ): Promise<RotationResult> {
    logger.info('Rotating proxy for account', { accountId, strategy: strategy.type });

    const client = await pool.connect();

    try {
      // Get current proxy
      const accountQuery = await client.query(
        'SELECT proxy_id FROM accounts WHERE id = $1',
        [accountId]
      );

      const currentProxyId = accountQuery.rows[0]?.proxy_id;

      // Select new proxy based on strategy
      let newProxy: ProxyConfig | null = null;

      switch (strategy.type) {
        case 'least-loaded':
          newProxy = await ProxyService.getLeastLoadedProxy(userId);
          break;

        case 'health-based':
          newProxy = await this.selectHealthBasedProxy(userId, strategy);
          break;

        case 'geographic':
          newProxy = await this.selectGeographicProxy(userId, currentProxyId);
          break;

        case 'round-robin':
          newProxy = await this.selectRoundRobinProxy(userId, currentProxyId);
          break;

        case 'time-based':
          newProxy = await this.selectTimeBasedProxy(userId);
          break;

        default:
          newProxy = await ProxyService.getLeastLoadedProxy(userId);
      }

      if (!newProxy) {
        throw new Error('No available proxy found for rotation');
      }

      // Unassign old proxy if exists
      if (currentProxyId) {
        await ProxyService.unassignProxyFromAccount(accountId);
      }

      // Assign new proxy
      await ProxyService.assignProxyToAccount(newProxy.id, accountId);

      const result: RotationResult = {
        accountId,
        oldProxyId: currentProxyId,
        newProxyId: newProxy.id,
        reason: `Rotated using ${strategy.type} strategy`,
        timestamp: new Date()
      };

      logger.info('Proxy rotation completed', {
        accountId,
        oldProxyId: currentProxyId || 'none',
        newProxyId: newProxy.id
      });

      return result;

    } finally {
      client.release();
    }
  }

  /**
   * Auto-rotate proxies based on usage thresholds
   */
  async autoRotateProxies(userId: string): Promise<RotationResult[]> {
    const client = await pool.connect();
    const results: RotationResult[] = [];

    try {
      // Get all accounts with assigned proxies
      const accountsQuery = await client.query(
        `SELECT a.id, a.proxy_id, p.request_count, p.error_count, p.health_status
         FROM accounts a
         JOIN proxy_configs p ON a.proxy_id = p.id
         WHERE a.user_id = $1 AND a.proxy_id IS NOT NULL`,
        [userId]
      );

      for (const row of accountsQuery.rows) {
        const accountId = row.id;
        const proxyId = row.proxy_id;
        const requestCount = parseInt(row.request_count);
        const errorCount = parseInt(row.error_count);
        const healthStatus = row.health_status;

        // Determine if rotation is needed
        let shouldRotate = false;
        let reason = '';

        // Rotate if proxy is dead or failing
        if (healthStatus === 'dead' || healthStatus === 'failing') {
          shouldRotate = true;
          reason = `Proxy health is ${healthStatus}`;
        }

        // Rotate if error rate is high (>30%)
        const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
        if (errorRate > 30 && requestCount >= 10) {
          shouldRotate = true;
          reason = `High error rate: ${errorRate.toFixed(1)}%`;
        }

        // Rotate if too many requests (load balancing)
        if (requestCount > 1000) {
          shouldRotate = true;
          reason = 'Load balancing - high request count';
        }

        if (shouldRotate) {
          try {
            const result = await this.rotateProxyForAccount(
              accountId,
              userId,
              { type: 'least-loaded' }
            );
            result.reason = reason;
            results.push(result);
          } catch (error: any) {
            logger.error('Failed to rotate proxy for account', {
              accountId,
              error: error.message,
              stack: error.stack
            });
          }
        }
      }

      if (results.length > 0) {
        logger.info('Auto-rotated proxies', { userId, count: results.length });
      }

      return results;

    } finally {
      client.release();
    }
  }

  /**
   * Rotate all proxies for accounts in a group
   */
  async rotateGroupProxies(groupId: string, userId: string): Promise<RotationResult[]> {
    const client = await pool.connect();
    const results: RotationResult[] = [];

    try {
      // Get accounts in group
      const groupQuery = await client.query(
        'SELECT account_ids FROM account_groups WHERE id = $1 AND user_id = $2',
        [groupId, userId]
      );

      if (groupQuery.rows.length === 0) {
        throw new Error('Group not found');
      }

      const accountIds = groupQuery.rows[0].account_ids || [];

      // Rotate proxy for each account
      for (const accountId of accountIds) {
        try {
          const result = await this.rotateProxyForAccount(accountId, userId, { type: 'least-loaded' });
          results.push(result);
        } catch (error: any) {
          logger.error('Failed to rotate proxy for account in group', {
            accountId,
            groupId,
            error: error.message,
            stack: error.stack
          });
        }
      }

      logger.info('Rotated proxies for group', { groupId, count: results.length });

      return results;

    } finally {
      client.release();
    }
  }

  /**
   * Select proxy based on health score
   */
  private async selectHealthBasedProxy(userId: string, strategy: RotationStrategy): Promise<ProxyConfig | null> {
    const proxies = await ProxyService.getProxiesByUser(userId, true);

    // Filter by health
    const healthyProxies = proxies.filter(p =>
      p.healthStatus === 'healthy' || p.healthStatus === 'slow'
    );

    if (healthyProxies.length === 0) {
      return null;
    }

    // Sort by error rate (ascending) and load (ascending)
    healthyProxies.sort((a, b) => {
      const errorRateA = a.requestCount > 0 ? a.errorCount / a.requestCount : 0;
      const errorRateB = b.requestCount > 0 ? b.errorCount / b.requestCount : 0;

      if (errorRateA !== errorRateB) {
        return errorRateA - errorRateB;
      }

      return a.assignedAccountIds.length - b.assignedAccountIds.length;
    });

    return healthyProxies[0];
  }

  /**
   * Select proxy from different geographic location
   */
  private async selectGeographicProxy(userId: string, currentProxyId?: string): Promise<ProxyConfig | null> {
    const proxies = await ProxyService.getProxiesByUser(userId, true);

    if (proxies.length === 0) {
      return null;
    }

    // Get current proxy location
    let currentCountry: string | undefined;
    if (currentProxyId) {
      const currentProxy = proxies.find(p => p.id === currentProxyId);
      currentCountry = currentProxy?.country;
    }

    // Prefer proxies from different country
    const differentCountryProxies = proxies.filter(p =>
      p.country && p.country !== currentCountry &&
      (p.healthStatus === 'healthy' || p.healthStatus === 'slow')
    );

    if (differentCountryProxies.length > 0) {
      // Return least loaded from different country
      differentCountryProxies.sort((a, b) =>
        a.assignedAccountIds.length - b.assignedAccountIds.length
      );
      return differentCountryProxies[0];
    }

    // Fallback to any healthy proxy
    return ProxyService.getLeastLoadedProxy(userId);
  }

  /**
   * Select next proxy in round-robin fashion
   */
  private async selectRoundRobinProxy(userId: string, currentProxyId?: string): Promise<ProxyConfig | null> {
    const proxies = await ProxyService.getProxiesByUser(userId, true);

    if (proxies.length === 0) {
      return null;
    }

    // Sort by ID for consistent ordering
    proxies.sort((a, b) => a.id.localeCompare(b.id));

    // Find current proxy index
    if (currentProxyId) {
      const currentIndex = proxies.findIndex(p => p.id === currentProxyId);
      if (currentIndex !== -1) {
        // Return next proxy (wrap around)
        const nextIndex = (currentIndex + 1) % proxies.length;
        return proxies[nextIndex];
      }
    }

    // Return first proxy if no current proxy
    return proxies[0];
  }

  /**
   * Select proxy based on time of day (for geographic optimization)
   */
  private async selectTimeBasedProxy(userId: string): Promise<ProxyConfig | null> {
    const hour = new Date().getUTCHours();

    // Prefer proxies from regions where it's daytime (9 AM - 9 PM)
    // This is a simple heuristic - can be improved with actual timezone data
    let preferredType: ProxyType;

    if (hour >= 6 && hour < 14) {
      // European daytime
      preferredType = 'datacenter'; // Assume datacenter proxies are European
    } else if (hour >= 14 && hour < 22) {
      // American daytime
      preferredType = 'residential'; // Assume residential are American
    } else {
      // Asian/Pacific daytime
      preferredType = 'mobile'; // Assume mobile are Asian
    }

    const proxy = await ProxyService.getLeastLoadedProxy(userId, preferredType);

    // Fallback to any type if preferred not available
    if (!proxy) {
      return ProxyService.getLeastLoadedProxy(userId);
    }

    return proxy;
  }

  /**
   * Get rotation statistics
   */
  async getRotationStats(userId: string): Promise<{
    totalAccounts: number;
    accountsWithProxy: number;
    accountsWithoutProxy: number;
    avgAccountsPerProxy: number;
  }> {
    const client = await pool.connect();

    try {
      const statsQuery = await client.query(
        `SELECT
           COUNT(*) as total_accounts,
           COUNT(proxy_id) as accounts_with_proxy,
           COUNT(*) - COUNT(proxy_id) as accounts_without_proxy
         FROM accounts
         WHERE user_id = $1`,
        [userId]
      );

      const proxiesQuery = await client.query(
        `SELECT
           AVG(array_length(assigned_account_ids, 1)) as avg_accounts_per_proxy
         FROM proxy_configs
         WHERE user_id = $1 AND is_active = true`,
        [userId]
      );

      return {
        totalAccounts: parseInt(statsQuery.rows[0].total_accounts),
        accountsWithProxy: parseInt(statsQuery.rows[0].accounts_with_proxy),
        accountsWithoutProxy: parseInt(statsQuery.rows[0].accounts_without_proxy),
        avgAccountsPerProxy: parseFloat(proxiesQuery.rows[0].avg_accounts_per_proxy) || 0
      };

    } finally {
      client.release();
    }
  }
}

export default new ProxyRotationManager();
