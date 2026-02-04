# Supabase Backend Setup Guide

## Free Tools Stack

- **Supabase**: Database + Auth + Storage + Real-time (Free: 500MB database, 1GB storage)
- **Vercel**: Node.js backend hosting (Free: Unlimited deployments)
- **Upstash**: Redis for job queue (Free: 10,000 commands/day)

**Total Cost: $0/month** (free tiers)

---

## Step 1: Create Supabase Project (5 minutes)

1. **Go to Supabase**: https://supabase.com
2. **Sign up** with GitHub/Google (free account)
3. **Create New Project**:
   - Organization: Create new or use existing
   - Project name: `insta-swarm-backend`
   - Database password: **Save this password!**
   - Region: Choose closest to you
   - Click "Create new project"
4. **Wait 2-3 minutes** for project to provision

---

## Step 2: Get API Keys

1. In your Supabase project, go to **Settings** → **API**
2. Copy these values (you'll need them):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** key: `eyJhbGciOiJI...` (long string)
   - **service_role** key: `eyJhbGciOiJI...` (different long string)

3. **Create .env file** in InstaDistro directory:
   ```bash
   cd InstaDistro
   cat > .env << 'EOF'
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_KEY=your-service-role-key-here
   EOF
   ```

---

## Step 3: Run Database Migrations

1. In Supabase dashboard, go to **SQL Editor**
2. Click **+ New query**
3. Copy the SQL from `supabase_schema.sql` (we'll create this file)
4. Click **Run** to execute
5. Verify tables created in **Table Editor**

---

## Step 4: Setup Storage Buckets

1. Go to **Storage** in Supabase dashboard
2. Create two buckets:
   - Bucket name: `videos` (public: false)
   - Bucket name: `variations` (public: false)
3. Configure access policies (RLS policies will be in SQL)

---

## Step 5: Setup Upstash Redis (Optional for now)

1. Go to https://upstash.com
2. Sign up (free account)
3. Create database:
   - Name: `insta-swarm-queue`
   - Region: Choose closest
   - Type: Global
4. Copy **REST URL** and **REST Token**
5. Add to `.env`:
   ```
   UPSTASH_REDIS_URL=https://xxx.upstash.io
   UPSTASH_REDIS_TOKEN=your-token-here
   ```

---

## Step 6: Configure Frontend

1. Install Supabase client:
   ```bash
   cd InstaDistro
   npm install @supabase/supabase-js
   ```

2. We'll create `src/lib/supabase.ts` with configuration

---

## Architecture Overview

```
┌─────────────────┐
│  React Native   │
│   Mobile App    │
└────────┬────────┘
         │
         │ (Supabase Client)
         │
    ┌────▼────────────────────────┐
    │      Supabase Cloud         │
    │  ┌──────────────────────┐   │
    │  │   PostgreSQL DB      │   │  Auto REST API
    │  │  - accounts          │   │  Real-time subscriptions
    │  │  - scheduled_posts   │   │  Authentication
    │  │  - warmup_tasks      │   │
    │  │  - proxies           │   │
    │  └──────────────────────┘   │
    │  ┌──────────────────────┐   │
    │  │   Storage Buckets    │   │
    │  │  - videos            │   │
    │  │  - variations        │   │
    │  └──────────────────────┘   │
    └─────────────────────────────┘
         │
         │ (Service Role Key)
         │
    ┌────▼────────────────────────┐
    │   Node.js Backend           │
    │   (Vercel Functions)        │
    │  ┌──────────────────────┐   │
    │  │ Instagram API Client │   │
    │  │ - GraphAPI           │   │
    │  │ - PrivateAPI         │   │
    │  └──────────────────────┘   │
    │  ┌──────────────────────┐   │
    │  │   Job Processor      │   │
    │  │ - PostJob            │   │
    │  │ - WarmupJob          │   │
    │  └──────────────────────┘   │
    └─────────────────────────────┘
         │
         │ (Upstash Redis)
         │
    ┌────▼────────────────────────┐
    │   Upstash Redis Cloud       │
    │  - Job queue                │
    │  - Scheduling               │
    └─────────────────────────────┘
```

---

## Next Steps

After completing setup above:
1. ✅ Run database migrations
2. ✅ Configure frontend Supabase client
3. ✅ Create Node.js backend for Instagram API
4. ✅ Deploy backend to Vercel
5. ✅ Test end-to-end flow

---

## Free Tier Limits

**Supabase Free Tier**:
- 500 MB database space (enough for 10,000+ accounts)
- 1 GB file storage (enough for 100+ videos)
- 50,000 monthly active users
- Social OAuth providers
- 2 GB bandwidth

**Vercel Free Tier**:
- 100 GB bandwidth/month
- Unlimited deployments
- 100GB-hours serverless function execution

**Upstash Free Tier**:
- 10,000 commands/day (enough for 500 scheduled posts/day)
- 256 MB max database size

---

## Cost to Scale Beyond Free Tier

**If you exceed free limits** (100+ accounts, heavy usage):
- Supabase Pro: $25/month (8GB database, 100GB storage)
- Vercel Pro: $20/month (1TB bandwidth)
- Upstash Pay-as-you-go: ~$10/month for 1M commands

**Total: ~$55/month** for production scale (vs $460/month in original plan)

---

## Ready to Start?

Once you've completed Steps 1-2 above and have your Supabase API keys, let me know and I'll:
1. Create the database schema SQL file
2. Configure the frontend Supabase client
3. Build the Node.js backend
4. Set everything up!
