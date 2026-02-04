import Queue, { Job } from 'bull';
import { envConfig } from '../config/env';
import { logger } from '../config/logger';
import { postingService } from '../services/instagram/PostingService';
import { pool } from '../config/database';

export interface DistributionJobData {
  distributionId: string;
  accountId: string;
  mediaPath: string;
  mediaType: 'photo' | 'video';
  caption?: string;
  hashtags?: string[];
  scheduledAt?: string;
}

const distributionQueue = new Queue<DistributionJobData>('instagram-distribution', {
  redis: { host: envConfig.REDIS_HOST || 'localhost', port: envConfig.REDIS_PORT || 6379 },
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 30000 }, removeOnComplete: 200, removeOnFail: 500, timeout: 600000 },
});

distributionQueue.process(async (job: Job<DistributionJobData>) => {
  const { distributionId, accountId, mediaPath, mediaType, caption, hashtags } = job.data;
  logger.info('Processing distribution job ' + job.id + ' for ' + accountId);
  try {
    const result = await postingService.post({ accountId, mediaPath, mediaType, caption, hashtags });
    if (!result.success) throw new Error(result.error || 'Post failed');
    logger.info('Distribution post OK: ' + accountId + ' mediaId=' + result.mediaId);
    return result;
  } catch (error: any) {
    logger.error('Distribution job failed: ' + accountId + ' — ' + error.message);
    throw error;
  }
});

distributionQueue.on('completed', (job) => logger.info('Dist job ' + job.id + ' done'));
distributionQueue.on('failed',    (job, err) => logger.error('Dist job ' + job.id + ' failed: ' + err.message));
distributionQueue.on('stalled',   (job) => logger.warn('Dist job ' + job.id + ' stalled'));

export { distributionQueue };
