-- Instagram Swarm Distribution System - Database Schema
-- Run this file to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE (App Users)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Authentication
  email VARCHAR(255) NOT NULL UNIQUE,
  google_id VARCHAR(255) UNIQUE,
  auth_provider VARCHAR(20) CHECK (auth_provider IN ('google', 'email')) DEFAULT 'google',

  -- Profile
  name VARCHAR(255),
  given_name VARCHAR(255),
  family_name VARCHAR(255),
  picture TEXT,
  locale VARCHAR(10),

  -- Status
  email_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_auth_provider ON users(auth_provider);

-- ============================================
-- ACCOUNTS TABLE (Instagram Accounts)
-- ============================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL UNIQUE,
  encrypted_password TEXT,
  account_type VARCHAR(20) CHECK (account_type IN ('personal', 'business')) DEFAULT 'personal',

  -- Instagram session data
  access_token TEXT,
  session_token TEXT,
  is_authenticated BOOLEAN DEFAULT false,
  last_auth_check TIMESTAMP,
  instagram_user_id VARCHAR(255),

  -- Profile data
  profile_pic_url TEXT,
  bio TEXT,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,

  -- Account state
  account_state VARCHAR(20) DEFAULT 'NEW_ACCOUNT' CHECK (account_state IN ('NEW_ACCOUNT', 'WARMING_UP', 'ACTIVE', 'RATE_LIMITED', 'PAUSED', 'SUSPENDED', 'RECOVERY', 'BANNED')),
  account_status VARCHAR(20) DEFAULT 'active',
  last_error TEXT,

  -- Proxy configuration
  proxy_id UUID REFERENCES proxy_configs(id) ON DELETE SET NULL,
  proxy_connected BOOLEAN DEFAULT false,

  -- Flags
  is_source BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_username ON accounts(username);
CREATE INDEX idx_accounts_state ON accounts(account_state);
CREATE INDEX idx_accounts_status ON accounts(account_status);

-- ============================================
-- PROXY CONFIGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS proxy_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('residential', 'datacenter', 'mobile')),

  -- Connection details
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL,
  username VARCHAR(255),
  encrypted_password TEXT,

  -- Location
  country VARCHAR(2),
  city VARCHAR(100),

  -- Status
  is_active BOOLEAN DEFAULT true,
  assigned_account_ids TEXT[] DEFAULT '{}',

  -- Health metrics
  last_health_check TIMESTAMP,
  health_status VARCHAR(20) DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'slow', 'failing', 'dead')),
  request_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_proxies_user_id ON proxy_configs(user_id);
CREATE INDEX idx_proxies_health_status ON proxy_configs(health_status);

-- ============================================
-- ACCOUNT GROUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS account_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',

  -- Group configuration
  account_ids TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  posting_strategy JSONB DEFAULT '{"postsPerDay": 10, "staggerMinutes": 30, "variationLevel": "high"}',

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_groups_user_id ON account_groups(user_id);

-- ============================================
-- WARMUP TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS warmup_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,

  -- Warmup schedule
  day INTEGER NOT NULL,
  task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('follow', 'like', 'comment', 'story', 'post', 'watch_story')),
  target_count INTEGER NOT NULL,
  completed_count INTEGER DEFAULT 0,

  -- Execution
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  scheduled_time TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_warmup_account_id ON warmup_tasks(account_id);
CREATE INDEX idx_warmup_scheduled_time ON warmup_tasks(scheduled_time);
CREATE INDEX idx_warmup_status ON warmup_tasks(status);

-- ============================================
-- SCHEDULED POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,

  -- Video reference
  video_id VARCHAR(255) NOT NULL,
  video_uri TEXT NOT NULL,
  thumbnail_uri TEXT,

  -- Target accounts
  account_ids TEXT[] NOT NULL,

  -- Schedule configuration
  schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('one-time', 'recurring', 'queue', 'bulk')),
  scheduled_time TIMESTAMP,
  recurring_config JSONB,
  queue_config JSONB,
  bulk_config JSONB,

  -- Post content
  caption TEXT,
  hashtags TEXT[] DEFAULT '{}',
  location JSONB,

  -- Execution status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  last_attempt_time TIMESTAMP,
  next_attempt_time TIMESTAMP,
  error_message TEXT,

  -- Results
  results JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_posts_user_id ON scheduled_posts(user_id);
CREATE INDEX idx_posts_status ON scheduled_posts(status);
CREATE INDEX idx_posts_next_attempt ON scheduled_posts(next_attempt_time);
CREATE INDEX idx_posts_schedule_type ON scheduled_posts(schedule_type);

-- ============================================
-- CONTENT VARIATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS content_variations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_video_id VARCHAR(255) NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,

  -- Variation configuration
  variations JSONB NOT NULL,
  similarity_score INTEGER CHECK (similarity_score >= 0 AND similarity_score <= 100),

  -- Generated content
  video_uri TEXT,
  caption TEXT,
  hashtags TEXT[] DEFAULT '{}',

  -- Metadata
  generated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_variations_video_id ON content_variations(original_video_id);
CREATE INDEX idx_variations_account_id ON content_variations(account_id);

-- ============================================
-- ACCOUNT HEALTH SCORES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS account_health_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE UNIQUE,

  -- Overall health
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),

  -- Detailed metrics
  metrics JSONB NOT NULL DEFAULT '{}',

  -- Flags and recommendations
  flags TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',

  -- Calculation timestamp
  last_calculated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_health_account_id ON account_health_scores(account_id);
CREATE INDEX idx_health_overall_score ON account_health_scores(overall_score);

-- ============================================
-- HEALTH ALERTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS health_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,

  -- Alert details
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  metadata JSONB,

  -- Status
  acknowledged BOOLEAN DEFAULT FALSE,
  resolved BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE INDEX idx_alerts_account_id ON health_alerts(account_id);
CREATE INDEX idx_alerts_user_id ON health_alerts(user_id);
CREATE INDEX idx_alerts_type ON health_alerts(alert_type);
CREATE INDEX idx_alerts_severity ON health_alerts(severity);
CREATE INDEX idx_alerts_created_at ON health_alerts(created_at);
CREATE INDEX idx_alerts_acknowledged ON health_alerts(acknowledged);
CREATE INDEX idx_alerts_resolved ON health_alerts(resolved);

-- ============================================
-- QUEUES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS queues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Queue configuration
  account_ids TEXT[] DEFAULT '{}',
  schedule JSONB NOT NULL DEFAULT '{"postsPerDay": 5, "optimalTimes": ["09:00", "15:00", "21:00"], "timezone": "UTC"}',

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_queues_user_id ON queues(user_id);
CREATE INDEX idx_queues_is_active ON queues(is_active);

-- ============================================
-- POST RESULTS LOG TABLE (for analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS post_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheduled_post_id UUID REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,

  -- Result
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed')),
  posted_at TIMESTAMP,
  instagram_post_id VARCHAR(255),
  error TEXT,

  -- Metrics
  response_time_ms INTEGER,

  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_results_post_id ON post_results(scheduled_post_id);
CREATE INDEX idx_results_account_id ON post_results(account_id);
CREATE INDEX idx_results_status ON post_results(status);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proxy_configs_updated_at BEFORE UPDATE ON proxy_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_groups_updated_at BEFORE UPDATE ON account_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_posts_updated_at BEFORE UPDATE ON scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_queues_updated_at BEFORE UPDATE ON queues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (for testing)
-- ============================================
-- Insert a test user account
-- INSERT INTO accounts (user_id, username, account_state) VALUES
--   ('test_user', 'test_account_1', 'ACTIVE'),
--   ('test_user', 'test_account_2', 'WARMING_UP');

-- ============================================
-- DONE!
-- ============================================
COMMENT ON TABLE accounts IS 'Instagram accounts managed by the swarm system';
COMMENT ON TABLE proxy_configs IS 'Proxy configurations for account rotation';
COMMENT ON TABLE account_groups IS 'Account grouping for organized distribution';
COMMENT ON TABLE warmup_tasks IS 'Automated warmup tasks for new accounts';
COMMENT ON TABLE scheduled_posts IS 'Scheduled Instagram posts across accounts';
COMMENT ON TABLE content_variations IS 'Pre-generated content variations per account';
COMMENT ON TABLE account_health_scores IS 'Real-time health monitoring for accounts';
COMMENT ON TABLE health_alerts IS 'Health alerts and notifications for account issues';
COMMENT ON TABLE queues IS 'Posting queues for automated scheduling';
COMMENT ON TABLE post_results IS 'Log of all posting attempts and results';
