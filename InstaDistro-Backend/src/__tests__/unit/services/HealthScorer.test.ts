import HealthScorer from '../../../services/health/HealthScorer';
import { AccountMetrics } from '../../../services/health/MetricsCollector';

describe('HealthScorer', () => {
  const scorer = new HealthScorer();

  describe('calculateHealthScore', () => {
    it('should return 100 for perfect metrics', () => {
      const metrics: AccountMetrics = {
        postSuccessRate: 100,
        errorRate24h: 0,
        rateLimitHits7d: 0,
        loginChallenges7d: 0,
        accountStatus: 'active',
        accountState: 'ACTIVE',
        daysSinceCreation: 100,
      };

      const score = scorer.calculateHealthScore(metrics);
      expect(score).toBe(100);
    });

    it('should penalize low post success rate', () => {
      const metrics: AccountMetrics = {
        postSuccessRate: 50, // 50% success
        errorRate24h: 0,
        rateLimitHits7d: 0,
        loginChallenges7d: 0,
        accountStatus: 'active',
        accountState: 'ACTIVE',
        daysSinceCreation: 100,
      };

      const score = scorer.calculateHealthScore(metrics);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(70); // Should still be decent
    });

    it('should penalize high error rate', () => {
      const metrics: AccountMetrics = {
        postSuccessRate: 100,
        errorRate24h: 50, // 50% errors
        rateLimitHits7d: 0,
        loginChallenges7d: 0,
        accountStatus: 'active',
        accountState: 'ACTIVE',
        daysSinceCreation: 100,
      };

      const score = scorer.calculateHealthScore(metrics);
      expect(score).toBeLessThan(50); // Heavy penalty for errors
    });

    it('should penalize frequent rate limits', () => {
      const metrics: AccountMetrics = {
        postSuccessRate: 100,
        errorRate24h: 0,
        rateLimitHits7d: 10, // Many rate limits
        loginChallenges7d: 0,
        accountStatus: 'active',
        accountState: 'ACTIVE',
        daysSinceCreation: 100,
      };

      const score = scorer.calculateHealthScore(metrics);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(50);
    });

    it('should penalize login challenges', () => {
      const metrics: AccountMetrics = {
        postSuccessRate: 100,
        errorRate24h: 0,
        rateLimitHits7d: 0,
        loginChallenges7d: 5, // Multiple challenges
        accountStatus: 'active',
        accountState: 'ACTIVE',
        daysSinceCreation: 100,
      };

      const score = scorer.calculateHealthScore(metrics);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(60);
    });

    it('should heavily penalize suspended accounts', () => {
      const metrics: AccountMetrics = {
        postSuccessRate: 100,
        errorRate24h: 0,
        rateLimitHits7d: 0,
        loginChallenges7d: 0,
        accountStatus: 'active',
        accountState: 'SUSPENDED',
        daysSinceCreation: 100,
      };

      const score = scorer.calculateHealthScore(metrics);
      expect(score).toBeLessThan(30);
    });

    it('should score zero for banned accounts', () => {
      const metrics: AccountMetrics = {
        postSuccessRate: 100,
        errorRate24h: 0,
        rateLimitHits7d: 0,
        loginChallenges7d: 0,
        accountStatus: 'active',
        accountState: 'BANNED',
        daysSinceCreation: 100,
      };

      const score = scorer.calculateHealthScore(metrics);
      expect(score).toBe(0);
    });

    it('should handle multiple issues (compound penalty)', () => {
      const metrics: AccountMetrics = {
        postSuccessRate: 60,
        errorRate24h: 30,
        rateLimitHits7d: 5,
        loginChallenges7d: 2,
        accountStatus: 'active',
        accountState: 'ACTIVE',
        daysSinceCreation: 100,
      };

      const score = scorer.calculateHealthScore(metrics);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(50); // Should be low due to multiple issues
    });

    it('should never return negative scores', () => {
      const metrics: AccountMetrics = {
        postSuccessRate: 0,
        errorRate24h: 100,
        rateLimitHits7d: 50,
        loginChallenges7d: 50,
        accountStatus: 'active',
        accountState: 'SUSPENDED',
        daysSinceCreation: 1,
      };

      const score = scorer.calculateHealthScore(metrics);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should cap scores at 100', () => {
      const metrics: AccountMetrics = {
        postSuccessRate: 100,
        errorRate24h: 0,
        rateLimitHits7d: 0,
        loginChallenges7d: 0,
        accountStatus: 'active',
        accountState: 'ACTIVE',
        daysSinceCreation: 1000, // Very old account
      };

      const score = scorer.calculateHealthScore(metrics);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('getCategoryFromScore', () => {
    it('should categorize 90-100 as excellent', () => {
      expect(scorer.getCategoryFromScore(100)).toBe('excellent');
      expect(scorer.getCategoryFromScore(95)).toBe('excellent');
      expect(scorer.getCategoryFromScore(90)).toBe('excellent');
    });

    it('should categorize 75-89 as good', () => {
      expect(scorer.getCategoryFromScore(89)).toBe('good');
      expect(scorer.getCategoryFromScore(80)).toBe('good');
      expect(scorer.getCategoryFromScore(75)).toBe('good');
    });

    it('should categorize 50-74 as fair', () => {
      expect(scorer.getCategoryFromScore(74)).toBe('fair');
      expect(scorer.getCategoryFromScore(60)).toBe('fair');
      expect(scorer.getCategoryFromScore(50)).toBe('fair');
    });

    it('should categorize 25-49 as poor', () => {
      expect(scorer.getCategoryFromScore(49)).toBe('poor');
      expect(scorer.getCategoryFromScore(35)).toBe('poor');
      expect(scorer.getCategoryFromScore(25)).toBe('poor');
    });

    it('should categorize 0-24 as critical', () => {
      expect(scorer.getCategoryFromScore(24)).toBe('critical');
      expect(scorer.getCategoryFromScore(10)).toBe('critical');
      expect(scorer.getCategoryFromScore(0)).toBe('critical');
    });

    it('should handle edge cases', () => {
      expect(scorer.getCategoryFromScore(-1)).toBe('critical');
      expect(scorer.getCategoryFromScore(101)).toBe('excellent');
    });
  });
});
