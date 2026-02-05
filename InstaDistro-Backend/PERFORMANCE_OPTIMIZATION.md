# Performance Optimization Guide

This guide documents the performance optimizations implemented in InstaDistro Backend and provides best practices for maintaining optimal performance.

## Table of Contents

1. [Overview](#overview)
2. [Caching Strategy](#caching-strategy)
3. [Pagination](#pagination)
4. [Job Queue Optimization](#job-queue-optimization)
5. [Database Performance](#database-performance)
6. [Monitoring](#monitoring)
7. [Best Practices](#best-practices)

## Overview

InstaDistro Backend has been optimized for high performance through:

- **Redis caching** for frequently accessed data
- **Cursor-based pagination** for efficient large dataset handling
- **Prioritized job queues** with exponential backoff retry strategies
- **Database indexing** (30+ indexes, 62-73% query speed improvement)
- **Connection pooling** optimization
- **Request/response monitoring** with performance tracking

### Performance Targets

- **GET endpoints**: P95 < 200ms
- **POST endpoints**: P95 < 500ms
- **Heavy operations**: P95 < 2 seconds
- **Cache hit rate**: > 80%
- **Simple queries**: < 50ms
- **Complex queries**: < 200ms

## Caching Strategy

### Cache Service

The `CacheService` provides Redis-based caching with TTL support:

```typescript
import { cacheService, CacheTTL, CacheNamespace } from './services/cache/CacheService';

// Get or set pattern (recommended)
const accounts = await cacheService.getOrSet(
  cacheService.key(CacheNamespace.ACCOUNTS_LIST, userId, 'active'),
  async () => {
    // Fetch from database
    return await db.query('SELECT * FROM accounts WHERE user_id = $1', [userId]);
  },
  CacheTTL.MEDIUM // 15 minutes
);

// Manual get/set
await cacheService.set(key, data, CacheTTL.SHORT); // 5 minutes
const cached = await cacheService.get(key);
```

### Cache TTLs

```typescript
export const CacheTTL = {
  VERY_SHORT: 60,     // 1 minute  - Real-time data
  SHORT: 300,         // 5 minutes - Frequently changing data
  MEDIUM: 900,        // 15 minutes - Standard caching
  LONG: 3600,         // 1 hour - Slowly changing data
  VERY_LONG: 86400,   // 24 hours - Static/reference data
};
```

### Cache Namespaces

Organized cache keys by domain:

- `account` - Individual account data
- `accounts:list` - Account lists
- `health` - Health scores
- `health:swarm` - Swarm health aggregates
- `schedule`, `proxy`, `group` - Other entities

### Cache Invalidation

```typescript
// Invalidate all user-related caches
await cacheService.invalidateUser(userId);

// Invalidate account-specific caches
await cacheService.invalidateAccount(accountId);

// Invalidate by pattern
await cacheService.delPattern('accounts:list:*');
```

### When to Use Caching

**✅ Good candidates for caching:**
- Account lists (changes infrequently)
- Health scores (can be stale for a few minutes)
- Swarm statistics
- Proxy lists
- Group configurations
- Reference data (warmup protocols, etc.)

**❌ Don't cache:**
- Real-time posting status
- Authentication tokens
- Rate limit counters
- Frequently mutating data
- User-specific sensitive data

## Pagination

### Cursor-Based Pagination (Recommended)

More efficient for large datasets than offset-based pagination:

```typescript
import {
  parseCursorPaginationParams,
  createCursorPaginatedResponse,
  buildCursorQuery,
} from './utils/pagination';

// In controller
async getAccounts(req: Request, res: Response) {
  const { cursor, limit } = parseCursorPaginationParams(req.query);

  // Build query with cursor
  const { query, params } = buildCursorQuery(
    'SELECT * FROM accounts WHERE user_id = $1',
    cursor,
    limit,
    'created_at',
    'DESC'
  );

  const result = await db.query(query, [userId, ...params]);

  // Create paginated response
  const response = createCursorPaginatedResponse(result.rows, limit);

  res.json(response);
}
```

**Benefits:**
- ✅ Consistent performance regardless of page depth
- ✅ No duplicate/missing records when data changes
- ✅ Better for infinite scroll UIs
- ✅ Efficient database queries (uses indexes)

### Offset-Based Pagination (Legacy)

Still supported for simpler use cases:

```typescript
import { parsePaginationParams, createPaginatedResponse } from './utils/pagination';

const { limit, offset, page } = parsePaginationParams(req.query);
const result = await db.query('SELECT * FROM accounts LIMIT $1 OFFSET $2', [limit, offset]);
const total = await db.query('SELECT COUNT(*) FROM accounts');

const response = createPaginatedResponse(result.rows, total.rows[0].count, page, limit);
```

**Limitations:**
- ❌ Slow for large offsets (OFFSET 10000)
- ❌ Can show duplicates if data changes
- ❌ Not efficient for large datasets

### Pagination Limits

```typescript
export const PAGINATION_LIMITS = {
  MIN: 1,
  DEFAULT: 50,
  MAX: 100,
};
```

Always enforce limits to prevent abuse:

```typescript
import { sanitizeLimit, sanitizePage } from './utils/pagination';

const limit = sanitizeLimit(req.query.limit); // Enforces 1-100 range
const page = sanitizePage(req.query.page); // Enforces >= 1
```

## Job Queue Optimization

### Job Priorities

Jobs are prioritized to ensure critical user-facing operations complete first:

```typescript
import { JobPriority, JobType, getJobOptionsByType } from './utils/jobQueue';

// Critical (Priority 1) - User-facing operations
await postQueue.add(JobType.POST_PUBLISH, data, getJobOptionsByType(JobType.POST_PUBLISH));

// High (Priority 2) - Important background tasks
await healthQueue.add(JobType.HEALTH_CHECK, data, getJobOptionsByType(JobType.HEALTH_CHECK));

// Normal (Priority 3) - Standard operations
await scheduleQueue.add(JobType.SCHEDULE_PROCESS, data, getJobOptionsByType(JobType.SCHEDULE_PROCESS));

// Low (Priority 4) - Monitoring
await monitorQueue.add(JobType.HEALTH_MONITOR, data, getJobOptionsByType(JobType.HEALTH_MONITOR));

// Very Low (Priority 5) - Analytics/Cleanup
await cleanupQueue.add(JobType.CLEANUP_OLD_JOBS, data, getJobOptionsByType(JobType.CLEANUP_OLD_JOBS));
```

### Retry Strategies

All job types include exponential backoff retry strategies:

```typescript
// Critical jobs: 3 attempts, 2s base delay
// High priority: 5 attempts, 5s base delay
// Normal: 5 attempts, 10s base delay
// Low: 10 attempts, 15s base delay
// Very Low: 15 attempts, 30s base delay

// Exponential backoff: 2^attempt * baseDelay
// Attempt 1: 2s, Attempt 2: 4s, Attempt 3: 8s, Attempt 4: 16s, Attempt 5: 32s
```

### Custom Job Options

```typescript
import {
  createCriticalJobOptions,
  createHighPriorityJobOptions,
  createNormalJobOptions,
  createLowPriorityJobOptions,
} from './utils/jobQueue';

// Customize standard options
const customOptions = createCriticalJobOptions({
  delay: 5000, // Delay 5 seconds
  repeat: { every: 60000 }, // Repeat every minute
});

await queue.add('custom-job', data, customOptions);
```

### Job Monitoring

```typescript
import { jobMonitor } from './utils/jobQueue';

// Record job lifecycle
jobMonitor.recordJobStarted('post:publish');
jobMonitor.recordJobComplete('post:publish');
jobMonitor.recordJobFailed('post:publish');

// Get statistics
const stats = jobMonitor.getStats('post:publish');
// { completed: 150, failed: 2, active: 3 }

// Log all stats
jobMonitor.logStats();
```

## Database Performance

### Indexes (Phase 4)

30+ indexes implemented for optimal query performance:

- **Composite indexes**: Multi-column queries
- **GIN indexes**: Array/JSONB searches
- **Partial indexes**: Filtered queries
- **Covering indexes**: Index-only scans

**Result**: 62-73% query speed improvement (150-200ms → 50-80ms)

See [DATABASE_OPTIMIZATION.md](./DATABASE_OPTIMIZATION.md) for details.

### Connection Pooling

Optimized PostgreSQL connection pool:

```typescript
const poolConfig = {
  max: 20,                    // Maximum connections
  min: 2,                     // Minimum idle connections
  idleTimeoutMillis: 30000,   // Close idle after 30s
  connectionTimeoutMillis: 5000, // Wait up to 5s for connection
  statement_timeout: 30000,   // Kill queries > 30s
};
```

### Query Performance Tracking

```typescript
import { queryTracker } from './utils/performance';

// Track query performance
const start = Date.now();
const result = await db.query(sql, params);
queryTracker.recordQuery(sql, Date.now() - start);

// Get statistics
const stats = queryTracker.getStats();
// {
//   totalQueries: 1250,
//   avgDuration: 45,
//   slowQueries: 3,
//   recentQueries: [...]
// }
```

Slow queries (> 1s) are automatically logged.

## Monitoring

### Request Performance Tracking

Automatic response time tracking:

```typescript
import { performanceMiddleware } from './utils/performance';

// Applied globally in index.ts
app.use(performanceMiddleware);

// Adds X-Response-Time header to every response
// Logs slow requests (> 1 second)
```

### Performance Tracker

Track specific operations:

```typescript
import { PerformanceTracker } from './utils/performance';

const tracker = new PerformanceTracker();

// Mark checkpoints
await fetchAccounts();
tracker.checkpoint('accounts-fetched');

await calculateHealth();
tracker.checkpoint('health-calculated');

await sendResponse();
tracker.checkpoint('response-sent');

// Log summary
tracker.logSummary('GET /api/accounts');
// {
//   context: 'GET /api/accounts',
//   totalTime: 250,
//   checkpoints: {
//     'accounts-fetched': 50,
//     'health-calculated': 180,
//     'response-sent': 250
//   }
// }
```

### Memory Monitoring

```typescript
import { logMemoryUsage } from './utils/performance';

// Log current memory usage
logMemoryUsage();
// {
//   rss: '125MB',
//   heapTotal: '85MB',
//   heapUsed: '62MB',
//   external: '2MB'
// }
```

### Performance Reports

```typescript
import { createPerformanceReport } from './utils/performance';

const report = createPerformanceReport();
// {
//   uptime: 3600,
//   memoryUsage: {...},
//   queryStats: {...}
// }
```

## Best Practices

### 1. Cache Frequently Accessed Data

```typescript
// ✅ Good: Cache expensive operations
const healthScore = await cacheService.getOrSet(
  cacheService.key(CacheNamespace.HEALTH, accountId),
  async () => await calculateHealthScore(accountId),
  CacheTTL.SHORT
);

// ❌ Bad: Fetch fresh every time
const healthScore = await calculateHealthScore(accountId);
```

### 2. Use Cursor Pagination for Large Datasets

```typescript
// ✅ Good: Cursor-based (efficient)
const { cursor, limit } = parseCursorPaginationParams(req.query);
const { query, params } = buildCursorQuery(baseQuery, cursor, limit);

// ❌ Bad: Large offset (slow)
const offset = (page - 1) * limit; // Page 100 = OFFSET 5000
```

### 3. Prioritize Jobs Appropriately

```typescript
// ✅ Good: User-facing operation = Critical priority
await queue.add(JobType.POST_PUBLISH, data, createCriticalJobOptions());

// ❌ Bad: Analytics job blocking user operations
await queue.add(JobType.ANALYTICS_PROCESS, data, createCriticalJobOptions());
```

### 4. Batch Database Operations

```typescript
// ✅ Good: Batch insert
await db.query('INSERT INTO accounts VALUES ($1), ($2), ($3)', [acc1, acc2, acc3]);

// ❌ Bad: Individual inserts
await db.query('INSERT INTO accounts VALUES ($1)', [acc1]);
await db.query('INSERT INTO accounts VALUES ($1)', [acc2]);
await db.query('INSERT INTO accounts VALUES ($1)', [acc3]);
```

### 5. Use Indexes for Queries

```typescript
// ✅ Good: Query uses indexed columns
SELECT * FROM accounts WHERE user_id = $1 AND account_state = 'ACTIVE';
// Uses index: idx_accounts_user_state

// ❌ Bad: Full table scan
SELECT * FROM accounts WHERE LOWER(username) LIKE '%test%';
```

### 6. Limit Query Results

```typescript
// ✅ Good: Always use LIMIT
SELECT * FROM posts ORDER BY created_at DESC LIMIT 50;

// ❌ Bad: Unbounded query
SELECT * FROM posts ORDER BY created_at DESC;
```

### 7. Invalidate Cache on Updates

```typescript
// ✅ Good: Clear cache after update
await db.query('UPDATE accounts SET status = $1 WHERE id = $2', [status, id]);
await cacheService.invalidateAccount(id);

// ❌ Bad: Stale cache
await db.query('UPDATE accounts SET status = $1 WHERE id = $2', [status, id]);
// Cache still has old status
```

### 8. Use Connection Pooling

```typescript
// ✅ Good: Use pool
import { pool } from './config/database';
const result = await pool.query(sql, params);

// ❌ Bad: New connection every time
const client = new Client();
await client.connect();
const result = await client.query(sql, params);
await client.end();
```

### 9. Monitor Slow Operations

```typescript
// ✅ Good: Track performance
const start = Date.now();
const result = await expensiveOperation();
const duration = Date.now() - start;

if (duration > 1000) {
  logger.warn('Slow operation', { operation: 'expensiveOperation', duration });
}

// ❌ Bad: No tracking
const result = await expensiveOperation();
```

### 10. Process Large Datasets in Batches

```typescript
import { processBatch } from './utils/performance';

// ✅ Good: Batch processing
await processBatch(
  accounts,
  50,
  async (batch) => await updateHealthScores(batch),
  100 // 100ms delay between batches
);

// ❌ Bad: Process all at once
await Promise.all(accounts.map(acc => updateHealthScore(acc)));
```

## Performance Checklist

Before deploying to production:

- [ ] Enable response caching for frequently accessed endpoints
- [ ] Implement cursor-based pagination for list endpoints
- [ ] Set appropriate job priorities for background tasks
- [ ] Verify all database queries use indexes
- [ ] Enable connection pooling
- [ ] Set up performance monitoring
- [ ] Configure appropriate cache TTLs
- [ ] Test with production-like data volumes
- [ ] Profile and optimize slow endpoints (> 1s)
- [ ] Set up alerts for performance degradation

## Performance Metrics

Current metrics (as of Phase 7):

- **Database queries**: 62-73% faster (30+ indexes)
- **Cache hit rate**: Target > 80%
- **Connection pool**: 20 max connections, optimized timeouts
- **Job priorities**: 5 priority levels (critical to very low)
- **Retry strategies**: Exponential backoff (up to 15 attempts for low-priority jobs)
- **Response time**: Target P95 < 200ms for GET, < 500ms for POST
- **Request tracking**: X-Response-Time header on all responses
- **Slow query detection**: Automatic logging for queries > 1s

## Additional Resources

- [DATABASE_OPTIMIZATION.md](./DATABASE_OPTIMIZATION.md) - Database indexing and query optimization
- [TESTING.md](./TESTING.md) - Testing infrastructure
- [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md) - Standard error responses

## Monitoring Tools (Recommended)

For production deployments, consider:

- **APM**: New Relic, Datadog, or AWS X-Ray
- **Database**: pganalyze or CloudWatch
- **Logs**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Metrics**: Prometheus + Grafana
- **Uptime**: UptimeRobot or Pingdom

## Support

For performance issues or optimization questions, check:
1. Logs for slow request warnings
2. Query performance statistics
3. Job queue metrics
4. Memory usage reports
5. Cache hit rates
