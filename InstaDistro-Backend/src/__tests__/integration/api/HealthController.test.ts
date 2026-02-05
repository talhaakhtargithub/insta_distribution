import request from 'supertest';
import express, { Express } from 'express';
import { HealthController } from '../../../api/controllers/HealthController';
import HealthMonitor from '../../../services/health/HealthMonitor';
import { queueAccountMonitoring, queueSwarmMonitoring } from '../../../jobs/HealthMonitorJob';

// Mock dependencies
jest.mock('../../../services/health/HealthMonitor');
jest.mock('../../../jobs/HealthMonitorJob');

describe('HealthController Integration Tests', () => {
  let app: Express;
  let healthController: HealthController;

  beforeAll(() => {
    // Setup Express app with routes
    app = express();
    app.use(express.json());

    healthController = new HealthController();

    // Setup routes
    app.get('/api/health/account/:id', (req, res) => healthController.getAccountHealth(req, res));
    app.post('/api/health/account/:id/monitor', (req, res) => healthController.queueAccountMonitoring(req, res));
    app.get('/api/health/swarm', (req, res) => healthController.getSwarmHealth(req, res));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health/account/:id', () => {
    it('should return account health report', async () => {
      const mockReport = {
        accountId: 'acc123',
        username: 'testuser',
        healthScore: 85,
        category: 'good',
        metrics: {
          postSuccessRate: 95,
          errorRate24h: 2,
          rateLimitHits7d: 0,
          loginChallenges7d: 0,
          accountStatus: 'active',
          accountState: 'ACTIVE',
          daysSinceCreation: 60,
        },
        issues: [],
        recommendations: ['Consider increasing post frequency'],
      };

      (HealthMonitor.monitorAccount as jest.Mock).mockResolvedValue(mockReport);

      const response = await request(app)
        .get('/api/health/account/acc123')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockReport);
      expect(HealthMonitor.monitorAccount).toHaveBeenCalledWith('acc123');
    });

    it('should handle errors gracefully', async () => {
      (HealthMonitor.monitorAccount as jest.Mock).mockRejectedValue(
        new Error('Account not found')
      );

      const response = await request(app)
        .get('/api/health/account/invalid')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Account not found');
    });
  });

  describe('POST /api/health/account/:id/monitor', () => {
    it('should queue account monitoring job', async () => {
      const mockJob = {
        id: 'job123',
        data: { accountId: 'acc123', userId: 'user456' },
      };

      (queueAccountMonitoring as jest.Mock).mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/health/account/acc123/monitor')
        .send({ userId: 'user456' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobId).toBe('job123');
      expect(response.body.data.message).toBe('Account monitoring queued');
      expect(queueAccountMonitoring).toHaveBeenCalledWith('acc123', 'user456');
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .post('/api/health/account/acc123/monitor')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User ID is required');
      expect(queueAccountMonitoring).not.toHaveBeenCalled();
    });

    it('should handle job queueing errors', async () => {
      (queueAccountMonitoring as jest.Mock).mockRejectedValue(
        new Error('Queue is full')
      );

      const response = await request(app)
        .post('/api/health/account/acc123/monitor')
        .send({ userId: 'user456' })
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Queue is full');
    });
  });

  describe('GET /api/health/swarm', () => {
    it('should return swarm health overview', async () => {
      const mockSwarmReport = {
        userId: 'user123',
        totalAccounts: 10,
        overallScore: 78,
        distribution: {
          excellent: 2,
          good: 5,
          fair: 2,
          poor: 1,
          critical: 0,
        },
        accounts: [
          {
            accountId: 'acc1',
            username: 'user1',
            healthScore: 95,
            category: 'excellent',
          },
          {
            accountId: 'acc2',
            username: 'user2',
            healthScore: 80,
            category: 'good',
          },
        ],
        alerts: [],
      };

      (HealthMonitor.monitorSwarm as jest.Mock).mockResolvedValue(mockSwarmReport);

      const response = await request(app)
        .get('/api/health/swarm')
        .query({ userId: 'user123' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSwarmReport);
      expect(HealthMonitor.monitorSwarm).toHaveBeenCalledWith('user123');
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .get('/api/health/swarm')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User ID is required');
      expect(HealthMonitor.monitorSwarm).not.toHaveBeenCalled();
    });

    it('should handle monitoring errors', async () => {
      (HealthMonitor.monitorSwarm as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/health/swarm')
        .query({ userId: 'user123' })
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database connection failed');
    });

    it('should handle empty swarm (no accounts)', async () => {
      const emptySwarmReport = {
        userId: 'user456',
        totalAccounts: 0,
        overallScore: 0,
        distribution: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0,
          critical: 0,
        },
        accounts: [],
        alerts: [],
      };

      (HealthMonitor.monitorSwarm as jest.Mock).mockResolvedValue(emptySwarmReport);

      const response = await request(app)
        .get('/api/health/swarm')
        .query({ userId: 'user456' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalAccounts).toBe(0);
      expect(response.body.data.accounts).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors with 500 status', async () => {
      (HealthMonitor.monitorAccount as jest.Mock).mockRejectedValue(
        new Error('Unexpected error occurred')
      );

      const response = await request(app)
        .get('/api/health/account/acc999')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle null/undefined return values', async () => {
      (HealthMonitor.monitorAccount as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/health/account/acc123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });
  });
});
