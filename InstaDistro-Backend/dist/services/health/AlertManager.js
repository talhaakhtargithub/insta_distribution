"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertManager = exports.AlertSeverity = exports.AlertType = void 0;
const database_1 = require("../../config/database");
const logger_1 = require("../../config/logger");
// ============================================
// TYPES
// ============================================
var AlertType;
(function (AlertType) {
    AlertType["HEALTH_CRITICAL"] = "health_critical";
    AlertType["HEALTH_POOR"] = "health_poor";
    AlertType["SHADOWBAN_SUSPECTED"] = "shadowban_suspected";
    AlertType["HIGH_ERROR_RATE"] = "high_error_rate";
    AlertType["RATE_LIMIT_FREQUENT"] = "rate_limit_frequent";
    AlertType["LOGIN_CHALLENGE"] = "login_challenge";
    AlertType["ENGAGEMENT_DROP"] = "engagement_drop";
    AlertType["ACCOUNT_SUSPENDED"] = "account_suspended";
    AlertType["ACCOUNT_BANNED"] = "account_banned";
    AlertType["WARMUP_STALLED"] = "warmup_stalled";
    AlertType["INACTIVE_ACCOUNT"] = "inactive_account";
})(AlertType || (exports.AlertType = AlertType = {}));
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["INFO"] = "info";
    AlertSeverity["WARNING"] = "warning";
    AlertSeverity["ERROR"] = "error";
    AlertSeverity["CRITICAL"] = "critical";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
// ============================================
// ALERT MANAGER SERVICE
// ============================================
class AlertManager {
    /**
     * Define alert rules
     */
    alertRules = [
        // Critical health
        {
            type: AlertType.HEALTH_CRITICAL,
            severity: AlertSeverity.CRITICAL,
            condition: (m) => m.postSuccessRate < 25 && m.totalPosts > 5,
            messageTemplate: (m) => `Critical health score with ${m.postSuccessRate.toFixed(1)}% success rate. Immediate action required.`,
            cooldownHours: 24
        },
        // Poor health
        {
            type: AlertType.HEALTH_POOR,
            severity: AlertSeverity.WARNING,
            condition: (m) => m.postSuccessRate < 50 && m.postSuccessRate >= 25 && m.totalPosts > 5,
            messageTemplate: (m) => `Poor account health with ${m.postSuccessRate.toFixed(1)}% success rate. Review posting strategy.`,
            cooldownHours: 12
        },
        // High error rate
        {
            type: AlertType.HIGH_ERROR_RATE,
            severity: AlertSeverity.ERROR,
            condition: (m) => m.errorRate24h > 20,
            messageTemplate: (m) => `High error rate: ${m.errorCount24h} errors in last 24h (${m.errorRate24h.toFixed(1)}%).`,
            cooldownHours: 6
        },
        // Frequent rate limits
        {
            type: AlertType.RATE_LIMIT_FREQUENT,
            severity: AlertSeverity.ERROR,
            condition: (m) => m.rateLimitHits24h > 2,
            messageTemplate: (m) => `Frequent rate limits: ${m.rateLimitHits24h} hits in last 24h. Reduce posting frequency.`,
            cooldownHours: 12
        },
        // Login challenge
        {
            type: AlertType.LOGIN_CHALLENGE,
            severity: AlertSeverity.ERROR,
            condition: (m) => m.loginChallenges > 0,
            messageTemplate: () => `Login challenge detected. Manual verification may be required.`,
            cooldownHours: 24
        },
        // Account suspended
        {
            type: AlertType.ACCOUNT_SUSPENDED,
            severity: AlertSeverity.CRITICAL,
            condition: (m) => m.accountState === 'SUSPENDED',
            messageTemplate: () => `Account has been suspended. Stop all activity immediately.`,
            cooldownHours: 48
        },
        // Account banned
        {
            type: AlertType.ACCOUNT_BANNED,
            severity: AlertSeverity.CRITICAL,
            condition: (m) => m.accountState === 'BANNED',
            messageTemplate: () => `Account has been banned. This account may be permanently disabled.`,
            cooldownHours: 48
        },
        // Inactive account
        {
            type: AlertType.INACTIVE_ACCOUNT,
            severity: AlertSeverity.INFO,
            condition: (m) => {
                if (!m.lastPostAt)
                    return false;
                const hoursSinceLastPost = (Date.now() - m.lastPostAt.getTime()) / (1000 * 60 * 60);
                return hoursSinceLastPost > 168; // 7 days
            },
            messageTemplate: (m) => {
                const daysSinceLastPost = m.lastPostAt
                    ? Math.floor((Date.now() - m.lastPostAt.getTime()) / (1000 * 60 * 60 * 24))
                    : 0;
                return `Account inactive for ${daysSinceLastPost} days. Consider resuming posting.`;
            },
            cooldownHours: 72
        },
        // Warmup stalled
        {
            type: AlertType.WARMUP_STALLED,
            severity: AlertSeverity.WARNING,
            condition: (m) => m.accountState === 'WARMING_UP' && m.warmupProgress < 30 && m.warmupTasksPending > 10,
            messageTemplate: (m) => `Warmup progress stalled at ${m.warmupProgress.toFixed(0)}%. ${m.warmupTasksPending} tasks pending.`,
            cooldownHours: 24
        }
    ];
    /**
     * Create a new alert
     */
    async createAlert(accountId, alertType, severity, message, metadata) {
        const client = await database_1.pool.connect();
        try {
            // Get account's user_id and username
            const accountQuery = await client.query('SELECT user_id, username FROM accounts WHERE id = $1', [accountId]);
            if (accountQuery.rows.length === 0) {
                throw new Error(`Account ${accountId} not found`);
            }
            const { user_id, username } = accountQuery.rows[0];
            // Check for recent similar alerts (cooldown)
            const recentAlertQuery = await client.query(`SELECT id FROM health_alerts
         WHERE account_id = $1
           AND alert_type = $2
           AND created_at > NOW() - INTERVAL '24 hours'
         LIMIT 1`, [accountId, alertType]);
            if (recentAlertQuery.rows.length > 0) {
                logger_1.logger.debug(`Alert ${alertType} for account ${accountId} skipped - cooldown active`);
                // Return existing alert instead of creating duplicate
                const existingQuery = await client.query('SELECT * FROM health_alerts WHERE id = $1', [recentAlertQuery.rows[0].id]);
                return this.mapRowToAlert(existingQuery.rows[0]);
            }
            // Create alert
            const insertQuery = await client.query(`INSERT INTO health_alerts
         (account_id, user_id, alert_type, severity, message, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`, [accountId, user_id, alertType, severity, message, metadata ? JSON.stringify(metadata) : null]);
            const alert = this.mapRowToAlert(insertQuery.rows[0]);
            alert.username = username;
            logger_1.logger.info(`Alert created: ${alertType} for account ${username} (${accountId})`);
            // Send notification (in a real app, this would send email/push notification)
            await this.sendNotification(user_id, alert);
            return alert;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get active alerts for a user
     */
    async getActiveAlerts(userId, unacknowledgedOnly = false) {
        const client = await database_1.pool.connect();
        try {
            let query = `
        SELECT ha.*, a.username
        FROM health_alerts ha
        JOIN accounts a ON ha.account_id = a.id
        WHERE ha.user_id = $1 AND ha.resolved = false
      `;
            if (unacknowledgedOnly) {
                query += ' AND ha.acknowledged = false';
            }
            query += ' ORDER BY ha.created_at DESC';
            const result = await client.query(query, [userId]);
            return result.rows.map(row => this.mapRowToAlert(row));
        }
        finally {
            client.release();
        }
    }
    /**
     * Get alerts for specific account
     */
    async getAccountAlerts(accountId, limit = 50) {
        const client = await database_1.pool.connect();
        try {
            const result = await client.query(`SELECT ha.*, a.username
         FROM health_alerts ha
         JOIN accounts a ON ha.account_id = a.id
         WHERE ha.account_id = $1
         ORDER BY ha.created_at DESC
         LIMIT $2`, [accountId, limit]);
            return result.rows.map(row => this.mapRowToAlert(row));
        }
        finally {
            client.release();
        }
    }
    /**
     * Acknowledge an alert
     */
    async acknowledgeAlert(alertId) {
        const client = await database_1.pool.connect();
        try {
            await client.query(`UPDATE health_alerts
         SET acknowledged = true, acknowledged_at = NOW()
         WHERE id = $1`, [alertId]);
            logger_1.logger.info(`Alert ${alertId} acknowledged`);
        }
        finally {
            client.release();
        }
    }
    /**
     * Resolve an alert
     */
    async resolveAlert(alertId, resolution) {
        const client = await database_1.pool.connect();
        try {
            const metadata = resolution ? JSON.stringify({ resolution }) : null;
            await client.query(`UPDATE health_alerts
         SET resolved = true,
             resolved_at = NOW(),
             metadata = COALESCE($2, metadata)
         WHERE id = $1`, [alertId, metadata]);
            logger_1.logger.info(`Alert ${alertId} resolved`);
        }
        finally {
            client.release();
        }
    }
    /**
     * Check alert rules against account metrics
     * Returns list of alerts that should be created
     */
    checkAlertRules(accountId, metrics) {
        const alertsToCreate = [];
        for (const rule of this.alertRules) {
            if (rule.condition(metrics)) {
                alertsToCreate.push({
                    type: rule.type,
                    severity: rule.severity,
                    message: rule.messageTemplate(metrics)
                });
            }
        }
        return alertsToCreate;
    }
    /**
     * Auto-create alerts based on metrics
     */
    async autoCreateAlerts(accountId, metrics) {
        const alertsToCreate = this.checkAlertRules(accountId, metrics);
        const createdAlerts = [];
        for (const alertData of alertsToCreate) {
            try {
                const alert = await this.createAlert(accountId, alertData.type, alertData.severity, alertData.message, { metrics });
                createdAlerts.push(alert);
            }
            catch (error) {
                logger_1.logger.error(`Failed to create alert ${alertData.type}:`, error);
            }
        }
        return createdAlerts;
    }
    /**
     * Send notification to user
     * In production, this would integrate with email/push notification services
     */
    async sendNotification(userId, alert) {
        // TODO: Integrate with notification service (email, SMS, push, etc.)
        logger_1.logger.info(`[NOTIFICATION] User ${userId}: ${alert.severity.toUpperCase()} - ${alert.message}`);
        // For now, just log the notification
        // In production, you would:
        // - Send email via SendGrid/AWS SES
        // - Send push notification via Firebase
        // - Send webhook to user's configured endpoint
        // - Store in-app notification
        // Example:
        // await emailService.send({
        //   to: user.email,
        //   subject: `Alert: ${alert.alertType}`,
        //   body: alert.message
        // });
    }
    /**
     * Get alert statistics for a user
     */
    async getAlertStats(userId) {
        const client = await database_1.pool.connect();
        try {
            const statsQuery = await client.query(`SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE acknowledged = false) as unacknowledged,
           COUNT(*) FILTER (WHERE resolved = false) as unresolved,
           severity,
           alert_type
         FROM health_alerts
         WHERE user_id = $1
         GROUP BY severity, alert_type`, [userId]);
            const bySeverity = {
                [AlertSeverity.INFO]: 0,
                [AlertSeverity.WARNING]: 0,
                [AlertSeverity.ERROR]: 0,
                [AlertSeverity.CRITICAL]: 0
            };
            const byType = {};
            let total = 0;
            let unacknowledged = 0;
            let unresolved = 0;
            for (const row of statsQuery.rows) {
                const count = parseInt(row.total);
                total += count;
                unacknowledged += parseInt(row.unacknowledged);
                unresolved += parseInt(row.unresolved);
                bySeverity[row.severity] = (bySeverity[row.severity] || 0) + count;
                byType[row.alert_type] = (byType[row.alert_type] || 0) + count;
            }
            return {
                total,
                unacknowledged,
                unresolved,
                bySeverity: bySeverity,
                byType: byType
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Map database row to Alert interface
     */
    mapRowToAlert(row) {
        return {
            id: row.id,
            accountId: row.account_id,
            userId: row.user_id,
            alertType: row.alert_type,
            severity: row.severity,
            message: row.message,
            metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined,
            acknowledged: row.acknowledged,
            resolved: row.resolved,
            createdAt: new Date(row.created_at),
            acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
            resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
            username: row.username
        };
    }
}
exports.AlertManager = AlertManager;
exports.default = new AlertManager();
