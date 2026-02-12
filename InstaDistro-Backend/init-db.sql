-- Instagram Swarm Database Schema
-- This file is executed automatically when the database container first starts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('personal', 'business')),
    account_state VARCHAR(50) NOT NULL DEFAULT 'NEW_ACCOUNT' CHECK (account_state IN ('NEW_ACCOUNT', 'IN_WARMUP', 'ACTIVE', 'PAUSED', 'BANNED')),
    is_authenticated BOOLEAN DEFAULT false,
    session_data JSONB,
    instagram_user_id VARCHAR(255),
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    bio TEXT,
    profile_pic_url TEXT,
    group_id UUID,
    proxy_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_post_at TIMESTAMP,
    last_action_at TIMESTAMP
);

-- Groups Table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Proxies Table
CREATE TABLE IF NOT EXISTS proxies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    username VARCHAR(255),
    password TEXT,
    protocol VARCHAR(10) DEFAULT 'http' CHECK (protocol IN ('http', 'https', 'socks5')),
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Post Results Table
CREATE TABLE IF NOT EXISTS post_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    media_id VARCHAR(255),
    media_type VARCHAR(50) NOT NULL CHECK (media_type IN ('photo', 'video', 'carousel')),
    caption TEXT,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'posted', 'failed')),
    error_message TEXT,
    posted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Warmup Tasks Table
CREATE TABLE IF NOT EXISTS warmup_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    day INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target_count INTEGER NOT NULL,
    completed_count INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    scheduled_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Distribution Jobs Table
CREATE TABLE IF NOT EXISTS distribution_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    content JSONB NOT NULL,
    account_ids UUID[] NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    scheduled_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Health Metrics Table
CREATE TABLE IF NOT EXISTS health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    health_score INTEGER NOT NULL,
    metrics JSONB NOT NULL,
    alerts JSONB,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Schedules Table
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    cron_expression VARCHAR(100) NOT NULL,
    content JSONB NOT NULL,
    account_ids UUID[],
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username);
CREATE INDEX IF NOT EXISTS idx_accounts_state ON accounts(account_state);
CREATE INDEX IF NOT EXISTS idx_post_results_account_id ON post_results(account_id);
CREATE INDEX IF NOT EXISTS idx_post_results_status ON post_results(status);
CREATE INDEX IF NOT EXISTS idx_warmup_tasks_account_id ON warmup_tasks(account_id);
CREATE INDEX IF NOT EXISTS idx_warmup_tasks_status ON warmup_tasks(status);
CREATE INDEX IF NOT EXISTS idx_distribution_jobs_user_id ON distribution_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_account_id ON health_metrics(account_id);
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
