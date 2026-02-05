"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.variationEngine = exports.VariationEngine = void 0;
const logger_1 = require("../../config/logger");
const database_1 = require("../../config/database");
const VideoVariator_1 = require("./VideoVariator");
const CaptionVariator_1 = require("./CaptionVariator");
const HashtagGenerator_1 = require("./HashtagGenerator");
const variations_1 = require("../../config/variations");
class VariationEngine {
    settings;
    constructor(settings) {
        this.settings = { ...variations_1.DEFAULT_VARIATION_SETTINGS, ...settings };
    }
    async createContentVariation(content, accountId) {
        logger_1.logger.info('Variation engine: creating for ' + accountId);
        let mediaPath = content.mediaPath;
        if (content.mediaType === 'video') {
            try {
                mediaPath = await VideoVariator_1.videoVariator.createVariation(content.mediaPath, accountId);
            }
            catch (err) {
                logger_1.logger.warn('Video variation failed for ' + accountId + ', using original');
            }
        }
        const caption = content.caption ? CaptionVariator_1.captionVariator.createVariation(content.caption, accountId) : '';
        const hashtags = HashtagGenerator_1.hashtagGenerator.createHashtagVariation(content.hashtags, content.niche, accountId);
        const variation = { accountId, mediaPath, caption, hashtags };
        await this.storeVariation(accountId, variation, content);
        return variation;
    }
    async createVariationsForSwarm(content, accountIds) {
        logger_1.logger.info('Swarm variations for ' + accountIds.length + ' accounts');
        const variations = [];
        for (const id of accountIds) {
            try {
                variations.push(await this.createContentVariation(content, id));
            }
            catch (err) {
                logger_1.logger.error('Variation failed for ' + id);
            }
        }
        return variations;
    }
    async getVariations(accountId, limit = 10) {
        try {
            const r = await database_1.pool.query('SELECT * FROM content_variations WHERE account_id = $1 ORDER BY created_at DESC LIMIT $2', [accountId, limit]);
            return r.rows;
        }
        catch (_) {
            return [];
        }
    }
    async storeVariation(accountId, v, orig) {
        try {
            await database_1.pool.query(`INSERT INTO content_variations (account_id, original_media_path, variation_media_path, original_caption, variation_caption, hashtags, media_type, variation_settings, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`, [accountId, orig.mediaPath, v.mediaPath, orig.caption || null, v.caption, JSON.stringify(v.hashtags), orig.mediaType, JSON.stringify(this.settings)]);
        }
        catch (_) {
            logger_1.logger.warn('Variation persist failed (non-critical)');
        }
    }
}
exports.VariationEngine = VariationEngine;
exports.variationEngine = new VariationEngine();
