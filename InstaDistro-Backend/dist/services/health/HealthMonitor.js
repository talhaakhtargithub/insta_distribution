"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthMonitor = void 0;
const database_1 = require("../../config/database");
const MetricsCollector_1 = __importDefault(require("./MetricsCollector"));
const HealthScorer_1 = __importDefault(require("./HealthScorer"));
const AlertManager_1 = __importDefault(require("./AlertManager"));
const logger_1 = require("../../config/logger");
const CacheService_1 = require("../cache/CacheService");
// ============================================
// HEALTH MONITOR SERVICE
// ============================================
class HealthMonitor {
    /**
     * Monitor a single account and generate health report
     * Cached for 5 minutes to reduce database load
     */
    async monitorAccount(accountId) {
        // Try to get from cache first
        const cacheKey = CacheService_1.cacheService.key(CacheService_1.CacheNamespace.HEALTH, accountId);
        const cached = await CacheService_1.cacheService.get(cacheKey);
        if (cached) {
            logger_1.logger.debug('Health report cache hit', { accountId });
            return cached;
        }
        const client = await database_1.pool.connect();
        try {
            // Get account info
            const accountQuery = await client.query('SELECT username FROM accounts WHERE id = $1', [accountId]);
            if (accountQuery.rows.length === 0) {
                throw new Error(`Account ${accountId} not found`);
            }
            const username = accountQuery.rows[0].username;
            // Collect metrics
            const metrics = await MetricsCollector_1.default.collectAccountMetrics(accountId);
            // Calculate scores and breakdown
            const scoreBreakdown = HealthScorer_1.default.getHealthScoreBreakdown(metrics);
            // Detect flags
            const flags = HealthScorer_1.default.detectFlags(metrics);
            // Generate recommendations
            const recommendations = HealthScorer_1.default.generateRecommendations(metrics);
            // Check for alerts and auto-create if needed
            const newAlerts = await AlertManager_1.default.autoCreateAlerts(accountId, metrics);
            // Get recent alerts
            const recentAlerts = await AlertManager_1.default.getAccountAlerts(accountId, 10);
            // Update health score in database
            await this.updateHealthScore(accountId, scoreBreakdown, metrics, flags, recommendations);
            const report = {
                accountId,
                username,
                metrics,
                scoreBreakdown,
                flags,
                recommendations,
                alerts: recentAlerts,
                lastUpdated: new Date()
            };
            // Cache the report
            await CacheService_1.cacheService.set(cacheKey, report, CacheService_1.CacheTTL.SHORT);
            return report;
        }
        finally {
            client.release();
        }
    }
    /**
     * Monitor all accounts for a user and generate swarm health report
     * Cached for 5 minutes to reduce load
     */
    async monitorSwarm(userId) {
        // Try to get from cache first
        const cacheKey = CacheService_1.cacheService.key(CacheService_1.CacheNamespace.HEALTH_SWARM, userId);
        const cached = await CacheService_1.cacheService.get(cacheKey);
        if (cached) {
            logger_1.logger.debug('Swarm health report cache hit', { userId });
            return cached;
        }
        const client = await database_1.pool.connect();
        try {
            // Get all accounts for user
            const accountsQuery = await client.query('SELECT id, username FROM accounts WHERE user_id = $1', [userId]);
            const accounts = accountsQuery.rows;
            // Collect swarm-wide metrics
            const swarmMetrics = await MetricsCollector_1.default.collectSwarmMetrics(userId);
            // Monitor each account
            const accountReports = [];
            let criticalCount = 0;
            let healthyCount = 0;
            for (const account of accounts) {
                try {
                    const report = await this.monitorAccount(account.id);
                    accountReports.push(report);
                    if (report.scoreBreakdown.category === 'critical' || report.scoreBreakdown.category === 'poor') {
                        criticalCount++;
                    }
                    else if (report.scoreBreakdown.category === 'excellent' || report.scoreBreakdown.category === 'good') {
                        healthyCount++;
                    }
                }
                catch (error) {
                    logger_1.logger.error('Error monitoring account', {
                        accountId: account.id,
                        error: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack : undefined
                    });
                }
            }
            // Get active alerts
            const activeAlerts = await AlertManager_1.default.getActiveAlerts(userId);
            // Calculate overall health
            const avgScore = accountReports.length > 0
                ? accountReports.reduce((sum, r) => sum + r.scoreBreakdown.overall, 0) / accountReports.length
                : 0;
            const category = HealthScorer_1.default.categorizeHealth(avgScore);
            // Generate summary
            const summary = this.generateSwarmSummary(swarmMetrics, avgScore, criticalCount, healthyCount, activeAlerts.length);
            const report = {
                userId,
                swarmMetrics,
                accountReports,
                overallHealth: {
                    avgScore,
                    category,
                    criticalAccounts: criticalCount,
                    healthyAccounts: healthyCount
                },
                activeAlerts,
                summary,
                generatedAt: new Date()
            };
            // Cache the report
            await CacheService_1.cacheService.set(cacheKey, report, CacheService_1.CacheTTL.SHORT);
            return report;
        }
        finally {
            client.release();
        }
    }
    /**
     * Generate daily health report for a user
     */
    async generateDailyReport(userId) {
        const swarmReport = await this.monitorSwarm(userId);
        // Get alerts created in last 24 hours
        const client = await database_1.pool.connect();
        let newAlerts = [];
        try {
            const alertsQuery = await client.query(`SELECT ha.*, a.username
         FROM health_alerts ha
         JOIN accounts a ON ha.account_id = a.id
         WHERE ha.user_id = $1 AND ha.created_at > NOW() - INTERVAL '24 hours'
         ORDER BY ha.created_at DESC`, [userId]);
            newAlerts = alertsQuery.rows.map(row => ({
                id: row.id,
                accountId: row.account_id,
                userId: row.user_id,
                alertType: row.alert_type,
                severity: row.severity,
                message: row.message,
                acknowledged: row.acknowledged,
                resolved: row.resolved,
                createdAt: new Date(row.created_at),
                username: row.username
            }));
        }
        finally {
            client.release();
        }
        // Extract top performers and problem accounts
        const sortedReports = [...swarmReport.accountReports].sort((a, b) => b.scoreBreakdown.overall - a.scoreBreakdown.overall);
        const topPerformers = sortedReports.slice(0, 5).map(r => ({
            accountId: r.accountId,
            username: r.username,
            score: r.scoreBreakdown.overall
        }));
        const problemAccounts = sortedReports
            .filter(r => r.scoreBreakdown.overall < 50)
            .slice(0, 5)
            .map(r => ({
            accountId: r.accountId,
            username: r.username,
            score: r.scoreBreakdown.overall,
            issues: r.flags
        }));
        const summary = this.generateDailySummary(swarmReport.swarmMetrics, newAlerts.length, problemAccounts.length);
        return {
            userId,
            date: new Date(),
            swarmMetrics: swarmReport.swarmMetrics,
            topPerformers,
            problemAccounts,
            newAlerts,
            summary
        };
    }
    /**
     * Generate weekly health report
     */
    async generateWeeklyReport(userId) {
        const weekEnd = new Date();
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        // Get current swarm metrics
        const currentMetrics = await MetricsCollector_1.default.collectSwarmMetrics(userId);
        // Get accounts
        const client = await database_1.pool.connect();
        let accounts = [];
        try {
            const accountsQuery = await client.query('SELECT id, username FROM accounts WHERE user_id = $1', [userId]);
            accounts = accountsQuery.rows;
        }
        finally {
            client.release();
        }
        // Calculate weekly averages for each account
        const accountWeeklyScores = [];
        for (const account of accounts) {
            try {
                const metrics = await MetricsCollector_1.default.collectAccountMetrics(account.id);
                const scoreBreakdown = HealthScorer_1.default.getHealthScoreBreakdown(metrics);
                const flags = HealthScorer_1.default.detectFlags(metrics);
                accountWeeklyScores.push({
                    accountId: account.id,
                    username: account.username,
                    avgScore: scoreBreakdown.overall,
                    issues: flags
                });
            }
            catch (error) {
                logger_1.logger.error('Error calculating weekly score for account', {
                    accountId: account.id,
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                });
            }
        }
        // Sort and get top/problem accounts
        const sortedScores = [...accountWeeklyScores].sort((a, b) => b.avgScore - a.avgScore);
        const topPerformers = sortedScores.slice(0, 5);
        const problemAccounts = sortedScores.filter(a => a.avgScore < 50).slice(0, 5);
        // Generate recommendations
        const recommendations = this.generateWeeklyRecommendations(currentMetrics, problemAccounts.length);
        const summary = this.generateWeeklySummary(currentMetrics, topPerformers.length, problemAccounts.length);
        return {
            userId,
            weekStart,
            weekEnd,
            swarmMetrics: currentMetrics,
            trends: {
                overallHealthChange: 0, // Would need historical data
                postsChange: 0,
                successRateChange: 0
            },
            topPerformers,
            problemAccounts,
            recommendations,
            summary
        };
    }
    /**
     * Update health score in database
     */
    async updateHealthScore(accountId, scoreBreakdown, metrics, flags, recommendations) {
        const client = await database_1.pool.connect();
        try {
            // Check if record exists
            const existingQuery = await client.query('SELECT id FROM account_health_scores WHERE account_id = $1', [accountId]);
            const metricsJson = JSON.stringify({
                posting: {
                    totalPosts: metrics.totalPosts,
                    successRate: metrics.postSuccessRate,
                    avgResponseTime: metrics.avgResponseTime
                },
                errors: {
                    errorRate24h: metrics.errorRate24h,
                    errorRate7d: metrics.errorRate7d,
                    rateLimitHits: metrics.rateLimitHits
                },
                account: {
                    state: metrics.accountState,
                    lastPostAt: metrics.lastPostAt
                },
                scores: {
                    engagement: scoreBreakdown.engagement,
                    reliability: scoreBreakdown.reliability,
                    risk: scoreBreakdown.risk
                },
                breakdown: scoreBreakdown.breakdown
            });
            if (existingQuery.rows.length > 0) {
                // Update existing
                await client.query(`UPDATE account_health_scores
           SET overall_score = $2,
               metrics = $3,
               flags = $4,
               recommendations = $5,
               last_calculated = NOW()
           WHERE account_id = $1`, [accountId, scoreBreakdown.overall, metricsJson, flags, recommendations]);
            }
            else {
                // Insert new
                await client.query(`INSERT INTO account_health_scores (account_id, overall_score, metrics, flags, recommendations)
           VALUES ($1, $2, $3, $4, $5)`, [accountId, scoreBreakdown.overall, metricsJson, flags, recommendations]);
            }
        }
        finally {
            client.release();
        }
    }
    /**
     * Generate swarm summary text
     */
    generateSwarmSummary(metrics, avgScore, criticalCount, healthyCount, activeAlertCount) {
        const parts = [];
        parts.push(`Your swarm has ${metrics.totalAccounts} accounts with an average health score of ${avgScore.toFixed(0)}/100.`);
        if (healthyCount > 0) {
            parts.push(`${healthyCount} accounts are performing well.`);
        }
        if (criticalCount > 0) {
            parts.push(`⚠️ ${criticalCount} accounts need attention.`);
        }
        parts.push(`Overall success rate: ${metrics.overallSuccessRate.toFixed(1)}% across ${metrics.totalPosts} posts.`);
        if (activeAlertCount > 0) {
            parts.push(`You have ${activeAlertCount} active alerts.`);
        }
        return parts.join(' ');
    }
    /**
     * Generate daily summary
     */
    generateDailySummary(metrics, newAlerts, problemCount) {
        const parts = [];
        parts.push(`Daily Report: ${metrics.totalPosts} posts across ${metrics.activeAccounts} active accounts.`);
        parts.push(`Success rate: ${metrics.overallSuccessRate.toFixed(1)}%.`);
        if (newAlerts > 0) {
            parts.push(`${newAlerts} new alerts today.`);
        }
        if (problemCount > 0) {
            parts.push(`${problemCount} accounts need attention.`);
        }
        else {
            parts.push(`All accounts are healthy.`);
        }
        return parts.join(' ');
    }
    /**
     * Generate weekly summary
     */
    generateWeeklySummary(metrics, topPerformersCount, problemCount) {
        const parts = [];
        parts.push(`Weekly Report: ${metrics.totalPosts} posts this week.`);
        parts.push(`Overall success rate: ${metrics.overallSuccessRate.toFixed(1)}%.`);
        if (topPerformersCount > 0) {
            parts.push(`Top ${topPerformersCount} performers identified.`);
        }
        if (problemCount > 0) {
            parts.push(`${problemCount} accounts need improvement.`);
        }
        return parts.join(' ');
    }
    /**
     * Generate weekly recommendations
     */
    generateWeeklyRecommendations(metrics, problemCount) {
        const recommendations = [];
        if (metrics.overallSuccessRate < 80) {
            recommendations.push('Overall success rate is below 80%. Review posting strategy and error logs.');
        }
        if (problemCount > metrics.totalAccounts * 0.3) {
            recommendations.push('More than 30% of accounts have issues. Consider reducing posting frequency.');
        }
        if (metrics.activeAccounts < metrics.totalAccounts * 0.7) {
            recommendations.push('Less than 70% of accounts are active. Review suspended/paused accounts.');
        }
        if (metrics.avgResponseTime > 2000) {
            recommendations.push('Average response time is slow. Check proxy performance and network connectivity.');
        }
        if (recommendations.length === 0) {
            recommendations.push('Keep up the good work! Your swarm is healthy.');
        }
        return recommendations;
    }
}
exports.HealthMonitor = HealthMonitor;
exports.default = new HealthMonitor();
