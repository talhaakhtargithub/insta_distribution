import { JobOptions } from 'bull';
import { logger } from '../config/logger';

/**
 * Job Queue Utilities
 * Phase 7: Performance Optimization
 * Provides standardized job options with priorities and retry strategies
 */

/**
 * Job priority levels
 */
export enum JobPriority {
  CRITICAL = 1, // Immediate execution (user-facing operations)
  HIGH = 2, // Important but not immediate
  NORMAL = 3, // Standard priority
  LOW = 4, // Background tasks
  VERY_LOW = 5, // Cleanup, analytics
}

/**
 * Retry strategy with exponential backoff
 */
export function exponentialBackoff(attemptsMade: number, maxAttempts: number = 5): number {
  if (attemptsMade >= maxAttempts) {
    return -1; // Stop retrying
  }

  // Exponential backoff: 2^attempt * 1000ms
  // Attempt 1: 2 seconds
  // Attempt 2: 4 seconds
  // Attempt 3: 8 seconds
  // Attempt 4: 16 seconds
  // Attempt 5: 32 seconds
  const delay = Math.pow(2, attemptsMade) * 1000;

  // Cap at 1 minute
  return Math.min(delay, 60000);
}

/**
 * Linear backoff retry strategy
 */
export function linearBackoff(attemptsMade: number, maxAttempts: number = 5): number {
  if (attemptsMade >= maxAttempts) {
    return -1;
  }

  // Linear backoff: attempt * 5000ms
  return attemptsMade * 5000;
}

/**
 * Create job options for critical user-facing operations
 * - Highest priority
 * - Quick retry with exponential backoff
 * - Short timeout
 */
export function createCriticalJobOptions(customOptions?: Partial<JobOptions>): JobOptions {
  return {
    priority: JobPriority.CRITICAL,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    timeout: 30000, // 30 seconds
    removeOnComplete: true,
    removeOnFail: false, // Keep failed jobs for debugging
    ...customOptions,
  };
}

/**
 * Create job options for high-priority operations
 * - High priority
 * - Moderate retry with exponential backoff
 * - Normal timeout
 */
export function createHighPriorityJobOptions(customOptions?: Partial<JobOptions>): JobOptions {
  return {
    priority: JobPriority.HIGH,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    timeout: 60000, // 1 minute
    removeOnComplete: true,
    removeOnFail: false,
    ...customOptions,
  };
}

/**
 * Create job options for normal operations
 * - Normal priority
 * - Standard retry with exponential backoff
 * - Standard timeout
 */
export function createNormalJobOptions(customOptions?: Partial<JobOptions>): JobOptions {
  return {
    priority: JobPriority.NORMAL,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    timeout: 120000, // 2 minutes
    removeOnComplete: true,
    removeOnFail: false,
    ...customOptions,
  };
}

/**
 * Create job options for low-priority background tasks
 * - Low priority
 * - Many retries with linear backoff
 * - Long timeout
 */
export function createLowPriorityJobOptions(customOptions?: Partial<JobOptions>): JobOptions {
  return {
    priority: JobPriority.LOW,
    attempts: 10,
    backoff: {
      type: 'exponential',
      delay: 15000,
    },
    timeout: 300000, // 5 minutes
    removeOnComplete: true,
    removeOnFail: false,
    ...customOptions,
  };
}

/**
 * Create job options for very low priority tasks (cleanup, analytics)
 * - Lowest priority
 * - Many retries
 * - Very long timeout
 */
export function createVeryLowPriorityJobOptions(customOptions?: Partial<JobOptions>): JobOptions {
  return {
    priority: JobPriority.VERY_LOW,
    attempts: 15,
    backoff: {
      type: 'exponential',
      delay: 30000,
    },
    timeout: 600000, // 10 minutes
    removeOnComplete: true,
    removeOnFail: true, // Can safely remove failed low-priority jobs
    ...customOptions,
  };
}

/**
 * Create job options for scheduled/delayed jobs
 */
export function createScheduledJobOptions(
  delay: number,
  customOptions?: Partial<JobOptions>
): JobOptions {
  return {
    ...createNormalJobOptions(),
    delay,
    ...customOptions,
  };
}

/**
 * Create job options for repeating/cron jobs
 */
export function createRepeatingJobOptions(
  repeat: any,
  customOptions?: Partial<JobOptions>
): JobOptions {
  return {
    ...createLowPriorityJobOptions(),
    repeat,
    ...customOptions,
  };
}

/**
 * Job types enum for categorization
 */
export enum JobType {
  // User-facing (Critical/High priority)
  POST_PUBLISH = 'post:publish',
  ACCOUNT_VERIFY = 'account:verify',
  MEDIA_UPLOAD = 'media:upload',

  // Background processing (Normal priority)
  WARMUP_TASK = 'warmup:task',
  HEALTH_CHECK = 'health:check',
  PROXY_TEST = 'proxy:test',

  // Scheduled tasks (Normal/Low priority)
  SCHEDULE_PROCESS = 'schedule:process',
  DISTRIBUTION_PROCESS = 'distribution:process',

  // Monitoring (Low priority)
  HEALTH_MONITOR = 'health:monitor',
  PROXY_HEALTH_CHECK = 'proxy:health',
  SWARM_MONITOR = 'swarm:monitor',

  // Analytics/Cleanup (Very Low priority)
  ANALYTICS_PROCESS = 'analytics:process',
  CLEANUP_OLD_JOBS = 'cleanup:jobs',
  GENERATE_REPORT = 'report:generate',
}

/**
 * Get recommended job options based on job type
 */
export function getJobOptionsByType(jobType: JobType, customOptions?: Partial<JobOptions>): JobOptions {
  switch (jobType) {
    // Critical jobs
    case JobType.POST_PUBLISH:
    case JobType.ACCOUNT_VERIFY:
    case JobType.MEDIA_UPLOAD:
      return createCriticalJobOptions(customOptions);

    // High priority jobs
    case JobType.WARMUP_TASK:
    case JobType.HEALTH_CHECK:
    case JobType.PROXY_TEST:
      return createHighPriorityJobOptions(customOptions);

    // Normal priority jobs
    case JobType.SCHEDULE_PROCESS:
    case JobType.DISTRIBUTION_PROCESS:
      return createNormalJobOptions(customOptions);

    // Low priority jobs
    case JobType.HEALTH_MONITOR:
    case JobType.PROXY_HEALTH_CHECK:
    case JobType.SWARM_MONITOR:
      return createLowPriorityJobOptions(customOptions);

    // Very low priority jobs
    case JobType.ANALYTICS_PROCESS:
    case JobType.CLEANUP_OLD_JOBS:
    case JobType.GENERATE_REPORT:
      return createVeryLowPriorityJobOptions(customOptions);

    default:
      return createNormalJobOptions(customOptions);
  }
}

/**
 * Job monitoring helper
 */
export class JobMonitor {
  private jobCounts: Map<string, { completed: number; failed: number; active: number }> = new Map();

  recordJobComplete(jobType: string): void {
    const counts = this.jobCounts.get(jobType) || { completed: 0, failed: 0, active: 0 };
    counts.completed++;
    counts.active = Math.max(0, counts.active - 1);
    this.jobCounts.set(jobType, counts);
  }

  recordJobFailed(jobType: string): void {
    const counts = this.jobCounts.get(jobType) || { completed: 0, failed: 0, active: 0 };
    counts.failed++;
    counts.active = Math.max(0, counts.active - 1);
    this.jobCounts.set(jobType, counts);
  }

  recordJobStarted(jobType: string): void {
    const counts = this.jobCounts.get(jobType) || { completed: 0, failed: 0, active: 0 };
    counts.active++;
    this.jobCounts.set(jobType, counts);
  }

  getStats(jobType?: string): any {
    if (jobType) {
      return this.jobCounts.get(jobType) || { completed: 0, failed: 0, active: 0 };
    }
    return Object.fromEntries(this.jobCounts);
  }

  logStats(): void {
    const stats = this.getStats();
    logger.info('Job queue statistics', { stats });
  }
}

export const jobMonitor = new JobMonitor();

/**
 * Rate limiting for job processing
 */
export function createRateLimitedJobOptions(
  maxConcurrent: number,
  customOptions?: Partial<JobOptions>
): JobOptions {
  return {
    ...createNormalJobOptions(customOptions),
    // Note: Concurrency is set at the queue level, not job level
    // This is just a helper to document the intent
  };
}
