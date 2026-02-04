# Instagram Swarm Distribution - TODO & Next Phases

**Current Status:** ✅ **Phase 1 Complete** - Backend Infrastructure & Account Management

This document outlines what's been completed and what remains to build a complete Instagram swarm management system for 100+ accounts.

---

## ✅ Phase 1: COMPLETED (Weeks 1-2)

### Backend Infrastructure
- [x] Node.js + TypeScript + Express backend
- [x] PostgreSQL database (9 tables)
- [x] Redis for caching & job queues
- [x] Docker + Docker Compose setup
- [x] Database migrations system
- [x] Environment configuration & validation

### Account Management API
- [x] Create account (POST /api/accounts)
- [x] List accounts (GET /api/accounts)
- [x] Get account by ID (GET /api/accounts/:id)
- [x] Update account (PUT /api/accounts/:id)
- [x] Delete account (DELETE /api/accounts/:id)
- [x] Bulk import (POST /api/accounts/bulk-import)
- [x] Swarm statistics (GET /api/accounts/stats/swarm)

### Security & Production Features
- [x] AES-256 password encryption
- [x] Rate limiting (100 req/15min)
- [x] Security headers (Helmet.js)
- [x] Input sanitization
- [x] Winston logging
- [x] CORS configuration
- [x] Graceful shutdown
- [x] Health checks

### Frontend Integration
- [x] Backend API service (backendApi.ts)
- [x] Account creation with password + type
- [x] Backend sync with offline fallback
- [x] Updated AccountsScreen UI
- [x] Loading states & error handling

### Documentation
- [x] Complete README files
- [x] DEPLOYMENT.md guide
- [x] SETUP_COMPLETE.md
- [x] API documentation

---

## 🚧 Phase 2: Instagram API Integration (Weeks 3-4)

**Goal:** Connect to Instagram and enable actual posting

### 2.1 Instagram API Clients

**Priority:** HIGH
**Estimated Time:** 3-5 days

**Tasks:**
- [ ] **Install Instagram API packages**
  ```bash
  cd InstaDistro-Backend
  npm install instagram-private-api@latest
  npm install axios
  ```

- [ ] **Create Instagram Graph API Client** (for Business accounts)
  - File: `src/services/instagram/GraphApiClient.ts`
  - Methods:
    - `login(username, password)` - Authenticate
    - `postPhoto(imageUrl, caption)` - Post image
    - `postVideo(videoUrl, caption)` - Post video
    - `getUserInfo()` - Get profile info
    - `getMediaInsights(mediaId)` - Get post analytics

- [ ] **Create Instagram Private API Client** (for Personal accounts)
  - File: `src/services/instagram/PrivateApiClient.ts`
  - Methods:
    - `login(username, password)` - Authenticate with credentials
    - `uploadPhoto(filePath, caption)` - Upload photo
    - `uploadVideo(filePath, caption)` - Upload video
    - `getTimelineFeed()` - Get feed
    - `like(mediaId)` - Like post
    - `follow(userId)` - Follow user
    - `comment(mediaId, text)` - Comment on post

- [ ] **Create Unified Posting Service**
  - File: `src/services/instagram/PostingService.ts`
  - Auto-detect account type and use correct client
  - Handle errors (rate limits, login failures, etc.)
  - Retry logic with exponential backoff
  - Session management

**References:**
- Graph API docs: https://developers.facebook.com/docs/instagram-api
- Private API: https://github.com/dilame/instagram-private-api

---

### 2.2 Account Authentication

**Priority:** HIGH
**Estimated Time:** 2-3 days

**Tasks:**
- [ ] **Implement Instagram login flow**
  - Test credentials when account is created
  - Store session tokens (encrypted)
  - Handle 2FA challenges
  - Handle checkpoint challenges (suspicious login)
  - Auto-refresh sessions before expiry

- [ ] **Create Authentication Service**
  - File: `src/services/instagram/AuthService.ts`
  - Methods:
    - `authenticate(account)` - Login to Instagram
    - `verifySession(account)` - Check if session is valid
    - `refreshSession(account)` - Refresh expired session
    - `handleChallenge(account, challengeType)` - Handle 2FA/checkpoints

- [ ] **Add Account Verification Endpoint**
  - Implement `POST /api/accounts/:id/verify`
  - Test Instagram login
  - Update `is_authenticated` status
  - Store session token

- [ ] **Update Frontend**
  - Add "Verify" button in AccountsScreen
  - Show authentication status (✓ Verified / ✗ Not Verified)
  - Handle 2FA input dialog

**Testing:**
```bash
# Test account authentication
curl -X POST http://localhost:3000/api/accounts/ACCOUNT_ID/verify \
  -H "x-user-id: user_1"
```

---

### 2.3 Basic Posting Functionality

**Priority:** HIGH
**Estimated Time:** 2-3 days

**Tasks:**
- [ ] **Create Post Job Processor**
  - File: `src/jobs/PostJob.ts`
  - Use Bull queue for background processing
  - Execute actual Instagram post
  - Update `post_results` table
  - Handle failures and retries

- [ ] **Create Immediate Post Endpoint**
  - Endpoint: `POST /api/posts/immediate`
  - Body:
    ```json
    {
      "accountId": "uuid",
      "videoUri": "path/to/video.mp4",
      "caption": "My caption",
      "hashtags": ["tag1", "tag2"]
    }
    ```
  - Upload video to Instagram
  - Return post ID and status

- [ ] **Update Frontend**
  - Add "Post Now" button in DistributionScreen
  - Show posting progress
  - Display success/failure results
  - Show Instagram post URL

**Testing:**
```bash
# Test immediate posting
curl -X POST http://localhost:3000/api/posts/immediate \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_1" \
  -d '{
    "accountId": "uuid",
    "videoUri": "/path/to/video.mp4",
    "caption": "Test post",
    "hashtags": ["test"]
  }'
```

---

### 2.4 Error Handling & Rate Limits

**Priority:** MEDIUM
**Estimated Time:** 2 days

**Tasks:**
- [ ] **Instagram Error Handler**
  - File: `src/services/instagram/ErrorHandler.ts`
  - Detect rate limit errors (429)
  - Detect login failures
  - Detect shadowban
  - Detect checkpoint required
  - Auto-pause account on critical errors

- [ ] **Rate Limit Tracker**
  - Track posts per account per hour/day
  - Prevent exceeding Instagram limits:
    - Personal: 3-7 posts/day
    - Business: 10-15 posts/day
  - Queue posts if limit reached
  - Resume when limit resets

---

## 🚧 Phase 3: Warmup Automation (Weeks 5-6)

**Goal:** Automatically warm up new accounts over 14 days

### 3.1 Warmup Task Generator

**Priority:** HIGH
**Estimated Time:** 3-4 days

**Tasks:**
- [ ] **Create Warmup Protocol Configuration**
  - File: `src/config/warmup.ts`
  - Define 14-day warmup schedule:
    ```typescript
    Day 1-2: Setup profile, follow 5-10, like 10-15
    Day 3-4: Light activity, post 1 story
    Day 5-7: Increase engagement, first feed post
    Day 8-10: 1 post/day
    Day 11-14: 2-3 posts/day
    Day 15+: Full ACTIVE (10-15 posts/day)
    ```

- [ ] **Create Warmup Task Generator**
  - File: `src/services/swarm/WarmupAutomation.ts`
  - Methods:
    - `generateWarmupTasks(accountId)` - Generate all 14 days of tasks
    - `getTasksForDay(accountId, day)` - Get tasks for specific day
    - `markTaskComplete(taskId)` - Mark task as done

- [ ] **Implement Auto-Start Warmup**
  - When account is created → auto-generate warmup tasks
  - Set account state to `WARMING_UP`
  - Schedule first tasks for execution

**Database Query:**
```sql
-- Insert warmup tasks for an account
INSERT INTO warmup_tasks (account_id, day, task_type, target_count, scheduled_time)
VALUES
  ('account-uuid', 1, 'follow', 10, NOW() + INTERVAL '2 hours'),
  ('account-uuid', 1, 'like', 15, NOW() + INTERVAL '4 hours');
```

---

### 3.2 Warmup Job Processor

**Priority:** HIGH
**Estimated Time:** 3-4 days

**Tasks:**
- [ ] **Create Warmup Job**
  - File: `src/jobs/WarmupJob.ts`
  - Bull queue processor
  - Execute warmup tasks:
    - Follow users
    - Like posts
    - Comment (random templates)
    - Watch stories
    - Post stories/feed

- [ ] **Create Warmup Executor**
  - File: `src/services/swarm/WarmupExecutor.ts`
  - Methods:
    - `executeFollow(accountId, targetUserId)` - Follow user
    - `executeLike(accountId, mediaId)` - Like post
    - `executeComment(accountId, mediaId)` - Post comment
    - `executeStoryView(accountId, storyId)` - View story
    - `executePost(accountId, content)` - Post content

- [ ] **Add Random Delays**
  - 30 seconds - 5 minutes between actions
  - Mimic human behavior
  - Prevent spam detection

- [ ] **Create Warmup Scheduler**
  - Schedule tasks for execution
  - Respect warmup timeline
  - Auto-transition to ACTIVE on Day 15

**Endpoints:**
- `POST /api/warmup/start/:accountId` - Start warmup
- `GET /api/warmup/progress/:accountId` - Get progress
- `GET /api/warmup/tasks` - List all tasks
- `DELETE /api/warmup/cancel/:accountId` - Cancel warmup

---

### 3.3 Warmup Monitoring UI

**Priority:** MEDIUM
**Estimated Time:** 2 days

**Tasks:**
- [ ] **Create WarmupProgressCard Component**
  - File: `InstaDistro/src/components/WarmupProgressCard.tsx`
  - Show "Day X/14" progress bar
  - List today's tasks with checkmarks
  - Show next scheduled action
  - "Skip to Active" button (with warning)

- [ ] **Update AccountsScreen**
  - Show warmup badge on accounts in WARMING_UP state
  - Tap account to see warmup details
  - Display warmup progress

---

## 🚧 Phase 4: Content Variation Engine (Weeks 7-8)

**Goal:** Generate unique content variations for each account

### 4.1 Video Variation Processing

**Priority:** MEDIUM
**Estimated Time:** 4-5 days

**Tasks:**
- [ ] **Install FFmpeg & Dependencies**
  ```bash
  # On server
  sudo apt install ffmpeg

  # In backend
  npm install fluent-ffmpeg @ffmpeg-installer/ffmpeg
  ```

- [ ] **Create Video Processor**
  - File: `src/services/storage/VideoProcessor.ts`
  - Methods:
    - `applySpeedChange(videoPath, multiplier)` - Change speed (0.95-1.05)
    - `adjustBrightness(videoPath, level)` - Adjust brightness (-10 to +10)
    - `adjustContrast(videoPath, level)` - Adjust contrast
    - `cropVideo(videoPath, dimensions)` - Crop edges (2-5%)
    - `mirrorVideo(videoPath)` - Mirror horizontally
    - `addWatermark(videoPath, text)` - Add subtle watermark

- [ ] **Create Variation Generator**
  - File: `src/services/swarm/ContentVariationEngine.ts`
  - Methods:
    - `generateVideoVariation(videoPath, accountId)` - Create unique video
    - `generateCaptionVariation(template)` - Create unique caption
    - `generateHashtagSet()` - Rotate hashtags
  - Store variations in `content_variations` table

- [ ] **Pre-Generate Variations**
  - When video is uploaded → generate variations for all accounts
  - Store in database
  - Serve from cache when posting

**Testing:**
```bash
# Generate variation
ffmpeg -i input.mp4 -filter:v "eq=brightness=0.1" output.mp4
```

---

### 4.2 Caption & Hashtag Variation

**Priority:** MEDIUM
**Estimated Time:** 2 days

**Tasks:**
- [ ] **Create Caption Template System**
  - File: `src/services/swarm/CaptionGenerator.ts`
  - Templates with variables:
    ```
    "Check out this {adjective} content! {emoji} {hashtags}"
    "You won't believe this {adjective} video! {emoji}"
    ```
  - Variable pools (adjectives, emojis, etc.)
  - Generate unique combinations

- [ ] **Create Hashtag Rotator**
  - File: `src/services/swarm/HashtagRotator.ts`
  - Hashtag pools:
    - Primary: #viral, #trending
    - Niche: #fitness, #workout
    - Engagement: #like4like
    - Location: #usa, #newyork
  - Rotate combinations per account
  - Ensure 70%+ variation from original

**Endpoint:**
- `POST /api/variations/generate` - Generate variations
- `GET /api/variations/:videoId` - Get all variations

---

## 🚧 Phase 5: Smart Distribution Engine (Weeks 9-10)

**Goal:** Distribute content to 100+ accounts with staggered timing

### 5.1 Staggered Posting Algorithm

**Priority:** HIGH
**Estimated Time:** 3-4 days

**Tasks:**
- [ ] **Create Staggered Distributor**
  - File: `src/services/scheduling/StaggeredDistributor.ts`
  - Algorithm:
    ```typescript
    Input: 100 accounts, 1 video, 6-hour window
    Output: Schedule with posts every 3-4 minutes
    - Add random jitter (±10% of interval)
    - Respect account states (skip PAUSED/BANNED)
    - Use variations per account
    ```

- [ ] **Distribution Patterns**
  - Wave: Post in groups (10 accounts every 30min)
  - Random: Completely random within window
  - Peak Time: Concentrate at engagement peaks
  - Geographic: Spread by timezone
  - Risk-Weighted: More spacing for new accounts

- [ ] **Create Distribution Endpoint**
  - Endpoint: `POST /api/swarm/distribute`
  - Body:
    ```json
    {
      "videoId": "uuid",
      "accountIds": ["uuid1", "uuid2", ...],
      "duration": 6,
      "pattern": "staggered",
      "caption": "Template text",
      "hashtags": ["tag1", "tag2"]
    }
    ```
  - Generate schedule
  - Queue all posts
  - Return timeline

**Frontend:**
- [ ] Create SwarmDistributeScreen
  - Select video
  - Select accounts (multi-select with filters)
  - Choose pattern & duration
  - Preview timeline
  - Execute distribution

---

### 5.2 Account Rotation

**Priority:** MEDIUM
**Estimated Time:** 2 days

**Tasks:**
- [ ] **Create Account Rotator**
  - File: `src/services/scheduling/AccountRotator.ts`
  - Round-robin rotation for recurring posts
  - Health-based filtering (skip accounts with score < 70)
  - Load balancing (prioritize accounts with fewer posts)
  - Track posts per account per day

---

### 5.3 Risk Mitigation

**Priority:** HIGH
**Estimated Time:** 2-3 days

**Tasks:**
- [ ] **Pattern Avoidance**
  - Randomize delays (30s-5min)
  - Randomize action order
  - Mimic real user sessions
  - Device fingerprinting per account

- [ ] **Safety Limits**
  - NEW_ACCOUNT: 1-3 posts/day
  - WARMING_UP: 3-7 posts/day
  - ACTIVE: 10-15 posts/day

- [ ] **Auto-Pause Triggers**
  - Action block → Pause 24-48 hours
  - 3 failed logins → Pause & alert
  - Follower drop > 10% → Pause
  - Multiple accounts from same proxy blocked → Rotate proxy

---

## 🚧 Phase 6: Account Groups (Week 11)

**Goal:** Organize 100+ accounts into groups

### 6.1 Group Management

**Priority:** MEDIUM
**Estimated Time:** 3 days

**Tasks:**
- [ ] **Create Group Controller**
  - File: `src/api/controllers/GroupController.ts`
  - Endpoints:
    - `POST /api/groups` - Create group
    - `GET /api/groups` - List groups
    - `PUT /api/groups/:id` - Update group
    - `DELETE /api/groups/:id` - Delete group
    - `POST /api/groups/:id/add-accounts` - Add accounts
    - `POST /api/groups/:id/distribute` - Distribute to group

- [ ] **Group Features**
  - Name, color, description
  - Tags (niche, region, age)
  - Posting strategy per group
  - Bulk operations

- [ ] **Frontend: GroupManagementScreen**
  - List groups as cards
  - Create/edit group dialog
  - Multi-select accounts
  - Distribute to group

---

## 🚧 Phase 7: Health Monitoring (Weeks 12-13)

**Goal:** Monitor account health in real-time

### 7.1 Health Scoring System

**Priority:** HIGH
**Estimated Time:** 4-5 days

**Tasks:**
- [ ] **Create Health Monitor**
  - File: `src/services/swarm/HealthMonitor.ts`
  - Calculate health score (0-100):
    - Login success rate
    - Posting success rate
    - Engagement rate
    - Follow ratio
    - Account age
    - Action blocks

- [ ] **Health Check Job**
  - File: `src/jobs/HealthCheckJob.ts`
  - Run every hour
  - Check all accounts
  - Detect issues:
    - Shadowban
    - Rate limit
    - Checkpoint required
  - Update `account_health_scores` table

- [ ] **Auto-Actions**
  - Score < 50 → Alert user
  - Score < 30 → Auto-pause
  - Multiple flags → Investigate

- [ ] **Frontend: Health Dashboard**
  - Show health score per account
  - Color indicators (green/yellow/red)
  - Filter by health status
  - Show recommendations

---

## 🚧 Phase 8: Proxy Management (Week 14)

**Goal:** Manage 100+ proxies efficiently

### 8.1 Proxy System

**Priority:** MEDIUM
**Estimated Time:** 3-4 days

**Tasks:**
- [ ] **Create Proxy Controller**
  - Endpoints:
    - `POST /api/proxies` - Add proxy
    - `GET /api/proxies` - List proxies
    - `POST /api/proxies/bulk-import` - Import from file
    - `POST /api/proxies/:id/health-check` - Check health
    - `POST /api/proxies/assign` - Assign to account

- [ ] **Proxy Health Monitor**
  - File: `src/services/proxy/ProxyHealthMonitor.ts`
  - Check every 15 minutes:
    - Response time
    - Instagram accessibility
    - IP geolocation
  - Auto-disable dead proxies

- [ ] **Proxy Assignment**
  - 1 proxy per account (sticky session)
  - Backup proxy for failover
  - Auto-rotation on failure

- [ ] **Frontend: ProxyManagementScreen**
  - List proxies (table view)
  - Add/edit proxy
  - Bulk import (CSV)
  - Health status indicators
  - Assignment management

---

## 🚧 Phase 9: Advanced Scheduling (Weeks 15-16)

**Goal:** Complete scheduling system

### 9.1 Recurring Schedules

**Priority:** MEDIUM
**Estimated Time:** 3 days

**Tasks:**
- [ ] **Create Recurring Scheduler**
  - File: `src/services/scheduling/RecurringService.ts`
  - Support:
    - Daily (every X days)
    - Weekly (specific days)
    - Monthly (specific date)
  - Timezone handling
  - End date support

- [ ] **Recurring Job Processor**
  - File: `src/jobs/RecurringJob.ts`
  - Check every minute
  - Create PostJob for due schedules
  - Calculate next occurrence

- [ ] **Endpoints:**
  - `POST /api/schedules/recurring`
  - `GET /api/schedules`
  - `DELETE /api/schedules/:id`

---

### 9.2 Queue System

**Priority:** LOW
**Estimated Time:** 2 days

**Tasks:**
- [ ] **Queue Manager**
  - File: `src/services/scheduling/QueueManager.ts`
  - Multiple queues per user
  - Priority system
  - Optimal time calculation
  - Auto-scheduling

- [ ] **Frontend: QueueManagementScreen**
  - Create queues
  - Add videos to queue
  - Configure posting schedule
  - View queue status

---

## 🚧 Phase 10: Production Polish (Weeks 17-18)

**Goal:** Make it bulletproof for production

### 10.1 Testing

**Priority:** HIGH
**Estimated Time:** 5 days

**Tasks:**
- [ ] **Unit Tests**
  - Test all services (70%+ coverage)
  - Test API endpoints
  - Test encryption/decryption
  - Test schedule calculations

- [ ] **Integration Tests**
  - Test full posting flow
  - Test warmup automation
  - Test distribution to 100 accounts
  - Test proxy rotation
  - Test error recovery

- [ ] **Load Testing**
  - 100 accounts posting simultaneously
  - 1000 API requests/minute
  - Database query performance
  - Redis queue throughput

---

### 10.2 Monitoring & Alerts

**Priority:** HIGH
**Estimated Time:** 2-3 days

**Tasks:**
- [ ] **Setup Monitoring**
  - Grafana dashboards
  - Prometheus metrics
  - Sentry error tracking
  - Uptime monitoring

- [ ] **Create Alerts**
  - Email alerts for critical errors
  - Slack notifications
  - SMS for downtime
  - Weekly summary reports

---

### 10.3 Documentation

**Priority:** MEDIUM
**Estimated Time:** 2 days

**Tasks:**
- [ ] **Update Documentation**
  - Complete API docs
  - Add code comments
  - Create user guide
  - Add troubleshooting section
  - Best practices guide

- [ ] **Video Tutorials**
  - Setup walkthrough
  - Account management demo
  - Distribution demo
  - Warmup demo

---

## 📊 Priority Summary

### Must Have (Phase 2-3)
1. **Instagram API Integration** - Cannot post without this
2. **Basic Posting** - Core functionality
3. **Warmup Automation** - Essential for scaling

### Should Have (Phase 4-7)
4. **Content Variation** - Important for avoiding bans
5. **Smart Distribution** - Key differentiator
6. **Health Monitoring** - Prevents issues

### Nice to Have (Phase 8-10)
7. **Proxy Management** - Scaling feature
8. **Advanced Scheduling** - User convenience
9. **Production Polish** - Professional finish

---

## 🔧 Development Setup for Next Developer

### 1. Clone & Setup

```bash
# Clone repo
git clone git@github.com:talhaakhtargithub/insta_distribution.git
cd insta_distribution

# Backend
cd InstaDistro-Backend
npm install
docker-compose up -d
npm run migrate
npm run dev

# Frontend (new terminal)
cd ../InstaDistro
npm install
npx expo start
```

### 2. Create Feature Branch

```bash
git checkout -b feature/instagram-api-integration
```

### 3. Read Documentation

- [SETUP_COMPLETE.md](SETUP_COMPLETE.md) - Complete setup guide
- [InstaDistro-Backend/README.md](InstaDistro-Backend/README.md) - Backend docs
- [InstaDistro-Backend/DEPLOYMENT.md](InstaDistro-Backend/DEPLOYMENT.md) - Deployment guide

### 4. Start with Phase 2.1

Begin with Instagram API integration (highest priority).

---

## 📞 Questions or Issues?

**Documentation:**
- Setup: [SETUP_COMPLETE.md](SETUP_COMPLETE.md)
- Backend: [InstaDistro-Backend/README.md](InstaDistro-Backend/README.md)
- Deployment: [InstaDistro-Backend/DEPLOYMENT.md](InstaDistro-Backend/DEPLOYMENT.md)

**Testing:**
```bash
# Health check
curl http://localhost:3000/health

# List accounts
curl http://localhost:3000/api/accounts -H "x-user-id: user_1"

# Database access
docker exec -it insta-swarm-db psql -U swarm_user -d insta_swarm
```

**Logs:**
```bash
# Backend logs
docker-compose logs -f

# Application logs
tail -f logs/combined.log
tail -f logs/error.log
```

---

## ✅ Quick Checklist for Next Developer

**Before Starting:**
- [ ] Read SETUP_COMPLETE.md
- [ ] Start backend successfully
- [ ] Test account creation
- [ ] Review database schema
- [ ] Understand current architecture

**Phase 2 Checklist:**
- [ ] Install instagram-private-api
- [ ] Create GraphApiClient.ts
- [ ] Create PrivateApiClient.ts
- [ ] Implement login flow
- [ ] Test posting to 1 account
- [ ] Handle errors & retries
- [ ] Update frontend to trigger posts

**Testing:**
- [ ] Can create accounts
- [ ] Can authenticate with Instagram
- [ ] Can post to Instagram
- [ ] Errors are handled gracefully
- [ ] Logs show useful information

---

**Estimated Total Remaining Time:** 12-14 weeks (with 1 developer)

**Most Critical Path:** Phase 2 (Instagram API) → Phase 3 (Warmup) → Phase 5 (Distribution)

**GitHub:** https://github.com/talhaakhtargithub/insta_distribution

---

**Good luck! The foundation is solid. Time to add the magic! 🚀**