# Task: Phase 2.4 - Error Handling & Rate Limits

**Priority:** MEDIUM
**Estimated Time:** 2 days
**Status:** PENDING

---

## Overview

Implement comprehensive error handling for Instagram API interactions and rate limit tracking to prevent account bans and ensure reliable posting.

---

## Files to Create/Modify

### New Files:
1. `src/services/instagram/ErrorHandler.ts` - Centralized error handling
2. `src/services/instagram/RateLimiter.ts` - Rate limit tracking per account
3. `src/types/errors.ts` - Error type definitions

### Files to Modify:
1. `src/services/instagram/PrivateApiClient.ts` - Add error handling
2. `src/services/instagram/GraphApiClient.ts` - Add error handling
3. `src/services/instagram/PostingService.ts` - Integrate rate limiting

---

## Task Breakdown

### Task 2.4.1: Create Error Handler
**File:** `src/services/instagram/ErrorHandler.ts`

```typescript
// Error categories to handle:
- RateLimitError (429) - Too many requests
- AuthenticationError (401) - Login required
- ForbiddenError (403) - Account blocked/banned
- CheckpointError - Instagram challenge required
- ShadowbanError - Content being suppressed
- MediaError - Invalid media format
- NetworkError - Connection issues
- UnknownError - Fallback for unexpected errors
```

**Functions:**
- `handleInstagramError(error)` - Parse and categorize errors
- `shouldRetry(error)` - Determine if error is retryable
- `getRetryDelay(error, attempt)` - Calculate backoff time
- `logError(error, context)` - Structured error logging
- `pauseAccountIfNeeded(accountId, error)` - Auto-pause on critical errors

---

### Task 2.4.2: Create Rate Limiter
**File:** `src/services/instagram/RateLimiter.ts`

```typescript
// Rate limits to track:
- Posts per hour (personal: 1, business: 2)
- Posts per day (personal: 5-7, business: 10-15)
- Likes per hour (10-15)
- Comments per hour (5-10)
- Follows per day (50-100)
- DMs per day (50)
```

**Functions:**
- `canPost(accountId)` - Check if posting is allowed
- `recordAction(accountId, actionType)` - Record an action
- `getRemainingQuota(accountId, actionType)` - Get remaining quota
- `getResetTime(accountId, actionType)` - Get when quota resets
- `adjustLimitsForAccountAge(accountId)` - Lower limits for new accounts

**Storage:**
- Use Redis for tracking with TTL-based expiration
- Key format: `ratelimit:{accountId}:{actionType}:{window}`

---

### Task 2.4.3: Update API Clients
**Files:** `PrivateApiClient.ts`, `GraphApiClient.ts`

Add to each method:
- Try/catch with ErrorHandler
- Rate limit check before action
- Record action after success
- Proper error propagation

---

### Task 2.4.4: Database Updates

Add fields to `accounts` table:
```sql
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS 
  last_rate_limit_at TIMESTAMP,
  rate_limit_count INTEGER DEFAULT 0,
  auto_paused_until TIMESTAMP,
  pause_reason TEXT;
```

---

## Testing Commands

```bash
# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/posts/immediate \
    -H "Content-Type: application/json" \
    -H "x-user-id: user_1" \
    -d '{"accountId":"ID","mediaPath":"/test.jpg","caption":"Test"}'
  sleep 1
done

# Check rate limit status
curl http://localhost:3000/api/accounts/ID/rate-limit-status \
  -H "x-user-id: user_1"
```

---

## Completion Checklist

- [ ] ErrorHandler.ts created
- [ ] RateLimiter.ts created
- [ ] PrivateApiClient.ts updated
- [ ] GraphApiClient.ts updated
- [ ] PostingService.ts updated
- [ ] Database migration added
- [ ] TypeScript compiles without errors
- [ ] Rate limiting tested
- [ ] Error handling tested
- [ ] Documentation updated
