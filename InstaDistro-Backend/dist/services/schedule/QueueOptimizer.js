"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueOptimizer = void 0;
const database_1 = require("../../config/database");
// ============================================
// QUEUE OPTIMIZER
// ============================================
class QueueOptimizer {
    /**
     * Get optimal posting times for an account based on historical performance
     */
    async getOptimalTimes(accountId, count = 3) {
        const client = await database_1.pool.connect();
        try {
            // Get historical posting data
            const result = await client.query(`SELECT
           EXTRACT(HOUR FROM posted_at) as hour,
           COUNT(*) as total_posts,
           COUNT(*) FILTER (WHERE status = 'success') as successful_posts,
           AVG(response_time_ms) as avg_response_time
         FROM post_results
         WHERE account_id = $1
           AND posted_at IS NOT NULL
           AND posted_at > NOW() - INTERVAL '30 days'
         GROUP BY EXTRACT(HOUR FROM posted_at)
         HAVING COUNT(*) >= 3
         ORDER BY (COUNT(*) FILTER (WHERE status = 'success')::float / COUNT(*)) DESC
         LIMIT 10`, [accountId]);
            if (result.rows.length === 0) {
                // Return default optimal times if no historical data
                return this.getDefaultOptimalTimes();
            }
            // Calculate scores based on success rate and response time
            const optimalTimes = result.rows.slice(0, count).map(row => {
                const hour = parseInt(row.hour);
                const totalPosts = parseInt(row.total_posts);
                const successfulPosts = parseInt(row.successful_posts);
                const successRate = (successfulPosts / totalPosts) * 100;
                const avgResponseTime = parseFloat(row.avg_response_time) || 0;
                // Score calculation (higher is better)
                let score = successRate; // Base score from success rate
                // Bonus for fast response times
                if (avgResponseTime < 1000) {
                    score += 10;
                }
                else if (avgResponseTime < 2000) {
                    score += 5;
                }
                // Cap at 100
                score = Math.min(100, score);
                return {
                    time: `${hour.toString().padStart(2, '0')}:00`,
                    score,
                    reason: `${successRate.toFixed(1)}% success rate from ${totalPosts} posts`
                };
            });
            return optimalTimes;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get default optimal times (industry best practices)
     */
    getDefaultOptimalTimes() {
        return [
            {
                time: '09:00',
                score: 85,
                reason: 'Morning peak - high engagement'
            },
            {
                time: '15:00',
                score: 80,
                reason: 'Afternoon peak - consistent engagement'
            },
            {
                time: '21:00',
                score: 90,
                reason: 'Evening peak - highest engagement'
            }
        ];
    }
    /**
     * Optimize queue schedule for multiple posts
     */
    async optimizeQueue(userId, posts, config) {
        const slots = [];
        // Get optimal times for each account
        const accountOptimalTimes = new Map();
        const allAccountIds = new Set();
        for (const post of posts) {
            post.accountIds.forEach(id => allAccountIds.add(id));
        }
        for (const accountId of allAccountIds) {
            const optimalTimes = config.useOptimalTimes
                ? await this.getOptimalTimes(accountId)
                : this.getDefaultOptimalTimes();
            accountOptimalTimes.set(accountId, optimalTimes);
        }
        // Distribute posts across the time range
        const totalDays = Math.ceil((config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24));
        const postsPerDay = config.postsPerDay || 3;
        let currentDate = new Date(config.startDate);
        let postIndex = 0;
        while (postIndex < posts.length && currentDate <= config.endDate) {
            const dailyPosts = Math.min(postsPerDay, posts.length - postIndex);
            for (let i = 0; i < dailyPosts && postIndex < posts.length; i++) {
                const post = posts[postIndex];
                for (const accountId of post.accountIds) {
                    const optimalTimes = accountOptimalTimes.get(accountId) || this.getDefaultOptimalTimes();
                    const timeSlot = optimalTimes[i % optimalTimes.length];
                    const [hours, minutes] = timeSlot.time.split(':').map(Number);
                    const slotTime = new Date(currentDate);
                    slotTime.setHours(hours, minutes, 0, 0);
                    // Add random jitter (±15 minutes)
                    const jitter = Math.floor(Math.random() * 30) - 15;
                    slotTime.setMinutes(slotTime.getMinutes() + jitter);
                    slots.push({
                        time: slotTime,
                        accountId,
                        priority: timeSlot.score,
                        isOptimal: timeSlot.score >= 80
                    });
                }
                postIndex++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        // Sort by time
        slots.sort((a, b) => a.time.getTime() - b.time.getTime());
        return slots;
    }
    /**
     * Get best days of week for posting based on historical data
     */
    async getBestDaysOfWeek(accountId) {
        const client = await database_1.pool.connect();
        try {
            const result = await client.query(`SELECT
           EXTRACT(DOW FROM posted_at) as day_of_week,
           COUNT(*) as total_posts,
           COUNT(*) FILTER (WHERE status = 'success') as successful_posts
         FROM post_results
         WHERE account_id = $1
           AND posted_at IS NOT NULL
           AND posted_at > NOW() - INTERVAL '90 days'
         GROUP BY EXTRACT(DOW FROM posted_at)
         HAVING COUNT(*) >= 5
         ORDER BY (COUNT(*) FILTER (WHERE status = 'success')::float / COUNT(*)) DESC
         LIMIT 3`, [accountId]);
            if (result.rows.length === 0) {
                // Default: Tuesday, Thursday, Sunday
                return [2, 4, 0];
            }
            return result.rows.map(row => parseInt(row.day_of_week));
        }
        finally {
            client.release();
        }
    }
    /**
     * Get recommended posts per day based on account health and history
     */
    async getRecommendedPostsPerDay(accountId) {
        const client = await database_1.pool.connect();
        try {
            // Get account health score
            const healthQuery = await client.query('SELECT overall_score FROM account_health_scores WHERE account_id = $1', [accountId]);
            const healthScore = healthQuery.rows[0]?.overall_score || 70;
            // Get account state
            const accountQuery = await client.query('SELECT account_state FROM accounts WHERE id = $1', [accountId]);
            const accountState = accountQuery.rows[0]?.account_state;
            // Calculate recommended posts based on health and state
            let recommendedPosts = 3; // Default
            if (accountState === 'NEW_ACCOUNT') {
                recommendedPosts = 1;
            }
            else if (accountState === 'WARMING_UP') {
                recommendedPosts = 2;
            }
            else if (accountState === 'ACTIVE') {
                if (healthScore >= 90) {
                    recommendedPosts = 5;
                }
                else if (healthScore >= 75) {
                    recommendedPosts = 4;
                }
                else if (healthScore >= 50) {
                    recommendedPosts = 3;
                }
                else {
                    recommendedPosts = 2;
                }
            }
            else if (accountState === 'RATE_LIMITED' || accountState === 'PAUSED') {
                recommendedPosts = 1;
            }
            return recommendedPosts;
        }
        finally {
            client.release();
        }
    }
    /**
     * Create optimization report for an account
     */
    async createOptimizationReport(accountId) {
        const [optimalTimes, bestDays, recommendedPosts] = await Promise.all([
            this.getOptimalTimes(accountId, 5),
            this.getBestDaysOfWeek(accountId),
            this.getRecommendedPostsPerDay(accountId)
        ]);
        return {
            accountId,
            optimalTimes,
            recommendedPostsPerDay: recommendedPosts,
            bestDaysOfWeek: bestDays,
            timezone: 'UTC' // Can be customized per user
        };
    }
    /**
     * Balance load across multiple accounts
     */
    async balanceLoadAcrossAccounts(accountIds, totalPosts, config) {
        const distribution = new Map();
        // Get recommended posts per day for each account
        const recommendations = await Promise.all(accountIds.map(async (id) => ({
            accountId: id,
            recommendedPosts: await this.getRecommendedPostsPerDay(id)
        })));
        // Calculate total capacity
        const totalCapacity = recommendations.reduce((sum, rec) => sum + rec.recommendedPosts, 0);
        // Distribute posts proportionally
        let remaining = totalPosts;
        for (const rec of recommendations) {
            const proportion = rec.recommendedPosts / totalCapacity;
            const allocated = Math.min(Math.floor(totalPosts * proportion), remaining);
            distribution.set(rec.accountId, allocated);
            remaining -= allocated;
        }
        // Distribute remaining posts to accounts with capacity
        while (remaining > 0) {
            for (const rec of recommendations) {
                if (remaining <= 0)
                    break;
                const current = distribution.get(rec.accountId) || 0;
                if (current < rec.recommendedPosts * 2) { // Don't exceed 2x recommended
                    distribution.set(rec.accountId, current + 1);
                    remaining--;
                }
            }
        }
        return distribution;
    }
    /**
     * Estimate completion time for a queue
     */
    estimateCompletionTime(totalPosts, accountCount, postsPerDay) {
        const postsPerDayPerAccount = postsPerDay / accountCount;
        const totalDays = Math.ceil(totalPosts / postsPerDay);
        const completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + totalDays);
        return {
            days: totalDays,
            estimatedCompletionDate: completionDate
        };
    }
}
exports.QueueOptimizer = QueueOptimizer;
exports.default = new QueueOptimizer();
