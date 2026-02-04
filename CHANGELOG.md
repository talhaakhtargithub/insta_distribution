# Changelog - Instagram Swarm Distribution

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added — Phase 2.4: Error Handling & Rate Limits
- **Error Taxonomy** (`src/types/errors.ts`) — 8 categorised error classes: RateLimit, Authentication, Forbidden, Checkpoint, Shadowban, Media, Network, Unknown
- **ErrorHandler** (`src/services/instagram/ErrorHandler.ts`) — parses raw Private/Graph API errors into typed errors; calculates exponential retry delays; auto-pauses accounts on critical errors
- **RateLimiter** (`src/services/instagram/RateLimiter.ts`) — Redis-backed per-account quota tracking (hourly + daily windows); separate limits for personal vs business accounts; reduced limits for accounts < 30 days old

### Added — Phase 4: Content Variation Engine
- **VideoVariator** (`src/services/variation/VideoVariator.ts`) — ffmpeg filter graph: brightness, contrast, saturation, crop, playback speed, volume. Each variation is randomised within safe thresholds
- **CaptionVariator** (`src/services/variation/CaptionVariator.ts`) — 24-word synonym dictionary; sentence reordering; formatting tweaks
- **HashtagGenerator** (`src/services/variation/HashtagGenerator.ts`) — popular/medium/niche hashtag pools; time-of-day tags; deterministic per-account rotation via djb2 hash
- **VariationEngine** (`src/services/variation/VariationEngine.ts`) — orchestrates video + caption + hashtag variation; persists to `content_variations` table
- **Variation API** — `POST /api/variations/create`, `POST /api/variations/batch`, `GET /api/variations/:accountId`, `GET /api/variations/settings`

### Added — Phase 5: Smart Distribution Engine
- **SchedulingAlgorithm** (`src/services/distribution/SchedulingAlgorithm.ts`) — spreads posts over a configurable window (default 6 h); random gaps 2–15 min; peak-hour priority; human-jitter overlay
- **AccountSelector** (`src/services/distribution/AccountSelector.ts`) — health-score + recency scoring; shuffled lead rotation; filters out paused/banned accounts
- **RiskManager** (`src/services/distribution/RiskManager.ts`) — pre-distribution risk score (account count, recent flags, off-peak penalty); blocks distributions at score ≥ 80; emergency halt cancels all pending posts
- **DistributionEngine** (`src/services/distribution/DistributionEngine.ts`) — full pipeline: risk check → account selection → content variation → schedule → queue
- **DistributionJob** (`src/jobs/DistributionJob.ts`) — Bull queue (`instagram-distribution`); 3-attempt exponential backoff; event listeners
- **Distribution API** — `POST /api/distribution/start`, `GET /api/distribution/:id/status`, `POST /api/distribution/:id/cancel`

### Added — Agent Skills
- `.claude/settings.json` — project-level agent configuration: auto TypeScript check hook (postToolUse), build-validate skill, dev-state reader, health-check skill

### Added — Phase 6: Account Groups
- **GroupService** (`src/services/groups/GroupService.ts`) — Full CRUD for account groups; account-to-group management (add/remove/move); group statistics and health scoring
- **GroupController** (`src/api/controllers/GroupController.ts`) — 8 API endpoints for group management
- **Groups API** — `POST /api/groups`, `GET /api/groups`, `PUT /api/groups/:id`, `DELETE /api/groups/:id`, `POST /api/groups/:id/accounts/add`, `POST /api/groups/:id/accounts/remove`, `GET /api/groups/:id/stats`

### Added — Phase 7: Health Monitoring ✨ NEW
- **MetricsCollector** (`src/services/health/MetricsCollector.ts`) — collects posting metrics, error rates, rate limit hits, warmup progress, engagement data; generates daily/weekly aggregates
- **HealthScorer** (`src/services/health/HealthScorer.ts`) — calculates health score (0-100) with weighted factors: post success rate (30%), error rate (25%), rate limits (20%), login challenges (15%), account state (10%); engagement scoring; risk assessment; categorization (excellent/good/fair/poor/critical)
- **AlertManager** (`src/services/health/AlertManager.ts`) — 10 alert types (health critical, shadowban suspected, high error rate, rate limit frequent, login challenge, account suspended/banned, inactive, warmup stalled); auto-alert creation based on rules; cooldown periods to prevent spam; alert acknowledgment and resolution
- **HealthMonitor** (`src/services/health/HealthMonitor.ts`) — orchestrates monitoring; generates account and swarm health reports; daily/weekly report generation; auto-updates health scores in database
- **HealthMonitorJob** (`src/jobs/HealthMonitorJob.ts`) — Bull queue for background monitoring; runs every 6 hours for all active users; daily report at 9 AM; weekly report every Monday
- **HealthController** (`src/api/controllers/HealthController.ts`) — 14 API endpoints for health monitoring
- **Health API** — `GET /api/health/account/:id`, `POST /api/health/account/:id/monitor`, `GET /api/health/swarm`, `GET /api/health/alerts`, `POST /api/health/alerts/:id/acknowledge`, `GET /api/health/reports/daily`, `GET /api/health/reports/weekly`, etc.
- **Database** — `health_alerts` table with 7 indexes for efficient querying

### Added — Phase 2.3 (carried forward)
- Post Job Processor, Media Uploader, Enhanced Post Controller (7 endpoints), batch posting, pagination

### Changed
- `src/index.ts` — mounted `/api/variations`, `/api/distribution`, `/api/groups`, and `/api/health` routes
- PostController supports both synchronous and queue-based posting
- Auto-monitoring scheduler starts on server boot

### In Progress
- Phase 8: Proxy Management
- Phase 9: Advanced Scheduling
- Frontend integration for variation + distribution + groups + health APIs

---

## [1.0.0] - 2026-02-04

### Added
- Complete backend infrastructure (Phase 1)
- PostgreSQL database with 9 tables
- Redis caching and Bull queues
- Docker deployment setup
- Account management API (CRUD + bulk import)
- AES-256 password encryption
- Rate limiting & security middleware
- Winston logging system
- Instagram Private API client (personal accounts)
- Instagram Graph API client (business accounts)
- Unified posting service
- OAuth flow for business accounts
- Account verification endpoints
- Background health check job
- React Native mobile app with Expo
- Account management UI
- Video editor screen
- Distribution screen
- Settings with theme support

### Security
- Helmet.js security headers
- CORS configuration
- Input sanitization
- Rate limiting (100 req/15min)
- Encrypted credential storage

---

## [0.1.0] - Initial Setup

### Added
- Project structure
- Basic Express.js server
- TypeScript configuration
- Environment setup

---
