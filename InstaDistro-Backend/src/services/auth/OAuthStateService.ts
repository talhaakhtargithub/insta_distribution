import crypto from 'crypto';
import { redisClient } from '../../config/redis';
import { logger } from '../../config/logger';

/**
 * OAuth State Service
 * Manages OAuth state tokens for CSRF protection
 */
export class OAuthStateService {
  private readonly STATE_PREFIX = 'oauth:state:';
  private readonly STATE_TTL = 600; // 10 minutes

  /**
   * Generate a cryptographically secure random state token
   */
  generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Store state token in Redis with TTL
   * Associates state with metadata for validation
   */
  async storeState(state: string, metadata: { provider: string; timestamp: number }): Promise<void> {
    try {
      const key = `${this.STATE_PREFIX}${state}`;
      const value = JSON.stringify(metadata);

      await redisClient.setex(key, this.STATE_TTL, value);

      logger.debug('OAuth state stored', { state: state.substring(0, 8) + '...', provider: metadata.provider });
    } catch (error) {
      logger.error('Failed to store OAuth state', { error });
      throw new Error('Failed to store OAuth state');
    }
  }

  /**
   * Validate state token and retrieve metadata
   * Returns metadata if valid, null if invalid/expired
   */
  async validateState(state: string): Promise<{ provider: string; timestamp: number } | null> {
    try {
      const key = `${this.STATE_PREFIX}${state}`;
      const value = await redisClient.get(key);

      if (!value) {
        logger.warn('OAuth state validation failed: state not found or expired', {
          state: state.substring(0, 8) + '...'
        });
        return null;
      }

      // Delete state after validation (one-time use)
      await redisClient.del(key);

      const metadata = JSON.parse(value);

      logger.debug('OAuth state validated successfully', {
        state: state.substring(0, 8) + '...',
        provider: metadata.provider
      });

      return metadata;
    } catch (error) {
      logger.error('Failed to validate OAuth state', { error });
      return null;
    }
  }

  /**
   * Clean up expired state tokens (called periodically)
   * Redis TTL handles this automatically, but this can be used for manual cleanup
   */
  async cleanupExpiredStates(): Promise<number> {
    try {
      const pattern = `${this.STATE_PREFIX}*`;
      const keys = await redisClient.keys(pattern);

      let deletedCount = 0;
      for (const key of keys) {
        const ttl = await redisClient.ttl(key);
        if (ttl === -1) {
          // No TTL set, delete it
          await redisClient.del(key);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.info('Cleaned up expired OAuth states', { count: deletedCount });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup OAuth states', { error });
      return 0;
    }
  }
}

export const oauthStateService = new OAuthStateService();
