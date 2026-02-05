"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.distributionEngine = exports.DistributionEngine = void 0;
const logger_1 = require("../../config/logger");
const database_1 = require("../../config/database");
const AccountSelector_1 = require("./AccountSelector");
const SchedulingAlgorithm_1 = require("./SchedulingAlgorithm");
const RiskManager_1 = require("./RiskManager");
const VariationEngine_1 = require("../variation/VariationEngine");
const PostJob_1 = require("../../jobs/PostJob");
class DistributionEngine {
    async distribute(request) {
        const distributionId = 'dist_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
        logger_1.logger.info('Distribution started: ' + distributionId);
        const risk = await RiskManager_1.riskManager.validateDistribution(request.accountCount, new Date());
        if (risk.blocked) {
            logger_1.logger.warn('Blocked by risk manager', risk);
            return { distributionId, totalAccounts: 0, queued: 0, failed: 0, riskAssessment: risk, schedule: [] };
        }
        let accounts = await AccountSelector_1.accountSelector.selectAccounts({ userId: request.userId, count: request.accountCount, excludeIds: request.excludeAccountIds });
        accounts = AccountSelector_1.accountSelector.filterUnavailable(accounts);
        accounts = AccountSelector_1.accountSelector.rotateLeadAccounts(accounts);
        if (accounts.length === 0)
            return { distributionId, totalAccounts: 0, queued: 0, failed: 0, riskAssessment: risk, schedule: [] };
        const accountIds = accounts.map((a) => a.id);
        const content = { ...request.content, niche: request.niche };
        const variations = await VariationEngine_1.variationEngine.createVariationsForSwarm(content, accountIds);
        const schedule = SchedulingAlgorithm_1.schedulingAlgorithm.calculateDistributionSchedule(accountIds);
        const humanSchedule = SchedulingAlgorithm_1.schedulingAlgorithm.addHumanVariation(schedule);
        let queued = 0, failed = 0;
        for (const entry of humanSchedule) {
            const variation = variations.find((v) => v.accountId === entry.accountId);
            if (!variation) {
                failed++;
                continue;
            }
            try {
                await (0, PostJob_1.queuePost)({
                    userId: request.userId, accountId: entry.accountId,
                    mediaPath: variation.mediaPath, mediaType: request.content.mediaType,
                    caption: variation.caption, hashtags: variation.hashtags,
                    scheduledFor: entry.scheduledAt.toISOString(), priority: entry.priority, distributionId,
                });
                queued++;
            }
            catch (err) {
                logger_1.logger.error('Queue failed for ' + entry.accountId);
                failed++;
            }
        }
        logger_1.logger.info('Distribution complete: ' + distributionId, { queued, failed });
        return { distributionId, totalAccounts: accounts.length, queued, failed, riskAssessment: risk, schedule: humanSchedule };
    }
    async getStatus(distributionId) {
        try {
            const r = await database_1.pool.query('SELECT * FROM scheduled_posts WHERE distribution_id = $1 ORDER BY created_at DESC', [distributionId]);
            const statuses = r.rows.reduce((acc, row) => { acc[row.status] = (acc[row.status] || 0) + 1; return acc; }, {});
            return { distributionId, total: r.rows.length, statuses, posts: r.rows };
        }
        catch (_) {
            return null;
        }
    }
    async cancel(distributionId) {
        await RiskManager_1.riskManager.emergencyHalt(distributionId, 'Manual cancellation');
    }
}
exports.DistributionEngine = DistributionEngine;
exports.distributionEngine = new DistributionEngine();
