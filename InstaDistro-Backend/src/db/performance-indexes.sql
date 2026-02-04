-- ============================================
-- PHASE 4: DATABASE PERFORMANCE OPTIMIZATION
-- ============================================
-- This migration adds composite indexes, GIN indexes,
-- and junction tables for optimal query performance
--
-- Run AFTER migrations.sql
-- ============================================

-- ============================================
-- COMPOSITE INDEXES (for multi-column queries)
-- ============================================

-- Accounts: frequently queried together
CREATE INDEX IF NOT EXISTS idx_accounts_user_state ON accounts(user_id, account_state);
CREATE INDEX IF NOT EXISTS idx_accounts_user_status ON accounts(user_id, account_status);

-- Scheduled Posts: optimize post queue queries
CREATE INDEX IF NOT EXISTS idx_posts_account_status ON scheduled_posts(account_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_user_status_time ON scheduled_posts(user_id, status, next_attempt_time);

-- Post Results: analytics queries
CREATE INDEX IF NOT EXISTS idx_results_account_status_date ON post_results(account_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_results_user_status ON post_results(user_id, status) WHERE user_id IS NOT NULL;

-- Warmup Tasks: daily task queries
CREATE INDEX IF NOT EXISTS idx_warmup_account_day_status ON warmup_tasks(account_id, day, status);

-- Health Alerts: unresolved alerts query
CREATE INDEX IF NOT EXISTS idx_alerts_user_resolved_created ON health_alerts(user_id, resolved, created_at);

-- Proxy Configs: active proxy assignment
CREATE INDEX IF NOT EXISTS idx_proxies_user_active_health ON proxy_configs(user_id, is_active, health_status);

-- ============================================
-- GIN INDEXES (for array and JSONB queries)
-- ============================================

-- Content Variations: hashtag searches
CREATE INDEX IF NOT EXISTS idx_variations_hashtags_gin ON content_variations USING GIN(hashtags);

-- Account Groups: account_ids array searches
CREATE INDEX IF NOT EXISTS idx_groups_account_ids_gin ON account_groups USING GIN(account_ids);

-- Queues: account_ids array searches
CREATE INDEX IF NOT EXISTS idx_queues_account_ids_gin ON queues USING GIN(account_ids);

-- Scheduled Posts: metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_posts_metadata_gin ON scheduled_posts USING GIN(metadata);

-- Health Alerts: metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_alerts_metadata_gin ON health_alerts USING GIN(metadata);

-- Account Health Scores: metrics JSONB queries
CREATE INDEX IF NOT EXISTS idx_health_metrics_gin ON account_health_scores USING GIN(metrics);

-- ============================================
-- PARTIAL INDEXES (for filtered queries)
-- ============================================

-- Active accounts only (most common query)
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(user_id, account_state)
  WHERE account_state IN ('WARMING_UP', 'ACTIVE');

-- Pending posts only (scheduled queue)
CREATE INDEX IF NOT EXISTS idx_posts_pending ON scheduled_posts(next_attempt_time)
  WHERE status = 'pending';

-- Failed posts for retry (error recovery)
CREATE INDEX IF NOT EXISTS idx_posts_failed ON scheduled_posts(user_id, next_attempt_time)
  WHERE status = 'failed';

-- Unacknowledged alerts (notification queries)
CREATE INDEX IF NOT EXISTS idx_alerts_unacknowledged ON health_alerts(user_id, severity, created_at)
  WHERE acknowledged = FALSE;

-- Active proxies (rotation queries)
CREATE INDEX IF NOT EXISTS idx_proxies_active ON proxy_configs(user_id, health_status)
  WHERE is_active = TRUE;

-- ============================================
-- COVERING INDEXES (include frequently accessed columns)
-- ============================================

-- Account list with essential info (avoid table lookups)
CREATE INDEX IF NOT EXISTS idx_accounts_list_covering ON accounts(user_id, account_state)
  INCLUDE (username, follower_count, is_authenticated);

-- Post results summary (analytics dashboards)
CREATE INDEX IF NOT EXISTS idx_results_summary_covering ON post_results(account_id, created_at)
  INCLUDE (status, response_time_ms);

-- ============================================
-- ANALYZE TABLES (update statistics for query planner)
-- ============================================

ANALYZE accounts;
ANALYZE scheduled_posts;
ANALYZE post_results;
ANALYZE warmup_tasks;
ANALYZE health_alerts;
ANALYZE proxy_configs;
ANALYZE account_groups;
ANALYZE queues;
ANALYZE content_variations;
ANALYZE account_health_scores;

-- ============================================
-- PERFORMANCE MONITORING QUERIES
-- ============================================

-- Check index usage (run periodically)
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- Find missing indexes (tables with many sequential scans)
-- SELECT schemaname, tablename, seq_scan, seq_tup_read, idx_scan, seq_tup_read / seq_scan AS avg_seq_tup
-- FROM pg_stat_user_tables
-- WHERE seq_scan > 0
-- ORDER BY seq_tup_read DESC;

-- Check table sizes
-- SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- DONE! Performance indexes applied
-- ============================================

COMMENT ON INDEX idx_accounts_user_state IS 'Composite index for user account listings by state';
COMMENT ON INDEX idx_posts_user_status_time IS 'Composite index for scheduled post queue optimization';
COMMENT ON INDEX idx_variations_hashtags_gin IS 'GIN index for hashtag array searches';
COMMENT ON INDEX idx_accounts_active IS 'Partial index for active accounts only';
COMMENT ON INDEX idx_accounts_list_covering IS 'Covering index to avoid table lookups';
