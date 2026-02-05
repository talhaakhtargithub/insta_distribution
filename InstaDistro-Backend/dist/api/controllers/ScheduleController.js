"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleController = void 0;
const ScheduleService_1 = __importDefault(require("../../services/schedule/ScheduleService"));
const QueueOptimizer_1 = __importDefault(require("../../services/schedule/QueueOptimizer"));
const CalendarService_1 = __importDefault(require("../../services/schedule/CalendarService"));
const logger_1 = require("../../config/logger");
// ============================================
// SCHEDULE CONTROLLER
// ============================================
class ScheduleController {
    /**
     * POST /api/schedules
     * Create a new schedule
     */
    async createSchedule(req, res) {
        try {
            const { userId, videoId, videoUri, accountIds, scheduleType, scheduledTime, recurringConfig, queueConfig, bulkConfig, caption, hashtags, location, thumbnailUri } = req.body;
            if (!userId || !videoId || !videoUri || !accountIds || !scheduleType) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields'
                });
            }
            const schedule = await ScheduleService_1.default.createSchedule(userId, videoId, videoUri, accountIds, scheduleType, {
                scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
                recurringConfig,
                queueConfig,
                bulkConfig,
                caption,
                hashtags,
                location,
                thumbnailUri
            });
            res.status(201).json({
                success: true,
                data: schedule
            });
        }
        catch (error) {
            logger_1.logger.error('Error creating schedule', { error: error.message, stack: error.stack });
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
    async getSchedules(req, res) {
        try {
            const userId = req.query.userId || req.user?.id;
            const status = req.query.status;
            const scheduleType = req.query.scheduleType;
            const limit = req.query.limit ? parseInt(req.query.limit) : 50;
            const offset = req.query.offset ? parseInt(req.query.offset) : 0;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const result = await ScheduleService_1.default.getSchedulesByUser(userId, {
                status,
                scheduleType,
                limit,
                offset
            });
            res.json({
                success: true,
                data: result
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting schedules', { error: error.message, stack: error.stack });
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
    async getScheduleById(req, res) {
        try {
            const { id } = req.params;
            const schedule = await ScheduleService_1.default.getScheduleById(id);
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
        }
        catch (error) {
            logger_1.logger.error('Error getting schedule', { error: error.message, stack: error.stack });
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
    async updateSchedule(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;
            if (updates.scheduledTime) {
                updates.scheduledTime = new Date(updates.scheduledTime);
            }
            const schedule = await ScheduleService_1.default.updateSchedule(id, updates);
            res.json({
                success: true,
                data: schedule
            });
        }
        catch (error) {
            logger_1.logger.error('Error updating schedule', { error: error.message, stack: error.stack });
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
    async cancelSchedule(req, res) {
        try {
            const { id } = req.params;
            await ScheduleService_1.default.cancelSchedule(id);
            res.json({
                success: true,
                message: 'Schedule cancelled successfully'
            });
        }
        catch (error) {
            logger_1.logger.error('Error cancelling schedule', { error: error.message, stack: error.stack });
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
    async getStats(req, res) {
        try {
            const userId = req.query.userId || req.user?.id;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const stats = await ScheduleService_1.default.getScheduleStats(userId);
            res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting schedule stats', { error: error.message, stack: error.stack });
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
    async optimizeQueue(req, res) {
        try {
            const { userId, posts, config } = req.body;
            if (!userId || !posts || !config) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: userId, posts, config'
                });
            }
            const slots = await QueueOptimizer_1.default.optimizeQueue(userId, posts, {
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
        }
        catch (error) {
            logger_1.logger.error('Error optimizing queue', { error: error.message, stack: error.stack });
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
    async getOptimalTimes(req, res) {
        try {
            const { accountId } = req.params;
            const count = req.query.count ? parseInt(req.query.count) : 3;
            const optimalTimes = await QueueOptimizer_1.default.getOptimalTimes(accountId, count);
            res.json({
                success: true,
                data: optimalTimes
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting optimal times', { error: error.message, stack: error.stack });
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
    async getOptimizationReport(req, res) {
        try {
            const { accountId } = req.params;
            const report = await QueueOptimizer_1.default.createOptimizationReport(accountId);
            res.json({
                success: true,
                data: report
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting optimization report', { error: error.message, stack: error.stack });
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
    async getMonthCalendar(req, res) {
        try {
            const userId = req.query.userId || req.user?.id;
            const month = parseInt(req.query.month);
            const year = parseInt(req.query.year);
            if (!userId || !month || !year) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required parameters: userId, month, year'
                });
            }
            const calendar = await CalendarService_1.default.getMonthCalendar(userId, month, year);
            res.json({
                success: true,
                data: calendar
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting month calendar', { error: error.message, stack: error.stack });
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
    async getWeekCalendar(req, res) {
        try {
            const userId = req.query.userId || req.user?.id;
            const startDate = new Date(req.query.startDate);
            if (!userId || !startDate) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required parameters: userId, startDate'
                });
            }
            const calendar = await CalendarService_1.default.getWeekCalendar(userId, startDate);
            res.json({
                success: true,
                data: calendar
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting week calendar', { error: error.message, stack: error.stack });
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
    async getDayTimeline(req, res) {
        try {
            const userId = req.query.userId || req.user?.id;
            const date = new Date(req.query.date);
            if (!userId || !date) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required parameters: userId, date'
                });
            }
            const timeline = await CalendarService_1.default.getDayTimeline(userId, date);
            res.json({
                success: true,
                data: timeline
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting day timeline', { error: error.message, stack: error.stack });
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
    async getUpcoming(req, res) {
        try {
            const userId = req.query.userId || req.user?.id;
            const days = req.query.days ? parseInt(req.query.days) : 7;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const events = await CalendarService_1.default.getUpcomingEvents(userId, days);
            res.json({
                success: true,
                data: {
                    events,
                    count: events.length
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting upcoming events', { error: error.message, stack: error.stack });
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
    async getConflicts(req, res) {
        try {
            const userId = req.query.userId || req.user?.id;
            const startDate = new Date(req.query.startDate);
            const endDate = new Date(req.query.endDate);
            if (!userId || !startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required parameters: userId, startDate, endDate'
                });
            }
            const conflicts = await CalendarService_1.default.getScheduleConflicts(userId, startDate, endDate);
            res.json({
                success: true,
                data: {
                    conflicts,
                    count: conflicts.length
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting conflicts', { error: error.message, stack: error.stack });
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
    async getHeatmap(req, res) {
        try {
            const userId = req.query.userId || req.user?.id;
            const days = req.query.days ? parseInt(req.query.days) : 30;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            const heatmap = await CalendarService_1.default.getPostingHeatmap(userId, days);
            res.json({
                success: true,
                data: heatmap
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting heatmap', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}
exports.ScheduleController = ScheduleController;
exports.default = new ScheduleController();
