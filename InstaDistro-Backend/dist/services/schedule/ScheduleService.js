"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleService = void 0;
const database_1 = require("../../config/database");
// ============================================
// SCHEDULE SERVICE
// ============================================
class ScheduleService {
    /**
     * Create a new schedule
     */
    async createSchedule(userId, videoId, videoUri, accountIds, scheduleType, config) {
        const client = await database_1.pool.connect();
        try {
            const result = await client.query(`INSERT INTO scheduled_posts
         (user_id, video_id, video_uri, thumbnail_uri, account_ids, schedule_type,
          scheduled_time, recurring_config, queue_config, bulk_config,
          caption, hashtags, location)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`, [
                userId,
                videoId,
                videoUri,
                config.thumbnailUri,
                accountIds,
                scheduleType,
                config.scheduledTime,
                config.recurringConfig ? JSON.stringify(config.recurringConfig) : null,
                config.queueConfig ? JSON.stringify(config.queueConfig) : null,
                config.bulkConfig ? JSON.stringify(config.bulkConfig) : null,
                config.caption,
                config.hashtags || [],
                config.location ? JSON.stringify(config.location) : null
            ]);
            // Calculate next attempt time
            await this.updateNextAttemptTime(result.rows[0].id);
            return this.mapRowToSchedule(result.rows[0]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Get schedule by ID
     */
    async getScheduleById(scheduleId) {
        const client = await database_1.pool.connect();
        try {
            const result = await client.query('SELECT * FROM scheduled_posts WHERE id = $1', [scheduleId]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToSchedule(result.rows[0]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Get all schedules for a user
     */
    async getSchedulesByUser(userId, filters) {
        const client = await database_1.pool.connect();
        try {
            let whereConditions = ['user_id = $1'];
            let params = [userId];
            let paramCounter = 2;
            if (filters?.status) {
                whereConditions.push(`status = $${paramCounter++}`);
                params.push(filters.status);
            }
            if (filters?.scheduleType) {
                whereConditions.push(`schedule_type = $${paramCounter++}`);
                params.push(filters.scheduleType);
            }
            if (filters?.startDate) {
                whereConditions.push(`scheduled_time >= $${paramCounter++}`);
                params.push(filters.startDate);
            }
            if (filters?.endDate) {
                whereConditions.push(`scheduled_time <= $${paramCounter++}`);
                params.push(filters.endDate);
            }
            const whereClause = whereConditions.join(' AND ');
            // Get total count
            const countResult = await client.query(`SELECT COUNT(*) as total FROM scheduled_posts WHERE ${whereClause}`, params);
            const total = parseInt(countResult.rows[0].total);
            // Get schedules
            let query = `SELECT * FROM scheduled_posts WHERE ${whereClause} ORDER BY created_at DESC`;
            if (filters?.limit) {
                query += ` LIMIT $${paramCounter++}`;
                params.push(filters.limit);
            }
            if (filters?.offset) {
                query += ` OFFSET $${paramCounter++}`;
                params.push(filters.offset);
            }
            const result = await client.query(query, params);
            return {
                schedules: result.rows.map(row => this.mapRowToSchedule(row)),
                total
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Update schedule
     */
    async updateSchedule(scheduleId, updates) {
        const client = await database_1.pool.connect();
        try {
            const fields = [];
            const values = [];
            let paramCounter = 1;
            if (updates.scheduledTime !== undefined) {
                fields.push(`scheduled_time = $${paramCounter++}`);
                values.push(updates.scheduledTime);
            }
            if (updates.caption !== undefined) {
                fields.push(`caption = $${paramCounter++}`);
                values.push(updates.caption);
            }
            if (updates.hashtags !== undefined) {
                fields.push(`hashtags = $${paramCounter++}`);
                values.push(updates.hashtags);
            }
            if (updates.location !== undefined) {
                fields.push(`location = $${paramCounter++}`);
                values.push(JSON.stringify(updates.location));
            }
            if (updates.status !== undefined) {
                fields.push(`status = $${paramCounter++}`);
                values.push(updates.status);
            }
            if (fields.length === 0) {
                throw new Error('No fields to update');
            }
            values.push(scheduleId);
            const query = `UPDATE scheduled_posts SET ${fields.join(', ')} WHERE id = $${paramCounter} RETURNING *`;
            const result = await client.query(query, values);
            if (result.rows.length === 0) {
                throw new Error('Schedule not found');
            }
            return this.mapRowToSchedule(result.rows[0]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Delete/Cancel schedule
     */
    async cancelSchedule(scheduleId) {
        const client = await database_1.pool.connect();
        try {
            await client.query(`UPDATE scheduled_posts SET status = 'cancelled' WHERE id = $1`, [scheduleId]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Get schedules due for execution
     */
    async getDueSchedules() {
        const client = await database_1.pool.connect();
        try {
            const result = await client.query(`SELECT * FROM scheduled_posts
         WHERE status = 'pending'
           AND next_attempt_time IS NOT NULL
           AND next_attempt_time <= NOW()
         ORDER BY next_attempt_time ASC
         LIMIT 100`);
            return result.rows.map(row => this.mapRowToSchedule(row));
        }
        finally {
            client.release();
        }
    }
    /**
     * Get schedule statistics
     */
    async getScheduleStats(userId) {
        const client = await database_1.pool.connect();
        try {
            const result = await client.query(`SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'pending') as pending,
           COUNT(*) FILTER (WHERE status = 'processing') as processing,
           COUNT(*) FILTER (WHERE status = 'completed') as completed,
           COUNT(*) FILTER (WHERE status = 'failed') as failed,
           COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
           COUNT(*) FILTER (WHERE status = 'pending' AND scheduled_time::date = CURRENT_DATE) as upcoming_today,
           COUNT(*) FILTER (WHERE status = 'pending' AND scheduled_time BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days') as upcoming_this_week
         FROM scheduled_posts
         WHERE user_id = $1`, [userId]);
            const row = result.rows[0];
            return {
                total: parseInt(row.total),
                pending: parseInt(row.pending),
                processing: parseInt(row.processing),
                completed: parseInt(row.completed),
                failed: parseInt(row.failed),
                cancelled: parseInt(row.cancelled),
                upcomingToday: parseInt(row.upcoming_today),
                upcomingThisWeek: parseInt(row.upcoming_this_week)
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Update next attempt time based on schedule configuration
     */
    async updateNextAttemptTime(scheduleId) {
        const client = await database_1.pool.connect();
        try {
            const schedule = await this.getScheduleById(scheduleId);
            if (!schedule) {
                return;
            }
            let nextAttemptTime = null;
            switch (schedule.scheduleType) {
                case 'one-time':
                    nextAttemptTime = schedule.scheduledTime || null;
                    break;
                case 'recurring':
                    nextAttemptTime = this.calculateNextRecurringTime(schedule.recurringConfig);
                    break;
                case 'queue':
                case 'bulk':
                    // Will be calculated by queue optimizer
                    nextAttemptTime = schedule.scheduledTime || new Date();
                    break;
            }
            if (nextAttemptTime) {
                await client.query('UPDATE scheduled_posts SET next_attempt_time = $1 WHERE id = $2', [nextAttemptTime, scheduleId]);
            }
        }
        finally {
            client.release();
        }
    }
    /**
     * Calculate next occurrence for recurring schedule
     */
    calculateNextRecurringTime(config) {
        const now = new Date();
        const [hours, minutes] = config.timeOfDay.split(':').map(Number);
        const nextTime = new Date();
        nextTime.setHours(hours, minutes, 0, 0);
        // If time has passed today, move to next occurrence
        if (nextTime <= now) {
            switch (config.pattern) {
                case 'daily':
                    nextTime.setDate(nextTime.getDate() + 1);
                    break;
                case 'weekly':
                    nextTime.setDate(nextTime.getDate() + 7);
                    break;
                case 'biweekly':
                    nextTime.setDate(nextTime.getDate() + 14);
                    break;
                case 'monthly':
                    nextTime.setMonth(nextTime.getMonth() + 1);
                    break;
            }
        }
        // For weekly patterns with specific days
        if (config.pattern === 'weekly' && config.daysOfWeek && config.daysOfWeek.length > 0) {
            const currentDay = nextTime.getDay();
            const targetDays = config.daysOfWeek.sort();
            // Find next day of week
            let daysToAdd = 0;
            for (const targetDay of targetDays) {
                if (targetDay > currentDay) {
                    daysToAdd = targetDay - currentDay;
                    break;
                }
            }
            if (daysToAdd === 0) {
                // Wrap to next week
                daysToAdd = 7 - currentDay + targetDays[0];
            }
            nextTime.setDate(nextTime.getDate() + daysToAdd);
        }
        return nextTime;
    }
    /**
     * Map database row to Schedule interface
     */
    mapRowToSchedule(row) {
        return {
            id: row.id,
            userId: row.user_id,
            videoId: row.video_id,
            videoUri: row.video_uri,
            thumbnailUri: row.thumbnail_uri,
            accountIds: row.account_ids || [],
            scheduleType: row.schedule_type,
            scheduledTime: row.scheduled_time ? new Date(row.scheduled_time) : undefined,
            recurringConfig: row.recurring_config ? JSON.parse(row.recurring_config) : undefined,
            queueConfig: row.queue_config ? JSON.parse(row.queue_config) : undefined,
            bulkConfig: row.bulk_config ? JSON.parse(row.bulk_config) : undefined,
            caption: row.caption,
            hashtags: row.hashtags || [],
            location: row.location ? JSON.parse(row.location) : undefined,
            status: row.status,
            attempts: row.attempts || 0,
            lastAttemptTime: row.last_attempt_time ? new Date(row.last_attempt_time) : undefined,
            nextAttemptTime: row.next_attempt_time ? new Date(row.next_attempt_time) : undefined,
            errorMessage: row.error_message,
            results: row.results ? JSON.parse(row.results) : {},
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
}
exports.ScheduleService = ScheduleService;
exports.default = new ScheduleService();
