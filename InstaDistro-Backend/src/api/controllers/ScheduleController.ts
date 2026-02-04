import { Request, Response } from 'express';
import ScheduleService from '../../services/schedule/ScheduleService';
import QueueOptimizer from '../../services/schedule/QueueOptimizer';
import CalendarService from '../../services/schedule/CalendarService';
import { logger } from '../../config/logger';

// ============================================
// SCHEDULE CONTROLLER
// ============================================

export class ScheduleController {

  /**
   * POST /api/schedules
   * Create a new schedule
   */
  async createSchedule(req: Request, res: Response) {
    try {
      const {
        userId,
        videoId,
        videoUri,
        accountIds,
        scheduleType,
        scheduledTime,
        recurringConfig,
        queueConfig,
        bulkConfig,
        caption,
        hashtags,
        location,
        thumbnailUri
      } = req.body;

      if (!userId || !videoId || !videoUri || !accountIds || !scheduleType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      const schedule = await ScheduleService.createSchedule(
        userId,
        videoId,
        videoUri,
        accountIds,
        scheduleType,
        {
          scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
          recurringConfig,
          queueConfig,
          bulkConfig,
          caption,
          hashtags,
          location,
          thumbnailUri
        }
      );

      res.status(201).json({
        success: true,
        data: schedule
      });

    } catch (error: any) {
      logger.error('Error creating schedule', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/schedules
   * Get all schedules for user
   */
  async getSchedules(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string || (req as any).user?.id;
      const status = req.query.status as any;
      const scheduleType = req.query.scheduleType as any;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const result = await ScheduleService.getSchedulesByUser(userId, {
        status,
        scheduleType,
        limit,
        offset
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      logger.error('Error getting schedules', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/schedules/:id
   * Get schedule by ID
   */
  async getScheduleById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const schedule = await ScheduleService.getScheduleById(id);

      if (!schedule) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found'
        });
      }

      res.json({
        success: true,
        data: schedule
      });

    } catch (error: any) {
      logger.error('Error getting schedule', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PUT /api/schedules/:id
   * Update schedule
   */
  async updateSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (updates.scheduledTime) {
        updates.scheduledTime = new Date(updates.scheduledTime);
      }

      const schedule = await ScheduleService.updateSchedule(id, updates);

      res.json({
        success: true,
        data: schedule
      });

    } catch (error: any) {
      logger.error('Error updating schedule', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/schedules/:id
   * Cancel schedule
   */
  async cancelSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await ScheduleService.cancelSchedule(id);

      res.json({
        success: true,
        message: 'Schedule cancelled successfully'
      });

    } catch (error: any) {
      logger.error('Error cancelling schedule', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/schedules/stats
   * Get schedule statistics
   */
  async getStats(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string || (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const stats = await ScheduleService.getScheduleStats(userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      logger.error('Error getting schedule stats', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/schedules/optimize
   * Optimize queue schedule
   */
  async optimizeQueue(req: Request, res: Response) {
    try {
      const { userId, posts, config } = req.body;

      if (!userId || !posts || !config) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, posts, config'
        });
      }

      const slots = await QueueOptimizer.optimizeQueue(userId, posts, {
        startDate: new Date(config.startDate),
        endDate: new Date(config.endDate),
        postsPerDay: config.postsPerDay,
        useOptimalTimes: config.useOptimalTimes
      });

      res.json({
        success: true,
        data: {
          slots,
          count: slots.length
        }
      });

    } catch (error: any) {
      logger.error('Error optimizing queue', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/schedules/optimal-times/:accountId
   * Get optimal posting times for account
   */
  async getOptimalTimes(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const count = req.query.count ? parseInt(req.query.count as string) : 3;

      const optimalTimes = await QueueOptimizer.getOptimalTimes(accountId, count);

      res.json({
        success: true,
        data: optimalTimes
      });

    } catch (error: any) {
      logger.error('Error getting optimal times', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/schedules/optimization/:accountId
   * Get optimization report for account
   */
  async getOptimizationReport(req: Request, res: Response) {
    try {
      const { accountId } = req.params;

      const report = await QueueOptimizer.createOptimizationReport(accountId);

      res.json({
        success: true,
        data: report
      });

    } catch (error: any) {
      logger.error('Error getting optimization report', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/schedules/calendar/month
   * Get monthly calendar view
   */
  async getMonthCalendar(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string || (req as any).user?.id;
      const month = parseInt(req.query.month as string);
      const year = parseInt(req.query.year as string);

      if (!userId || !month || !year) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: userId, month, year'
        });
      }

      const calendar = await CalendarService.getMonthCalendar(userId, month, year);

      res.json({
        success: true,
        data: calendar
      });

    } catch (error: any) {
      logger.error('Error getting month calendar', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/schedules/calendar/week
   * Get weekly calendar view
   */
  async getWeekCalendar(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string || (req as any).user?.id;
      const startDate = new Date(req.query.startDate as string);

      if (!userId || !startDate) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: userId, startDate'
        });
      }

      const calendar = await CalendarService.getWeekCalendar(userId, startDate);

      res.json({
        success: true,
        data: calendar
      });

    } catch (error: any) {
      logger.error('Error getting week calendar', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/schedules/calendar/day
   * Get daily timeline
   */
  async getDayTimeline(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string || (req as any).user?.id;
      const date = new Date(req.query.date as string);

      if (!userId || !date) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: userId, date'
        });
      }

      const timeline = await CalendarService.getDayTimeline(userId, date);

      res.json({
        success: true,
        data: timeline
      });

    } catch (error: any) {
      logger.error('Error getting day timeline', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/schedules/upcoming
   * Get upcoming events
   */
  async getUpcoming(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string || (req as any).user?.id;
      const days = req.query.days ? parseInt(req.query.days as string) : 7;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const events = await CalendarService.getUpcomingEvents(userId, days);

      res.json({
        success: true,
        data: {
          events,
          count: events.length
        }
      });

    } catch (error: any) {
      logger.error('Error getting upcoming events', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/schedules/conflicts
   * Get schedule conflicts
   */
  async getConflicts(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string || (req as any).user?.id;
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);

      if (!userId || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: userId, startDate, endDate'
        });
      }

      const conflicts = await CalendarService.getScheduleConflicts(userId, startDate, endDate);

      res.json({
        success: true,
        data: {
          conflicts,
          count: conflicts.length
        }
      });

    } catch (error: any) {
      logger.error('Error getting conflicts', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/schedules/heatmap
   * Get posting heatmap
   */
  async getHeatmap(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string || (req as any).user?.id;
      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const heatmap = await CalendarService.getPostingHeatmap(userId, days);

      res.json({
        success: true,
        data: heatmap
      });

    } catch (error: any) {
      logger.error('Error getting heatmap', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new ScheduleController();
