"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobMonitor = exports.JobMonitor = exports.JobType = exports.JobPriority = void 0;
exports.exponentialBackoff = exponentialBackoff;
exports.linearBackoff = linearBackoff;
exports.createCriticalJobOptions = createCriticalJobOptions;
exports.createHighPriorityJobOptions = createHighPriorityJobOptions;
exports.createNormalJobOptions = createNormalJobOptions;
exports.createLowPriorityJobOptions = createLowPriorityJobOptions;
exports.createVeryLowPriorityJobOptions = createVeryLowPriorityJobOptions;
exports.createScheduledJobOptions = createScheduledJobOptions;
exports.createRepeatingJobOptions = createRepeatingJobOptions;
exports.getJobOptionsByType = getJobOptionsByType;
exports.createRateLimitedJobOptions = createRateLimitedJobOptions;
const logger_1 = require("../config/logger");
/**
 * Job Queue Utilities
 * Phase 7: Performance Optimization
 * Provides standardized job options with priorities and retry strategies
 */
/**
 * Job priority levels
 */
var JobPriority;
(function (JobPriority) {
    JobPriority[JobPriority["CRITICAL"] = 1] = "CRITICAL";
    JobPriority[JobPriority["HIGH"] = 2] = "HIGH";
    JobPriority[JobPriority["NORMAL"] = 3] = "NORMAL";
    JobPriority[JobPriority["LOW"] = 4] = "LOW";
    JobPriority[JobPriority["VERY_LOW"] = 5] = "VERY_LOW";
})(JobPriority || (exports.JobPriority = JobPriority = {}));
/**
 * Retry strategy with exponential backoff
 */
function exponentialBackoff(attemptsMade, maxAttempts = 5) {
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
function linearBackoff(attemptsMade, maxAttempts = 5) {
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
function createCriticalJobOptions(customOptions) {
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
function createHighPriorityJobOptions(customOptions) {
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
function createNormalJobOptions(customOptions) {
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
function createLowPriorityJobOptions(customOptions) {
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
function createVeryLowPriorityJobOptions(customOptions) {
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
function createScheduledJobOptions(delay, customOptions) {
    return {
        ...createNormalJobOptions(),
        delay,
        ...customOptions,
    };
}
/**
 * Create job options for repeating/cron jobs
 */
function createRepeatingJobOptions(repeat, customOptions) {
    return {
        ...createLowPriorityJobOptions(),
        repeat,
        ...customOptions,
    };
}
/**
 * Job types enum for categorization
 */
var JobType;
(function (JobType) {
    // User-facing (Critical/High priority)
    JobType["POST_PUBLISH"] = "post:publish";
    JobType["ACCOUNT_VERIFY"] = "account:verify";
    JobType["MEDIA_UPLOAD"] = "media:upload";
    // Background processing (Normal priority)
    JobType["WARMUP_TASK"] = "warmup:task";
    JobType["HEALTH_CHECK"] = "health:check";
    JobType["PROXY_TEST"] = "proxy:test";
    // Scheduled tasks (Normal/Low priority)
    JobType["SCHEDULE_PROCESS"] = "schedule:process";
    JobType["DISTRIBUTION_PROCESS"] = "distribution:process";
    // Monitoring (Low priority)
    JobType["HEALTH_MONITOR"] = "health:monitor";
    JobType["PROXY_HEALTH_CHECK"] = "proxy:health";
    JobType["SWARM_MONITOR"] = "swarm:monitor";
    // Analytics/Cleanup (Very Low priority)
    JobType["ANALYTICS_PROCESS"] = "analytics:process";
    JobType["CLEANUP_OLD_JOBS"] = "cleanup:jobs";
    JobType["GENERATE_REPORT"] = "report:generate";
})(JobType || (exports.JobType = JobType = {}));
/**
 * Get recommended job options based on job type
 */
function getJobOptionsByType(jobType, customOptions) {
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
class JobMonitor {
    jobCounts = new Map();
    recordJobComplete(jobType) {
        const counts = this.jobCounts.get(jobType) || { completed: 0, failed: 0, active: 0 };
        counts.completed++;
        counts.active = Math.max(0, counts.active - 1);
        this.jobCounts.set(jobType, counts);
    }
    recordJobFailed(jobType) {
        const counts = this.jobCounts.get(jobType) || { completed: 0, failed: 0, active: 0 };
        counts.failed++;
        counts.active = Math.max(0, counts.active - 1);
        this.jobCounts.set(jobType, counts);
    }
    recordJobStarted(jobType) {
        const counts = this.jobCounts.get(jobType) || { completed: 0, failed: 0, active: 0 };
        counts.active++;
        this.jobCounts.set(jobType, counts);
    }
    getStats(jobType) {
        if (jobType) {
            return this.jobCounts.get(jobType) || { completed: 0, failed: 0, active: 0 };
        }
        return Object.fromEntries(this.jobCounts);
    }
    logStats() {
        const stats = this.getStats();
        logger_1.logger.info('Job queue statistics', { stats });
    }
}
exports.JobMonitor = JobMonitor;
exports.jobMonitor = new JobMonitor();
/**
 * Rate limiting for job processing
 */
function createRateLimitedJobOptions(maxConcurrent, customOptions) {
    return {
        ...createNormalJobOptions(customOptions),
        // Note: Concurrency is set at the queue level, not job level
        // This is just a helper to document the intent
    };
}
