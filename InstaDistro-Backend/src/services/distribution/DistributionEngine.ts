import { logger } from '../../config/logger';
import { pool } from '../../config/database';
import { accountSelector } from './AccountSelector';
import { schedulingAlgorithm } from './SchedulingAlgorithm';
import { riskManager } from './RiskManager';
import { variationEngine, ContentInput } from '../variation/VariationEngine';
import { queuePost } from '../../jobs/PostJob';

export interface DistributionRequest {
  userId: string;
  content: ContentInput;
  accountCount: number;
  spreadHours?: number;
  niche?: string;
  excludeAccountIds?: string[];
}
export interface DistributionResult {
  distributionId: string;
  totalAccounts: number;
  queued: number;
  failed: number;
  riskAssessment: any;
  schedule: any[];
}
export class DistributionEngine {
  async distribute(request: DistributionRequest): Promise<DistributionResult> {
    const distributionId = 'dist_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    logger.info('Distribution started: ' + distributionId);

    const risk = await riskManager.validateDistribution(request.accountCount, new Date());
    if (risk.blocked) {
      logger.warn('Blocked by risk manager', risk);
      return { distributionId, totalAccounts: 0, queued: 0, failed: 0, riskAssessment: risk, schedule: [] };
    }

    let accounts = await accountSelector.selectAccounts({ userId: request.userId, count: request.accountCount, excludeIds: request.excludeAccountIds });
    accounts = accountSelector.filterUnavailable(accounts);
    accounts = accountSelector.rotateLeadAccounts(accounts);
    if (accounts.length === 0) return { distributionId, totalAccounts: 0, queued: 0, failed: 0, riskAssessment: risk, schedule: [] };

    const accountIds = accounts.map((a: any) => a.id);
    const content: ContentInput = { ...request.content, niche: request.niche };
    const variations = await variationEngine.createVariationsForSwarm(content, accountIds);

    const schedule = schedulingAlgorithm.calculateDistributionSchedule(accountIds);
    const humanSchedule = schedulingAlgorithm.addHumanVariation(schedule);

    let queued = 0, failed = 0;
    for (const entry of humanSchedule) {
      const variation = variations.find((v) => v.accountId === entry.accountId);
      if (!variation) { failed++; continue; }
      try {
        await queuePost({
          userId: request.userId, accountId: entry.accountId,
          mediaPath: variation.mediaPath, mediaType: request.content.mediaType,
          caption: variation.caption, hashtags: variation.hashtags,
          scheduledFor: entry.scheduledAt.toISOString(), priority: entry.priority, distributionId,
        });
        queued++;
      } catch (err) { logger.error('Queue failed for ' + entry.accountId); failed++; }
    }

    logger.info('Distribution complete: ' + distributionId, { queued, failed });
    return { distributionId, totalAccounts: accounts.length, queued, failed, riskAssessment: risk, schedule: humanSchedule };
  }

  async getStatus(distributionId: string): Promise<any> {
    try {
      const r = await pool.query('SELECT * FROM scheduled_posts WHERE distribution_id = $1 ORDER BY created_at DESC', [distributionId]);
      const statuses = r.rows.reduce((acc: any, row: any) => { acc[row.status] = (acc[row.status] || 0) + 1; return acc; }, {});
      return { distributionId, total: r.rows.length, statuses, posts: r.rows };
    } catch (_) { return null; }
  }

  async cancel(distributionId: string): Promise<void> {
    await riskManager.emergencyHalt(distributionId, 'Manual cancellation');
  }
}
export const distributionEngine = new DistributionEngine();
