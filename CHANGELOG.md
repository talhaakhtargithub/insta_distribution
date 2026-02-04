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

### Added — Phase 2.3 (carried forward)
- Post Job Processor, Media Uploader, Enhanced Post Controller (7 endpoints), batch posting, pagination

### Changed
- `src/index.ts` — mounted `/api/variations` and `/api/distribution` routes
- PostController supports both synchronous and queue-based posting

### In Progress
- Phase 6: Account Groups
- Phase 7: Health Monitoring
- Frontend integration for variation + distribution APIs

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
