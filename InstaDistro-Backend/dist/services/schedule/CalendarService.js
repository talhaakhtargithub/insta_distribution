"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarService = void 0;
const database_1 = require("../../config/database");
const ScheduleService_1 = __importDefault(require("./ScheduleService"));
// ============================================
// CALENDAR SERVICE
// ============================================
class CalendarService {
    /**
     * Get calendar view for a specific month
     */
    async getMonthCalendar(userId, month, year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        // Get all schedules for the month
        const { schedules } = await ScheduleService_1.default.getSchedulesByUser(userId, {
            startDate,
            endDate
        });
        // Organize by weeks
        const weeks = [];
        let currentDate = new Date(startDate);
        let weekNumber = 1;
        while (currentDate <= endDate) {
            const weekStart = new Date(currentDate);
            const weekEnd = new Date(currentDate);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const week = await this.getWeekData(userId, weekStart, weekEnd, weekNumber, schedules);
            weeks.push(week);
            weekNumber++;
            currentDate.setDate(currentDate.getDate() + 7);
        }
        // Calculate monthly totals
        const monthlyTotals = {
            scheduled: schedules.filter(s => s.status === 'pending').length,
            completed: schedules.filter(s => s.status === 'completed').length,
            failed: schedules.filter(s => s.status === 'failed').length
        };
        return {
            month,
            year,
            weeks,
            monthlyTotals
        };
    }
    /**
     * Get calendar view for a specific week
     */
    async getWeekCalendar(userId, startDate) {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        const { schedules } = await ScheduleService_1.default.getSchedulesByUser(userId, {
            startDate,
            endDate
        });
        return this.getWeekData(userId, startDate, endDate, 1, schedules);
    }
    /**
     * Get timeline view for a specific day
     */
    async getDayTimeline(userId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const { schedules } = await ScheduleService_1.default.getSchedulesByUser(userId, {
            startDate: startOfDay,
            endDate: endOfDay
        });
        // Create timeline events
        const events = schedules.map(schedule => ({
            id: schedule.id,
            time: schedule.scheduledTime || schedule.nextAttemptTime || schedule.createdAt,
            type: schedule.status === 'completed' ? 'completed' :
                schedule.status === 'failed' ? 'failed' : 'scheduled',
            schedule,
            accountCount: schedule.accountIds.length
        }));
        // Sort by time
        events.sort((a, b) => a.time.getTime() - b.time.getTime());
        return events;
    }
    /**
     * Get upcoming events (next 7 days)
     */
    async getUpcomingEvents(userId, days = 7) {
        const now = new Date();
        const future = new Date();
        future.setDate(future.getDate() + days);
        const { schedules } = await ScheduleService_1.default.getSchedulesByUser(userId, {
            status: 'pending',
            startDate: now,
            endDate: future
        });
        const events = schedules.map(schedule => ({
            id: schedule.id,
            time: schedule.nextAttemptTime || schedule.scheduledTime || schedule.createdAt,
            type: 'scheduled',
            schedule,
            accountCount: schedule.accountIds.length
        }));
        events.sort((a, b) => a.time.getTime() - b.time.getTime());
        return events;
    }
    /**
     * Get schedule conflicts (overlapping posts for same accounts)
     */
    async getScheduleConflicts(userId, startDate, endDate) {
        const { schedules } = await ScheduleService_1.default.getSchedulesByUser(userId, {
            status: 'pending',
            startDate,
            endDate
        });
        const conflicts = new Map();
        // Group by time (within 5 minutes)
        for (const schedule of schedules) {
            const time = schedule.scheduledTime || schedule.nextAttemptTime;
            if (!time)
                continue;
            const timeKey = this.getTimeKey(time, 5); // 5-minute window
            if (!conflicts.has(timeKey)) {
                conflicts.set(timeKey, []);
            }
            conflicts.get(timeKey).push(schedule);
        }
        // Find actual conflicts (same accounts at same time)
        const conflictList = [];
        for (const [timeKey, scheduleGroup] of conflicts) {
            if (scheduleGroup.length <= 1)
                continue;
            // Find overlapping accounts
            const accountMap = new Map();
            for (const schedule of scheduleGroup) {
                for (const accountId of schedule.accountIds) {
                    if (!accountMap.has(accountId)) {
                        accountMap.set(accountId, []);
                    }
                    accountMap.get(accountId).push(schedule);
                }
            }
            // Accounts with multiple schedules = conflict
            const affectedAccounts = [];
            const conflictingSchedules = [];
            for (const [accountId, accountSchedules] of accountMap) {
                if (accountSchedules.length > 1) {
                    affectedAccounts.push(accountId);
                    accountSchedules.forEach(s => {
                        if (!conflictingSchedules.includes(s)) {
                            conflictingSchedules.push(s);
                        }
                    });
                }
            }
            if (affectedAccounts.length > 0) {
                conflictList.push({
                    time: this.parseTimeKey(timeKey),
                    conflictingSchedules,
                    affectedAccounts
                });
            }
        }
        return conflictList;
    }
    /**
     * Get posting heatmap data (for visualization)
     */
    async getPostingHeatmap(userId, days = 30) {
        const client = await database_1.pool.connect();
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const result = await client.query(`SELECT
           DATE(posted_at) as date,
           EXTRACT(HOUR FROM posted_at) as hour,
           COUNT(*) as count
         FROM post_results pr
         JOIN accounts a ON pr.account_id = a.id
         WHERE a.user_id = $1
           AND posted_at >= $2
         GROUP BY DATE(posted_at), EXTRACT(HOUR FROM posted_at)
         ORDER BY date, hour`, [userId, startDate]);
            const data = result.rows.map(row => ({
                date: row.date,
                hour: parseInt(row.hour),
                count: parseInt(row.count)
            }));
            const maxCount = data.length > 0
                ? Math.max(...data.map(d => d.count))
                : 0;
            return { data, maxCount };
        }
        finally {
            client.release();
        }
    }
    /**
     * Helper: Get week data
     */
    async getWeekData(userId, startDate, endDate, weekNumber, allSchedules) {
        const days = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);
            const daySchedules = allSchedules.filter(s => {
                const scheduleTime = s.scheduledTime || s.nextAttemptTime;
                return scheduleTime && scheduleTime >= dayStart && scheduleTime <= dayEnd;
            });
            days.push({
                date: new Date(currentDate),
                dayOfWeek: currentDate.getDay(),
                scheduledPosts: daySchedules.filter(s => s.status === 'pending').length,
                completedPosts: daySchedules.filter(s => s.status === 'completed').length,
                failedPosts: daySchedules.filter(s => s.status === 'failed').length,
                totalPosts: daySchedules.length,
                schedules: daySchedules
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        const weeklyTotals = {
            scheduled: days.reduce((sum, d) => sum + d.scheduledPosts, 0),
            completed: days.reduce((sum, d) => sum + d.completedPosts, 0),
            failed: days.reduce((sum, d) => sum + d.failedPosts, 0)
        };
        return {
            weekNumber,
            startDate,
            endDate,
            days,
            weeklyTotals
        };
    }
    /**
     * Helper: Get time key for grouping
     */
    getTimeKey(time, minuteWindow) {
        const roundedMinutes = Math.floor(time.getMinutes() / minuteWindow) * minuteWindow;
        const rounded = new Date(time);
        rounded.setMinutes(roundedMinutes, 0, 0);
        return rounded.toISOString();
    }
    /**
     * Helper: Parse time key back to Date
     */
    parseTimeKey(timeKey) {
        return new Date(timeKey);
    }
}
exports.CalendarService = CalendarService;
exports.default = new CalendarService();
