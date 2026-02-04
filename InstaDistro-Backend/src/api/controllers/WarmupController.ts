import { Request, Response } from 'express';
import { warmupAutomationService } from '../../services/swarm/WarmupAutomation';
import { getWarmupQueueStats, processWarmupTasksNow } from '../../jobs/WarmupJob';
import { logger } from '../../config/logger';

/**
 * Warmup Controller
 *
 * Handles API endpoints for warmup protocol management
 */
export class WarmupController {
  /**
   * POST /api/warmup/start/:accountId
   * Start warmup protocol for an account
   */
  async startWarmup(req: Request, res: Response) {
    try {
      const { accountId } = req.params;

      if (!accountId) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'accountId is required',
        });
      }

      logger.info(`Starting warmup for account ${accountId}`);

      const result = await warmupAutomationService.startWarmup(accountId);

      if (!result.success) {
        return res.status(400).json({
          error: 'Warmup Start Failed',
          message: result.message,
          details: result.error,
        });
      }

      res.json({
        success: true,
        message: result.message,
        tasksGenerated: result.tasksGenerated,
      });
    } catch (error: any) {
      logger.error('Start warmup error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to start warmup',
      });
    }
  }

  /**
   * GET /api/warmup/progress/:accountId
   * Get warmup progress for an account
   */
  async getProgress(req: Request, res: Response) {
    try {
      const { accountId } = req.params;

      if (!accountId) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'accountId is required',
        });
      }

      const progress = await warmupAutomationService.getProgress(accountId);

      if (!progress) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'No warmup progress found for this account',
        });
      }

      res.json({
        success: true,
        progress,
      });
    } catch (error: any) {
      logger.error('Get warmup progress error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to get warmup progress',
      });
    }
  }

  /**
   * GET /api/warmup/tasks/:accountId/:day
   * Get warmup tasks for specific account and day
   */
  async getTasksForDay(req: Request, res: Response) {
    try {
      const { accountId, day } = req.params;

      if (!accountId || !day) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'accountId and day are required',
        });
      }

      const dayNumber = parseInt(day);

      if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 14) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'day must be between 1 and 14',
        });
      }

      const tasks = await warmupAutomationService.getTasksForDay(accountId, dayNumber);

      res.json({
        success: true,
        day: dayNumber,
        tasks,
        count: tasks.length,
      });
    } catch (error: any) {
      logger.error('Get tasks for day error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to get tasks',
      });
    }
  }

  /**
   * POST /api/warmup/pause/:accountId
   * Pause warmup for an account
   */
  async pauseWarmup(req: Request, res: Response) {
    try {
      const { accountId } = req.params;

      if (!accountId) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'accountId is required',
        });
      }

      logger.info(`Pausing warmup for account ${accountId}`);

      const success = await warmupAutomationService.pauseWarmup(accountId);

      if (!success) {
        return res.status(400).json({
          error: 'Pause Failed',
          message: 'Failed to pause warmup',
        });
      }

      res.json({
        success: true,
        message: 'Warmup paused successfully',
      });
    } catch (error: any) {
      logger.error('Pause warmup error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to pause warmup',
      });
    }
  }

  /**
   * POST /api/warmup/resume/:accountId
   * Resume warmup for an account
   */
  async resumeWarmup(req: Request, res: Response) {
    try {
      const { accountId } = req.params;

      if (!accountId) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'accountId is required',
        });
      }

      logger.info(`Resuming warmup for account ${accountId}`);

      const success = await warmupAutomationService.resumeWarmup(accountId);

      if (!success) {
        return res.status(400).json({
          error: 'Resume Failed',
          message: 'Failed to resume warmup',
        });
      }

      res.json({
        success: true,
        message: 'Warmup resumed successfully',
      });
    } catch (error: any) {
      logger.error('Resume warmup error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to resume warmup',
      });
    }
  }

  /**
   * POST /api/warmup/skip-to-active/:accountId
   * Skip warmup and force account to ACTIVE (risky!)
   */
  async skipToActive(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const { confirmed } = req.body;

      if (!accountId) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'accountId is required',
        });
      }

      if (!confirmed) {
        return res.status(400).json({
          error: 'Confirmation Required',
          message: 'You must confirm this risky action by setting confirmed: true',
          warning:
            'Skipping warmup increases the risk of account suspension. This action cannot be undone.',
        });
      }

      logger.warn(`⚠️ Skipping warmup for account ${accountId} (RISKY!)`);

      const result = await warmupAutomationService.skipToActive(accountId);

      if (!result.success) {
        return res.status(400).json({
          error: 'Skip Failed',
          message: result.message,
          details: result.error,
        });
      }

      res.json({
        success: true,
        message: result.message,
        warning: 'Account is now ACTIVE. Monitor closely for any issues.',
      });
    } catch (error: any) {
      logger.error('Skip to active error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to skip warmup',
      });
    }
  }

  /**
   * GET /api/warmup/accounts
   * Get all accounts currently in warmup
   */
  async getAccountsInWarmup(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;

      const accounts = await warmupAutomationService.getAccountsInWarmup(userId);

      res.json({
        success: true,
        accounts,
        count: accounts.length,
      });
    } catch (error: any) {
      logger.error('Get accounts in warmup error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to get accounts in warmup',
      });
    }
  }

  /**
   * GET /api/warmup/stats
   * Get warmup statistics
   */
  async getStats(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;

      const stats = await warmupAutomationService.getWarmupStats(userId);
      const queueStats = await getWarmupQueueStats();

      res.json({
        success: true,
        stats: {
          ...stats,
          queue: queueStats,
        },
      });
    } catch (error: any) {
      logger.error('Get warmup stats error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to get warmup stats',
      });
    }
  }

  /**
   * POST /api/warmup/process-now
   * Manually trigger warmup task processing (admin only)
   */
  async processNow(req: Request, res: Response) {
    try {
      logger.info('Manually triggering warmup task processing');

      await processWarmupTasksNow();

      res.json({
        success: true,
        message: 'Warmup task processing triggered',
      });
    } catch (error: any) {
      logger.error('Process now error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to trigger processing',
      });
    }
  }

  /**
   * GET /api/warmup/protocol
   * Get the warmup protocol details (14-day schedule)
   */
  async getProtocol(req: Request, res: Response) {
    try {
      const { WARMUP_PROTOCOL } = await import('../../models/WarmupTask');

      res.json({
        success: true,
        protocol: WARMUP_PROTOCOL,
        totalDays: 14,
        description: '14-day aggressive warmup protocol for new Instagram accounts',
      });
    } catch (error: any) {
      logger.error('Get protocol error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to get protocol',
      });
    }
  }
}

export const warmupController = new WarmupController();
