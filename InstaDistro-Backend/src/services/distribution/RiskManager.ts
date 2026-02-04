import { logger } from '../../config/logger';
import { pool } from '../../config/database';

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  warnings: string[];
  blocked: boolean;
}
export class RiskManager {
  private readonly MIN_GAP_MS = 300000;
  async validateDistribution(accountCount: number, startTime: Date): Promise<RiskAssessment> {
    const warnings: string[] = [];
    let riskScore = 0;
    if (accountCount > 100) { warnings.push('Distributing to >100 accounts is high risk'); riskScore += 30; }
    else if (accountCount > 50) riskScore += 15;
    try {
      const flagged = await pool.query(`SELECT COUNT(*) as cnt FROM accounts WHERE account_status IN ('suspended','error','paused') AND updated_at > NOW() - INTERVAL '24 hours'`);
      const cnt = parseInt(flagged.rows[0].cnt, 10);
      if (cnt > 3) { warnings.push(cnt + ' accounts flagged in last 24h'); riskScore += 25; }
    } catch (_) { /* non-critical */ }
    const hour = startTime.getHours();
    if (hour >= 2 && hour <= 5) { warnings.push('Off-peak (2-5 AM) increases detection risk'); riskScore += 10; }
    const riskLevel = riskScore >= 60 ? 'critical' : riskScore >= 40 ? 'high' : riskScore >= 20 ? 'medium' : 'low';
    return { riskLevel, riskScore, warnings, blocked: riskScore >= 80 };
  }
  calculateRiskScore(accountCount: number, timingGaps: number[]): number {
    let score = 0;
    for (const gap of timingGaps) {
      if (gap < this.MIN_GAP_MS) score += 20;
      else if (gap < this.MIN_GAP_MS * 2) score += 5;
    }
    if (accountCount > 50) score += 10;
    return Math.min(score, 100);
  }
  async emergencyHalt(distributionId: string, reason: string): Promise<void> {
    logger.warn('EMERGENCY HALT: ' + distributionId + ' — ' + reason);
    try {
      await pool.query(`UPDATE scheduled_posts SET status = 'cancelled', updated_at = NOW() WHERE distribution_id = $1 AND status IN ('pending','queued')`, [distributionId]);
    } catch (err) { logger.error('Halt DB failed:', { error: err }); }
  }
}
export const riskManager = new RiskManager();
