# Task: Phase 5 - Smart Distribution Engine

**Priority:** HIGH
**Estimated Time:** 1 week
**Status:** PENDING

---

## Overview

Build the core distribution engine that intelligently distributes content across 100+ accounts with staggered timing, account rotation, and risk mitigation.

---

## Distribution Strategy

### Timing Strategy:
- **Spread Window:** 6 hours (configurable)
- **Min Gap Between Posts:** 2 minutes
- **Max Gap Between Posts:** 15 minutes
- **Peak Hours Prioritization:** 6-9 AM, 12-2 PM, 6-10 PM local time
- **Weekend Adjustment:** Different timing for weekends

### Account Selection:
1. **Priority Factors:**
   - Account health score (higher = priority)
   - Time since last post (longer = priority)
   - Account state (ACTIVE only)
   - Rate limit status (not limited)
   - Follower count (vary distribution)

2. **Rotation:**
   - Don't always use same accounts first
   - Rotate "lead" accounts
   - Balance workload across accounts

### Risk Mitigation:
- **Never:** Post same content to 2+ accounts within 5 minutes
- **Vary:** Caption and hashtags per account
- **Monitor:** Account health during distribution
- **Pause:** If multiple accounts get rate limited
- **Alert:** On suspicious activity patterns

---

## Files to Create

### New Files:
1. `src/services/distribution/DistributionEngine.ts` - Main orchestrator
2. `src/services/distribution/SchedulingAlgorithm.ts` - Timing calculation
3. `src/services/distribution/AccountSelector.ts` - Account selection
4. `src/services/distribution/RiskManager.ts` - Risk mitigation
5. `src/jobs/DistributionJob.ts` - Background distribution processing
6. `src/api/controllers/DistributionController.ts` - API endpoints

---

## Task Breakdown

### Task 5.1: Create Scheduling Algorithm
**File:** `src/services/distribution/SchedulingAlgorithm.ts`

```typescript
class SchedulingAlgorithm {
  // Calculate optimal post times
  calculateDistributionSchedule(
    accountCount: number,
    startTime: Date,
    spreadHours: number,
    options: SchedulingOptions
  ): PostSchedule[]
  
  // Adjust for peak hours
  optimizeForPeakHours(schedule: PostSchedule[]): PostSchedule[]
  
  // Add random jitter to times
  addHumanVariation(schedule: PostSchedule[]): PostSchedule[]
  
  // Adjust for timezone differences
  adjustForTimezones(schedule: PostSchedule[], accountTimezones: Map): PostSchedule[]
}
```

---

### Task 5.2: Create Account Selector
**File:** `src/services/distribution/AccountSelector.ts`

```typescript
class AccountSelector {
  // Get accounts for distribution
  selectAccounts(
    userId: string,
    count: number,
    criteria: SelectionCriteria
  ): Account[]
  
  // Score accounts for selection
  calculateAccountScore(account: Account): number
  
  // Rotate lead accounts
  rotateLeadAccounts(accounts: Account[]): Account[]
  
  // Filter out problematic accounts
  filterUnavailable(accounts: Account[]): Account[]
  
  // Balance by follower tiers
  balanceByTier(accounts: Account[]): Account[]
}
```

---

### Task 5.3: Create Risk Manager
**File:** `src/services/distribution/RiskManager.ts`

```typescript
class RiskManager {
  // Pre-distribution checks
  async validateDistribution(
    accounts: Account[],
    content: Content
  ): RiskAssessment
  
  // Monitor during distribution
  async monitorProgress(distributionId: string): void
  
  // Detect suspicious patterns
  detectAnomalies(metrics: DistributionMetrics): Anomaly[]
  
  // Emergency stop
  async emergencyHalt(distributionId: string, reason: string): void
  
  // Risk scoring
  calculateRiskScore(accounts: Account[], timing: Date[]): number
}
```

---

### Task 5.4: Create Distribution Engine
**File:** `src/services/distribution/DistributionEngine.ts`

```typescript
class DistributionEngine {
  // Main distribution method
  async distribute(request: DistributionRequest): DistributionResult {
    // 1. Select accounts
    const accounts = await this.accountSelector.selectAccounts(...)
    
    // 2. Create content variations
    const variations = await this.variationEngine.createVariationsForSwarm(...)
    
    // 3. Calculate schedule
    const schedule = this.schedulingAlgorithm.calculateDistributionSchedule(...)
    
    // 4. Validate risk
    const risk = await this.riskManager.validateDistribution(...)
    
    // 5. Queue posts
    await this.queuePosts(accounts, variations, schedule)
    
    // 6. Start monitoring
    this.riskManager.monitorProgress(distributionId)
    
    return result
  }
  
  // Get distribution status
  async getStatus(distributionId: string): DistributionStatus
  
  // Cancel distribution
  async cancel(distributionId: string): void
  
  // Retry failed posts
  async retryFailed(distributionId: string): void
}
```

---

### Task 5.5: Create Distribution Job
**File:** `src/jobs/DistributionJob.ts`

```typescript
// Bull queue for distribution processing
const distributionQueue = new Bull('distribution', redisConfig)

distributionQueue.process(async (job) => {
  const { accountId, variation, scheduledTime } = job.data
  
  // Wait until scheduled time
  await waitUntil(scheduledTime)
  
  // Execute post
  const result = await postingService.post(accountId, variation)
  
  // Update distribution log
  await updateDistributionLog(distributionId, accountId, result)
  
  return result
})
```

---

### Task 5.6: API Endpoints

**Endpoints:**
- `POST /api/distribution/start` - Start new distribution
- `GET /api/distribution/:id/status` - Get distribution status
- `GET /api/distribution/:id/progress` - Get detailed progress
- `POST /api/distribution/:id/pause` - Pause distribution
- `POST /api/distribution/:id/resume` - Resume distribution
- `POST /api/distribution/:id/cancel` - Cancel distribution
- `POST /api/distribution/:id/retry-failed` - Retry failed posts
- `GET /api/distribution/history` - Get distribution history
- `GET /api/distribution/analytics` - Get distribution analytics

---

### Task 5.7: Real-time Updates

Implement WebSocket or Server-Sent Events for:
- Live progress updates
- Success/failure notifications
- Risk alerts
- Completion notification

---

## Database Updates

```sql
-- Distribution logs table (may already exist)
CREATE TABLE IF NOT EXISTS swarm_distribution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  distribution_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id),
  status VARCHAR(50) DEFAULT 'pending',
  scheduled_at TIMESTAMP NOT NULL,
  executed_at TIMESTAMP,
  post_id VARCHAR(255),
  error TEXT,
  variation_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_distribution_logs ON swarm_distribution_logs(distribution_id);
```

---

## Completion Checklist

- [ ] SchedulingAlgorithm.ts created
- [ ] AccountSelector.ts created
- [ ] RiskManager.ts created
- [ ] DistributionEngine.ts created
- [ ] DistributionJob.ts created
- [ ] DistributionController.ts created
- [ ] API routes added
- [ ] WebSocket/SSE for live updates
- [ ] Integration with VariationEngine
- [ ] Integration with PostingService
- [ ] TypeScript compiles without errors
- [ ] All endpoints tested
- [ ] Full distribution flow tested
- [ ] Documentation updated
