import healthScorer from '../../../services/health/HealthScorer';
import { AccountMetrics } from '../../../services/health/MetricsCollector';

describe('HealthScorer', () => {
  const scorer = healthScorer;

  // Helper to create full metrics object
  const createMetrics = (overrides: Partial<AccountMetrics> = {}): AccountMetrics => ({
    accountId: 'test-account-id',
    totalPosts: 100,
    successfulPosts: 100,
    failedPosts: 0,
    postSuccessRate: 100,
    avgResponseTime: 300,
    totalResponseTime: 30000,
    errorCount24h: 0,
    errorCount7d: 0,
    errorRate24h: 0,
    errorRate7d: 0,
    rateLimitHits: 0,
    rateLimitHits24h: 0,
    rateLimitHits7d: 0,
    loginChallenges: 0,
    accountState: 'ACTIVE',
    lastError: null,
    lastPostAt: new Date(),
    warmupTasksCompleted: 100,
    warmupTasksPending: 0,
    warmupProgress: 100,
    calculatedAt: new Date(),
    ...overrides,
  });

  describe('calculateHealthScore', () => {
    it('should return high score for perfect metrics', () => {
      const metrics = createMetrics();
      const score = scorer.calculateHealthScore(metrics);
      expect(score).toBeGreaterThanOrEqual(80);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should penalize low post success rate', () => {
      const metrics = createMetrics({ postSuccessRate: 50 });
      const score = scorer.calculateHealthScore(metrics);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(50);
    });

    it('should penalize high error rate', () => {
      const metrics = createMetrics({ errorRate24h: 50 });
      const score = scorer.calculateHealthScore(metrics);
      expect(score).toBeLessThan(100);
    });

    it('should penalize frequent rate limits', () => {
      const metrics = createMetrics({ rateLimitHits24h: 5 });
      const score = scorer.calculateHealthScore(metrics);
      expect(score).toBeLessThan(100);
    });

    it('should penalize login challenges', () => {
      const metrics = createMetrics({ loginChallenges: 3 });
      const score = scorer.calculateHealthScore(metrics);
      expect(score).toBeLessThan(100);
    });

    it('should penalize suspended accounts', () => {
      const metrics = createMetrics({ accountState: 'SUSPENDED' });
      const score = scorer.calculateHealthScore(metrics);
      expect(score).toBeLessThan(100);
      // SUSPENDED accounts get a penalty, but still get bonuses for good metrics
    });

    it('should score very low for banned accounts', () => {
      const metrics = createMetrics({ accountState: 'BANNED' });
      const score = scorer.calculateHealthScore(metrics);
      // BANNED gets -100 penalty, but bonuses can add up to +15
      expect(score).toBeLessThanOrEqual(20);
    });

    it('should handle multiple issues (compound penalty)', () => {
      const metrics = createMetrics({
        postSuccessRate: 60,
        errorRate24h: 30,
        rateLimitHits24h: 5,
        loginChallenges: 2,
      });
      const score = scorer.calculateHealthScore(metrics);
      // Multiple issues result in severe penalty, may reach 0
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThan(100);
    });

    it('should never return negative scores', () => {
      const metrics = createMetrics({
        postSuccessRate: 0,
        errorRate24h: 100,
        rateLimitHits24h: 50,
        loginChallenges: 50,
        accountState: 'SUSPENDED',
      });
      const score = scorer.calculateHealthScore(metrics);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should cap scores at 100', () => {
      const metrics = createMetrics();
      const score = scorer.calculateHealthScore(metrics);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('categorizeHealth', () => {
    it('should categorize 90-100 as excellent', () => {
      expect(scorer.categorizeHealth(100)).toBe('excellent');
      expect(scorer.categorizeHealth(95)).toBe('excellent');
      expect(scorer.categorizeHealth(90)).toBe('excellent');
    });

    it('should categorize 75-89 as good', () => {
      expect(scorer.categorizeHealth(89)).toBe('good');
      expect(scorer.categorizeHealth(80)).toBe('good');
      expect(scorer.categorizeHealth(75)).toBe('good');
    });

    it('should categorize 50-74 as fair', () => {
      expect(scorer.categorizeHealth(74)).toBe('fair');
      expect(scorer.categorizeHealth(60)).toBe('fair');
      expect(scorer.categorizeHealth(50)).toBe('fair');
    });

    it('should categorize 25-49 as poor', () => {
      expect(scorer.categorizeHealth(49)).toBe('poor');
      expect(scorer.categorizeHealth(35)).toBe('poor');
      expect(scorer.categorizeHealth(25)).toBe('poor');
    });

    it('should categorize 0-24 as critical', () => {
      expect(scorer.categorizeHealth(24)).toBe('critical');
      expect(scorer.categorizeHealth(10)).toBe('critical');
      expect(scorer.categorizeHealth(0)).toBe('critical');
    });

    it('should handle edge cases', () => {
      expect(scorer.categorizeHealth(-1)).toBe('critical');
      expect(scorer.categorizeHealth(101)).toBe('excellent');
    });
  });
});
