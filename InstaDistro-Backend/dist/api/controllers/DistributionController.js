"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.distributionController = exports.DistributionController = void 0;
const DistributionEngine_1 = require("../../services/distribution/DistributionEngine");
const logger_1 = require("../../config/logger");
class DistributionController {
    async startDistribution(req, res) {
        try {
            const userId = req.headers['x-user-id'] || 'user_1';
            const { mediaPath, mediaType, caption, hashtags, accountCount, spreadHours, niche, excludeAccountIds } = req.body;
            if (!mediaPath || !mediaType || !accountCount)
                return res.status(400).json({ error: 'Validation Error', message: 'mediaPath, mediaType, accountCount required' });
            if (accountCount < 1 || accountCount > 200)
                return res.status(400).json({ error: 'Validation Error', message: 'accountCount 1-200' });
            const result = await DistributionEngine_1.distributionEngine.distribute({
                userId, content: { mediaPath, mediaType, caption, hashtags }, accountCount, spreadHours, niche, excludeAccountIds,
            });
            if (result.queued === 0)
                return res.status(400).json({ error: 'Failed', message: 'No posts queued', riskAssessment: result.riskAssessment });
            res.status(202).json({ success: true, distributionId: result.distributionId, queued: result.queued, failed: result.failed, totalAccounts: result.totalAccounts, riskAssessment: result.riskAssessment });
        }
        catch (error) {
            logger_1.logger.error('Start distribution:', error);
            res.status(500).json({ error: 'Server Error', message: error.message });
        }
    }
    async getDistributionStatus(req, res) {
        try {
            const status = await DistributionEngine_1.distributionEngine.getStatus(req.params.id);
            if (!status)
                return res.status(404).json({ error: 'Not Found' });
            res.json(status);
        }
        catch (error) {
            logger_1.logger.error('Get dist status:', error);
            res.status(500).json({ error: 'Server Error', message: error.message });
        }
    }
    async cancelDistribution(req, res) {
        try {
            await DistributionEngine_1.distributionEngine.cancel(req.params.id);
            res.json({ success: true, message: 'Cancelled: ' + req.params.id });
        }
        catch (error) {
            logger_1.logger.error('Cancel dist:', error);
            res.status(500).json({ error: 'Server Error', message: error.message });
        }
    }
}
exports.DistributionController = DistributionController;
exports.distributionController = new DistributionController();
