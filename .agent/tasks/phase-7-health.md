# Task: Phase 7 - Health Monitoring

**Priority:** MEDIUM
**Estimated Time:** 1 week
**Status:** PENDING

---

## Overview

Build a comprehensive health monitoring system that tracks account health, detects issues early, and provides actionable insights.

---

## Health Metrics

### Account Metrics:
1. **Engagement Rate:** Likes + comments per post
2. **Follower Growth:** Daily/weekly growth rate
3. **Post Success Rate:** Successful posts / total attempts
4. **Response Time:** How quickly posts are published
5. **Error Rate:** Errors in last 24h/7d
6. **Rate Limit Hits:** Times rate limited

### Risk Indicators:
1. **Shadowban Signs:** Sudden engagement drop
2. **Account Flags:** Login challenges frequency
3. **Suspension Risk:** Based on activity patterns
4. **Content Flags:** Removed/flagged posts

---

## Health Score Calculation

```typescript
// Health score: 0-100
calculateHealthScore(account: Account): number {
  let score = 100;
  
  // Deductions
  score -= errorRate * 10;           // -10 per 10% error rate
  score -= rateLimitHits * 5;        // -5 per rate limit
  score -= loginChallenges * 15;     // -15 per challenge
  score -= failedPosts * 2;          // -2 per failed post
  
  // Bonuses
  score += (postSuccessRate - 0.9) * 20;  // Bonus for >90% success
  score += (engagementRate - 0.02) * 50;  // Bonus for >2% engagement
  
  return Math.max(0, Math.min(100, score));
}
```

---

## Files to Create

### New Files:
1. `src/services/health/HealthMonitor.ts` - Main monitoring service
2. `src/services/health/HealthScorer.ts` - Score calculation
3. `src/services/health/AlertManager.ts` - Alert handling
4. `src/services/health/MetricsCollector.ts` - Collect metrics
5. `src/jobs/HealthMonitorJob.ts` - Background monitoring
6. `src/api/controllers/HealthController.ts` - API endpoints

---

## Task Breakdown

### Task 7.1: Create Metrics Collector
**File:** `src/services/health/MetricsCollector.ts`

```typescript
class MetricsCollector {
  // Collect metrics for single account
  async collectAccountMetrics(accountId): Promise<AccountMetrics>
  
  // Collect metrics for all accounts
  async collectSwarmMetrics(userId): Promise<SwarmMetrics>
  
  // Historical data
  async getMetricsHistory(accountId, days): Promise<MetricsHistory>
  
  // Aggregations
  async getDailyAggregates(accountId): Promise<DailyMetrics>
  async getWeeklyAggregates(accountId): Promise<WeeklyMetrics>
}
```

---

### Task 7.2: Create Health Scorer
**File:** `src/services/health/HealthScorer.ts`

```typescript
class HealthScorer {
  // Calculate scores
  calculateHealthScore(metrics: AccountMetrics): number
  calculateEngagementScore(metrics: AccountMetrics): number
  calculateRiskScore(metrics: AccountMetrics): number
  
  // Categorize health
  categorizeHealth(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  
  // Historical comparison
  compareToBaseline(current: number, historical: number[]): HealthTrend
}
```

---

### Task 7.3: Create Alert Manager
**File:** `src/services/health/AlertManager.ts`

```typescript
class AlertManager {
  // Alert creation
  createAlert(accountId, type, severity, message): Promise<Alert>
  
  // Alert management
  acknowledgeAlert(alertId): Promise<void>
  resolveAlert(alertId, resolution): Promise<void>
  
  // Notifications
  sendNotification(userId, alert): Promise<void>
  
  // Alert rules
  checkAlertRules(accountId, metrics): Alert[]
}

// Alert types
enum AlertType {
  HEALTH_CRITICAL = 'health_critical',
  SHADOWBAN_DETECTED = 'shadowban_detected',
  HIGH_ERROR_RATE = 'high_error_rate',
  RATE_LIMIT_FREQUENT = 'rate_limit_frequent',
  LOGIN_CHALLENGE = 'login_challenge',
  ENGAGEMENT_DROP = 'engagement_drop'
}
```

---

### Task 7.4: Create Health Monitor
**File:** `src/services/health/HealthMonitor.ts`

```typescript
class HealthMonitor {
  // Main monitoring
  async monitorAccount(accountId): Promise<HealthReport>
  async monitorSwarm(userId): Promise<SwarmHealthReport>
  
  // Real-time monitoring
  startRealTimeMonitoring(accountId): void
  stopRealTimeMonitoring(accountId): void
  
  // Reports
  async generateDailyReport(userId): Promise<DailyHealthReport>
  async generateWeeklyReport(userId): Promise<WeeklyHealthReport>
}
```

---

### Task 7.5: Background Job
**File:** `src/jobs/HealthMonitorJob.ts`

- Run every 6 hours
- Check all active accounts
- Update health scores
- Send alerts for critical issues
- Generate daily summary

---

### Task 7.6: API Endpoints

**Endpoints:**
- `GET /api/health/account/:id` - Get account health
- `GET /api/health/swarm` - Get swarm health overview
- `GET /api/health/alerts` - Get active alerts
- `POST /api/health/alerts/:id/acknowledge` - Acknowledge alert
- `GET /api/health/reports/daily` - Get daily report
- `GET /api/health/reports/weekly` - Get weekly report
- `GET /api/health/metrics/:accountId` - Get detailed metrics

---

## Database Updates

```sql
-- Update account_health_scores table
ALTER TABLE account_health_scores ADD COLUMN IF NOT EXISTS
  engagement_score DECIMAL(5,2),
  risk_score DECIMAL(5,2),
  metrics JSONB,
  alerts JSONB;

-- Alerts table
CREATE TABLE IF NOT EXISTS health_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  user_id VARCHAR(255) NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT FALSE,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP
);
```

---

## Completion Checklist

- [ ] MetricsCollector.ts created
- [ ] HealthScorer.ts created
- [ ] AlertManager.ts created
- [ ] HealthMonitor.ts created
- [ ] HealthMonitorJob.ts created
- [ ] HealthController.ts created
- [ ] API routes added
- [ ] Database migration added
- [ ] Alert notifications working
- [ ] TypeScript compiles without errors
- [ ] All endpoints tested
- [ ] Documentation updated
