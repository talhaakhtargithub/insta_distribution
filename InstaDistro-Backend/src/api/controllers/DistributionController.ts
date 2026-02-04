import { Request, Response } from 'express';
import { distributionEngine } from '../../services/distribution/DistributionEngine';
import { logger } from '../../config/logger';

export class DistributionController {
  async startDistribution(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string || 'user_1';
      const { mediaPath, mediaType, caption, hashtags, accountCount, spreadHours, niche, excludeAccountIds } = req.body;
      if (!mediaPath || !mediaType || !accountCount) return res.status(400).json({ error: 'Validation Error', message: 'mediaPath, mediaType, accountCount required' });
      if (accountCount < 1 || accountCount > 200) return res.status(400).json({ error: 'Validation Error', message: 'accountCount 1-200' });
      const result = await distributionEngine.distribute({
        userId, content: { mediaPath, mediaType, caption, hashtags }, accountCount, spreadHours, niche, excludeAccountIds,
      });
      if (result.queued === 0) return res.status(400).json({ error: 'Failed', message: 'No posts queued', riskAssessment: result.riskAssessment });
      res.status(202).json({ success: true, distributionId: result.distributionId, queued: result.queued, failed: result.failed, totalAccounts: result.totalAccounts, riskAssessment: result.riskAssessment });
    } catch (error: any) { logger.error('Start distribution:', error); res.status(500).json({ error: 'Server Error', message: error.message }); }
  }
  async getDistributionStatus(req: Request, res: Response) {
    try {
      const status = await distributionEngine.getStatus(req.params.id);
      if (!status) return res.status(404).json({ error: 'Not Found' });
      res.json(status);
    } catch (error: any) { logger.error('Get dist status:', error); res.status(500).json({ error: 'Server Error', message: error.message }); }
  }
  async cancelDistribution(req: Request, res: Response) {
    try {
      await distributionEngine.cancel(req.params.id);
      res.json({ success: true, message: 'Cancelled: ' + req.params.id });
    } catch (error: any) { logger.error('Cancel dist:', error); res.status(500).json({ error: 'Server Error', message: error.message }); }
  }
}
export const distributionController = new DistributionController();
