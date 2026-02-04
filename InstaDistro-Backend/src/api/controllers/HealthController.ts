import { Request, Response } from 'express';
import HealthMonitor from '../../services/health/HealthMonitor';
import MetricsCollector from '../../services/health/MetricsCollector';
import AlertManager from '../../services/health/AlertManager';
import {
  queueAccountMonitoring,
  queueSwarmMonitoring,
  queueDailyReport,
  queueWeeklyReport
} from '../../jobs/HealthMonitorJob';
import { logger } from '../../config/logger';

// ============================================
// HEALTH CONTROLLER
// ============================================

export class HealthController {

  /**
   * GET /api/health/account/:id
   * Get health report for a specific account
   */
  async getAccountHealth(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const report = await HealthMonitor.monitorAccount(id);

      res.json({
        success: true,
        data: report
      });

    } catch (error: any) {
      logger.error('Error getting account health', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/health/account/:id/monitor
   * Queue background monitoring for an account
   */
  async queueAccountMonitoring(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.body.userId || (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const job = await queueAccountMonitoring(id, userId);

      res.json({
        success: true,
        data: {
          jobId: job.id,
          message: 'Account monitoring queued'
        }
      });

    } catch (error: any) {
      logger.error('Error queuing account monitoring', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/health/swarm
   * Get health overview for all user's accounts
   */
  async getSwarmHealth(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string || (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const report = await HealthMonitor.monitorSwarm(userId);

      res.json({
        success: true,
        data: report
      });

    } catch (error: any) {
      logger.error('Error getting swarm health', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/health/swarm/monitor
   * Queue background swarm monitoring
   */
  async queueSwarmMonitoring(req: Request, res: Response) {
    try {
      const userId = req.body.userId || (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const job = await queueSwarmMonitoring(userId);

      res.json({
        success: true,
        data: {
          jobId: job.id,
          message: 'Swarm monitoring queued'
        }
      });

    } catch (error: any) {
      logger.error('Error queuing swarm monitoring', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/health/alerts
   * Get active alerts for user
   */
  async getAlerts(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string || (req as any).user?.id;
      const unacknowledgedOnly = req.query.unacknowledgedOnly === 'true';

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const alerts = await AlertManager.getActiveAlerts(userId, unacknowledgedOnly);

      res.json({
        success: true,
        data: {
          alerts,
          count: alerts.length
        }
      });

    } catch (error: any) {
      logger.error('Error getting alerts', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/health/alerts/account/:id
   * Get alerts for a specific account
   */
  async getAccountAlerts(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const alerts = await AlertManager.getAccountAlerts(id, limit);

      res.json({
        success: true,
        data: {
          alerts,
          count: alerts.length
        }
      });

    } catch (error: any) {
      logger.error('Error getting account alerts', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/health/alerts/:id/acknowledge
   * Acknowledge an alert
   */
  async acknowledgeAlert(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await AlertManager.acknowledgeAlert(id);

      res.json({
        success: true,
        message: 'Alert acknowledged'
      });

    } catch (error: any) {
      logger.error('Error acknowledging alert', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/health/alerts/:id/resolve
   * Resolve an alert
   */
  async resolveAlert(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { resolution } = req.body;

      await AlertManager.resolveAlert(id, resolution);

      res.json({
        success: true,
        message: 'Alert resolved'
      });

    } catch (error: any) {
      logger.error('Error resolving alert', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/health/alerts/stats
   * Get alert statistics
   */
  async getAlertStats(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string || (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const stats = await AlertManager.getAlertStats(userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      logger.error('Error getting alert stats', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/health/reports/daily
   * Get daily health report
   */
  async getDailyReport(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string || (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const report = await HealthMonitor.generateDailyReport(userId);

      res.json({
        success: true,
        data: report
      });

    } catch (error: any) {
      logger.error('Error generating daily report', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/health/reports/daily/queue
   * Queue daily report generation
   */
  async queueDailyReport(req: Request, res: Response) {
    try {
      const userId = req.body.userId || (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const job = await queueDailyReport(userId);

      res.json({
        success: true,
        data: {
          jobId: job.id,
          message: 'Daily report generation queued'
        }
      });

    } catch (error: any) {
      logger.error('Error queuing daily report', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/health/reports/weekly
   * Get weekly health report
   */
  async getWeeklyReport(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string || (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const report = await HealthMonitor.generateWeeklyReport(userId);

      res.json({
        success: true,
        data: report
      });

    } catch (error: any) {
      logger.error('Error generating weekly report', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/health/reports/weekly/queue
   * Queue weekly report generation
   */
  async queueWeeklyReport(req: Request, res: Response) {
    try {
      const userId = req.body.userId || (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const job = await queueWeeklyReport(userId);

      res.json({
        success: true,
        data: {
          jobId: job.id,
          message: 'Weekly report generation queued'
        }
      });

    } catch (error: any) {
      logger.error('Error queuing weekly report', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/health/metrics/:accountId
   * Get detailed metrics for an account
   */
  async getAccountMetrics(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const days = parseInt(req.query.days as string) || 30;

      const [metrics, history, dailyAggregates, weeklyAggregates] = await Promise.all([
        MetricsCollector.collectAccountMetrics(accountId),
        MetricsCollector.getMetricsHistory(accountId, days),
        MetricsCollector.getDailyAggregates(accountId, 7),
        MetricsCollector.getWeeklyAggregates(accountId, 4)
      ]);

      res.json({
        success: true,
        data: {
          current: metrics,
          history,
          daily: dailyAggregates,
          weekly: weeklyAggregates
        }
      });

    } catch (error: any) {
      logger.error('Error getting account metrics', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new HealthController();
