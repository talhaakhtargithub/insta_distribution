"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollector = void 0;
const database_1 = require("../../config/database");
// ============================================
// METRICS COLLECTOR SERVICE
// ============================================
class MetricsCollector {
    /**
     * Collect comprehensive metrics for a single account
     */
    async collectAccountMetrics(accountId) {
        const client = await database_1.pool.connect();
        try {
            // Get account info
            const accountQuery = await client.query(`SELECT account_state, last_error, username FROM accounts WHERE id = $1`, [accountId]);
            if (accountQuery.rows.length === 0) {
                throw new Error(`Account ${accountId} not found`);
            }
            const account = accountQuery.rows[0];
            // Get posting metrics
            const postMetricsQuery = await client.query(`SELECT
          COUNT(*) as total_posts,
          COUNT(*) FILTER (WHERE status = 'success') as successful_posts,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_posts,
          AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) as avg_response_time,
          SUM(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) as total_response_time,
          MAX(posted_at) as last_post_at
        FROM post_results
        WHERE account_id = $1`, [accountId]);
            const postMetrics = postMetricsQuery.rows[0];
            // Get error counts for different time periods
            const now = new Date();
            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const errorMetricsQuery = await client.query(`SELECT
          COUNT(*) FILTER (WHERE created_at >= $2) as errors_24h,
          COUNT(*) FILTER (WHERE created_at >= $3) as errors_7d,
          COUNT(*) as total_errors
        FROM post_results
        WHERE account_id = $1 AND status = 'failed'`, [accountId, twentyFourHoursAgo, sevenDaysAgo]);
            const errorMetrics = errorMetricsQuery.rows[0];
            // Get rate limit hits from error messages
            const rateLimitQuery = await client.query(`SELECT
          COUNT(*) as total_rate_limits,
          COUNT(*) FILTER (WHERE created_at >= $2) as rate_limits_24h,
          COUNT(*) FILTER (WHERE created_at >= $3) as rate_limits_7d
        FROM post_results
        WHERE account_id = $1
          AND status = 'failed'
          AND (error ILIKE '%rate%limit%' OR error ILIKE '%429%' OR error ILIKE '%too%many%requests%')`, [accountId, twentyFourHoursAgo, sevenDaysAgo]);
            const rateLimitMetrics = rateLimitQuery.rows[0];
            // Get login challenge count (from last_error containing 'challenge' or 'checkpoint')
            const loginChallenges = account.last_error &&
                (account.last_error.toLowerCase().includes('challenge') ||
                    account.last_error.toLowerCase().includes('checkpoint')) ? 1 : 0;
            // Get warmup metrics
            const warmupQuery = await client.query(`SELECT
          COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
          COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress')) as pending_tasks,
          COUNT(*) as total_tasks
        FROM warmup_tasks
        WHERE account_id = $1`, [accountId]);
            const warmupMetrics = warmupQuery.rows[0];
            const warmupProgress = warmupMetrics.total_tasks > 0
                ? (warmupMetrics.completed_tasks / warmupMetrics.total_tasks) * 100
                : 0;
            // Calculate success rate
            const totalPosts = parseInt(postMetrics.total_posts) || 0;
            const successfulPosts = parseInt(postMetrics.successful_posts) || 0;
            const failedPosts = parseInt(postMetrics.failed_posts) || 0;
            const postSuccessRate = totalPosts > 0 ? (successfulPosts / totalPosts) * 100 : 0;
            // Calculate error rates
            const errorCount24h = parseInt(errorMetrics.errors_24h) || 0;
            const errorCount7d = parseInt(errorMetrics.errors_7d) || 0;
            const errorRate24h = totalPosts > 0 ? (errorCount24h / totalPosts) * 100 : 0;
            const errorRate7d = totalPosts > 0 ? (errorCount7d / totalPosts) * 100 : 0;
            return {
                accountId,
                // Posting metrics
                totalPosts,
                successfulPosts,
                failedPosts,
                postSuccessRate,
                // Performance metrics
                avgResponseTime: parseFloat(postMetrics.avg_response_time) || 0,
                totalResponseTime: parseFloat(postMetrics.total_response_time) || 0,
                // Error metrics
                errorCount24h,
                errorCount7d,
                errorRate24h,
                errorRate7d,
                // Rate limit metrics
                rateLimitHits: parseInt(rateLimitMetrics.total_rate_limits) || 0,
                rateLimitHits24h: parseInt(rateLimitMetrics.rate_limits_24h) || 0,
                rateLimitHits7d: parseInt(rateLimitMetrics.rate_limits_7d) || 0,
                // Account health
                loginChallenges,
                accountState: account.account_state,
                lastError: account.last_error,
                lastPostAt: postMetrics.last_post_at ? new Date(postMetrics.last_post_at) : null,
                // Warmup metrics
                warmupTasksCompleted: parseInt(warmupMetrics.completed_tasks) || 0,
                warmupTasksPending: parseInt(warmupMetrics.pending_tasks) || 0,
                warmupProgress,
                calculatedAt: new Date()
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Collect aggregated metrics for all accounts belonging to a user
     */
    async collectSwarmMetrics(userId) {
        const client = await database_1.pool.connect();
        try {
            // Get all accounts for this user
            const accountsQuery = await client.query(`SELECT id, username, account_state FROM accounts WHERE user_id = $1`, [userId]);
            const accounts = accountsQuery.rows;
            const totalAccounts = accounts.length;
            const activeAccounts = accounts.filter(a => a.account_state === 'ACTIVE').length;
            const suspendedAccounts = accounts.filter(a => a.account_state === 'SUSPENDED' || a.account_state === 'BANNED').length;
            // Get aggregated posting metrics
            const accountIds = accounts.map(a => a.id);
            if (accountIds.length === 0) {
                return {
                    userId,
                    totalAccounts: 0,
                    activeAccounts: 0,
                    suspendedAccounts: 0,
                    totalPosts: 0,
                    successfulPosts: 0,
                    failedPosts: 0,
                    overallSuccessRate: 0,
                    avgHealthScore: 0,
                    avgResponseTime: 0,
                    topPerformers: [],
                    problemAccounts: [],
                    calculatedAt: new Date()
                };
            }
            const swarmPostMetricsQuery = await client.query(`SELECT
          COUNT(*) as total_posts,
          COUNT(*) FILTER (WHERE status = 'success') as successful_posts,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_posts,
          AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) as avg_response_time
        FROM post_results
        WHERE account_id = ANY($1)`, [accountIds]);
            const swarmMetrics = swarmPostMetricsQuery.rows[0];
            const totalPosts = parseInt(swarmMetrics.total_posts) || 0;
            const successfulPosts = parseInt(swarmMetrics.successful_posts) || 0;
            const failedPosts = parseInt(swarmMetrics.failed_posts) || 0;
            const overallSuccessRate = totalPosts > 0 ? (successfulPosts / totalPosts) * 100 : 0;
            // Get health scores
            const healthScoresQuery = await client.query(`SELECT
          ahs.account_id,
          ahs.overall_score,
          a.username
        FROM account_health_scores ahs
        JOIN accounts a ON ahs.account_id = a.id
        WHERE ahs.account_id = ANY($1)
        ORDER BY ahs.overall_score DESC`, [accountIds]);
            const healthScores = healthScoresQuery.rows;
            const avgHealthScore = healthScores.length > 0
                ? healthScores.reduce((sum, row) => sum + row.overall_score, 0) / healthScores.length
                : 0;
            // Top 5 performers
            const topPerformers = healthScores.slice(0, 5).map(row => ({
                accountId: row.account_id,
                username: row.username,
                healthScore: row.overall_score
            }));
            // Bottom 5 problem accounts (with health score < 50)
            const problemAccounts = healthScores
                .filter(row => row.overall_score < 50)
                .slice(-5)
                .map(row => ({
                accountId: row.account_id,
                username: row.username,
                healthScore: row.overall_score,
                issues: [] // Will be populated by HealthMonitor
            }));
            return {
                userId,
                totalAccounts,
                activeAccounts,
                suspendedAccounts,
                totalPosts,
                successfulPosts,
                failedPosts,
                overallSuccessRate,
                avgHealthScore,
                avgResponseTime: parseFloat(swarmMetrics.avg_response_time) || 0,
                topPerformers,
                problemAccounts,
                calculatedAt: new Date()
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Get historical metrics for an account
     */
    async getMetricsHistory(accountId, days = 30, period = 'daily') {
        const client = await database_1.pool.connect();
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const query = await client.query(`SELECT
          DATE(created_at) as date,
          COUNT(*) as total_posts,
          COUNT(*) FILTER (WHERE status = 'success') as successful_posts,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_posts,
          AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) as avg_response_time
        FROM post_results
        WHERE account_id = $1 AND created_at >= $2
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC`, [accountId, startDate]);
            const dataPoints = query.rows.map(row => ({
                date: new Date(row.date),
                metrics: {
                    totalPosts: parseInt(row.total_posts),
                    successfulPosts: parseInt(row.successful_posts),
                    failedPosts: parseInt(row.failed_posts),
                    postSuccessRate: row.total_posts > 0
                        ? (row.successful_posts / row.total_posts) * 100
                        : 0,
                    avgResponseTime: parseFloat(row.avg_response_time) || 0
                }
            }));
            return {
                accountId,
                period,
                dataPoints
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Get daily aggregated metrics for an account
     */
    async getDailyAggregates(accountId, days = 7) {
        const client = await database_1.pool.connect();
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const query = await client.query(`SELECT
          DATE(created_at) as date,
          COUNT(*) as posts,
          COUNT(*) FILTER (WHERE status = 'success') as successes,
          COUNT(*) FILTER (WHERE status = 'failed') as failures,
          AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) as avg_response_time,
          COUNT(*) FILTER (WHERE status = 'failed') as error_count
        FROM post_results
        WHERE account_id = $1 AND created_at >= $2
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) DESC`, [accountId, startDate]);
            return query.rows.map(row => ({
                date: new Date(row.date),
                posts: parseInt(row.posts),
                successes: parseInt(row.successes),
                failures: parseInt(row.failures),
                avgResponseTime: parseFloat(row.avg_response_time) || 0,
                errorCount: parseInt(row.error_count)
            }));
        }
        finally {
            client.release();
        }
    }
    /**
     * Get weekly aggregated metrics for an account
     */
    async getWeeklyAggregates(accountId, weeks = 4) {
        const client = await database_1.pool.connect();
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - (weeks * 7));
            const query = await client.query(`SELECT
          DATE_TRUNC('week', created_at) as week_start,
          COUNT(*) as total_posts,
          COUNT(*) FILTER (WHERE status = 'success') as successes,
          COUNT(*) FILTER (WHERE status = 'failed') as failures,
          AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) as avg_response_time,
          COUNT(DISTINCT DATE(created_at)) as active_days
        FROM post_results
        WHERE account_id = $1 AND created_at >= $2
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY DATE_TRUNC('week', created_at) DESC`, [accountId, startDate]);
            return query.rows.map(row => {
                const weekStart = new Date(row.week_start);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                const totalPosts = parseInt(row.total_posts);
                const successes = parseInt(row.successes);
                const activeDays = parseInt(row.active_days) || 1;
                return {
                    weekStart,
                    weekEnd,
                    totalPosts,
                    avgDailyPosts: totalPosts / activeDays,
                    successRate: totalPosts > 0 ? (successes / totalPosts) * 100 : 0,
                    avgResponseTime: parseFloat(row.avg_response_time) || 0,
                    totalErrors: parseInt(row.failures)
                };
            });
        }
        finally {
            client.release();
        }
    }
}
exports.MetricsCollector = MetricsCollector;
exports.default = new MetricsCollector();
