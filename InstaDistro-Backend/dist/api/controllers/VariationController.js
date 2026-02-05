"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.variationController = exports.VariationController = void 0;
const VariationEngine_1 = require("../../services/variation/VariationEngine");
const logger_1 = require("../../config/logger");
const variations_1 = require("../../config/variations");
class VariationController {
    async createVariation(req, res) {
        try {
            const { accountId, mediaPath, mediaType, caption, hashtags, niche } = req.body;
            if (!accountId || !mediaPath || !mediaType)
                return res.status(400).json({ error: 'Validation Error', message: 'accountId, mediaPath, mediaType required' });
            if (!['photo', 'video'].includes(mediaType))
                return res.status(400).json({ error: 'Validation Error', message: 'mediaType must be photo or video' });
            const content = { mediaPath, mediaType, caption, hashtags, niche };
            const variation = await VariationEngine_1.variationEngine.createContentVariation(content, accountId);
            res.json({ success: true, variation });
        }
        catch (error) {
            logger_1.logger.error('Variation error:', error);
            res.status(500).json({ error: 'Server Error', message: error.message });
        }
    }
    async createBatch(req, res) {
        try {
            const { accountIds, mediaPath, mediaType, caption, hashtags, niche } = req.body;
            if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0)
                return res.status(400).json({ error: 'Validation Error', message: 'accountIds array required' });
            if (!mediaPath || !mediaType)
                return res.status(400).json({ error: 'Validation Error', message: 'mediaPath and mediaType required' });
            const content = { mediaPath, mediaType, caption, hashtags, niche };
            const variations = await VariationEngine_1.variationEngine.createVariationsForSwarm(content, accountIds);
            res.json({ success: true, total: accountIds.length, created: variations.length, variations });
        }
        catch (error) {
            logger_1.logger.error('Batch error:', error);
            res.status(500).json({ error: 'Server Error', message: error.message });
        }
    }
    async getVariations(req, res) {
        try {
            const { accountId } = req.params;
            const limit = parseInt(req.query.limit, 10) || 10;
            const variations = await VariationEngine_1.variationEngine.getVariations(accountId, limit);
            res.json({ accountId, variations, total: variations.length });
        }
        catch (error) {
            logger_1.logger.error('Get variations error:', error);
            res.status(500).json({ error: 'Server Error', message: error.message });
        }
    }
    async getSettings(_req, res) {
        res.json({ settings: variations_1.DEFAULT_VARIATION_SETTINGS });
    }
}
exports.VariationController = VariationController;
exports.variationController = new VariationController();
