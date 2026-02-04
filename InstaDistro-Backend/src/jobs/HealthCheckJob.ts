import Queue from 'bull';
import { authService } from '../services/instagram/AuthService';
import { accountService } from '../services/swarm/AccountService';
import { logger } from '../config/logger';
import { envConfig } from '../config/env';

/**
 * Health Check Job
 *
 * Periodically checks Instagram account health:
 * - Verifies session validity
 * - Refreshes expired sessions
 * - Detects issues (shadowban, rate limit, etc.)
 * - Updates account status
 *
 * Schedule: Every 6 hours
 */

interface HealthCheckJobData {
  userId: string;
  accountId?: string; // Optional: check specific account
}

// Create Bull queue
const healthCheckQueue = new Queue<HealthCheckJobData>('health-check', {
  redis: {
    host: envConfig.REDIS_HOST || 'localhost',
    port: envConfig.REDIS_PORT || 6379,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
  },
});

/**
 * Process health check jobs
 */
healthCheckQueue.process(async (job) => {
  const { userId, accountId } = job.data;

  logger.info(`Processing health check job for user ${userId}${accountId ? ` (account: ${accountId})` : ''}`);

  try {
    if (accountId) {
      // Check specific account
      const result = await authService.authenticate(accountId);

      if (!result.success) {
        logger.warn(`Health check failed for account ${accountId}: ${result.error}`);

        // Update account status
        await accountService.updateAccount(accountId, {
          account_status: 'error',
          is_authenticated: false,
        });

        return {
          success: false,
          accountId,
          error: result.error,
        };
      }

      logger.info(`Health check passed for account ${accountId}`);

      return {
        success: true,
        accountId,
        authenticated: result.authenticated,
      };
    } else {
      // Check all accounts for user
      const result = await authService.checkAccountsHealth(userId);

      logger.info(`Health check completed for user ${userId}: ${result.checked} checked, ${result.refreshed} refreshed, ${result.failed} failed`);

      return {
        success: true,
        ...result,
      };
    }
  } catch (error: any) {
    logger.error(`Health check job failed:`, error);
    throw error; // Let Bull retry
  }
});

/**
 * Schedule health check for a user
 * Runs every 6 hours
 */
export async function scheduleHealthCheck(userId: string): Promise<void> {
  try {
    // Remove existing repeat jobs for this user
    const repeatableJobs = await healthCheckQueue.getRepeatableJobs();
    const existingJob = repeatableJobs.find((job) => job.name === `health-check-${userId}`);

    if (existingJob) {
      await healthCheckQueue.removeRepeatableByKey(existingJob.key);
      logger.info(`Removed existing health check schedule for user ${userId}`);
    }

    // Schedule new job (every 6 hours)
    await healthCheckQueue.add(
      `health-check-${userId}`,
      { userId },
      {
        repeat: {
          every: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
        },
      }
    );

    logger.info(`Scheduled health check for user ${userId} (every 6 hours)`);
  } catch (error) {
    logger.error(`Failed to schedule health check for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Run immediate health check for a specific account
 */
export async function checkAccountNow(userId: string, accountId: string): Promise<void> {
  try {
    await healthCheckQueue.add(
      `health-check-${accountId}`,
      { userId, accountId },
      {
        priority: 1, // High priority
      }
    );

    logger.info(`Queued immediate health check for account ${accountId}`);
  } catch (error) {
    logger.error(`Failed to queue health check for account ${accountId}:`, error);
    throw error;
  }
}

/**
 * Run immediate health check for all user accounts
 */
export async function checkAllAccountsNow(userId: string): Promise<void> {
  try {
    await healthCheckQueue.add(
      `health-check-all-${userId}`,
      { userId },
      {
        priority: 2, // Medium priority
      }
    );

    logger.info(`Queued immediate health check for all accounts of user ${userId}`);
  } catch (error) {
    logger.error(`Failed to queue health check for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Cancel health check schedule for a user
 */
export async function cancelHealthCheck(userId: string): Promise<void> {
  try {
    const repeatableJobs = await healthCheckQueue.getRepeatableJobs();
    const existingJob = repeatableJobs.find((job) => job.name === `health-check-${userId}`);

    if (existingJob) {
      await healthCheckQueue.removeRepeatableByKey(existingJob.key);
      logger.info(`Cancelled health check schedule for user ${userId}`);
    }
  } catch (error) {
    logger.error(`Failed to cancel health check for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get health check queue stats
 */
export async function getHealthCheckStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    healthCheckQueue.getWaitingCount(),
    healthCheckQueue.getActiveCount(),
    healthCheckQueue.getCompletedCount(),
    healthCheckQueue.getFailedCount(),
    healthCheckQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
  };
}

// Event listeners for monitoring
healthCheckQueue.on('completed', (job, result) => {
  logger.info(`Health check job ${job.id} completed:`, result);
});

healthCheckQueue.on('failed', (job, error) => {
  logger.error(`Health check job ${job.id} failed:`, error.message);
});

healthCheckQueue.on('stalled', (job) => {
  logger.warn(`Health check job ${job.id} stalled`);
});

export { healthCheckQueue };
