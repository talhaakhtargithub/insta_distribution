import { AccountMetrics } from './MetricsCollector';

// ============================================
// TYPES
// ============================================

export type HealthCategory = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export interface HealthTrend {
  direction: 'improving' | 'stable' | 'declining';
  changePercent: number;
  periodDays: number;
}

export interface HealthScoreBreakdown {
  overall: number;
  engagement: number;
  reliability: number;
  risk: number;
  category: HealthCategory;
  breakdown: {
    postSuccessScore: number;
    responseTimeScore: number;
    errorScore: number;
    rateLimitScore: number;
    accountStateScore: number;
    warmupScore: number;
  };
}

// ============================================
// HEALTH SCORER SERVICE
// ============================================

export class HealthScorer {

  /**
   * Calculate overall health score (0-100)
   * Based on multiple factors with weighted importance
   */
  calculateHealthScore(metrics: AccountMetrics): number {
    let score = 100;

    // 1. Post success rate (weight: 30%)
    const postSuccessPenalty = (100 - metrics.postSuccessRate) * 0.3;
    score -= postSuccessPenalty;

    // 2. Error rate in last 24h (weight: 25%)
    const errorRatePenalty = metrics.errorRate24h * 2.5; // 10% error rate = -25 points
    score -= errorRatePenalty;

    // 3. Rate limit hits (weight: 20%)
    const rateLimitPenalty = metrics.rateLimitHits24h * 10; // Each rate limit = -10 points
    score -= rateLimitPenalty;

    // 4. Login challenges (weight: 15%)
    const loginChallengePenalty = metrics.loginChallenges * 15; // Each challenge = -15 points
    score -= loginChallengePenalty;

    // 5. Account state (weight: 10%)
    const accountStatePenalty = this.getAccountStatePenalty(metrics.accountState);
    score -= accountStatePenalty;

    // Bonuses for excellent performance
    // Bonus for >95% success rate
    if (metrics.postSuccessRate > 95) {
      score += (metrics.postSuccessRate - 95) * 2; // Up to +10 for 100% success
    }

    // Bonus for fast response times (<500ms avg)
    if (metrics.avgResponseTime > 0 && metrics.avgResponseTime < 500) {
      score += 5;
    }

    // Bonus for active warmup progress
    if (metrics.warmupProgress > 50 && metrics.warmupProgress < 100) {
      score += 5; // Actively warming up
    }

    // Ensure score is within 0-100 range
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate engagement score based on account activity
   */
  calculateEngagementScore(metrics: AccountMetrics): number {
    let score = 100;

    // Check posting frequency (using last post time)
    if (metrics.lastPostAt) {
      const hoursSinceLastPost = (Date.now() - metrics.lastPostAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastPost > 168) { // >1 week
        score -= 40;
      } else if (hoursSinceLastPost > 72) { // >3 days
        score -= 20;
      } else if (hoursSinceLastPost > 24) { // >1 day
        score -= 10;
      }
    } else {
      // Never posted
      score -= 50;
    }

    // Check total activity
    if (metrics.totalPosts < 5) {
      score -= 20; // Very low activity
    } else if (metrics.totalPosts < 20) {
      score -= 10; // Low activity
    }

    // Bonus for consistent posting
    if (metrics.totalPosts > 100) {
      score += 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate risk score (0-100, higher = more risk)
   */
  calculateRiskScore(metrics: AccountMetrics): number {
    let risk = 0;

    // High error rate = high risk
    risk += metrics.errorRate7d * 2; // 10% error rate = +20 risk

    // Rate limits = high risk
    risk += metrics.rateLimitHits7d * 5; // Each rate limit in 7d = +5 risk

    // Login challenges = very high risk
    risk += metrics.loginChallenges * 30; // Each challenge = +30 risk

    // Account state risk
    const stateRisk = this.getAccountStateRisk(metrics.accountState);
    risk += stateRisk;

    // Recent errors are more risky
    if (metrics.errorCount24h > 5) {
      risk += 20; // Many recent errors
    }

    // Low success rate = high risk
    if (metrics.postSuccessRate < 50) {
      risk += 30;
    } else if (metrics.postSuccessRate < 70) {
      risk += 15;
    }

    return Math.max(0, Math.min(100, Math.round(risk)));
  }

  /**
   * Categorize health based on score
   */
  categorizeHealth(score: number): HealthCategory {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 25) return 'poor';
    return 'critical';
  }

  /**
   * Compare current score to historical baseline
   */
  compareToBaseline(current: number, historical: number[]): HealthTrend {
    if (historical.length === 0) {
      return {
        direction: 'stable',
        changePercent: 0,
        periodDays: 0
      };
    }

    // Calculate average of historical scores
    const avgHistorical = historical.reduce((sum, score) => sum + score, 0) / historical.length;
    const changePercent = ((current - avgHistorical) / avgHistorical) * 100;

    let direction: 'improving' | 'stable' | 'declining';
    if (changePercent > 5) {
      direction = 'improving';
    } else if (changePercent < -5) {
      direction = 'declining';
    } else {
      direction = 'stable';
    }

    return {
      direction,
      changePercent: Math.round(changePercent * 10) / 10,
      periodDays: historical.length
    };
  }

  /**
   * Get detailed breakdown of health score
   */
  getHealthScoreBreakdown(metrics: AccountMetrics): HealthScoreBreakdown {
    // Calculate individual component scores
    const postSuccessScore = Math.round(metrics.postSuccessRate);

    const responseTimeScore = this.calculateResponseTimeScore(metrics.avgResponseTime);

    const errorScore = Math.max(0, 100 - (metrics.errorRate24h * 10));

    const rateLimitScore = Math.max(0, 100 - (metrics.rateLimitHits24h * 20));

    const accountStateScore = 100 - this.getAccountStatePenalty(metrics.accountState);

    const warmupScore = metrics.accountState === 'WARMING_UP'
      ? Math.round(metrics.warmupProgress)
      : 100;

    // Calculate weighted overall score
    const overall = this.calculateHealthScore(metrics);
    const engagement = this.calculateEngagementScore(metrics);
    const risk = this.calculateRiskScore(metrics);
    const category = this.categorizeHealth(overall);

    return {
      overall,
      engagement,
      reliability: postSuccessScore,
      risk,
      category,
      breakdown: {
        postSuccessScore,
        responseTimeScore,
        errorScore,
        rateLimitScore,
        accountStateScore,
        warmupScore
      }
    };
  }

  /**
   * Calculate score based on response time
   */
  private calculateResponseTimeScore(avgResponseTime: number): number {
    if (avgResponseTime === 0) return 100; // No data
    if (avgResponseTime < 300) return 100;   // Excellent
    if (avgResponseTime < 500) return 90;    // Very good
    if (avgResponseTime < 1000) return 80;   // Good
    if (avgResponseTime < 2000) return 60;   // Fair
    if (avgResponseTime < 5000) return 40;   // Slow
    return 20; // Very slow
  }

  /**
   * Get penalty points based on account state
   */
  private getAccountStatePenalty(state: string): number {
    const penalties: Record<string, number> = {
      'NEW_ACCOUNT': 0,
      'WARMING_UP': 0,
      'ACTIVE': 0,
      'RATE_LIMITED': 30,
      'PAUSED': 20,
      'SUSPENDED': 50,
      'RECOVERY': 40,
      'BANNED': 100
    };

    return penalties[state] || 0;
  }

  /**
   * Get risk points based on account state
   */
  private getAccountStateRisk(state: string): number {
    const risks: Record<string, number> = {
      'NEW_ACCOUNT': 5,      // Slight risk (unproven)
      'WARMING_UP': 10,      // Low risk (building trust)
      'ACTIVE': 0,           // No risk
      'RATE_LIMITED': 40,    // High risk
      'PAUSED': 15,          // Medium risk
      'SUSPENDED': 70,       // Very high risk
      'RECOVERY': 60,        // Very high risk
      'BANNED': 100          // Maximum risk
    };

    return risks[state] || 0;
  }

  /**
   * Generate recommendations based on metrics
   */
  generateRecommendations(metrics: AccountMetrics): string[] {
    const recommendations: string[] = [];

    // Success rate recommendations
    if (metrics.postSuccessRate < 70) {
      recommendations.push('Post success rate is low. Review error logs and reduce posting frequency.');
    }

    // Error rate recommendations
    if (metrics.errorRate24h > 20) {
      recommendations.push('High error rate in last 24h. Pause posting and investigate issues.');
    }

    // Rate limit recommendations
    if (metrics.rateLimitHits24h > 0) {
      recommendations.push('Rate limits detected. Reduce posting frequency and add delays between posts.');
    }

    // Login challenge recommendations
    if (metrics.loginChallenges > 0) {
      recommendations.push('Login challenges detected. Manually verify account and consider proxy rotation.');
    }

    // Account state recommendations
    if (metrics.accountState === 'SUSPENDED' || metrics.accountState === 'BANNED') {
      recommendations.push('Account is suspended/banned. Stop all activity and contact Instagram support.');
    } else if (metrics.accountState === 'RATE_LIMITED') {
      recommendations.push('Account is rate limited. Wait 24-48 hours before resuming activity.');
    } else if (metrics.accountState === 'RECOVERY') {
      recommendations.push('Account is in recovery. Use minimal activity and focus on engagement.');
    }

    // Warmup recommendations
    if (metrics.accountState === 'WARMING_UP' && metrics.warmupProgress < 50) {
      recommendations.push('Continue warmup process. Follow the gradual activity increase schedule.');
    }

    // Inactivity recommendations
    if (metrics.lastPostAt) {
      const hoursSinceLastPost = (Date.now() - metrics.lastPostAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastPost > 168) {
        recommendations.push('No posting activity in over a week. Resume posting to maintain account health.');
      }
    }

    // Performance recommendations
    if (metrics.avgResponseTime > 3000) {
      recommendations.push('Slow API response times. Check proxy performance and network connectivity.');
    }

    // No issues - positive feedback
    if (recommendations.length === 0 && metrics.postSuccessRate > 90) {
      recommendations.push('Account is performing well. Continue current posting strategy.');
    }

    return recommendations;
  }

  /**
   * Detect potential issues/flags
   */
  detectFlags(metrics: AccountMetrics): string[] {
    const flags: string[] = [];

    // Shadowban detection (sudden engagement drop - requires historical data)
    // This would need to compare with historical engagement metrics

    // Error flags
    if (metrics.errorRate24h > 50) {
      flags.push('CRITICAL_ERROR_RATE');
    } else if (metrics.errorRate24h > 20) {
      flags.push('HIGH_ERROR_RATE');
    }

    // Rate limit flags
    if (metrics.rateLimitHits24h > 3) {
      flags.push('FREQUENT_RATE_LIMITS');
    } else if (metrics.rateLimitHits24h > 0) {
      flags.push('RATE_LIMITED');
    }

    // Account state flags
    if (metrics.accountState === 'SUSPENDED' || metrics.accountState === 'BANNED') {
      flags.push('ACCOUNT_SUSPENDED');
    } else if (metrics.accountState === 'RATE_LIMITED') {
      flags.push('RATE_LIMITED');
    } else if (metrics.accountState === 'RECOVERY') {
      flags.push('IN_RECOVERY');
    }

    // Login challenge flag
    if (metrics.loginChallenges > 0) {
      flags.push('LOGIN_CHALLENGE');
    }

    // Low success rate flag
    if (metrics.postSuccessRate < 50) {
      flags.push('LOW_SUCCESS_RATE');
    }

    // Inactivity flag
    if (!metrics.lastPostAt || (Date.now() - metrics.lastPostAt.getTime()) > (7 * 24 * 60 * 60 * 1000)) {
      flags.push('INACTIVE');
    }

    return flags;
  }
}

export default new HealthScorer();
