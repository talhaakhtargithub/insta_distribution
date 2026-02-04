import Bull from 'bull';
import { pool } from '../config/database';
import { logger } from '../config/logger';
import ProxyHealthMonitor from '../services/proxy/ProxyHealthMonitor';
import ProxyRotationManager from '../services/proxy/ProxyRotationManager';
import ProxyService from '../services/proxy/ProxyService';

// ============================================
// PROXY QUEUE
// ============================================

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

export const proxyQueue = new Bull('proxy-management', {
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
// JOB DATA TYPES
// ============================================

interface HealthCheckJobData {
  userId: string;
}

interface AutoRotateJobData {
  userId: string;
}

interface ProxyTestJobData {
  proxyId: string;
}

// ============================================
// JOB PROCESSORS
// ============================================

proxyQueue.process('health-check', async (job: Bull.Job<HealthCheckJobData>) => {
  const { userId } = job.data;

  logger.info(`[ProxyJob] Running health check for user ${userId}`);

  try {
    const report = await ProxyHealthMonitor.checkAllProxiesHealth(userId);

    logger.info(`[ProxyJob] Health check complete: ${report.healthyProxies}/${report.totalProxies} healthy`);

    // Auto-disable failing proxies
    const disabledCount = await ProxyHealthMonitor.autoDisableFailingProxies(userId);

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

  } catch (error: any) {
    logger.error(`[ProxyJob] Error in health check for user ${userId}:`, error);
    throw error;
  }
});

proxyQueue.process('auto-rotate', async (job: Bull.Job<AutoRotateJobData>) => {
  const { userId } = job.data;

  logger.info(`[ProxyJob] Running auto-rotation for user ${userId}`);

  try {
    const results = await ProxyRotationManager.autoRotateProxies(userId);

    logger.info(`[ProxyJob] Auto-rotation complete: ${results.length} proxies rotated`);

    return {
      success: true,
      userId,
      rotationCount: results.length,
      rotations: results,
      timestamp: new Date()
    };

  } catch (error: any) {
    logger.error(`[ProxyJob] Error in auto-rotation for user ${userId}:`, error);
    throw error;
  }
});

proxyQueue.process('proxy-test', async (job: Bull.Job<ProxyTestJobData>) => {
  const { proxyId } = job.data;

  logger.info(`[ProxyJob] Testing proxy ${proxyId}`);

  try {
    const proxy = await ProxyService.getProxyById(proxyId);

    if (!proxy) {
      throw new Error(`Proxy ${proxyId} not found`);
    }

    const result = await ProxyHealthMonitor.checkProxyHealth(proxy);

    logger.info(`[ProxyJob] Proxy ${proxyId} test complete: ${result.status} (${result.responseTime}ms)`);

    return {
      success: true,
      proxyId,
      status: result.status,
      responseTime: result.responseTime,
      testSuccess: result.success,
      error: result.error,
      timestamp: new Date()
    };

  } catch (error: any) {
    logger.error(`[ProxyJob] Error testing proxy ${proxyId}:`, error);
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
export async function scheduleProxyHealthChecks() {
  const client = await pool.connect();

  try {
    // Get all users with proxies
    const usersQuery = await client.query(
      'SELECT DISTINCT user_id FROM proxy_configs WHERE is_active = true'
    );

    const users = usersQuery.rows;

    logger.info(`[ProxyJob] Scheduling health checks for ${users.length} users`);

    for (const user of users) {
      // Schedule health check every 15 minutes
      await proxyQueue.add(
        'health-check',
        { userId: user.user_id },
        {
          repeat: {
            cron: '*/15 * * * *' // Every 15 minutes
          },
          jobId: `health-check-${user.user_id}` // Prevent duplicates
        }
      );

      // Schedule auto-rotation every hour
      await proxyQueue.add(
        'auto-rotate',
        { userId: user.user_id },
        {
          repeat: {
            cron: '0 * * * *' // Every hour
          },
          jobId: `auto-rotate-${user.user_id}`
        }
      );
    }

    logger.info(`[ProxyJob] Scheduled health checks and auto-rotation for ${users.length} users`);

  } catch (error) {
    logger.error('[ProxyJob] Error scheduling proxy jobs:', error);
  } finally {
    client.release();
  }
}

/**
 * Queue health check for a specific user
 */
export async function queueHealthCheck(userId: string): Promise<Bull.Job> {
  return proxyQueue.add('health-check', { userId });
}

/**
 * Queue auto-rotation for a user
 */
export async function queueAutoRotation(userId: string): Promise<Bull.Job> {
  return proxyQueue.add('auto-rotate', { userId });
}

/**
 * Queue proxy test
 */
export async function queueProxyTest(proxyId: string): Promise<Bull.Job> {
  return proxyQueue.add('proxy-test', { proxyId });
}

// ============================================
// EVENT LISTENERS
// ============================================

proxyQueue.on('completed', (job, result) => {
  logger.info(`[ProxyJob] Job ${job.id} (${job.name}) completed:`, result);
});

proxyQueue.on('failed', (job, err) => {
  logger.error(`[ProxyJob] Job ${job?.id} (${job?.name}) failed:`, err.message);
});

proxyQueue.on('error', (error) => {
  logger.error('[ProxyJob] Queue error:', error);
});

// ============================================
// EXPORTS
// ============================================

export default proxyQueue;
