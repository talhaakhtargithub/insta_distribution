"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskManager = exports.RiskManager = void 0;
const logger_1 = require("../../config/logger");
const database_1 = require("../../config/database");
class RiskManager {
    MIN_GAP_MS = 300000;
    async validateDistribution(accountCount, startTime) {
        const warnings = [];
        let riskScore = 0;
        if (accountCount > 100) {
            warnings.push('Distributing to >100 accounts is high risk');
            riskScore += 30;
        }
        else if (accountCount > 50)
            riskScore += 15;
        try {
            const flagged = await database_1.pool.query(`SELECT COUNT(*) as cnt FROM accounts WHERE account_status IN ('suspended','error','paused') AND updated_at > NOW() - INTERVAL '24 hours'`);
            const cnt = parseInt(flagged.rows[0].cnt, 10);
            if (cnt > 3) {
                warnings.push(cnt + ' accounts flagged in last 24h');
                riskScore += 25;
            }
        }
        catch (_) { /* non-critical */ }
        const hour = startTime.getHours();
        if (hour >= 2 && hour <= 5) {
            warnings.push('Off-peak (2-5 AM) increases detection risk');
            riskScore += 10;
        }
        const riskLevel = riskScore >= 60 ? 'critical' : riskScore >= 40 ? 'high' : riskScore >= 20 ? 'medium' : 'low';
        return { riskLevel, riskScore, warnings, blocked: riskScore >= 80 };
    }
    calculateRiskScore(accountCount, timingGaps) {
        let score = 0;
        for (const gap of timingGaps) {
            if (gap < this.MIN_GAP_MS)
                score += 20;
            else if (gap < this.MIN_GAP_MS * 2)
                score += 5;
        }
        if (accountCount > 50)
            score += 10;
        return Math.min(score, 100);
    }
    async emergencyHalt(distributionId, reason) {
        logger_1.logger.warn('EMERGENCY HALT: ' + distributionId + ' — ' + reason);
        try {
            await database_1.pool.query(`UPDATE scheduled_posts SET status = 'cancelled', updated_at = NOW() WHERE distribution_id = $1 AND status IN ('pending','queued')`, [distributionId]);
        }
        catch (err) {
            logger_1.logger.error('Halt DB failed:', { error: err });
        }
    }
}
exports.RiskManager = RiskManager;
exports.riskManager = new RiskManager();
