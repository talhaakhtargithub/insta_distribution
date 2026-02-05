"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceTargets = exports.queryTracker = exports.QueryPerformanceTracker = exports.PerformanceTracker = void 0;
exports.performanceMiddleware = performanceMiddleware;
exports.measureTime = measureTime;
exports.logMemoryUsage = logMemoryUsage;
exports.meetsPerformanceTarget = meetsPerformanceTarget;
exports.createPerformanceReport = createPerformanceReport;
exports.processBatch = processBatch;
exports.debounce = debounce;
exports.throttle = throttle;
const logger_1 = require("../config/logger");
/**
 * Performance Monitoring Utilities
 * Phase 7: Performance Optimization
 */
/**
 * Performance metrics tracker
 */
class PerformanceTracker {
    startTime;
    checkpoints = new Map();
    constructor() {
        this.startTime = Date.now();
    }
    /**
     * Mark a checkpoint
     */
    checkpoint(name) {
        this.checkpoints.set(name, Date.now() - this.startTime);
    }
    /**
     * Get elapsed time since start
     */
    elapsed() {
        return Date.now() - this.startTime;
    }
    /**
     * Get all checkpoints
     */
    getCheckpoints() {
        return Object.fromEntries(this.checkpoints);
    }
    /**
     * Get duration between two checkpoints
     */
    duration(start, end) {
        const startTime = this.checkpoints.get(start);
        const endTime = this.checkpoints.get(end);
        if (!startTime || !endTime)
            return 0;
        return endTime - startTime;
    }
    /**
     * Log performance summary
     */
    logSummary(context) {
        logger_1.logger.info('Performance summary', {
            context,
            totalTime: this.elapsed(),
            checkpoints: this.getCheckpoints(),
        });
    }
}
exports.PerformanceTracker = PerformanceTracker;
/**
 * Middleware to track request performance
 */
function performanceMiddleware(req, res, next) {
    const start = Date.now();
    // Capture the original end function
    const originalEnd = res.end;
    // Override res.end to capture response time
    res.end = function (...args) {
        const duration = Date.now() - start;
        // Log slow requests (> 1 second)
        if (duration > 1000) {
            logger_1.logger.warn('Slow request detected', {
                method: req.method,
                path: req.path,
                duration,
                requestId: req.requestId,
            });
        }
        // Add performance header
        res.setHeader('X-Response-Time', `${duration}ms`);
        // Call original end
        return originalEnd.apply(this, args);
    };
    next();
}
/**
 * Decorator to measure function execution time
 */
function measureTime(context) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const start = Date.now();
            try {
                const result = await originalMethod.apply(this, args);
                const duration = Date.now() - start;
                if (duration > 500) {
                    logger_1.logger.debug('Function execution time', {
                        context,
                        method: propertyKey,
                        duration,
                    });
                }
                return result;
            }
            catch (error) {
                const duration = Date.now() - start;
                logger_1.logger.error('Function execution failed', {
                    context,
                    method: propertyKey,
                    duration,
                    error,
                });
                throw error;
            }
        };
        return descriptor;
    };
}
/**
 * Database query performance tracker
 */
class QueryPerformanceTracker {
    queries = [];
    slowQueryThreshold = 1000; // 1 second
    recordQuery(query, duration) {
        this.queries.push({
            query: query.substring(0, 200), // Truncate long queries
            duration,
            timestamp: Date.now(),
        });
        // Log slow queries
        if (duration > this.slowQueryThreshold) {
            logger_1.logger.warn('Slow query detected', {
                query: query.substring(0, 200),
                duration,
            });
        }
        // Keep only last 100 queries
        if (this.queries.length > 100) {
            this.queries.shift();
        }
    }
    getStats() {
        if (this.queries.length === 0) {
            return {
                totalQueries: 0,
                avgDuration: 0,
                slowQueries: 0,
                recentQueries: [],
            };
        }
        const totalDuration = this.queries.reduce((sum, q) => sum + q.duration, 0);
        const slowQueries = this.queries.filter(q => q.duration > this.slowQueryThreshold).length;
        return {
            totalQueries: this.queries.length,
            avgDuration: totalDuration / this.queries.length,
            slowQueries,
            recentQueries: this.queries.slice(-10),
        };
    }
    logStats() {
        logger_1.logger.info('Query performance statistics', this.getStats());
    }
}
exports.QueryPerformanceTracker = QueryPerformanceTracker;
exports.queryTracker = new QueryPerformanceTracker();
/**
 * Memory usage tracker
 */
function logMemoryUsage() {
    const usage = process.memoryUsage();
    logger_1.logger.info('Memory usage', {
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`,
    });
}
/**
 * API endpoint performance targets
 */
exports.PerformanceTargets = {
    // Response time targets (P95)
    GET_ENDPOINTS: 200, // 200ms
    POST_ENDPOINTS: 500, // 500ms
    HEAVY_OPERATIONS: 2000, // 2 seconds
    // Database query targets
    SIMPLE_QUERY: 50, // 50ms
    COMPLEX_QUERY: 200, // 200ms
    AGGREGATION: 500, // 500ms
    // Cache hit rate targets
    CACHE_HIT_RATE: 0.8, // 80%
};
/**
 * Helper to check if response time meets target
 */
function meetsPerformanceTarget(duration, target) {
    return duration <= target;
}
function createPerformanceReport() {
    return {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        queryStats: exports.queryTracker.getStats(),
    };
}
/**
 * Batch processing helper to avoid overwhelming resources
 */
async function processBatch(items, batchSize, processor, delayMs = 0) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await processor(batch);
        results.push(...batchResults);
        // Optional delay between batches to prevent overwhelming resources
        if (delayMs > 0 && i + batchSize < items.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    return results;
}
/**
 * Debounce helper for rate-limited operations
 */
function debounce(func, waitMs) {
    let timeoutId = null;
    return function (...args) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, waitMs);
    };
}
/**
 * Throttle helper for rate-limited operations
 */
function throttle(func, limitMs) {
    let lastRun = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastRun >= limitMs) {
            func.apply(this, args);
            lastRun = now;
        }
    };
}
