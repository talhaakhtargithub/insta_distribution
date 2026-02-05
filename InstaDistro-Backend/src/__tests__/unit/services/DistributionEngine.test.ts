import { DistributionEngine, DistributionRequest } from '../../../services/distribution/DistributionEngine';
import { accountSelector } from '../../../services/distribution/AccountSelector';
import { schedulingAlgorithm } from '../../../services/distribution/SchedulingAlgorithm';
import { riskManager } from '../../../services/distribution/RiskManager';
import { variationEngine } from '../../../services/variation/VariationEngine';
import { queuePost } from '../../../jobs/PostJob';
import { pool } from '../../../config/database';

// Mock dependencies
jest.mock('../../../services/distribution/AccountSelector');
jest.mock('../../../services/distribution/SchedulingAlgorithm');
jest.mock('../../../services/distribution/RiskManager');
jest.mock('../../../services/variation/VariationEngine');
jest.mock('../../../jobs/PostJob');
jest.mock('../../../config/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('DistributionEngine Unit Tests', () => {
  let distributionEngine: DistributionEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    distributionEngine = new DistributionEngine();
  });

  describe('distribute()', () => {
    const mockRequest: DistributionRequest = {
      userId: 'user123',
      content: {
        mediaPath: '/path/to/video.mp4',
        mediaType: 'video',
        caption: 'Test caption',
        hashtags: ['test', 'viral'],
      },
      accountCount: 10,
      spreadHours: 6,
      niche: 'fitness',
    };

    const mockAccounts = [
      { id: 'acc1', username: 'user1', account_state: 'ACTIVE' },
      { id: 'acc2', username: 'user2', account_state: 'ACTIVE' },
      { id: 'acc3', username: 'user3', account_state: 'ACTIVE' },
    ];

    const mockVariations = [
      {
        accountId: 'acc1',
        mediaPath: '/path/to/variation1.mp4',
        caption: 'Test caption 1',
        hashtags: ['test1'],
      },
      {
        accountId: 'acc2',
        mediaPath: '/path/to/variation2.mp4',
        caption: 'Test caption 2',
        hashtags: ['test2'],
      },
      {
        accountId: 'acc3',
        mediaPath: '/path/to/variation3.mp4',
        caption: 'Test caption 3',
        hashtags: ['test3'],
      },
    ];

    const mockSchedule = [
      { accountId: 'acc1', scheduledAt: new Date(), priority: 1 },
      { accountId: 'acc2', scheduledAt: new Date(), priority: 1 },
      { accountId: 'acc3', scheduledAt: new Date(), priority: 1 },
    ];

    it('should successfully distribute content to multiple accounts', async () => {
      // Setup mocks
      (riskManager.validateDistribution as jest.Mock).mockResolvedValue({
        blocked: false,
        riskLevel: 'low',
      });
      (accountSelector.selectAccounts as jest.Mock).mockResolvedValue(mockAccounts);
      (accountSelector.filterUnavailable as jest.Mock).mockReturnValue(mockAccounts);
      (accountSelector.rotateLeadAccounts as jest.Mock).mockReturnValue(mockAccounts);
      (variationEngine.createVariationsForSwarm as jest.Mock).mockResolvedValue(mockVariations);
      (schedulingAlgorithm.calculateDistributionSchedule as jest.Mock).mockReturnValue(mockSchedule);
      (schedulingAlgorithm.addHumanVariation as jest.Mock).mockReturnValue(mockSchedule);
      (queuePost as jest.Mock).mockResolvedValue({ id: 'job123' });

      const result = await distributionEngine.distribute(mockRequest);

      expect(result.distributionId).toMatch(/^dist_/);
      expect(result.totalAccounts).toBe(3);
      expect(result.queued).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.schedule).toEqual(mockSchedule);
      expect(queuePost).toHaveBeenCalledTimes(3);
    });

    it('should block distribution if risk assessment fails', async () => {
      (riskManager.validateDistribution as jest.Mock).mockResolvedValue({
        blocked: true,
        riskLevel: 'critical',
        reason: 'Too many posts in short time',
      });

      const result = await distributionEngine.distribute(mockRequest);

      expect(result.totalAccounts).toBe(0);
      expect(result.queued).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.riskAssessment.blocked).toBe(true);
      expect(accountSelector.selectAccounts).not.toHaveBeenCalled();
    });

    it('should handle when no accounts are available', async () => {
      (riskManager.validateDistribution as jest.Mock).mockResolvedValue({
        blocked: false,
      });
      (accountSelector.selectAccounts as jest.Mock).mockResolvedValue([]);
      (accountSelector.filterUnavailable as jest.Mock).mockReturnValue([]);

      const result = await distributionEngine.distribute(mockRequest);

      expect(result.totalAccounts).toBe(0);
      expect(result.queued).toBe(0);
      expect(result.schedule).toEqual([]);
    });

    it('should filter out unavailable accounts', async () => {
      const allAccounts = [...mockAccounts, { id: 'acc4', account_state: 'PAUSED' }];

      (riskManager.validateDistribution as jest.Mock).mockResolvedValue({ blocked: false });
      (accountSelector.selectAccounts as jest.Mock).mockResolvedValue(allAccounts);
      (accountSelector.filterUnavailable as jest.Mock).mockReturnValue(mockAccounts); // Filters out paused
      (accountSelector.rotateLeadAccounts as jest.Mock).mockReturnValue(mockAccounts);
      (variationEngine.createVariationsForSwarm as jest.Mock).mockResolvedValue(mockVariations);
      (schedulingAlgorithm.calculateDistributionSchedule as jest.Mock).mockReturnValue(mockSchedule);
      (schedulingAlgorithm.addHumanVariation as jest.Mock).mockReturnValue(mockSchedule);
      (queuePost as jest.Mock).mockResolvedValue({ id: 'job123' });

      const result = await distributionEngine.distribute(mockRequest);

      expect(accountSelector.filterUnavailable).toHaveBeenCalledWith(allAccounts);
      expect(result.totalAccounts).toBe(3); // Only active accounts
    });

    it('should create variations for each account', async () => {
      (riskManager.validateDistribution as jest.Mock).mockResolvedValue({ blocked: false });
      (accountSelector.selectAccounts as jest.Mock).mockResolvedValue(mockAccounts);
      (accountSelector.filterUnavailable as jest.Mock).mockReturnValue(mockAccounts);
      (accountSelector.rotateLeadAccounts as jest.Mock).mockReturnValue(mockAccounts);
      (variationEngine.createVariationsForSwarm as jest.Mock).mockResolvedValue(mockVariations);
      (schedulingAlgorithm.calculateDistributionSchedule as jest.Mock).mockReturnValue(mockSchedule);
      (schedulingAlgorithm.addHumanVariation as jest.Mock).mockReturnValue(mockSchedule);
      (queuePost as jest.Mock).mockResolvedValue({ id: 'job123' });

      await distributionEngine.distribute(mockRequest);

      expect(variationEngine.createVariationsForSwarm).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaPath: '/path/to/video.mp4',
          niche: 'fitness',
        }),
        ['acc1', 'acc2', 'acc3']
      );
    });

    it('should apply human variation to schedule', async () => {
      (riskManager.validateDistribution as jest.Mock).mockResolvedValue({ blocked: false });
      (accountSelector.selectAccounts as jest.Mock).mockResolvedValue(mockAccounts);
      (accountSelector.filterUnavailable as jest.Mock).mockReturnValue(mockAccounts);
      (accountSelector.rotateLeadAccounts as jest.Mock).mockReturnValue(mockAccounts);
      (variationEngine.createVariationsForSwarm as jest.Mock).mockResolvedValue(mockVariations);
      (schedulingAlgorithm.calculateDistributionSchedule as jest.Mock).mockReturnValue(mockSchedule);
      (schedulingAlgorithm.addHumanVariation as jest.Mock).mockReturnValue(mockSchedule);
      (queuePost as jest.Mock).mockResolvedValue({ id: 'job123' });

      await distributionEngine.distribute(mockRequest);

      expect(schedulingAlgorithm.calculateDistributionSchedule).toHaveBeenCalledWith(['acc1', 'acc2', 'acc3']);
      expect(schedulingAlgorithm.addHumanVariation).toHaveBeenCalledWith(mockSchedule);
    });

    it('should handle partial failures when queueing posts', async () => {
      (riskManager.validateDistribution as jest.Mock).mockResolvedValue({ blocked: false });
      (accountSelector.selectAccounts as jest.Mock).mockResolvedValue(mockAccounts);
      (accountSelector.filterUnavailable as jest.Mock).mockReturnValue(mockAccounts);
      (accountSelector.rotateLeadAccounts as jest.Mock).mockReturnValue(mockAccounts);
      (variationEngine.createVariationsForSwarm as jest.Mock).mockResolvedValue(mockVariations);
      (schedulingAlgorithm.calculateDistributionSchedule as jest.Mock).mockReturnValue(mockSchedule);
      (schedulingAlgorithm.addHumanVariation as jest.Mock).mockReturnValue(mockSchedule);

      // First two succeed, third fails
      (queuePost as jest.Mock)
        .mockResolvedValueOnce({ id: 'job1' })
        .mockResolvedValueOnce({ id: 'job2' })
        .mockRejectedValueOnce(new Error('Queue full'));

      const result = await distributionEngine.distribute(mockRequest);

      expect(result.queued).toBe(2);
      expect(result.failed).toBe(1);
    });

    it('should skip accounts without variations', async () => {
      const incompleteVariations = [mockVariations[0], mockVariations[1]]; // Missing acc3

      (riskManager.validateDistribution as jest.Mock).mockResolvedValue({ blocked: false });
      (accountSelector.selectAccounts as jest.Mock).mockResolvedValue(mockAccounts);
      (accountSelector.filterUnavailable as jest.Mock).mockReturnValue(mockAccounts);
      (accountSelector.rotateLeadAccounts as jest.Mock).mockReturnValue(mockAccounts);
      (variationEngine.createVariationsForSwarm as jest.Mock).mockResolvedValue(incompleteVariations);
      (schedulingAlgorithm.calculateDistributionSchedule as jest.Mock).mockReturnValue(mockSchedule);
      (schedulingAlgorithm.addHumanVariation as jest.Mock).mockReturnValue(mockSchedule);
      (queuePost as jest.Mock).mockResolvedValue({ id: 'job123' });

      const result = await distributionEngine.distribute(mockRequest);

      expect(result.queued).toBe(2); // Only 2 variations available
      expect(result.failed).toBe(1); // acc3 has no variation
    });

    it('should respect exclude account IDs', async () => {
      const requestWithExclusion = {
        ...mockRequest,
        excludeAccountIds: ['acc2'],
      };

      (riskManager.validateDistribution as jest.Mock).mockResolvedValue({ blocked: false });
      (accountSelector.selectAccounts as jest.Mock).mockResolvedValue(mockAccounts);
      (accountSelector.filterUnavailable as jest.Mock).mockReturnValue(mockAccounts);
      (accountSelector.rotateLeadAccounts as jest.Mock).mockReturnValue(mockAccounts);
      (variationEngine.createVariationsForSwarm as jest.Mock).mockResolvedValue(mockVariations);
      (schedulingAlgorithm.calculateDistributionSchedule as jest.Mock).mockReturnValue(mockSchedule);
      (schedulingAlgorithm.addHumanVariation as jest.Mock).mockReturnValue(mockSchedule);
      (queuePost as jest.Mock).mockResolvedValue({ id: 'job123' });

      await distributionEngine.distribute(requestWithExclusion);

      expect(accountSelector.selectAccounts).toHaveBeenCalledWith({
        userId: 'user123',
        count: 10,
        excludeIds: ['acc2'],
      });
    });
  });

  describe('getStatus()', () => {
    it('should return distribution status with post counts', async () => {
      const mockPosts = [
        { id: 'post1', status: 'completed', distribution_id: 'dist123' },
        { id: 'post2', status: 'completed', distribution_id: 'dist123' },
        { id: 'post3', status: 'pending', distribution_id: 'dist123' },
        { id: 'post4', status: 'failed', distribution_id: 'dist123' },
      ];

      (pool.query as jest.Mock).mockResolvedValue({ rows: mockPosts });

      const result = await distributionEngine.getStatus('dist123');

      expect(result.distributionId).toBe('dist123');
      expect(result.total).toBe(4);
      expect(result.statuses).toEqual({
        completed: 2,
        pending: 1,
        failed: 1,
      });
      expect(result.posts).toEqual(mockPosts);
    });

    it('should return null if query fails', async () => {
      (pool.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await distributionEngine.getStatus('dist123');

      expect(result).toBeNull();
    });

    it('should handle empty results', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await distributionEngine.getStatus('dist123');

      expect(result.total).toBe(0);
      expect(result.statuses).toEqual({});
      expect(result.posts).toEqual([]);
    });
  });

  describe('cancel()', () => {
    it('should call risk manager emergency halt', async () => {
      (riskManager.emergencyHalt as jest.Mock).mockResolvedValue(undefined);

      await distributionEngine.cancel('dist123');

      expect(riskManager.emergencyHalt).toHaveBeenCalledWith('dist123', 'Manual cancellation');
    });

    it('should handle errors gracefully', async () => {
      (riskManager.emergencyHalt as jest.Mock).mockRejectedValue(new Error('Failed to halt'));

      await expect(distributionEngine.cancel('dist123')).rejects.toThrow('Failed to halt');
    });
  });
});
