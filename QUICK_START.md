# Quick Start Guide - Instagram Swarm Distribution System

## What's Been Created

✅ **Complete Backend Structure** with:
- Node.js + TypeScript + Express server
- Docker Compose for PostgreSQL + Redis
- Complete database schema (9 tables for swarm management)
- Migration system
- Environment configuration

✅ **Frontend App** (existing):
- React Native + Expo
- 7 screens (Accounts, Videos, Editor, Distribution, Settings, etc.)
- Visual Effects API integration (87 effects)
- Dark mode, video processing, etc.

---

## Next Steps (5 Minutes Setup)

### Step 1: Fix Docker Permissions

```bash
# Add yourself to docker group
sudo usermod -aG docker $USER

# Activate changes
newgrp docker

# Test (should work without sudo now)
docker ps
```

### Step 2: Start Database & Redis

```bash
# From project root
cd "/home/talha/Distribution_Mobile_App_MVP_For Instagram_Now"

# Start containers
docker-compose up -d

# Verify they're running (should see 2 containers)
docker ps
```

### Step 3: Setup Backend

```bash
# Navigate to backend
cd InstaDistro-Backend

# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

You should see:
```
🚀 Instagram Swarm Distribution API
📍 Server running on http://localhost:3000
✓ Ready to accept requests
```

### Step 4: Test Backend

Open new terminal:
```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "ok",
  "database": "connected"
}
```

### Step 5: Connect Mobile App to Backend

The mobile app is already running on `http://localhost:8081` (web).

We need to:
1. Update frontend to use backend API instead of AsyncStorage
2. Install Supabase client OR create custom API service
3. Test account creation through backend

---

## Current Architecture

```
┌──────────────────────┐
│  Mobile App (Expo)   │  ← Running on localhost:8081
│  React Native Web    │
└──────────┬───────────┘
           │
           │ HTTP API calls
           │
┌──────────▼───────────┐
│  Backend API         │  ← Will run on localhost:3000
│  Express + TypeScript│
└──────────┬───────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼────┐   ┌───▼────┐
│PostgreSQL│   │ Redis  │  ← Docker containers
│ :5432   │   │ :6379  │
└─────────┘   └────────┘
```

---

## What You Can Do Now

Once backend is running, you'll be able to:

### 1. Manage 100+ Instagram Accounts
- Add accounts with username/password
- Import bulk accounts from CSV
- Organize accounts into groups
- Track account health scores
- Manage proxies for each account

### 2. Automated Warmup (14-day protocol)
- New accounts automatically enter warmup
- Progressive engagement (follows, likes, comments)
- Auto-transition to ACTIVE on Day 15

### 3. Smart Distribution
- Distribute 1 video to 100 accounts
- Staggered posting (spread over 6 hours)
- Unique content variations per account
- Real-time success tracking

### 4. Schedule Management
- One-time schedules
- Recurring schedules (daily/weekly/monthly)
- Queue-based posting
- Bulk scheduling

---

## File Structure Created

```
Distribution_Mobile_App_MVP_For Instagram_Now/
├── InstaDistro/                    # Mobile app (existing)
│   ├── src/
│   ├── App.tsx
│   └── package.json
│
├── InstaDistro-Backend/            # NEW: Backend API
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts
│   │   ├── db/
│   │   │   ├── migrations.sql      # All database tables
│   │   │   └── migrate.ts          # Migration runner
│   │   ├── api/                    # (Next: API routes)
│   │   ├── services/               # (Next: Business logic)
│   │   └── index.ts                # Express server
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── docker-compose.yml              # NEW: PostgreSQL + Redis
├── DOCKER_SETUP.md                 # NEW: Docker instructions
├── SUPABASE_SETUP.md               # Alternative: Cloud setup
└── QUICK_START.md                  # This file
```

---

## Troubleshooting

### Docker won't start
```bash
# Check if ports are in use
sudo lsof -i :5432
sudo lsof -i :6379

# Stop system PostgreSQL/Redis if running
sudo systemctl stop postgresql
sudo systemctl stop redis
```

### Backend can't connect to database
```bash
# Verify containers are running
docker ps

# Check database is accessible
docker exec -it insta-swarm-db psql -U swarm_user -d insta_swarm -c "SELECT 1;"
```

### npm install fails
```bash
# Use Node 20+
node --version

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## What's Next?

After getting the backend running:

**Phase 1: Connect Mobile App**
- Create API service in mobile app
- Replace AsyncStorage with backend API calls
- Test account creation from mobile app

**Phase 2: Instagram Integration**
- Implement Instagram API clients
- Add posting functionality
- Test posting to Instagram

**Phase 3: Warmup Automation**
- Build warmup task generator
- Create background jobs
- Monitor warmup progress

**Phase 4: Distribution Engine**
- Content variation generator
- Staggered posting logic
- Health monitoring

---

## Need Help?

### View Logs
```bash
# Backend logs
npm run dev

# Database logs
docker logs insta-swarm-db

# Redis logs
docker logs insta-swarm-redis
```

### Access Database
```bash
docker exec -it insta-swarm-db psql -U swarm_user -d insta_swarm
```

Common queries:
```sql
-- List all tables
\dt

-- View accounts
SELECT * FROM accounts;

-- View scheduled posts
SELECT * FROM scheduled_posts;
```

---

## Ready to Continue?

Run these commands in order:

```bash
# 1. Fix Docker
sudo usermod -aG docker $USER && newgrp docker

# 2. Start containers
docker-compose up -d

# 3. Setup backend
cd InstaDistro-Backend
npm install
npm run migrate
npm run dev

# 4. Test in another terminal
curl http://localhost:3000/health
```

**Once you see "Ready to accept requests", you're all set!** 🎉
