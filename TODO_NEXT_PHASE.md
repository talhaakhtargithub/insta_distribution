# Instagram Swarm Distribution - TODO & Next Phases

**Current Status:** ✅ **Phase 3.1 Complete** - Warmup Protocol Implementation with Bull Queue

This document outlines what's been completed and what remains to build a complete Instagram swarm management system for 100+ accounts.

---

## 👋 FOR NEW DEVELOPERS - START HERE!

### Project Overview
This is an **Instagram Swarm Management System** that allows managing 100+ Instagram accounts from a single mobile app. Users can:
- Import/create Instagram accounts
- Post content to multiple accounts simultaneously
- Automate warmup protocols (14-day schedule)
- Generate unique content variations per account
- Monitor account health in real-time

**Tech Stack:**
- **Backend:** Node.js 20 + TypeScript + Express.js
- **Database:** PostgreSQL 15 (9 tables)
- **Cache/Queue:** Redis 7 + Bull
- **Mobile:** React Native (Expo)
- **Deployment:** Docker + Docker Compose
- **Instagram APIs:**
  - `instagram-private-api` (Personal accounts)
  - Instagram Graph API (Business accounts)

### Quick Start (5 minutes)

```bash
# 1. Clone repository
git clone git@github.com:talhaakhtargithub/insta_distribution.git
cd insta_distribution

# 2. Start backend
cd InstaDistro-Backend
npm install
cp .env.example .env  # Edit with your values
docker-compose up -d   # Starts PostgreSQL & Redis
npm run migrate        # Run database migrations
npm run dev            # Start backend on :3000

# 3. Test backend (new terminal)
curl http://localhost:3000/health
# Should return: {"status":"ok","database":"connected"}

# 4. Start mobile app (new terminal)
cd ../InstaDistro
npm install
npx expo start  # Scan QR code with Expo Go app
```

### Key Files to Understand

**Backend Structure:**
```
InstaDistro-Backend/
├── src/
│   ├── index.ts                              # Express server entry point
│   ├── config/
│   │   ├── database.ts                       # PostgreSQL connection
│   │   ├── env.ts                            # Environment config
│   │   └── logger.ts                         # Winston logging
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── AccountController.ts          # Account CRUD
│   │   │   ├── PostController.ts             # Posting endpoints
│   │   │   └── OAuthController.ts            # OAuth flow
│   │   ├── routes/
│   │   │   ├── accounts.routes.ts            # Account routes
│   │   │   ├── posts.routes.ts               # Post routes
│   │   │   └── oauth.routes.ts               # OAuth routes
│   │   └── middlewares/
│   │       ├── auth.middleware.ts            # JWT auth (TODO)
│   │       ├── rateLimit.middleware.ts       # Rate limiting
│   │       └── security.middleware.ts        # Security headers
│   ├── services/
│   │   ├── instagram/
│   │   │   ├── PrivateApiClient.ts          # Instagram Private API ✨
│   │   │   ├── GraphApiClient.ts            # Instagram Graph API ✨
│   │   │   ├── PostingService.ts            # Unified posting ✨
│   │   │   └── AuthService.ts               # Instagram authentication ✨
│   │   ├── auth/
│   │   │   ├── EncryptionService.ts         # AES-256 encryption
│   │   │   ├── InstagramOAuthService.ts     # Instagram OAuth ✨
│   │   │   ├── GoogleOAuthService.ts        # Google OAuth 🆕
│   │   │   ├── JwtService.ts                # JWT tokens 🆕
│   │   │   └── UserService.ts               # User management 🆕
│   │   └── swarm/
│   │       ├── AccountService.ts            # Account business logic
│   │       └── WarmupAutomation.ts          # Warmup protocol 🆕
│   ├── jobs/
│   │   ├── HealthCheckJob.ts                # Background health checks ✨
│   │   └── WarmupJob.ts                     # Warmup task processor 🆕
│   ├── models/
│   │   └── WarmupTask.ts                    # Warmup data models 🆕
│   └── db/
│       ├── migrate.ts                        # Migration runner
│       └── migrations/                       # SQL migrations (9 files)
├── docker-compose.yml                        # PostgreSQL + Redis
├── Dockerfile                                # Production container
└── package.json

✨ = New in Phase 2.1
```

**Frontend Structure:**
```
InstaDistro/
├── src/
│   ├── screens/
│   │   ├── AccountsScreen.tsx               # Account management
│   │   ├── DistributionScreen.tsx           # Content distribution
│   │   └── HomeScreen.tsx                   # Dashboard
│   ├── services/
│   │   └── backendApi.ts                    # Backend API client
│   ├── hooks/
│   │   └── useAccounts.ts                   # Account state hook
│   └── components/
│       └── AccountCard.tsx                  # Account UI card
└── App.tsx                                  # Root component
```

### Important Documentation

**Must Read (in order):**
1. [SETUP_COMPLETE.md](SETUP_COMPLETE.md) - Complete setup guide with architecture
2. [OAUTH_SETUP.md](InstaDistro-Backend/OAUTH_SETUP.md) - OAuth setup for business accounts
3. [InstaDistro-Backend/README.md](InstaDistro-Backend/README.md) - Backend API documentation
4. [InstaDistro-Backend/DEPLOYMENT.md](InstaDistro-Backend/DEPLOYMENT.md) - Production deployment

### Development Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes...

# Run TypeScript type check
cd InstaDistro-Backend
npx tsc --noEmit

# Build to verify no errors
npm run build

# Commit with descriptive message
git add .
git commit -m "feat: add new feature description"

# Push to GitHub
git push origin feature/your-feature-name
```

### Common Commands

**Backend:**
```bash
# Development
npm run dev              # Start with nodemon (auto-reload)
npm run build            # Build TypeScript
npm start                # Run production build

# Database
npm run migrate          # Run migrations
docker exec -it insta-swarm-db psql -U swarm_user -d insta_swarm  # Access DB

# Docker
docker-compose up -d     # Start services
docker-compose down      # Stop services
docker-compose logs -f   # View logs
```

**Testing:**
```bash
# Health check
curl http://localhost:3000/health

# List accounts
curl http://localhost:3000/api/accounts -H "x-user-id: user_1"

# Create account
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_1" \
  -d '{"username":"test","password":"pass","accountType":"personal"}'

# Check OAuth providers
curl http://localhost:3000/api/auth/providers
```

### What's Already Built

✅ **Complete Features:**
- PostgreSQL database with 9 tables
- Redis for caching & job queues
- Docker deployment setup
- Account management API (CRUD + bulk import)
- AES-256 password encryption
- Rate limiting & security middleware
- Winston logging (file + console)
- Instagram Private API client (personal accounts)
- Instagram Graph API client (business accounts)
- Unified posting service (auto-selects API)
- OAuth flow for business accounts
- Mobile app with account management UI

✅ **Backend Endpoints (All Working):**
```
GET  /health                          # Health check
GET  /api/accounts                    # List accounts
POST /api/accounts                    # Create account
GET  /api/accounts/:id                # Get account
PUT  /api/accounts/:id                # Update account
DELETE /api/accounts/:id              # Delete account
POST /api/accounts/bulk-import        # Import CSV
GET  /api/accounts/stats/swarm        # Swarm statistics
POST /api/accounts/:id/verify         # Verify Instagram credentials ✨
POST /api/accounts/:id/refresh-session # Refresh session ✨
POST /api/accounts/:id/2fa-challenge  # Handle 2FA ✨
POST /api/accounts/health-check       # Run health check ✨

POST /api/posts/immediate             # Post immediately ✨
POST /api/posts/verify-account        # Verify credentials ✨
GET  /api/posts/history               # Posting history ✨

GET  /api/auth/providers              # List OAuth providers ✨
GET  /api/auth/instagram/authorize    # Start Instagram OAuth ✨
GET  /api/auth/instagram/callback     # Instagram OAuth callback ✨
POST /api/auth/instagram/refresh-token # Refresh Instagram token ✨
GET  /api/auth/google/authorize       # Start Google OAuth ✨
GET  /api/auth/google/callback        # Google OAuth callback ✨
POST /api/auth/google/verify          # Verify Google ID token ✨
POST /api/auth/refresh                # Refresh JWT token ✨
GET  /api/auth/me                     # Get current user ✨

GET  /api/warmup/protocol             # Get 14-day protocol 🆕
POST /api/warmup/start/:accountId     # Start warmup 🆕
GET  /api/warmup/progress/:accountId  # Get progress 🆕
GET  /api/warmup/tasks/:accountId/:day # Get day tasks 🆕
POST /api/warmup/pause/:accountId     # Pause warmup 🆕
POST /api/warmup/resume/:accountId    # Resume warmup 🆕
POST /api/warmup/skip-to-active/:accountId # Skip (risky!) 🆕
GET  /api/warmup/accounts             # List warmup accounts 🆕
GET  /api/warmup/stats                # Get statistics 🆕
POST /api/warmup/process-now          # Manual trigger 🆕
```

### Database Schema (Quick Reference)

**Main Tables:**
- `accounts` - Instagram accounts (username, encrypted password, tokens)
- `proxies` - Proxy configuration for accounts
- `schedules` - Posting schedules
- `post_results` - Posting history & results
- `warmup_tasks` - 14-day warmup automation tasks
- `content_variations` - Video variations per account
- `account_health_scores` - Real-time health monitoring
- `account_groups` - Group organization
- `swarm_distribution_logs` - Distribution analytics

**Key Relationships:**
- 1 User → N Accounts
- 1 Account → 1 Proxy (optional)
- 1 Account → N Schedules
- 1 Account → N PostResults
- 1 Account → N WarmupTasks

### Authentication Methods

**Two ways to connect Instagram accounts:**

1. **Username/Password** (Personal + Business)
   - Direct login with credentials
   - Uses `instagram-private-api`
   - Full automation capabilities
   - Password encrypted with AES-256

2. **OAuth 2.0** (Business only)
   - Official Instagram API
   - No password storage
   - Requires Facebook App setup
   - See [OAUTH_SETUP.md](InstaDistro-Backend/OAUTH_SETUP.md)

### Troubleshooting

**Backend won't start:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker-compose logs db

# Reset database
docker-compose down -v
docker-compose up -d
npm run migrate
```

**TypeScript errors:**
```bash
# Clean build
rm -rf dist/
npm run build
```

**Database issues:**
```bash
# Access PostgreSQL
docker exec -it insta-swarm-db psql -U swarm_user -d insta_swarm

# Check tables
\dt

# Check accounts
SELECT id, username, account_type, is_authenticated FROM accounts;
```

### Need Help?

- **Architecture questions:** Read [SETUP_COMPLETE.md](SETUP_COMPLETE.md)
- **OAuth setup:** Read [OAUTH_SETUP.md](InstaDistro-Backend/OAUTH_SETUP.md)
- **API docs:** Read [InstaDistro-Backend/README.md](InstaDistro-Backend/README.md)
- **Deployment:** Read [InstaDistro-Backend/DEPLOYMENT.md](InstaDistro-Backend/DEPLOYMENT.md)

**Useful logs:**
```bash
# Application logs
tail -f InstaDistro-Backend/logs/combined.log
tail -f InstaDistro-Backend/logs/error.log

# Docker logs
docker-compose logs -f
```

---

---

## 🎯 What's Complete (Summary)

✅ **Phase 1:** Production-ready backend infrastructure with PostgreSQL, Redis, Docker
✅ **Phase 2.1:** Instagram API integration with TWO authentication methods:
- **Method 1:** Username/Password (Personal & Business accounts)
- **Method 2:** Instagram OAuth (Business accounts only)
✅ **Phase 2.2:** Account authentication & session management with health monitoring
✅ **Phase 2.3:** Google OAuth for app users with JWT-based authentication
✅ **Phase 3.1:** 14-day warmup protocol with Bull queue automation

**What Works Right Now:**
- ✅ Account management (create, list, update, delete)
- ✅ Both personal & business account support
- ✅ OAuth flow for business accounts
- ✅ Instagram posting endpoints (ready to test)
- ✅ Session management & automatic refresh
- ✅ Background health monitoring (every 6 hours)
- ✅ Google OAuth for app user login
- ✅ JWT authentication with access + refresh tokens
- ✅ 14-day warmup protocol with automated task execution
- ✅ Bull queue for background job processing
- ✅ Warmup progress tracking and statistics
- ✅ TypeScript compilation clean
- ✅ Backend build successful

---

## 🚀 **IMMEDIATE NEXT STEPS** (Start Here!)

### Option A: Test Instagram Posting (Recommended)
**Goal:** Verify Instagram API integration works end-to-end

**Steps:**
1. **Start Backend:**
   ```bash
   cd InstaDistro-Backend
   docker-compose up -d  # Start PostgreSQL & Redis
   npm run dev           # Start backend
   ```

2. **Add Test Account:**
   ```bash
   # Personal account with username/password
   curl -X POST http://localhost:3000/api/accounts \
     -H "Content-Type: application/json" \
     -H "x-user-id: user_1" \
     -d '{
       "username": "your_instagram_username",
       "password": "your_instagram_password",
       "accountType": "personal"
     }'
   ```

3. **Verify Account:**
   ```bash
   curl -X POST http://localhost:3000/api/posts/verify-account \
     -H "Content-Type: application/json" \
     -H "x-user-id: user_1" \
     -d '{"accountId": "ACCOUNT_ID_FROM_STEP_2"}'
   ```

4. **Post to Instagram:**
   ```bash
   curl -X POST http://localhost:3000/api/posts/immediate \
     -H "Content-Type: application/json" \
     -H "x-user-id: user_1" \
     -d '{
       "accountId": "ACCOUNT_ID",
       "mediaPath": "/path/to/image.jpg",
       "mediaType": "photo",
       "caption": "Test post from InstaDistro!",
       "hashtags": ["test", "automation"]
     }'
   ```

**Expected Result:** Post appears on Instagram account ✨

---

### Option B: Setup OAuth for Business Accounts

**Goal:** Enable "Login with Instagram" for business accounts

**Steps:**
1. **Create Facebook App:**
   - Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
   - Create new app → Consumer type
   - Add Instagram Basic Display product
   - Configure OAuth redirect: `http://localhost:3000/api/auth/instagram/callback`
   - Get Client ID and Client Secret

2. **Configure Backend:**
   ```bash
   # Edit .env file
   INSTAGRAM_CLIENT_ID=your_client_id_here
   INSTAGRAM_CLIENT_SECRET=your_client_secret_here
   INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/auth/instagram/callback
   ```

3. **Test OAuth Flow:**
   ```bash
   # Get authorization URL
   curl http://localhost:3000/api/auth/instagram/authorize

   # Open the returned authUrl in browser
   # User authorizes → Instagram redirects to callback
   # Account automatically added to database
   ```

**Expected Result:** Business account connected via OAuth ✨

**Documentation:** See [OAUTH_SETUP.md](InstaDistro-Backend/OAUTH_SETUP.md) for detailed guide

---

### Option C: Continue Building Features

**Goal:** Start Phase 2.2 - Account Authentication

**Next Feature:** Implement automatic session management and 2FA handling

Jump to [Phase 2.2](#22-account-authentication) below for tasks.

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

## ✅ Phase 2: Instagram API Integration (Weeks 3-4)

**Goal:** Connect to Instagram and enable actual posting

### ✅ 2.1 Instagram API Clients (COMPLETED)

**Priority:** HIGH
**Time Taken:** 1 day

**Completed Tasks:**
- [x] **Install Instagram API packages**
  - Installed `instagram-private-api@latest`
  - Installed `axios` for HTTP requests
  - Installed `form-data` for file uploads

- [x] **Create Instagram Graph API Client** (for Business accounts)
  - File: `src/services/instagram/GraphApiClient.ts` ✅
  - Methods implemented:
    - `uploadPhoto(imageUrl, caption)` - Post image via Graph API
    - `uploadVideo(videoUrl, caption)` - Post video with processing
    - `getUserInfo()` - Get account info
    - `getAccountInfo()` - Get detailed account data
    - `getMediaInsights(mediaId)` - Get post analytics
    - `getRecentMedia(limit)` - Get recent posts
    - `validateToken()` - Check token validity
    - Static `exchangeToken()` - Get long-lived tokens

- [x] **Create Instagram Private API Client** (for Personal accounts)
  - File: `src/services/instagram/PrivateApiClient.ts` ✅
  - Methods implemented:
    - `login(password)` - Authenticate with credentials
    - `restoreSession(sessionToken)` - Restore previous session
    - `uploadPhoto(imagePath, caption)` - Upload photo
    - `uploadVideo(videoPath, caption, coverImagePath)` - Upload video
    - `likePost(mediaId)` - Like post
    - `commentOnPost(mediaId, text)` - Comment on post
    - `followUser(userId)` - Follow user
    - `getUserInfo()` - Get user info
    - `getTimelineFeed(maxItems)` - Get feed
    - `searchUsers(query)` - Search users
    - `isSessionValid()` - Check session validity

- [x] **Create Unified Posting Service**
  - File: `src/services/instagram/PostingService.ts` ✅
  - Features:
    - Auto-detect account type (personal/business)
    - Use correct API client based on type
    - Session management for Private API
    - Token management for Graph API
    - Caption building with hashtags
    - Error handling (rate limits, login failures)
    - Account verification method

- [x] **Create Posting Endpoints**
  - File: `src/api/controllers/PostController.ts` ✅
  - Endpoints:
    - `POST /api/posts/immediate` - Post now
    - `POST /api/posts/verify-account` - Verify credentials
    - `GET /api/posts/history` - Get posting history
  - File: `src/api/routes/posts.routes.ts` ✅

- [x] **Add Instagram OAuth Support**
  - File: `src/services/auth/InstagramOAuthService.ts` ✅
  - File: `src/api/controllers/OAuthController.ts` ✅
  - File: `src/api/routes/oauth.routes.ts` ✅
  - Features:
    - OAuth 2.0 flow for business accounts
    - Token exchange and refresh
    - Long-lived token support (60 days)
    - Multiple OAuth providers support
  - Endpoints:
    - `GET /api/auth/providers` - List OAuth providers
    - `GET /api/auth/instagram/authorize` - Start OAuth
    - `GET /api/auth/instagram/callback` - OAuth callback
    - `POST /api/auth/instagram/refresh-token` - Refresh token

**Documentation:**
- [x] OAUTH_SETUP.md - Complete OAuth guide
- [x] .env.example updated with OAuth variables

**Dual Authentication Methods:**
1. ✅ Username/Password (Personal + Business)
2. ✅ Instagram OAuth (Business only)

---

### ✅ 2.2 Account Authentication (COMPLETED)

**Priority:** HIGH
**Time Taken:** 1 day

**Completed Tasks:**
- [x] **Implement Instagram login flow**
  - ✅ Test credentials when account is created
  - ✅ Store session tokens (encrypted)
  - ✅ Handle 2FA challenges (detection + error messaging)
  - ✅ Handle checkpoint challenges (user guidance)
  - ✅ Auto-refresh sessions before expiry

- [x] **Create Authentication Service**
  - File: `src/services/instagram/AuthService.ts` ✅
  - Methods implemented:
    - `authenticate(accountId)` - Auto-detects type, logs in to Instagram
    - `authenticatePersonalAccount()` - Private API login
    - `authenticateBusinessAccount()` - Graph API token validation
    - `verifyPersonalSession()` - Check if session is valid
    - `refreshSession(accountId)` - Refresh expired session
    - `handle2FAChallenge()` - Handle 2FA (detection only)
    - `handleCheckpointChallenge()` - Handle Instagram challenges
    - `checkAccountsHealth(userId)` - Batch health check

- [x] **Add Account Verification Endpoints**
  - File: `src/api/controllers/AccountController.ts` ✅
  - Endpoints:
    - `POST /api/accounts/:id/verify` - Verify credentials
    - `POST /api/accounts/:id/refresh-session` - Refresh session
    - `POST /api/accounts/:id/2fa-challenge` - Submit 2FA code
    - `POST /api/accounts/health-check` - Run health check
  - Updates `is_authenticated` status
  - Stores session token encrypted
  - Updates account info (followers, profile pic, etc.)

- [x] **Background Health Check Job**
  - File: `src/jobs/HealthCheckJob.ts` ✅
  - Bull queue for background processing
  - Runs every 6 hours automatically
  - Functions:
    - `scheduleHealthCheck(userId)` - Schedule periodic checks
    - `checkAccountNow(userId, accountId)` - Immediate check
    - `checkAllAccountsNow(userId)` - Check all accounts
    - `cancelHealthCheck(userId)` - Cancel schedule
    - `getHealthCheckStats()` - Queue statistics
  - Event monitoring and logging

- [ ] **Update Frontend** (TODO - Phase 2.4)
  - Add "Verify" button in AccountsScreen
  - Show authentication status (✓ Verified / ✗ Not Verified)
  - Handle 2FA input dialog

**Features:**
✅ Automatic session management
✅ Session validity checking
✅ Auto-refresh before expiry
✅ Challenge detection (2FA, checkpoint)
✅ Account status updates
✅ Background health monitoring
✅ Batch health checks
✅ Queue-based processing

**Testing:**
```bash
# Test account verification
curl -X POST http://localhost:3000/api/accounts/ACCOUNT_ID/verify \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_1"

# Expected: {"success":true,"authenticated":true,"accountInfo":{...}}

# Refresh session
curl -X POST http://localhost:3000/api/accounts/ACCOUNT_ID/refresh-session \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_1"

# Run health check for all accounts
curl -X POST http://localhost:3000/api/accounts/health-check \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_1"
```

---

### ✅ 2.3 Google OAuth for App Users (COMPLETED)

**Priority:** MEDIUM
**Time Taken:** 1 day

**Completed Tasks:**
- [x] **Install Google OAuth packages**
  - Installed `google-auth-library@^9.x.x`
  - Installed `jsonwebtoken@^9.x.x`
  - Installed `@types/jsonwebtoken@^9.x.x`

- [x] **Create JWT Service**
  - File: `src/services/auth/JwtService.ts` ✅
  - Methods implemented:
    - `generateAccessToken(payload)` - 1 hour expiry
    - `generateRefreshToken(payload)` - 7 day expiry
    - `generateTokenPair(payload)` - Both tokens
    - `verifyAccessToken(token)` - Verify and decode
    - `verifyRefreshToken(token)` - Verify refresh
    - `isTokenExpired(token)` - Check expiry
    - `parseExpiry(expiry)` - Convert to seconds
  - JWT payload includes: userId, email, name, picture, provider

- [x] **Create Google OAuth Service**
  - File: `src/services/auth/GoogleOAuthService.ts` ✅
  - Methods implemented:
    - `getAuthorizationUrl(state)` - Generate OAuth URL
    - `authenticateWithCode(code)` - Exchange code for tokens
    - `verifyIdToken(idToken)` - For mobile apps (Google Sign-In SDK)
    - `isConfigured()` - Check if credentials set
    - `getStatus()` - Configuration status
  - Supports both web OAuth and mobile ID token verification

- [x] **Create User Service**
  - File: `src/services/auth/UserService.ts` ✅
  - Methods implemented:
    - `findByEmail(email)` - Find user by email
    - `findByGoogleId(googleId)` - Find by Google ID
    - `findById(id)` - Find by user ID
    - `create(input)` - Create new user
    - `update(id, updates)` - Update user profile
    - `updateLastLogin(id)` - Update login time
    - `findOrCreateFromGoogle(googleUserInfo)` - OAuth user creation
    - `delete(id)` - Delete user
  - Auto-links Google accounts to existing email accounts

- [x] **Add Users Table**
  - Added to `src/db/migrations.sql` ✅
  - Fields: id, email, google_id, auth_provider, name, given_name, family_name, picture, locale, email_verified, is_active, created_at, updated_at, last_login
  - Indexes: email, google_id, auth_provider
  - Updated accounts table with foreign key to users table

- [x] **Update Auth Middleware**
  - File: `src/api/middlewares/auth.middleware.ts` ✅
  - Changed from placeholder to full JWT verification
  - Extracts Bearer token from Authorization header
  - Verifies JWT and attaches user to request
  - Backward compatible with x-user-id header (dev mode)
  - Handles token expiry with clear error messages

- [x] **Add Google OAuth Endpoints**
  - Updated `src/api/controllers/OAuthController.ts` ✅
  - Endpoints:
    - `GET /api/auth/google/authorize` - Get OAuth URL
    - `GET /api/auth/google/callback` - Handle OAuth callback
    - `POST /api/auth/google/verify` - Verify ID token (mobile)
    - `POST /api/auth/refresh` - Refresh access token
    - `GET /api/auth/me` - Get current user profile
  - Returns user + JWT tokens on successful auth

- [x] **Update Environment Configuration**
  - Updated `.env.example` with Google OAuth vars
  - Added GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
  - Documentation on how to get credentials from Google Cloud Console

**Features:**
✅ Google OAuth 2.0 for app user authentication
✅ JWT-based session management (access + refresh tokens)
✅ Mobile app support (ID token verification)
✅ Account linking (Google → existing email account)
✅ Automatic user creation from Google profile
✅ Protected routes with JWT middleware
✅ Token refresh endpoint

**Architecture:**
- **Instagram accounts** authenticated via Instagram (username/password OR Instagram OAuth)
- **App users** authenticated via Google OAuth + JWT tokens
- Clear separation: users table (app users) vs accounts table (Instagram accounts)
- users.id → accounts.user_id (one user can have many Instagram accounts)

**Testing:**
```bash
# Get Google OAuth URL
curl http://localhost:3000/api/auth/google/authorize

# After OAuth callback, test protected endpoint
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Refresh token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

---

## ✅ Phase 3: Warmup Automation (Week 5-6)

**Goal:** Implement 14-day warmup protocol for new Instagram accounts

### ✅ 3.1 Warmup Protocol Implementation (COMPLETED)

**Priority:** HIGH
**Time Taken:** 1 day

**Completed Tasks:**
- [x] **Create WarmupTask Model**
  - File: `src/models/WarmupTask.ts` ✅
  - Task types: follow, like, comment, watch_story, story, post
  - Task statuses: pending, in_progress, completed, failed
  - Full 14-day protocol configuration:
    - Days 1-2: Account setup (follow 5-10, like 10-15)
    - Days 3-4: Light activity (comments added, first story)
    - Days 5-7: Increased engagement, **FIRST FEED POST on Day 7**
    - Days 8-10: Posting phase (1 post/day)
    - Days 11-14: Scale up (2-3 posts/day)
  - Helper functions: getWarmupProtocolForDay, calculateWarmupProgress, isWarmupComplete

- [x] **Create WarmupAutomation Service**
  - File: `src/services/swarm/WarmupAutomation.ts` ✅
  - Methods implemented:
    - `startWarmup(accountId)` - Generate all 14 days of tasks
    - `getProgress(accountId)` - Get completion percentage, current day
    - `getDueTasks(limit)` - Fetch tasks ready for execution
    - `getTasksForDay(accountId, day)` - Get specific day tasks
    - `updateTask(taskId, updates)` - Update task status
    - `completeTask(taskId, completedCount)` - Mark complete
    - `failTask(taskId, errorMessage)` - Mark failed
    - `pauseWarmup(accountId)` - Pause warmup
    - `resumeWarmup(accountId)` - Resume warmup
    - `skipToActive(accountId)` - Force skip (with warning)
    - `getAccountsInWarmup(userId)` - List warmup accounts
    - `getWarmupStats(userId)` - Aggregate statistics
  - Randomized task scheduling (spread throughout day)
  - Automatic transition to ACTIVE state after Day 14

- [x] **Create WarmupJob Processor**
  - File: `src/jobs/WarmupJob.ts` ✅
  - Bull queue-based task processing
  - Automatic scheduler (checks every 5 minutes)
  - Instagram action executors:
    - `executeFollowAction()` - Follow from explore feed
    - `executeLikeAction()` - Like posts from timeline
    - `executeCommentAction()` - Generic comments (10 variations)
    - `executeWatchStoryAction()` - Watch stories
    - `executePostStoryAction()` - Post stories (TODO: content)
    - `executePostFeedAction()` - Post to feed (TODO: content)
  - Randomized delays (30s-180s) to mimic human behavior
  - Session validation before each action
  - Retry logic with exponential backoff
  - Queue event monitoring (completed, failed, error)

- [x] **Create WarmupController**
  - File: `src/api/controllers/WarmupController.ts` ✅
  - Endpoints:
    - `POST /api/warmup/start/:accountId` - Start warmup protocol
    - `GET /api/warmup/progress/:accountId` - Get progress (day, %, tasks)
    - `GET /api/warmup/tasks/:accountId/:day` - Get day tasks
    - `POST /api/warmup/pause/:accountId` - Pause warmup
    - `POST /api/warmup/resume/:accountId` - Resume warmup
    - `POST /api/warmup/skip-to-active/:accountId` - Skip (requires confirmation)
    - `GET /api/warmup/accounts` - List accounts in warmup
    - `GET /api/warmup/stats` - Get statistics + queue stats
    - `GET /api/warmup/protocol` - Get protocol details
    - `POST /api/warmup/process-now` - Manual trigger (admin)

- [x] **Create Redis Configuration**
  - File: `src/config/redis.ts` ✅
  - Bull queue configuration
  - Retry strategy and connection pooling
  - Environment variable support (REDIS_HOST, REDIS_PORT, REDIS_DB, REDIS_URL)
  - Updated `src/config/env.ts` with Redis fields

- [x] **Integrate Warmup Routes**
  - File: `src/api/routes/warmup.routes.ts` ✅
  - All routes protected with auth middleware
  - Registered routes in `src/index.ts`
  - Started warmup scheduler on server boot
  - Updated API documentation with warmup endpoints

**Features:**
✅ 14-day progressive warmup protocol
✅ Automated task generation with randomization
✅ Bull queue-based background processing
✅ Scheduler checks for due tasks every 5 minutes
✅ Instagram actions: follow, like, comment, watch stories
✅ Randomized delays (30s-180s) to avoid detection
✅ Session management and validation
✅ Automatic transition to ACTIVE after Day 14
✅ Pause/resume functionality
✅ Skip to active (risky, with warning)
✅ Progress tracking and statistics
✅ Queue monitoring and admin controls

**Database:**
- warmup_tasks table already existed in migrations.sql
- Columns: id, account_id, day, task_type, target_count, completed_count, status, scheduled_time, completed_at, error_message

**Risk Mitigation:**
✅ Randomized delays between actions
✅ Progressive scaling (1-3 posts → 10-15 posts over 14 days)
✅ Automatic pause on authentication failures
✅ Session validation before each action
✅ Retry logic with exponential backoff
✅ Queue-based processing (handles server restarts)

**Testing:**
```bash
# Start warmup for account
curl -X POST http://localhost:3000/api/warmup/start/ACCOUNT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get progress
curl http://localhost:3000/api/warmup/progress/ACCOUNT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get protocol details
curl http://localhost:3000/api/warmup/protocol \
  -H "Authorization: Bearer YOUR_TOKEN"

# Pause warmup
curl -X POST http://localhost:3000/api/warmup/pause/ACCOUNT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Skip to active (risky!)
curl -X POST http://localhost:3000/api/warmup/skip-to-active/ACCOUNT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"confirmed": true}'
```

**Next Steps:**
- Phase 3.2: Warmup Execution Testing
- Phase 3.3: Warmup UI Components (frontend)
- Phase 4: Content Variation Engine

---

### 2.4 Basic Posting Functionality

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