import { pool } from '../../config/database';
import ScheduleService, { Schedule, ScheduleStatus } from './ScheduleService';

// ============================================
// TYPES
// ============================================

export interface CalendarDay {
  date: Date;
  dayOfWeek: number;
  scheduledPosts: number;
  completedPosts: number;
  failedPosts: number;
  totalPosts: number;
  schedules: Schedule[];
}

export interface CalendarWeek {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  days: CalendarDay[];
  weeklyTotals: {
    scheduled: number;
    completed: number;
    failed: number;
  };
}

export interface CalendarMonth {
  month: number;
  year: number;
  weeks: CalendarWeek[];
  monthlyTotals: {
    scheduled: number;
    completed: number;
    failed: number;
  };
}

export interface TimelineEvent {
  id: string;
  time: Date;
  type: 'scheduled' | 'completed' | 'failed';
  schedule: Schedule;
  accountCount: number;
}

// ============================================
// CALENDAR SERVICE
// ============================================

export class CalendarService {

  /**
   * Get calendar view for a specific month
   */
  async getMonthCalendar(userId: string, month: number, year: number): Promise<CalendarMonth> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get all schedules for the month
    const { schedules } = await ScheduleService.getSchedulesByUser(userId, {
      startDate,
      endDate
    });

    // Organize by weeks
    const weeks: CalendarWeek[] = [];
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
  async getWeekCalendar(userId: string, startDate: Date): Promise<CalendarWeek> {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const { schedules } = await ScheduleService.getSchedulesByUser(userId, {
      startDate,
      endDate
    });

    return this.getWeekData(userId, startDate, endDate, 1, schedules);
  }

  /**
   * Get timeline view for a specific day
   */
  async getDayTimeline(userId: string, date: Date): Promise<TimelineEvent[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { schedules } = await ScheduleService.getSchedulesByUser(userId, {
      startDate: startOfDay,
      endDate: endOfDay
    });

    // Create timeline events
    const events: TimelineEvent[] = schedules.map(schedule => ({
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
  async getUpcomingEvents(userId: string, days: number = 7): Promise<TimelineEvent[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    const { schedules } = await ScheduleService.getSchedulesByUser(userId, {
      status: 'pending',
      startDate: now,
      endDate: future
    });

    const events: TimelineEvent[] = schedules.map(schedule => ({
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
  async getScheduleConflicts(userId: string, startDate: Date, endDate: Date): Promise<Array<{
    time: Date;
    conflictingSchedules: Schedule[];
    affectedAccounts: string[];
  }>> {
    const { schedules } = await ScheduleService.getSchedulesByUser(userId, {
      status: 'pending',
      startDate,
      endDate
    });

    const conflicts: Map<string, Schedule[]> = new Map();

    // Group by time (within 5 minutes)
    for (const schedule of schedules) {
      const time = schedule.scheduledTime || schedule.nextAttemptTime;
      if (!time) continue;

      const timeKey = this.getTimeKey(time, 5); // 5-minute window

      if (!conflicts.has(timeKey)) {
        conflicts.set(timeKey, []);
      }

      conflicts.get(timeKey)!.push(schedule);
    }

    // Find actual conflicts (same accounts at same time)
    const conflictList: Array<{
      time: Date;
      conflictingSchedules: Schedule[];
      affectedAccounts: string[];
    }> = [];

    for (const [timeKey, scheduleGroup] of conflicts) {
      if (scheduleGroup.length <= 1) continue;

      // Find overlapping accounts
      const accountMap: Map<string, Schedule[]> = new Map();

      for (const schedule of scheduleGroup) {
        for (const accountId of schedule.accountIds) {
          if (!accountMap.has(accountId)) {
            accountMap.set(accountId, []);
          }
          accountMap.get(accountId)!.push(schedule);
        }
      }

      // Accounts with multiple schedules = conflict
      const affectedAccounts: string[] = [];
      const conflictingSchedules: Schedule[] = [];

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
  async getPostingHeatmap(userId: string, days: number = 30): Promise<{
    data: Array<{
      date: string;
      hour: number;
      count: number;
    }>;
    maxCount: number;
  }> {
    const client = await pool.connect();

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await client.query(
        `SELECT
           DATE(posted_at) as date,
           EXTRACT(HOUR FROM posted_at) as hour,
           COUNT(*) as count
         FROM post_results pr
         JOIN accounts a ON pr.account_id = a.id
         WHERE a.user_id = $1
           AND posted_at >= $2
         GROUP BY DATE(posted_at), EXTRACT(HOUR FROM posted_at)
         ORDER BY date, hour`,
        [userId, startDate]
      );

      const data = result.rows.map(row => ({
        date: row.date,
        hour: parseInt(row.hour),
        count: parseInt(row.count)
      }));

      const maxCount = data.length > 0
        ? Math.max(...data.map(d => d.count))
        : 0;

      return { data, maxCount };

    } finally {
      client.release();
    }
  }

  /**
   * Helper: Get week data
   */
  private async getWeekData(
    userId: string,
    startDate: Date,
    endDate: Date,
    weekNumber: number,
    allSchedules: Schedule[]
  ): Promise<CalendarWeek> {
    const days: CalendarDay[] = [];
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
  private getTimeKey(time: Date, minuteWindow: number): string {
    const roundedMinutes = Math.floor(time.getMinutes() / minuteWindow) * minuteWindow;
    const rounded = new Date(time);
    rounded.setMinutes(roundedMinutes, 0, 0);
    return rounded.toISOString();
  }

  /**
   * Helper: Parse time key back to Date
   */
  private parseTimeKey(timeKey: string): Date {
    return new Date(timeKey);
  }
}

export default new CalendarService();
