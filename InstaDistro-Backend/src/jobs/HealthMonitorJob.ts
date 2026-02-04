import Bull from 'bull';
import { pool } from '../config/database';
import { logger } from '../config/logger';
import HealthMonitor from '../services/health/HealthMonitor';

// ============================================
// HEALTH MONITOR QUEUE
// ============================================

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

export const healthMonitorQueue = new Bull('health-monitor', {
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
// JOB DATA TYPES
// ============================================

interface MonitorAccountJobData {
  accountId: string;
  userId: string;
}

interface MonitorSwarmJobData {
  userId: string;
}

interface DailyReportJobData {
  userId: string;
}

interface WeeklyReportJobData {
  userId: string;
}

// ============================================
// JOB PROCESSOR
// ============================================

healthMonitorQueue.process('monitor-account', async (job: Bull.Job<MonitorAccountJobData>) => {
  const { accountId, userId } = job.data;

  logger.info(`[HealthMonitor] Monitoring account ${accountId} for user ${userId}`);

  try {
    const report = await HealthMonitor.monitorAccount(accountId);

    logger.info(`[HealthMonitor] Account ${accountId} health: ${report.scoreBreakdown.overall}/100 (${report.scoreBreakdown.category})`);

    if (report.alerts.length > 0) {
      logger.info(`[HealthMonitor] Account ${accountId} has ${report.alerts.length} active alerts`);
    }

    return {
      success: true,
      accountId,
      healthScore: report.scoreBreakdown.overall,
      category: report.scoreBreakdown.category,
      alertCount: report.alerts.length,
      timestamp: new Date()
    };

  } catch (error: any) {
    logger.error(`[HealthMonitor] Error monitoring account ${accountId}:`, error);
    throw error;
  }
});

healthMonitorQueue.process('monitor-swarm', async (job: Bull.Job<MonitorSwarmJobData>) => {
  const { userId } = job.data;

  logger.info(`[HealthMonitor] Monitoring swarm for user ${userId}`);

  try {
    const report = await HealthMonitor.monitorSwarm(userId);

    logger.info(`[HealthMonitor] Swarm health: ${report.overallHealth.avgScore.toFixed(1)}/100 (${report.overallHealth.category})`);
    logger.info(`[HealthMonitor] ${report.overallHealth.healthyAccounts} healthy, ${report.overallHealth.criticalAccounts} critical`);
    logger.info(`[HealthMonitor] Active alerts: ${report.activeAlerts.length}`);

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

  } catch (error: any) {
    logger.error(`[HealthMonitor] Error monitoring swarm for user ${userId}:`, error);
    throw error;
  }
});

healthMonitorQueue.process('daily-report', async (job: Bull.Job<DailyReportJobData>) => {
  const { userId } = job.data;

  logger.info(`[HealthMonitor] Generating daily report for user ${userId}`);

  try {
    const report = await HealthMonitor.generateDailyReport(userId);

    logger.info(`[HealthMonitor] Daily report generated: ${report.summary}`);

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

  } catch (error: any) {
    logger.error(`[HealthMonitor] Error generating daily report for user ${userId}:`, error);
    throw error;
  }
});

healthMonitorQueue.process('weekly-report', async (job: Bull.Job<WeeklyReportJobData>) => {
  const { userId } = job.data;

  logger.info(`[HealthMonitor] Generating weekly report for user ${userId}`);

  try {
    const report = await HealthMonitor.generateWeeklyReport(userId);

    logger.info(`[HealthMonitor] Weekly report generated: ${report.summary}`);

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

  } catch (error: any) {
    logger.error(`[HealthMonitor] Error generating weekly report for user ${userId}:`, error);
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
export async function scheduleAutoMonitoring() {
  const client = await pool.connect();

  try {
    // Get all active users
    const usersQuery = await client.query(
      'SELECT DISTINCT user_id FROM accounts WHERE account_status = $1',
      ['active']
    );

    const users = usersQuery.rows;

    logger.info(`[HealthMonitor] Scheduling auto-monitoring for ${users.length} users`);

    for (const user of users) {
      // Schedule swarm monitoring every 6 hours
      await healthMonitorQueue.add(
        'monitor-swarm',
        { userId: user.user_id },
        {
          repeat: {
            cron: '0 */6 * * *' // Every 6 hours
          },
          jobId: `monitor-swarm-${user.user_id}` // Prevent duplicates
        }
      );

      // Schedule daily report at 9 AM
      await healthMonitorQueue.add(
        'daily-report',
        { userId: user.user_id },
        {
          repeat: {
            cron: '0 9 * * *' // Daily at 9 AM
          },
          jobId: `daily-report-${user.user_id}`
        }
      );

      // Schedule weekly report every Monday at 9 AM
      await healthMonitorQueue.add(
        'weekly-report',
        { userId: user.user_id },
        {
          repeat: {
            cron: '0 9 * * 1' // Mondays at 9 AM
          },
          jobId: `weekly-report-${user.user_id}`
        }
      );
    }

    logger.info(`[HealthMonitor] Auto-monitoring scheduled for ${users.length} users`);

  } catch (error) {
    logger.error('[HealthMonitor] Error scheduling auto-monitoring:', error);
  } finally {
    client.release();
  }
}

/**
 * Queue monitoring for a specific account
 */
export async function queueAccountMonitoring(accountId: string, userId: string): Promise<Bull.Job> {
  return healthMonitorQueue.add('monitor-account', { accountId, userId });
}

/**
 * Queue swarm monitoring for a user
 */
export async function queueSwarmMonitoring(userId: string): Promise<Bull.Job> {
  return healthMonitorQueue.add('monitor-swarm', { userId });
}

/**
 * Queue daily report generation
 */
export async function queueDailyReport(userId: string): Promise<Bull.Job> {
  return healthMonitorQueue.add('daily-report', { userId });
}

/**
 * Queue weekly report generation
 */
export async function queueWeeklyReport(userId: string): Promise<Bull.Job> {
  return healthMonitorQueue.add('weekly-report', { userId });
}

// ============================================
// EVENT LISTENERS
// ============================================

healthMonitorQueue.on('completed', (job, result) => {
  logger.info(`[HealthMonitor] Job ${job.id} (${job.name}) completed:`, result);
});

healthMonitorQueue.on('failed', (job, err) => {
  logger.error(`[HealthMonitor] Job ${job?.id} (${job?.name}) failed:`, err.message);
});

healthMonitorQueue.on('error', (error) => {
  logger.error('[HealthMonitor] Queue error:', error);
});

// ============================================
// EXPORTS
// ============================================

export default healthMonitorQueue;
