import { Request, Response } from 'express';
import { variationEngine, ContentInput } from '../../services/variation/VariationEngine';
import { logger } from '../../config/logger';
import { DEFAULT_VARIATION_SETTINGS } from '../../config/variations';

export class VariationController {
  async createVariation(req: Request, res: Response) {
    try {
      const { accountId, mediaPath, mediaType, caption, hashtags, niche } = req.body;
      if (!accountId || !mediaPath || !mediaType) return res.status(400).json({ error: 'Validation Error', message: 'accountId, mediaPath, mediaType required' });
      if (!['photo','video'].includes(mediaType)) return res.status(400).json({ error: 'Validation Error', message: 'mediaType must be photo or video' });
      const content: ContentInput = { mediaPath, mediaType, caption, hashtags, niche };
      const variation = await variationEngine.createContentVariation(content, accountId);
      res.json({ success: true, variation });
    } catch (error: any) { logger.error('Variation error:', error); res.status(500).json({ error: 'Server Error', message: error.message }); }
  }
  async createBatch(req: Request, res: Response) {
    try {
      const { accountIds, mediaPath, mediaType, caption, hashtags, niche } = req.body;
      if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) return res.status(400).json({ error: 'Validation Error', message: 'accountIds array required' });
      if (!mediaPath || !mediaType) return res.status(400).json({ error: 'Validation Error', message: 'mediaPath and mediaType required' });
      const content: ContentInput = { mediaPath, mediaType, caption, hashtags, niche };
      const variations = await variationEngine.createVariationsForSwarm(content, accountIds);
      res.json({ success: true, total: accountIds.length, created: variations.length, variations });
    } catch (error: any) { logger.error('Batch error:', error); res.status(500).json({ error: 'Server Error', message: error.message }); }
  }
  async getVariations(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const variations = await variationEngine.getVariations(accountId, limit);
      res.json({ accountId, variations, total: variations.length });
    } catch (error: any) { logger.error('Get variations error:', error); res.status(500).json({ error: 'Server Error', message: error.message }); }
  }
  async getSettings(_req: Request, res: Response) {
    res.json({ settings: DEFAULT_VARIATION_SETTINGS });
  }
}
export const variationController = new VariationController();
