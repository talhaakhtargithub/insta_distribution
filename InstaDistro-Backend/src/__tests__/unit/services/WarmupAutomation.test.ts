import { WarmupAutomationService, StartWarmupResult, WarmupProgress } from '../../../services/swarm/WarmupAutomation';
import { pool } from '../../../config/database';
import { WARMUP_PROTOCOL } from '../../../models/WarmupTask';

// Mock dependencies
jest.mock('../../../config/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('WarmupAutomationService Unit Tests', () => {
  let warmupService: WarmupAutomationService;

  beforeEach(() => {
    jest.clearAllMocks();
    warmupService = new WarmupAutomationService();
  });

  describe('startWarmup()', () => {
    const mockAccount = {
      id: 'acc123',
      username: 'testuser',
      account_state: 'NEW_ACCOUNT',
    };

    it('should start warmup protocol successfully', async () => {
      // Mock account exists
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAccount] }) // Account query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Existing tasks check
        .mockResolvedValueOnce({ rows: [] }) // Update account state
        .mockResolvedValue({ rows: [] }); // Task insertions

      const result = await warmupService.startWarmup('acc123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
      expect(result.tasksGenerated).toBeGreaterThan(0);

      // Verify account state was updated
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE accounts'),
        expect.arrayContaining(['WARMING_UP', 'acc123'])
      );
    });

    it('should return error if account not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await warmupService.startWarmup('nonexistent');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Account not found');
    });

    it('should return error if warmup already started', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAccount] }) // Account exists
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }); // Already has tasks

      const result = await warmupService.startWarmup('acc123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('already started');
    });

    it('should handle database errors gracefully', async () => {
      (pool.query as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const result = await warmupService.startWarmup('acc123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to start');
      expect(result.error).toBe('Database connection failed');
    });
  });

  describe('getProgress()', () => {
    const mockTasks = [
      {
        id: 'task1',
        account_id: 'acc123',
        day: 1,
        task_type: 'follow',
        target_count: 5,
        completed_count: 5,
        status: 'completed',
      },
      {
        id: 'task2',
        account_id: 'acc123',
        day: 1,
        task_type: 'like',
        target_count: 10,
        completed_count: 10,
        status: 'completed',
      },
      {
        id: 'task3',
        account_id: 'acc123',
        day: 2,
        task_type: 'follow',
        target_count: 5,
        completed_count: 0,
        status: 'pending',
        scheduled_time: new Date('2024-01-02T10:00:00Z'),
      },
    ];

    it('should return warmup progress with statistics', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockTasks });

      const result = await warmupService.getProgress('acc123');

      expect(result).toBeDefined();
      expect(result?.accountId).toBe('acc123');
      expect(result?.currentDay).toBeGreaterThan(0);
      expect(result?.progressPercentage).toBeGreaterThanOrEqual(0);
      expect(result?.progressPercentage).toBeLessThanOrEqual(100);
      expect(result?.tasksCompleted).toBe(2);
      expect(result?.tasksTotal).toBe(3);
    });

    it('should return null if no warmup tasks exist', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await warmupService.getProgress('acc123');

      expect(result).toBeNull();
    });

    it('should calculate completion correctly', async () => {
      const allCompletedTasks = mockTasks.map(t => ({ ...t, status: 'completed' }));
      (pool.query as jest.Mock).mockResolvedValue({ rows: allCompletedTasks });

      const result = await warmupService.getProgress('acc123');

      expect(result?.isComplete).toBe(false); // Not complete until all 14 days done
    });

    it('should identify next scheduled task', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockTasks });

      const result = await warmupService.getProgress('acc123');

      expect(result?.nextTaskTime).toBeDefined();
    });
  });

  describe('getTasksForDay()', () => {
    const mockDayTasks = [
      {
        id: 'task1',
        day: 5,
        task_type: 'follow',
        target_count: 10,
        status: 'pending',
      },
      {
        id: 'task2',
        day: 5,
        task_type: 'like',
        target_count: 20,
        status: 'pending',
      },
    ];

    it('should return tasks for specific day', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockDayTasks });

      const result = await warmupService.getTasksForDay('acc123', 5);

      expect(result).toHaveLength(2);
      expect(result[0].day).toBe(5);
      expect(result[1].day).toBe(5);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE account_id'),
        expect.arrayContaining(['acc123', 5])
      );
    });

    it('should return empty array if no tasks for day', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await warmupService.getTasksForDay('acc123', 15);

      expect(result).toEqual([]);
    });
  });

  describe('pauseWarmup()', () => {
    it('should pause warmup by updating account state', async () => {
      const mockAccount = { id: 'acc123', account_state: 'WARMING_UP' };
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAccount] }) // Check account
        .mockResolvedValueOnce({ rows: [] }); // Update state

      const result = await warmupService.pauseWarmup('acc123');

      expect(result.success).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE accounts'),
        expect.arrayContaining(['PAUSED', 'acc123'])
      );
    });

    it('should return error if account not in warmup', async () => {
      const mockAccount = { id: 'acc123', account_state: 'ACTIVE' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockAccount] });

      const result = await warmupService.pauseWarmup('acc123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not in warmup');
    });
  });

  describe('resumeWarmup()', () => {
    it('should resume warmup by updating account state', async () => {
      const mockAccount = { id: 'acc123', account_state: 'PAUSED' };
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAccount] }) // Check account
        .mockResolvedValueOnce({ rows: [] }); // Update state

      const result = await warmupService.resumeWarmup('acc123');

      expect(result.success).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE accounts'),
        expect.arrayContaining(['WARMING_UP', 'acc123'])
      );
    });

    it('should return error if account not paused', async () => {
      const mockAccount = { id: 'acc123', account_state: 'ACTIVE' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockAccount] });

      const result = await warmupService.resumeWarmup('acc123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not paused');
    });
  });

  describe('skipToActive()', () => {
    it('should skip warmup and transition to ACTIVE', async () => {
      const mockAccount = { id: 'acc123', account_state: 'WARMING_UP' };
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAccount] }) // Check account
        .mockResolvedValueOnce({ rows: [] }) // Update account state
        .mockResolvedValueOnce({ rows: [] }); // Delete warmup tasks

      const result = await warmupService.skipToActive('acc123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('transitioned to ACTIVE');

      // Verify state updated to ACTIVE
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE accounts'),
        expect.arrayContaining(['ACTIVE', 'acc123'])
      );

      // Verify warmup tasks cleaned up
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM warmup_tasks'),
        expect.arrayContaining(['acc123'])
      );
    });

    it('should return error if account not in warmup', async () => {
      const mockAccount = { id: 'acc123', account_state: 'ACTIVE' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockAccount] });

      const result = await warmupService.skipToActive('acc123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not in warmup');
    });
  });

  describe('getAccountsInWarmup()', () => {
    const mockWarmupAccounts = [
      {
        id: 'acc1',
        username: 'user1',
        account_state: 'WARMING_UP',
        progress: 35,
        current_day: 5,
      },
      {
        id: 'acc2',
        username: 'user2',
        account_state: 'WARMING_UP',
        progress: 70,
        current_day: 10,
      },
    ];

    it('should return all accounts in warmup for user', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockWarmupAccounts });

      const result = await warmupService.getAccountsInWarmup('user123');

      expect(result).toHaveLength(2);
      expect(result[0].account_state).toBe('WARMING_UP');
      expect(result[1].account_state).toBe('WARMING_UP');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("account_state = 'WARMING_UP'"),
        expect.arrayContaining(['user123'])
      );
    });

    it('should return empty array if no accounts in warmup', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await warmupService.getAccountsInWarmup('user123');

      expect(result).toEqual([]);
    });
  });

  describe('getWarmupStats()', () => {
    const mockStats = [
      {
        total_accounts: 5,
        avg_progress: 45.5,
        total_tasks: 150,
        completed_tasks: 68,
        pending_tasks: 72,
        failed_tasks: 10,
      },
    ];

    it('should return warmup statistics', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockStats });

      const result = await warmupService.getWarmupStats('user123');

      expect(result).toBeDefined();
      expect(result.totalAccounts).toBe(5);
      expect(result.avgProgress).toBe(45.5);
      expect(result.totalTasks).toBe(150);
      expect(result.completedTasks).toBe(68);
    });

    it('should handle users with no warmup accounts', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{
          total_accounts: 0,
          avg_progress: null,
          total_tasks: 0,
          completed_tasks: 0,
          pending_tasks: 0,
          failed_tasks: 0,
        }],
      });

      const result = await warmupService.getWarmupStats('user123');

      expect(result.totalAccounts).toBe(0);
      expect(result.avgProgress).toBe(0);
    });
  });

  describe('WARMUP_PROTOCOL validation', () => {
    it('should have all 14 days defined', () => {
      expect(Object.keys(WARMUP_PROTOCOL)).toHaveLength(14);

      for (let day = 1; day <= 14; day++) {
        expect(WARMUP_PROTOCOL[day]).toBeDefined();
      }
    });

    it('should have increasing activity over days', () => {
      const day1 = WARMUP_PROTOCOL[1];
      const day7 = WARMUP_PROTOCOL[7];
      const day14 = WARMUP_PROTOCOL[14];

      // Early days should have fewer/lighter tasks
      expect(day1.length).toBeLessThanOrEqual(day7.length);

      // Should have posting by day 14
      const hasPosting = day14.some(task =>
        task.taskType === 'post' || task.taskType === 'story'
      );
      expect(hasPosting).toBe(true);
    });
  });
});
