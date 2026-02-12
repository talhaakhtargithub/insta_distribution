import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Performance Monitoring Utilities
 * Phase 7: Performance Optimization
 */

/**
 * Performance metrics tracker
 */
export class PerformanceTracker {
  private startTime: number;
  private checkpoints: Map<string, number> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Mark a checkpoint
   */
  checkpoint(name: string): void {
    this.checkpoints.set(name, Date.now() - this.startTime);
  }

  /**
   * Get elapsed time since start
   */
  elapsed(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get all checkpoints
   */
  getCheckpoints(): Record<string, number> {
    return Object.fromEntries(this.checkpoints);
  }

  /**
   * Get duration between two checkpoints
   */
  duration(start: string, end: string): number {
    const startTime = this.checkpoints.get(start);
    const endTime = this.checkpoints.get(end);

    if (!startTime || !endTime) return 0;
    return endTime - startTime;
  }

  /**
   * Log performance summary
   */
  logSummary(context: string): void {
    logger.info('Performance summary', {
      context,
      totalTime: this.elapsed(),
      checkpoints: this.getCheckpoints(),
    });
  }
}

/**
 * Middleware to track request performance
 */
export function performanceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Capture the original end function
  const originalEnd = res.end;

  // Override res.end to capture response time
  res.end = function (this: Response, ...args: any[]): any {
    const duration = Date.now() - start;

    // Log slow requests (> 1 second)
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration,
        requestId: (req as any).requestId,
      });
    }

    // Add performance header (only if headers not already sent)
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration}ms`);
    }

    // Call original end
    return originalEnd.apply(this, args as any);
  } as any;

  next();
}

/**
 * Decorator to measure function execution time
 */
export function measureTime(context: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;

        if (duration > 500) {
          logger.debug('Function execution time', {
            context,
            method: propertyKey,
            duration,
          });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - start;
        logger.error('Function execution failed', {
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
export class QueryPerformanceTracker {
  private queries: Array<{
    query: string;
    duration: number;
    timestamp: number;
  }> = [];

  private slowQueryThreshold: number = 1000; // 1 second

  recordQuery(query: string, duration: number): void {
    this.queries.push({
      query: query.substring(0, 200), // Truncate long queries
      duration,
      timestamp: Date.now(),
    });

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      logger.warn('Slow query detected', {
        query: query.substring(0, 200),
        duration,
      });
    }

    // Keep only last 100 queries
    if (this.queries.length > 100) {
      this.queries.shift();
    }
  }

  getStats(): {
    totalQueries: number;
    avgDuration: number;
    slowQueries: number;
    recentQueries: any[];
  } {
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

  logStats(): void {
    logger.info('Query performance statistics', this.getStats());
  }
}

export const queryTracker = new QueryPerformanceTracker();

/**
 * Memory usage tracker
 */
export function logMemoryUsage(): void {
  const usage = process.memoryUsage();

  logger.info('Memory usage', {
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`,
  });
}

/**
 * API endpoint performance targets
 */
export const PerformanceTargets = {
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
} as const;

/**
 * Helper to check if response time meets target
 */
export function meetsPerformanceTarget(duration: number, target: number): boolean {
  return duration <= target;
}

/**
 * Create performance report
 */
export interface PerformanceReport {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  avgResponseTime?: number;
  slowRequests?: number;
  queryStats?: ReturnType<QueryPerformanceTracker['getStats']>;
}

export function createPerformanceReport(): PerformanceReport {
  return {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    queryStats: queryTracker.getStats(),
  };
}

/**
 * Batch processing helper to avoid overwhelming resources
 */
export async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>,
  delayMs: number = 0
): Promise<R[]> {
  const results: R[] = [];

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
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>): void {
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
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastRun = 0;

  return function (this: any, ...args: Parameters<T>): void {
    const now = Date.now();

    if (now - lastRun >= limitMs) {
      func.apply(this, args);
      lastRun = now;
    }
  };
}
