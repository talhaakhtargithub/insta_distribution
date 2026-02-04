# Task: Phase 9 - Advanced Scheduling

**Priority:** MEDIUM
**Estimated Time:** 1 week
**Status:** PENDING

---

## Overview

Implement advanced scheduling features including recurring schedules, timezone support, optimal timing suggestions, and queue management.

---

## Schedule Types

1. **One-time:** Post once at specific time
2. **Daily:** Post every day at specific time
3. **Weekly:** Post on specific days of week
4. **Custom:** Complex cron-like schedules
5. **Recurring Distribution:** Distribute content on schedule

---

## Files to Create

### New Files:
1. `src/services/scheduling/ScheduleManager.ts` - Schedule management
2. `src/services/scheduling/RecurringScheduler.ts` - Handle recurring
3. `src/services/scheduling/OptimalTimeCalculator.ts` - Best time suggestions
4. `src/services/scheduling/QueueManager.ts` - Queue operations
5. `src/jobs/ScheduleExecutorJob.ts` - Execute scheduled posts
6. `src/api/controllers/ScheduleController.ts` - API endpoints

---

## Task Breakdown

### Task 9.1: Create Schedule Manager
**File:** `src/services/scheduling/ScheduleManager.ts`

```typescript
class ScheduleManager {
  // CRUD
  async createSchedule(data): Promise<Schedule>
  async getSchedule(scheduleId): Promise<Schedule>
  async updateSchedule(scheduleId, data): Promise<Schedule>
  async deleteSchedule(scheduleId): Promise<void>
  async listSchedules(userId): Promise<Schedule[]>
  
  // Control
  async pauseSchedule(scheduleId): Promise<void>
  async resumeSchedule(scheduleId): Promise<void>
  
  // Execution
  async getNextExecution(scheduleId): Promise<Date>
  async getUpcomingExecutions(scheduleId, count): Promise<Date[]>
}
```

---

### Task 9.2: Create Recurring Scheduler
**File:** `src/services/scheduling/RecurringScheduler.ts`

```typescript
class RecurringScheduler {
  // Parse schedule patterns
  parsePattern(pattern: string): SchedulePattern
  
  // Calculate next occurrence
  getNextOccurrence(pattern, after?): Date
  
  // Generate occurrence list
  generateOccurrences(pattern, count): Date[]
  
  // Cron-like syntax support
  parseCron(cron: string): CronSchedule
}

// Pattern examples
const patterns = {
  daily: 'every day at 10:00',
  weekly: 'every monday,wednesday,friday at 18:00',
  biweekly: 'every 2 weeks on monday at 09:00',
  custom: '0 10 * * 1-5' // Cron format
};
```

---

### Task 9.3: Create Optimal Time Calculator
**File:** `src/services/scheduling/OptimalTimeCalculator.ts`

```typescript
class OptimalTimeCalculator {
  // Get best posting times
  async getOptimalTimes(accountId): Promise<TimeSlot[]>
  
  // Based on engagement history
  analyzeEngagementPatterns(accountId): EngagementPattern
  
  // Based on follower activity
  async getFollowerActiveHours(accountId): Promise<HourDistribution>
  
  // Global best practices
  getGlobalOptimalTimes(niche: string): TimeSlot[]
  
  // Combine factors
  calculateOptimalSlots(
    accountId,
    niche,
    timezone
  ): Promise<TimeSlot[]>
}
```

---

### Task 9.4: Create Queue Manager
**File:** `src/services/scheduling/QueueManager.ts`

```typescript
class QueueManager {
  // Queue operations
  async addToQueue(item): Promise<QueueItem>
  async removeFromQueue(itemId): Promise<void>
  async getQueuePosition(itemId): Promise<number>
  
  // Queue view
  async getQueue(userId, filters?): Promise<QueueItem[]>
  async getQueueStats(userId): Promise<QueueStats>
  
  // Reordering
  async moveToFront(itemId): Promise<void>
  async moveToPosition(itemId, position): Promise<void>
  
  // Bulk operations
  async clearQueue(userId): Promise<void>
  async pauseQueue(userId): Promise<void>
  async resumeQueue(userId): Promise<void>
}
```

---

### Task 9.5: Create Schedule Executor Job
**File:** `src/jobs/ScheduleExecutorJob.ts`

- Check for due schedules every minute
- Execute scheduled posts
- Handle recurring schedule advancement
- Update schedule status
- Handle failures and retries

---

### Task 9.6: API Endpoints

**Endpoints:**
- `POST /api/schedules` - Create schedule
- `GET /api/schedules` - List schedules
- `GET /api/schedules/:id` - Get schedule details
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule
- `POST /api/schedules/:id/pause` - Pause schedule
- `POST /api/schedules/:id/resume` - Resume schedule
- `GET /api/schedules/upcoming` - Get upcoming posts
- `GET /api/schedules/optimal-times/:accountId` - Get optimal times
- `GET /api/queue` - Get posting queue
- `POST /api/queue/reorder` - Reorder queue
- `DELETE /api/queue/:id` - Remove from queue

---

## Database Updates

```sql
-- Extend scheduled_posts table
ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS
  schedule_pattern TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  last_executed_at TIMESTAMP,
  next_execution_at TIMESTAMP,
  execution_count INTEGER DEFAULT 0,
  timezone VARCHAR(50) DEFAULT 'UTC';

-- Queue table (may already exist as 'queues')
ALTER TABLE queues ADD COLUMN IF NOT EXISTS
  queue_position INTEGER,
  priority INTEGER DEFAULT 5,
  paused BOOLEAN DEFAULT FALSE;
```

---

## Completion Checklist

- [ ] ScheduleManager.ts created
- [ ] RecurringScheduler.ts created
- [ ] OptimalTimeCalculator.ts created
- [ ] QueueManager.ts created
- [ ] ScheduleExecutorJob.ts created
- [ ] ScheduleController.ts created
- [ ] API routes added
- [ ] Database migration added
- [ ] Cron parsing working
- [ ] Recurring schedules tested
- [ ] TypeScript compiles without errors
- [ ] All endpoints tested
- [ ] Documentation updated
