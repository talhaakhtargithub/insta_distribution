import { RateLimiter } from '../../../services/instagram/RateLimiter';
import { AccountAction } from '../../../types/errors';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis');

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    // Create mock Redis instance
    mockRedis = {
      get: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      del: jest.fn(),
      ttl: jest.fn(),
      pipeline: jest.fn().mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
      disconnect: jest.fn(),
    } as any;

    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);

    rateLimiter = new RateLimiter();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canPost', () => {
    it('should allow post when under hourly and daily limits', async () => {
      mockRedis.get.mockResolvedValueOnce('0').mockResolvedValueOnce('0'); // hourly, daily

      const result = await rateLimiter.canPost('account123', 'personal');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should deny post when hourly limit reached', async () => {
      mockRedis.get.mockResolvedValueOnce('1').mockResolvedValueOnce('0'); // hourly at limit, daily ok
      mockRedis.ttl.mockResolvedValue(1800); // 30 minutes until reset

      const result = await rateLimiter.canPost('account123', 'personal');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Hourly post limit reached');
      expect(result.retryAfter).toBe(1800);
    });

    it('should deny post when daily limit reached', async () => {
      mockRedis.get.mockResolvedValueOnce('0').mockResolvedValueOnce('5'); // hourly ok, daily at limit
      mockRedis.ttl.mockResolvedValue(43200); // 12 hours until reset

      const result = await rateLimiter.canPost('account123', 'personal');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily post limit reached');
      expect(result.retryAfter).toBe(43200);
    });
  });

  describe('checkLimit', () => {
    it('should check limits for different actions', async () => {
      mockRedis.get.mockResolvedValue('0');

      const postResult = await rateLimiter.checkLimit('account123', AccountAction.POST, 'personal');
      expect(postResult.allowed).toBe(true);

      const likeResult = await rateLimiter.checkLimit('account123', AccountAction.LIKE, 'personal');
      expect(likeResult.allowed).toBe(true);

      const commentResult = await rateLimiter.checkLimit('account123', AccountAction.COMMENT, 'personal');
      expect(commentResult.allowed).toBe(true);
    });

    it('should apply different limits for business accounts', async () => {
      mockRedis.get.mockResolvedValueOnce('1').mockResolvedValueOnce('0'); // hourly at personal limit

      // Personal account: limit is 1/hour, so should be denied
      const personalResult = await rateLimiter.canPost('account123', 'personal');
      expect(personalResult.allowed).toBe(false);

      mockRedis.get.mockResolvedValueOnce('1').mockResolvedValueOnce('0'); // hourly at 1

      // Business account: limit is 2/hour, so should be allowed
      const businessResult = await rateLimiter.canPost('account456', 'business');
      expect(businessResult.allowed).toBe(true);
    });

    it('should apply reduced limits for new accounts', async () => {
      const twentyDaysAgo = new Date(Date.now() - 20 * 86400000); // 20 days old
      mockRedis.get.mockResolvedValue('0');

      // New account gets 50% of normal limits
      // Personal post limit: 1/hour normally, 0.5 -> 1/hour (floor with max 1)
      // Check that limits are calculated correctly
      const result = await rateLimiter.checkLimit(
        'newaccount',
        AccountAction.POST,
        'personal',
        twentyDaysAgo
      );

      expect(result.allowed).toBe(true);
    });

    it('should not reduce limits for old accounts', async () => {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000); // 60 days old
      mockRedis.get.mockResolvedValueOnce('0').mockResolvedValueOnce('0');

      const result = await rateLimiter.checkLimit(
        'oldaccount',
        AccountAction.POST,
        'personal',
        sixtyDaysAgo
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('recordAction', () => {
    it('should increment hourly and daily counters', async () => {
      const pipeline = {
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockRedis.pipeline.mockReturnValue(pipeline as any);

      await rateLimiter.recordAction('account123', AccountAction.POST);

      expect(pipeline.incr).toHaveBeenCalledTimes(2); // hourly + daily
      expect(pipeline.expire).toHaveBeenCalledTimes(2);
      expect(pipeline.exec).toHaveBeenCalled();
    });

    it('should set correct TTL for hourly and daily windows', async () => {
      const pipeline = {
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockRedis.pipeline.mockReturnValue(pipeline as any);

      await rateLimiter.recordAction('account123', AccountAction.LIKE);

      // Verify expire was called with correct TTLs
      const expireCalls = (pipeline.expire as jest.Mock).mock.calls;
      expect(expireCalls[0][1]).toBe(3600); // 1 hour
      expect(expireCalls[1][1]).toBe(86400); // 24 hours
    });
  });

  describe('getRemainingQuota', () => {
    it('should calculate remaining quota correctly', async () => {
      mockRedis.get.mockResolvedValueOnce('5').mockResolvedValueOnce('30'); // 5 hourly, 30 daily

      const result = await rateLimiter.getRemainingQuota(
        'account123',
        AccountAction.LIKE,
        'personal'
      );

      expect(result.hourlyRemaining).toBe(10); // 15 - 5
      expect(result.dailyRemaining).toBe(70); // 100 - 30
      expect(result.hourlyLimit).toBe(15);
      expect(result.dailyLimit).toBe(100);
    });

    it('should not return negative remaining quota', async () => {
      mockRedis.get.mockResolvedValueOnce('20').mockResolvedValueOnce('150'); // over limit

      const result = await rateLimiter.getRemainingQuota(
        'account123',
        AccountAction.LIKE,
        'personal'
      );

      expect(result.hourlyRemaining).toBe(0); // max(0, 15 - 20)
      expect(result.dailyRemaining).toBe(0); // max(0, 100 - 150)
    });

    it('should handle no usage (fresh account)', async () => {
      mockRedis.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      const result = await rateLimiter.getRemainingQuota(
        'newaccount',
        AccountAction.POST,
        'personal'
      );

      expect(result.hourlyRemaining).toBe(1); // personal post limit
      expect(result.dailyRemaining).toBe(5);
    });
  });

  describe('getResetTime', () => {
    it('should return TTL for both windows', async () => {
      mockRedis.ttl.mockResolvedValueOnce(1800).mockResolvedValueOnce(43200);

      const result = await rateLimiter.getResetTime('account123', AccountAction.POST);

      expect(result.hourlyResetIn).toBe(1800); // 30 minutes
      expect(result.dailyResetIn).toBe(43200); // 12 hours
    });

    it('should handle expired keys (TTL -2)', async () => {
      mockRedis.ttl.mockResolvedValueOnce(-2).mockResolvedValueOnce(-2);

      const result = await rateLimiter.getResetTime('account123', AccountAction.COMMENT);

      expect(result.hourlyResetIn).toBe(0);
      expect(result.dailyResetIn).toBe(0);
    });

    it('should handle keys without TTL (TTL -1)', async () => {
      mockRedis.ttl.mockResolvedValueOnce(-1).mockResolvedValueOnce(-1);

      const result = await rateLimiter.getResetTime('account123', AccountAction.FOLLOW);

      expect(result.hourlyResetIn).toBe(0);
      expect(result.dailyResetIn).toBe(0);
    });
  });

  describe('resetQuota', () => {
    it('should reset quota for specific action', async () => {
      mockRedis.del.mockResolvedValue(2);

      await rateLimiter.resetQuota('account123', AccountAction.POST);

      expect(mockRedis.del).toHaveBeenCalledWith(
        expect.stringContaining('account123'),
        expect.stringContaining('account123')
      );
    });

    it('should reset quota for all actions if no action specified', async () => {
      mockRedis.del.mockResolvedValue(10);

      await rateLimiter.resetQuota('account123');

      // Should delete keys for all 5 actions * 2 windows = 10 keys
      expect(mockRedis.del).toHaveBeenCalledTimes(1);
      expect((mockRedis.del as jest.Mock).mock.calls[0].length).toBe(10);
    });
  });

  describe('integration scenarios', () => {
    it('should enforce rate limits across multiple actions', async () => {
      const pipeline = {
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockRedis.pipeline.mockReturnValue(pipeline as any);

      // Simulate posting once (within limit)
      mockRedis.get.mockResolvedValueOnce('0').mockResolvedValueOnce('0');
      let result = await rateLimiter.canPost('account123', 'personal');
      expect(result.allowed).toBe(true);

      await rateLimiter.recordAction('account123', AccountAction.POST);

      // Try to post again (should hit hourly limit)
      mockRedis.get.mockResolvedValueOnce('1').mockResolvedValueOnce('1');
      mockRedis.ttl.mockResolvedValue(3000);
      result = await rateLimiter.canPost('account123', 'personal');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Hourly');
    });

    it('should handle business account with higher limits', async () => {
      // Business account can post 2/hour
      mockRedis.get.mockResolvedValue('1'); // 1 post already

      const result = await rateLimiter.canPost('businessaccount', 'business');
      expect(result.allowed).toBe(true); // Still under limit of 2
    });

    it('should correctly reduce limits for new accounts', async () => {
      const newAccount = new Date(Date.now() - 15 * 86400000); // 15 days old

      // Personal like limit: 15/hour normally, 50% = 7/hour for new accounts
      mockRedis.get.mockResolvedValueOnce('7').mockResolvedValueOnce('0');
      mockRedis.ttl.mockResolvedValue(1800);

      const result = await rateLimiter.checkLimit(
        'newaccount',
        AccountAction.LIKE,
        'personal',
        newAccount
      );

      // Should be at limit (7 >= 7)
      expect(result.allowed).toBe(false);
    });
  });

  describe('close', () => {
    it('should disconnect Redis client', async () => {
      await rateLimiter.close();

      expect(mockRedis.disconnect).toHaveBeenCalled();
    });
  });
});
