# Performance API Guide

This guide documents the performance features integrated into the InstaDistro Backend API.

## Overview

Phase 8 integrated comprehensive performance optimizations including:
- **Redis caching** for frequently accessed data
- **Cursor-based pagination** for efficient large dataset handling
- **Job priorities** with exponential backoff retry strategies
- **Performance monitoring** with request timing

## Pagination

All list endpoints now support cursor-based pagination for improved performance.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Number of items per page (1-100) |
| `cursor` | string | - | Cursor for next page (from previous response) |

### Example Request

```bash
# First page (default 50 items)
curl "http://localhost:3000/api/accounts" \
  -H "x-user-id: user_1"

# With custom limit
curl "http://localhost:3000/api/accounts?limit=20" \
  -H "x-user-id: user_1"

# Next page using cursor
curl "http://localhost:3000/api/accounts?cursor=eyJpZCI6ImFjYy0xMjMifQ&limit=20" \
  -H "x-user-id: user_1"
```

### Response Format

```json
{
  "data": [
    {
      "id": "account-uuid",
      "username": "test_account",
      "account_type": "personal",
      "account_status": "active"
    }
  ],
  "pagination": {
    "limit": 50,
    "hasMore": true,
    "nextCursor": "eyJpZCI6ImFjYy0xMjMifQ",
    "prevCursor": "eyJpZCI6ImFjYy0wMTIifQ"
  }
}
```

### Paginated Endpoints

- `GET /api/accounts` - List accounts
- Future endpoints will adopt this pattern

## Caching

### Cache Behavior

The API implements intelligent caching to reduce database load:

| Endpoint | Cache TTL | Cache Key |
|----------|-----------|-----------|
| `GET /api/accounts` | 15 min | `accounts:list:{userId}:{state}:{cursor}:{limit}` |
| `GET /api/accounts/stats/swarm` | 5 min | `health:swarm:{userId}` |
| Health monitoring | 5 min | `health:{accountId}` or `health:swarm:{userId}` |

### Cache Invalidation

Caches are automatically invalidated when data changes:

- **Account created/updated/deleted** → Invalidates all user account caches
- **Bulk import** → Invalidates user account list cache
- **Health updates** → Automatic expiry after TTL

### Cache Headers

Responses include cache information when served from cache:

```bash
X-Response-Time: 15ms  # Much faster when cached
```

## Performance Monitoring

### Response Time Headers

All API responses include performance headers:

```http
X-Response-Time: 123ms
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
```

### Performance Targets

| Endpoint Type | P95 Target |
|---------------|------------|
| GET endpoints | < 200ms |
| POST endpoints | < 500ms |
| Heavy operations | < 2 seconds |

### Slow Request Logging

Requests exceeding 1 second are automatically logged as warnings with:
- Request method and path
- Duration in milliseconds
- Request ID for tracing

## Job Queue Priorities

Background jobs are now prioritized for optimal performance:

### Priority Levels

| Priority | Level | Retry Strategy | Use Cases |
|----------|-------|----------------|-----------|
| Critical | 1 | 3 attempts, 2s delay | User-facing posts |
| High | 2 | 5 attempts, 5s delay | Health checks, warmup tasks |
| Normal | 3 | 5 attempts, 10s delay | Scheduled posts |
| Low | 4 | 10 attempts, 15s delay | Monitoring |
| Very Low | 5 | 15 attempts, 30s delay | Analytics, cleanup |

### Exponential Backoff

Failed jobs retry with exponential backoff:
- Attempt 1: 2s delay
- Attempt 2: 4s delay
- Attempt 3: 8s delay
- Attempt 4: 16s delay
- Attempt 5: 32s delay
- Cap: 60s maximum

### Job Monitoring

Job statistics are tracked and can be queried:

```bash
# Get job queue stats
curl "http://localhost:3000/api/admin/job-stats" \
  -H "Authorization: Bearer <token>"
```

## Performance Best Practices

### Client-Side

1. **Use cursor pagination** instead of requesting all data at once
2. **Cache responses** on the client when appropriate
3. **Implement retry logic** with exponential backoff
4. **Monitor response times** using X-Response-Time header

### Example: Efficient Pagination

```javascript
// Good: Fetch pages as needed
async function* fetchAllAccounts() {
  let cursor = undefined;

  while (true) {
    const url = cursor
      ? `/api/accounts?cursor=${cursor}&limit=100`
      : '/api/accounts?limit=100';

    const response = await fetch(url);
    const { data, pagination } = await response.json();

    yield* data;

    if (!pagination.hasMore) break;
    cursor = pagination.nextCursor;
  }
}

// Bad: Fetch everything at once
async function fetchAllAccountsBad() {
  const response = await fetch('/api/accounts?limit=10000'); // ❌ Large payload
  return await response.json();
}
```

### Rate Limiting Awareness

Be aware of rate limits when making repeated requests:
- Authenticated users: 300 requests per 15 minutes
- Anonymous users: 100 requests per 15 minutes

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 285
X-RateLimit-Reset: 1640000000
```

## Performance Metrics

Current system performance (after Phase 8 optimizations):

- **Database queries**: 62-73% faster with indexes
- **Cache hit rate target**: > 80%
- **API response time**: P95 < 200ms for cached endpoints
- **Job processing**: Priority-based with automatic retries
- **Request tracking**: All requests include timing headers

## Monitoring and Debugging

### Check Performance

```bash
# Monitor slow requests in logs
tail -f logs/combined.log | grep "Slow request detected"

# Check cache performance
curl "http://localhost:3000/api/accounts/stats/swarm" \
  -H "x-user-id: user_1" \
  -w "\nResponse Time: %{time_total}s\n"
```

### Performance Reports

Performance data is logged with structured metadata:

```json
{
  "level": "info",
  "message": "Performance summary",
  "context": "GET /api/accounts",
  "totalTime": 45,
  "checkpoints": {
    "params-parsed": 2,
    "cache-miss": 5,
    "accounts-fetched": 38,
    "response-created": 42,
    "response-cached": 45
  }
}
```

## Related Documentation

- [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md) - Performance optimization guide
- [DATABASE_OPTIMIZATION.md](./DATABASE_OPTIMIZATION.md) - Database indexing details
- [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md) - Error response standards

## Support

For performance-related questions:
1. Check response time headers (X-Response-Time)
2. Review application logs for slow request warnings
3. Monitor cache hit rates
4. Check job queue statistics
