import request from 'supertest';
import express, { Express } from 'express';
import { PostController } from '../../../api/controllers/PostController';
import { postingService } from '../../../services/instagram/PostingService';
import {
  queuePost,
  queueBatchPosts,
  getPostJobStatus,
  cancelPost,
  retryPost,
  getPostQueueStats,
  getPendingPosts,
} from '../../../jobs/PostJob';

// Mock dependencies
jest.mock('../../../services/instagram/PostingService');
jest.mock('../../../jobs/PostJob');
jest.mock('../../../config/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('PostController Integration Tests', () => {
  let app: Express;
  let postController: PostController;

  const mockUser = {
    userId: 'user123',
    email: 'test@example.com',
    provider: 'google' as const,
  };

  beforeAll(() => {
    // Setup Express app with routes
    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req, res, next) => {
      (req as any).user = mockUser;
      next();
    });

    postController = new PostController();

    // Setup routes
    app.post('/api/posts/immediate', (req, res) => postController.postImmediate(req, res));
    app.post('/api/posts/queue', (req, res) => postController.queuePost(req, res));
    app.post('/api/posts/batch', (req, res) => postController.queueBatch(req, res));
    app.get('/api/posts/:id/status', (req, res) => postController.getPostStatus(req, res));
    app.delete('/api/posts/:id', (req, res) => postController.cancelPost(req, res));
    app.post('/api/posts/:id/retry', (req, res) => postController.retryPost(req, res));
    app.get('/api/posts/queue/stats', (req, res) => postController.getQueueStats(req, res));
    app.get('/api/posts/queue/pending', (req, res) => postController.getPendingPosts(req, res));
    app.post('/api/posts/verify-account', (req, res) => postController.verifyAccount(req, res));
    app.get('/api/posts/history', (req, res) => postController.getHistory(req, res));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/posts/immediate', () => {
    it('should post to Instagram immediately', async () => {
      const mockResult = {
        success: true,
        mediaId: '123456789',
        postedAt: new Date(),
      };

      (postingService.post as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/posts/immediate')
        .send({
          accountId: 'acc123',
          mediaPath: '/path/to/image.jpg',
          mediaType: 'photo',
          caption: 'Test post',
          hashtags: ['test', 'instagram'],
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.mediaId).toBe('123456789');
      expect(response.body.message).toBe('Posted to Instagram successfully');
      expect(postingService.post).toHaveBeenCalledWith({
        accountId: 'acc123',
        mediaPath: '/path/to/image.jpg',
        mediaType: 'photo',
        caption: 'Test post',
        hashtags: ['test', 'instagram'],
        coverImagePath: undefined,
      });
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/posts/immediate')
        .send({
          accountId: 'acc123',
          mediaType: 'photo',
          // missing mediaPath
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.message).toContain('required');
    });

    it('should return 400 if mediaType is invalid', async () => {
      const response = await request(app)
        .post('/api/posts/immediate')
        .send({
          accountId: 'acc123',
          mediaPath: '/path/to/image.jpg',
          mediaType: 'invalid',
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.message).toContain('photo');
    });

    it('should handle posting failures', async () => {
      (postingService.post as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Instagram API error',
      });

      const response = await request(app)
        .post('/api/posts/immediate')
        .send({
          accountId: 'acc123',
          mediaPath: '/path/to/image.jpg',
          mediaType: 'photo',
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Post Failed');
      expect(response.body.message).toContain('Instagram API error');
    });

    it('should handle server errors', async () => {
      (postingService.post as jest.Mock).mockRejectedValue(new Error('Network error'));

      const response = await request(app)
        .post('/api/posts/immediate')
        .send({
          accountId: 'acc123',
          mediaPath: '/path/to/image.jpg',
          mediaType: 'photo',
        })
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body.error).toBe('Server Error');
    });
  });

  describe('POST /api/posts/queue', () => {
    it('should queue a post for background processing', async () => {
      const mockJob = {
        id: 'job123',
        data: {
          accountId: 'acc123',
          mediaPath: '/path/to/image.jpg',
        },
      };

      (queuePost as jest.Mock).mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/posts/queue')
        .send({
          accountId: 'acc123',
          mediaPath: '/path/to/image.jpg',
          mediaType: 'photo',
          caption: 'Queued post',
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBe('job123');
      expect(response.body.message).toContain('queued');
    });

    it('should support scheduled posts', async () => {
      const scheduledTime = new Date(Date.now() + 3600000); // 1 hour from now
      const mockJob = { id: 'job123' };

      (queuePost as jest.Mock).mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/posts/queue')
        .send({
          accountId: 'acc123',
          mediaPath: '/path/to/image.jpg',
          mediaType: 'photo',
          scheduledFor: scheduledTime.toISOString(),
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(queuePost).toHaveBeenCalled();
    });
  });

  describe('POST /api/posts/batch', () => {
    it('should queue multiple posts', async () => {
      const mockJobs = [
        { id: 'job1', data: { accountId: 'acc1' } },
        { id: 'job2', data: { accountId: 'acc2' } },
      ];

      (queueBatchPosts as jest.Mock).mockResolvedValue(mockJobs);

      const response = await request(app)
        .post('/api/posts/batch')
        .send({
          posts: [
            {
              accountId: 'acc1',
              mediaPath: '/path/to/image1.jpg',
              mediaType: 'photo',
            },
            {
              accountId: 'acc2',
              mediaPath: '/path/to/image2.jpg',
              mediaType: 'photo',
            },
          ],
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.jobIds).toHaveLength(2);
      expect(response.body.jobIds).toContain('job1');
      expect(response.body.jobIds).toContain('job2');
    });

    it('should return 400 if posts array is empty', async () => {
      const response = await request(app)
        .post('/api/posts/batch')
        .send({
          posts: [],
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('GET /api/posts/:id/status', () => {
    it('should return job status', async () => {
      const mockStatus = {
        id: 'job123',
        state: 'completed',
        progress: 100,
        result: { mediaId: '123456' },
      };

      (getPostJobStatus as jest.Mock).mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/posts/job123/status')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.id).toBe('job123');
      expect(response.body.state).toBe('completed');
    });

    it('should return 404 if job not found', async () => {
      (getPostJobStatus as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/posts/nonexistent/status')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('should cancel a queued post', async () => {
      (cancelPost as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/posts/job123')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cancelled');
      expect(cancelPost).toHaveBeenCalledWith('job123');
    });

    it('should return 404 if job not found', async () => {
      (cancelPost as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/posts/nonexistent')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });
  });

  describe('POST /api/posts/:id/retry', () => {
    it('should retry a failed post', async () => {
      const mockJob = { id: 'job123-retry' };
      (retryPost as jest.Mock).mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/posts/job123/retry')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.newJobId).toBe('job123-retry');
      expect(retryPost).toHaveBeenCalledWith('job123');
    });
  });

  describe('GET /api/posts/queue/stats', () => {
    it('should return queue statistics', async () => {
      const mockStats = {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      };

      (getPostQueueStats as jest.Mock).mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/posts/queue/stats')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.waiting).toBe(5);
      expect(response.body.active).toBe(2);
      expect(response.body.completed).toBe(100);
      expect(response.body.failed).toBe(3);
    });
  });

  describe('GET /api/posts/queue/pending', () => {
    it('should return pending posts', async () => {
      const mockPending = [
        {
          id: 'job1',
          data: { accountId: 'acc1', mediaPath: '/path1.jpg' },
          state: 'waiting',
        },
        {
          id: 'job2',
          data: { accountId: 'acc2', mediaPath: '/path2.jpg' },
          state: 'delayed',
        },
      ];

      (getPendingPosts as jest.Mock).mockResolvedValue(mockPending);

      const response = await request(app)
        .get('/api/posts/queue/pending')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.pending).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });
  });

  describe('POST /api/posts/verify-account', () => {
    it('should verify account can post', async () => {
      (postingService.verifyAccount as jest.Mock).mockResolvedValue({
        success: true,
        canPost: true,
        accountInfo: {
          username: 'testuser',
          isAuthenticated: true,
        },
      });

      const response = await request(app)
        .post('/api/posts/verify-account')
        .send({ accountId: 'acc123' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.canPost).toBe(true);
      expect(response.body.accountInfo.username).toBe('testuser');
    });

    it('should return 400 if accountId is missing', async () => {
      const response = await request(app)
        .post('/api/posts/verify-account')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('GET /api/posts/history', () => {
    it('should return posting history', async () => {
      const mockPool = require('../../../config/database').pool;
      const mockHistory = [
        {
          id: 'post1',
          account_id: 'acc1',
          username: 'user1',
          media_type: 'photo',
          status: 'success',
          created_at: new Date(),
        },
        {
          id: 'post2',
          account_id: 'acc2',
          username: 'user2',
          media_type: 'video',
          status: 'success',
          created_at: new Date(),
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockHistory });

      const response = await request(app)
        .get('/api/posts/history')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.history).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should support filtering by accountId', async () => {
      const mockPool = require('../../../config/database').pool;
      mockPool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/posts/history?accountId=acc123')
        .expect(200);

      expect(mockPool.query).toHaveBeenCalled();
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('account_id');
    });
  });
});
