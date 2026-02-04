# Task: Phase 3 - Warmup Automation

**Priority:** HIGH
**Estimated Time:** 1 week
**Status:** PENDING

---

## Overview

Implement the 14-day warmup protocol that automatically warms up new Instagram accounts before allowing full posting activity. This prevents new accounts from being flagged or banned.

---

## Warmup Protocol (14-Day Schedule)

| Day | Activity Level | Actions |
|-----|---------------|---------|
| 1-2 | Minimal | Setup profile, browse feed (5-10 min), follow 5 users |
| 3-4 | Light | Like 10-15 posts, follow 5-10 users, 1 story view |
| 5-6 | Moderate | Like 15-20 posts, comment 2-3 times, post 1 story |
| 7-8 | Active | First feed post, like 20-25 posts, follow 10-15 users |
| 9-10 | Increased | 1 feed post/day, like 25-30 posts, comment 5-7 times |
| 11-12 | Heavy | 2 feed posts/day, engage with 30+ posts |
| 13-14 | Full | 2-3 posts/day, full engagement allowed |
| 15+ | ACTIVE | Account fully warmed up, normal operation |

---

## Files to Create

### New Files:
1. `src/config/warmup.ts` - Warmup protocol configuration
2. `src/services/swarm/WarmupAutomation.ts` - Warmup task generator
3. `src/services/swarm/WarmupExecutor.ts` - Execute warmup tasks
4. `src/jobs/WarmupTaskJob.ts` - Process individual warmup tasks
5. `src/api/controllers/WarmupController.ts` - Warmup API endpoints
6. `src/api/routes/warmup.routes.ts` - Warmup routes

---

## Task Breakdown

### Task 3.1: Create Warmup Configuration
**File:** `src/config/warmup.ts`

```typescript
export const WARMUP_PROTOCOL = {
  TOTAL_DAYS: 14,
  PHASES: [
    {
      days: [1, 2],
      name: 'MINIMAL',
      actions: { browse: 10, follow: 5, like: 0, comment: 0, post: 0 }
    },
    {
      days: [3, 4],
      name: 'LIGHT',
      actions: { browse: 15, follow: 10, like: 15, comment: 0, post: 0, story: 1 }
    },
    // ... rest of phases
  ],
  DELAYS: {
    MIN_BETWEEN_ACTIONS: 30, // seconds
    MAX_BETWEEN_ACTIONS: 300, // 5 minutes
    SESSION_LENGTH: { MIN: 5, MAX: 20 } // minutes
  }
};
```

---

### Task 3.2: Create Warmup Task Generator
**File:** `src/services/swarm/WarmupAutomation.ts`

**Functions:**
- `generateWarmupSchedule(accountId)` - Create all 14 days of tasks
- `getTasksForDay(accountId, day)` - Get tasks for specific day
- `getNextTask(accountId)` - Get next pending task
- `markTaskComplete(taskId, result)` - Mark task as done
- `adjustSchedule(accountId, reason)` - Modify schedule for issues
- `skipToActive(accountId)` - Emergency skip (risky)

---

### Task 3.3: Create Warmup Executor
**File:** `src/services/swarm/WarmupExecutor.ts`

**Functions:**
- `executeFollow(accountId, targetUser)` - Follow a user
- `executeLike(accountId, mediaId)` - Like a post
- `executeComment(accountId, mediaId, text)` - Post comment
- `executeStoryView(accountId, userId)` - View stories
- `executePost(accountId, content)` - Post to feed
- `executeBrowse(accountId, minutes)` - Browse feed
- `findTargetContent(accountId, niche)` - Find relevant content

---

### Task 3.4: Create Warmup Task Job
**File:** `src/jobs/WarmupTaskJob.ts`

**Features:**
- Bull queue for warmup task processing
- Staggered execution (not all at once)
- Human-like delays between actions
- Failure handling with retry
- Progress tracking
- Auto-advance to next day

---

### Task 3.5: Create Warmup Scheduler (Already Exists)
**File:** `src/jobs/WarmupJob.ts` (Extend)

Add:
- Automatic task scheduling on account creation
- Daily check for pending tasks
- Auto-transition to ACTIVE on day 15
- Pause/resume capabilities

---

### Task 3.6: Warmup API Endpoints

**Endpoints:**
- `GET /api/warmup/protocol` - Get warmup protocol details
- `POST /api/warmup/start/:accountId` - Start warmup for account
- `GET /api/warmup/progress/:accountId` - Get warmup progress
- `GET /api/warmup/tasks/:accountId/:day` - Get tasks for specific day
- `POST /api/warmup/pause/:accountId` - Pause warmup
- `POST /api/warmup/resume/:accountId` - Resume warmup
- `POST /api/warmup/skip-to-active/:accountId` - Skip warmup (risky)
- `GET /api/warmup/accounts` - Get all accounts in warmup
- `GET /api/warmup/stats` - Get warmup statistics

---

## Database Updates

Already have `warmup_tasks` table, but may need:
```sql
ALTER TABLE warmup_tasks ADD COLUMN IF NOT EXISTS
  actual_result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0;
```

---

## Comment Templates

Store human-like comment templates:
```typescript
const COMMENT_TEMPLATES = [
  "Love this! 🔥",
  "Amazing content! 👏",
  "This is so good! ❤️",
  "Wow, incredible work!",
  "So inspiring! ✨",
  // 50+ more templates with variations
];
```

---

## Completion Checklist

- [ ] warmup.ts configuration created
- [ ] WarmupAutomation.ts created
- [ ] WarmupExecutor.ts created
- [ ] WarmupTaskJob.ts created
- [ ] WarmupController.ts updated
- [ ] warmup.routes.ts updated
- [ ] WarmupJob.ts extended
- [ ] Database migration if needed
- [ ] Comment templates added
- [ ] TypeScript compiles without errors
- [ ] All endpoints tested
- [ ] Integration with account creation tested
- [ ] Documentation updated
