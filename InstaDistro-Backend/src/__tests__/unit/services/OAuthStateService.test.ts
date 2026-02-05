import { OAuthStateService } from '../../../services/auth/OAuthStateService';
import { redisClient } from '../../../config/redis';

// Mock Redis client
jest.mock('../../../config/redis', () => ({
  redisClient: {
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    ttl: jest.fn(),
  },
}));

describe('OAuthStateService', () => {
  let service: OAuthStateService;

  beforeEach(() => {
    service = new OAuthStateService();
    jest.clearAllMocks();
  });

  describe('generateState', () => {
    it('should generate a random hex string', () => {
      const state1 = service.generateState();
      const state2 = service.generateState();

      expect(state1).toBeDefined();
      expect(state2).toBeDefined();
      expect(state1).not.toBe(state2);
      expect(state1.length).toBe(64); // 32 bytes = 64 hex chars
      expect(state2.length).toBe(64);
      expect(state1).toMatch(/^[0-9a-f]{64}$/); // Only hex characters
    });

    it('should generate unique states on multiple calls', () => {
      const states = new Set();
      for (let i = 0; i < 100; i++) {
        states.add(service.generateState());
      }
      expect(states.size).toBe(100); // All unique
    });
  });

  describe('storeState', () => {
    it('should store state in Redis with metadata', async () => {
      const state = 'test-state-token';
      const metadata = { provider: 'instagram', timestamp: Date.now() };

      (redisClient.setex as jest.Mock).mockResolvedValue('OK');

      await service.storeState(state, metadata);

      expect(redisClient.setex).toHaveBeenCalledWith(
        'oauth:state:test-state-token',
        600, // TTL
        JSON.stringify(metadata)
      );
    });

    it('should throw error if Redis fails', async () => {
      const state = 'test-state';
      const metadata = { provider: 'google', timestamp: Date.now() };

      (redisClient.setex as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await expect(service.storeState(state, metadata)).rejects.toThrow(
        'Failed to store OAuth state'
      );
    });
  });

  describe('validateState', () => {
    it('should return metadata for valid state', async () => {
      const state = 'valid-state';
      const metadata = { provider: 'instagram', timestamp: 1234567890 };

      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(metadata));
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      const result = await service.validateState(state);

      expect(result).toEqual(metadata);
      expect(redisClient.get).toHaveBeenCalledWith('oauth:state:valid-state');
      expect(redisClient.del).toHaveBeenCalledWith('oauth:state:valid-state');
    });

    it('should return null for non-existent state', async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      const result = await service.validateState('invalid-state');

      expect(result).toBeNull();
      expect(redisClient.del).not.toHaveBeenCalled(); // Should not delete if not found
    });

    it('should return null for expired state', async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      const result = await service.validateState('expired-state');

      expect(result).toBeNull();
    });

    it('should delete state after successful validation (one-time use)', async () => {
      const state = 'one-time-state';
      const metadata = { provider: 'google', timestamp: Date.now() };

      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(metadata));
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      await service.validateState(state);

      expect(redisClient.del).toHaveBeenCalledWith('oauth:state:one-time-state');
    });

    it('should return null if Redis fails', async () => {
      (redisClient.get as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const result = await service.validateState('test-state');

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON in Redis', async () => {
      (redisClient.get as jest.Mock).mockResolvedValue('invalid-json{');

      const result = await service.validateState('test-state');

      expect(result).toBeNull();
    });
  });

  describe('cleanupExpiredStates', () => {
    it('should delete states without TTL', async () => {
      const keys = ['oauth:state:key1', 'oauth:state:key2', 'oauth:state:key3'];

      (redisClient.keys as jest.Mock).mockResolvedValue(keys);
      (redisClient.ttl as jest.Mock)
        .mockResolvedValueOnce(-1) // key1: no TTL
        .mockResolvedValueOnce(300) // key2: has TTL
        .mockResolvedValueOnce(-1); // key3: no TTL
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      const result = await service.cleanupExpiredStates();

      expect(result).toBe(2); // key1 and key3 deleted
      expect(redisClient.del).toHaveBeenCalledTimes(2);
      expect(redisClient.del).toHaveBeenCalledWith('oauth:state:key1');
      expect(redisClient.del).toHaveBeenCalledWith('oauth:state:key3');
    });

    it('should return 0 if no states need cleanup', async () => {
      const keys = ['oauth:state:key1', 'oauth:state:key2'];

      (redisClient.keys as jest.Mock).mockResolvedValue(keys);
      (redisClient.ttl as jest.Mock)
        .mockResolvedValueOnce(300)
        .mockResolvedValueOnce(600);

      const result = await service.cleanupExpiredStates();

      expect(result).toBe(0);
      expect(redisClient.del).not.toHaveBeenCalled();
    });

    it('should return 0 if no states exist', async () => {
      (redisClient.keys as jest.Mock).mockResolvedValue([]);

      const result = await service.cleanupExpiredStates();

      expect(result).toBe(0);
    });

    it('should return 0 if Redis fails', async () => {
      (redisClient.keys as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const result = await service.cleanupExpiredStates();

      expect(result).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete OAuth flow', async () => {
      const metadata = { provider: 'instagram', timestamp: Date.now() };

      // Generate state
      const state = service.generateState();
      expect(state).toBeDefined();

      // Store state
      (redisClient.setex as jest.Mock).mockResolvedValue('OK');
      await service.storeState(state, metadata);
      expect(redisClient.setex).toHaveBeenCalled();

      // Validate state
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(metadata));
      (redisClient.del as jest.Mock).mockResolvedValue(1);
      const result = await service.validateState(state);
      expect(result).toEqual(metadata);

      // Second validation should fail (one-time use)
      (redisClient.get as jest.Mock).mockResolvedValue(null);
      const secondResult = await service.validateState(state);
      expect(secondResult).toBeNull();
    });

    it('should reject tampered state', async () => {
      const metadata = { provider: 'instagram', timestamp: Date.now() };

      // Store original state
      const originalState = service.generateState();
      (redisClient.setex as jest.Mock).mockResolvedValue('OK');
      await service.storeState(originalState, metadata);

      // Try to validate tampered state
      const tamperedState = originalState.substring(0, 60) + 'XXXX';
      (redisClient.get as jest.Mock).mockResolvedValue(null);
      const result = await service.validateState(tamperedState);

      expect(result).toBeNull();
    });
  });
});
