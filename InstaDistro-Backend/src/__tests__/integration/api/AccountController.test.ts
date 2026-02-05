import request from 'supertest';
import express, { Express } from 'express';
import { AccountController } from '../../../api/controllers/AccountController';
import { accountService } from '../../../services/swarm/AccountService';
import { authService } from '../../../services/instagram/AuthService';
import { cacheService } from '../../../services/cache/CacheService';

// Mock dependencies
jest.mock('../../../services/swarm/AccountService');
jest.mock('../../../services/instagram/AuthService');
jest.mock('../../../services/cache/CacheService');

describe('AccountController Integration Tests', () => {
  let app: Express;
  let accountController: AccountController;

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

    accountController = new AccountController();

    // Setup routes
    app.post('/api/accounts', (req, res) => accountController.createAccount(req, res));
    app.get('/api/accounts', (req, res) => accountController.getAccounts(req, res));
    app.get('/api/accounts/:id', (req, res) => accountController.getAccountById(req, res));
    app.put('/api/accounts/:id', (req, res) => accountController.updateAccount(req, res));
    app.delete('/api/accounts/:id', (req, res) => accountController.deleteAccount(req, res));
    app.post('/api/accounts/bulk-import', (req, res) => accountController.bulkImport(req, res));
    app.get('/api/accounts/stats/swarm', (req, res) => accountController.getSwarmStats(req, res));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/accounts', () => {
    it('should create a new account successfully', async () => {
      const mockAccount = {
        id: 'acc123',
        user_id: 'user123',
        username: 'testuser',
        account_type: 'personal',
        account_state: 'NEW_ACCOUNT',
        is_authenticated: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (accountService.createAccount as jest.Mock).mockResolvedValue({
        ...mockAccount,
        encrypted_password: 'encrypted_pass',
      });
      (cacheService.invalidateUser as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/accounts')
        .send({
          username: 'testuser',
          password: 'testpass123',
          accountType: 'personal',
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.message).toBe('Account created successfully');
      expect(response.body.account.id).toBe('acc123');
      expect(response.body.account.username).toBe('testuser');
      expect(response.body.account.encrypted_password).toBeUndefined();
      expect(accountService.createAccount).toHaveBeenCalledWith({
        user_id: 'user123',
        username: 'testuser',
        password: 'testpass123',
        account_type: 'personal',
        proxy_id: undefined,
      });
    });

    it('should return 400 if username is missing', async () => {
      const response = await request(app)
        .post('/api/accounts')
        .send({
          password: 'testpass123',
          accountType: 'personal',
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.message).toBe('Username and password are required');
    });

    it('should return 400 if accountType is invalid', async () => {
      const response = await request(app)
        .post('/api/accounts')
        .send({
          username: 'testuser',
          password: 'testpass123',
          accountType: 'invalid',
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.message).toBe('accountType must be either "personal" or "business"');
    });

    it('should handle creation errors', async () => {
      (accountService.createAccount as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .post('/api/accounts')
        .send({
          username: 'testuser',
          password: 'testpass123',
          accountType: 'personal',
        })
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body.error).toBe('Server Error');
    });
  });

  describe('GET /api/accounts', () => {
    it('should return all accounts for user', async () => {
      const mockAccounts = [
        {
          id: 'acc1',
          username: 'user1',
          account_type: 'personal',
          account_state: 'ACTIVE',
        },
        {
          id: 'acc2',
          username: 'user2',
          account_type: 'business',
          account_state: 'WARMING_UP',
        },
      ];

      (cacheService.getOrSet as jest.Mock).mockResolvedValue({
        data: mockAccounts,
        hasMore: false,
        total: 2,
      });

      const response = await request(app)
        .get('/api/accounts')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.hasMore).toBe(false);
    });

    it('should support cursor pagination', async () => {
      const mockAccounts = [{ id: 'acc1', username: 'user1' }];

      (cacheService.getOrSet as jest.Mock).mockResolvedValue({
        data: mockAccounts,
        hasMore: true,
        total: 10,
        nextCursor: 'next_cursor_value',
      });

      const response = await request(app)
        .get('/api/accounts?limit=1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.hasMore).toBe(true);
      expect(response.body.nextCursor).toBe('next_cursor_value');
    });
  });

  describe('GET /api/accounts/:id', () => {
    it('should return account by ID', async () => {
      const mockAccount = {
        id: 'acc123',
        username: 'testuser',
        account_type: 'personal',
      };

      (cacheService.getOrSet as jest.Mock).mockResolvedValue(mockAccount);

      const response = await request(app)
        .get('/api/accounts/acc123')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.id).toBe('acc123');
      expect(response.body.username).toBe('testuser');
    });

    it('should return 404 if account not found', async () => {
      (cacheService.getOrSet as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/accounts/nonexistent')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });
  });

  describe('PUT /api/accounts/:id', () => {
    it('should update account successfully', async () => {
      const mockUpdatedAccount = {
        id: 'acc123',
        username: 'testuser',
        bio: 'Updated bio',
      };

      (accountService.updateAccount as jest.Mock).mockResolvedValue(mockUpdatedAccount);
      (cacheService.invalidateUser as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .put('/api/accounts/acc123')
        .send({
          bio: 'Updated bio',
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.message).toBe('Account updated successfully');
      expect(response.body.account.bio).toBe('Updated bio');
    });

    it('should handle update errors', async () => {
      (accountService.updateAccount as jest.Mock).mockRejectedValue(
        new Error('Update failed')
      );

      const response = await request(app)
        .put('/api/accounts/acc123')
        .send({
          bio: 'New bio',
        })
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body.error).toBe('Server Error');
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    it('should delete account successfully', async () => {
      (accountService.deleteAccount as jest.Mock).mockResolvedValue(undefined);
      (cacheService.invalidateUser as jest.Mock).mockResolvedValue(undefined);
      (cacheService.invalidateUser as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/accounts/acc123')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.message).toBe('Account deleted successfully');
      expect(accountService.deleteAccount).toHaveBeenCalledWith('acc123', 'user123');
    });

    it('should handle deletion errors', async () => {
      (accountService.deleteAccount as jest.Mock).mockRejectedValue(
        new Error('Account not found')
      );

      const response = await request(app)
        .delete('/api/accounts/nonexistent')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body.error).toBe('Server Error');
    });
  });

  describe('POST /api/accounts/bulk-import', () => {
    it('should import multiple accounts successfully', async () => {
      const mockResult = {
        success: 2,
        failed: 0,
        total: 2,
        accounts: [
          { id: 'acc1', username: 'user1' },
          { id: 'acc2', username: 'user2' },
        ],
        errors: [],
      };

      (accountService.bulkImport as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/accounts/bulk-import')
        .send({
          accounts: [
            { username: 'user1', password: 'pass1', accountType: 'personal' },
            { username: 'user2', password: 'pass2', accountType: 'business' },
          ],
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.message).toContain('Imported 2 out of 2 accounts');
      expect(response.body.result.success).toBe(2);
    });

    it('should return 400 if accounts array is empty', async () => {
      const response = await request(app)
        .post('/api/accounts/bulk-import')
        .send({
          accounts: [],
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('GET /api/accounts/stats/swarm', () => {
    it('should return swarm statistics', async () => {
      const mockStats = {
        total: 10,
        active: 7,
        warmingUp: 2,
        paused: 1,
        banned: 0,
        avgHealthScore: 82.5,
      };

      (accountService.getSwarmStats as jest.Mock).mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/accounts/stats/swarm')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.total).toBe(10);
      expect(response.body.active).toBe(7);
      expect(response.body.avgHealthScore).toBe(82.5);
    });
  });
});
