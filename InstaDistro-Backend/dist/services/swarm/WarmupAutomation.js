"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warmupAutomationService = exports.WarmupAutomationService = void 0;
const database_1 = require("../../config/database");
const logger_1 = require("../../config/logger");
const WarmupTask_1 = require("../../models/WarmupTask");
class WarmupAutomationService {
    /**
     * Start warmup protocol for an account
     * Generates all 14 days of tasks with scheduled times
     */
    async startWarmup(accountId) {
        try {
            logger_1.logger.info(`Starting warmup protocol for account ${accountId}`);
            // Check if account exists
            const accountResult = await database_1.pool.query('SELECT id, username, account_state FROM accounts WHERE id = $1', [accountId]);
            if (accountResult.rows.length === 0) {
                return {
                    success: false,
                    message: 'Account not found',
                };
            }
            const account = accountResult.rows[0];
            // Check if warmup already started
            const existingTasks = await database_1.pool.query('SELECT COUNT(*) FROM warmup_tasks WHERE account_id = $1', [accountId]);
            if (parseInt(existingTasks.rows[0].count) > 0) {
                return {
                    success: false,
                    message: 'Warmup already started for this account',
                };
            }
            // Update account state to WARMING_UP
            await database_1.pool.query('UPDATE accounts SET account_state = $1, updated_at = NOW() WHERE id = $2', ['WARMING_UP', accountId]);
            // Generate tasks for all 14 days
            const tasksGenerated = await this.generateWarmupTasks(accountId);
            logger_1.logger.info(`Generated ${tasksGenerated} warmup tasks for account ${account.username}`);
            return {
                success: true,
                message: 'Warmup protocol started successfully',
                tasksGenerated,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to start warmup:', error);
            return {
                success: false,
                message: 'Failed to start warmup protocol',
                error: error.message,
            };
        }
    }
    /**
     * Generate warmup tasks for all 14 days
     * Tasks are scheduled with random delays to appear human-like
     */
    async generateWarmupTasks(accountId) {
        let tasksGenerated = 0;
        const now = new Date();
        for (const dayProtocol of WarmupTask_1.WARMUP_PROTOCOL) {
            const dayNumber = dayProtocol.day;
            // Schedule tasks for this day (spread throughout the day)
            for (const task of dayProtocol.tasks) {
                // Random time within the day (with some spread)
                const hoursFromNow = (dayNumber - 1) * 24 + this.randomBetween(2, 20);
                const scheduledTime = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000);
                // Random target count within min-max range
                const targetCount = this.randomBetween(task.minCount, task.maxCount);
                const taskInput = {
                    account_id: accountId,
                    day: dayNumber,
                    task_type: task.type,
                    target_count: targetCount,
                    scheduled_time: scheduledTime.toISOString(),
                };
                await this.createTask(taskInput);
                tasksGenerated++;
            }
        }
        return tasksGenerated;
    }
    /**
     * Create a single warmup task
     */
    async createTask(input) {
        const result = await database_1.pool.query(`INSERT INTO warmup_tasks (account_id, day, task_type, target_count, scheduled_time)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [input.account_id, input.day, input.task_type, input.target_count, input.scheduled_time]);
        return this.mapTask(result.rows[0]);
    }
    /**
     * Get warmup progress for an account
     */
    async getProgress(accountId) {
        try {
            // Get all tasks for this account
            const tasksResult = await database_1.pool.query(`SELECT * FROM warmup_tasks
         WHERE account_id = $1
         ORDER BY day, scheduled_time`, [accountId]);
            if (tasksResult.rows.length === 0) {
                return null;
            }
            const allTasks = tasksResult.rows.map(this.mapTask);
            // Calculate current day (based on completed tasks)
            const completedDays = new Set(allTasks.filter(t => t.status === 'completed').map(t => t.day));
            const currentDay = Math.max(1, ...Array.from(completedDays)) || 1;
            // Get tasks for today
            const tasksToday = allTasks.filter(t => t.day === currentDay);
            // Calculate totals
            const tasksCompleted = allTasks.filter(t => t.status === 'completed').length;
            const tasksTotal = allTasks.length;
            // Find next task
            const pendingTasks = allTasks.filter(t => t.status === 'pending' && new Date(t.scheduled_time) > new Date());
            const nextTask = pendingTasks.sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime())[0];
            return {
                accountId,
                currentDay,
                totalDays: 14,
                progressPercentage: (0, WarmupTask_1.calculateWarmupProgress)(currentDay),
                tasksCompleted,
                tasksTotal,
                tasksToday,
                nextTaskTime: nextTask?.scheduled_time,
                isComplete: (0, WarmupTask_1.isWarmupComplete)(currentDay) && tasksCompleted === tasksTotal,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get warmup progress:', error);
            return null;
        }
    }
    /**
     * Get tasks due for execution (scheduled time has passed)
     */
    async getDueTasks(limit = 100) {
        try {
            const result = await database_1.pool.query(`SELECT * FROM warmup_tasks
         WHERE status = 'pending'
         AND scheduled_time <= NOW()
         ORDER BY scheduled_time
         LIMIT $1`, [limit]);
            return result.rows.map(this.mapTask);
        }
        catch (error) {
            logger_1.logger.error('Failed to get due tasks:', error);
            return [];
        }
    }
    /**
     * Get tasks for specific account and day
     */
    async getTasksForDay(accountId, day) {
        try {
            const result = await database_1.pool.query(`SELECT * FROM warmup_tasks
         WHERE account_id = $1 AND day = $2
         ORDER BY scheduled_time`, [accountId, day]);
            return result.rows.map(this.mapTask);
        }
        catch (error) {
            logger_1.logger.error('Failed to get tasks for day:', error);
            return [];
        }
    }
    /**
     * Update task status and progress
     */
    async updateTask(taskId, updates) {
        try {
            const fields = [];
            const values = [];
            let paramCount = 1;
            if (updates.completed_count !== undefined) {
                fields.push(`completed_count = $${paramCount++}`);
                values.push(updates.completed_count);
            }
            if (updates.status !== undefined) {
                fields.push(`status = $${paramCount++}`);
                values.push(updates.status);
            }
            if (updates.completed_at !== undefined) {
                fields.push(`completed_at = $${paramCount++}`);
                values.push(updates.completed_at);
            }
            if (updates.error_message !== undefined) {
                fields.push(`error_message = $${paramCount++}`);
                values.push(updates.error_message);
            }
            if (fields.length === 0) {
                return null;
            }
            values.push(taskId);
            const result = await database_1.pool.query(`UPDATE warmup_tasks
         SET ${fields.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`, values);
            if (result.rows.length === 0) {
                return null;
            }
            // Check if all tasks for this account are complete
            const task = this.mapTask(result.rows[0]);
            await this.checkWarmupCompletion(task.account_id);
            return task;
        }
        catch (error) {
            logger_1.logger.error('Failed to update task:', error);
            return null;
        }
    }
    /**
     * Mark task as in progress
     */
    async startTask(taskId) {
        try {
            const result = await database_1.pool.query(`UPDATE warmup_tasks
         SET status = 'in_progress'
         WHERE id = $1 AND status = 'pending'
         RETURNING id`, [taskId]);
            return result.rows.length > 0;
        }
        catch (error) {
            logger_1.logger.error('Failed to start task:', error);
            return false;
        }
    }
    /**
     * Mark task as completed
     */
    async completeTask(taskId, completedCount) {
        try {
            const updates = {
                status: 'completed',
                completed_count: completedCount,
                completed_at: new Date().toISOString(),
            };
            const result = await this.updateTask(taskId, updates);
            return result !== null;
        }
        catch (error) {
            logger_1.logger.error('Failed to complete task:', error);
            return false;
        }
    }
    /**
     * Mark task as failed
     */
    async failTask(taskId, errorMessage) {
        try {
            const updates = {
                status: 'failed',
                error_message: errorMessage,
            };
            const result = await this.updateTask(taskId, updates);
            return result !== null;
        }
        catch (error) {
            logger_1.logger.error('Failed to mark task as failed:', error);
            return false;
        }
    }
    /**
     * Check if warmup is complete and transition account to ACTIVE
     */
    async checkWarmupCompletion(accountId) {
        try {
            const progress = await this.getProgress(accountId);
            if (!progress) {
                return;
            }
            // If all tasks are complete and we're on day 14+
            if (progress.isComplete && progress.currentDay >= 14) {
                // Transition account to ACTIVE state
                await database_1.pool.query('UPDATE accounts SET account_state = $1, updated_at = NOW() WHERE id = $2', ['ACTIVE', accountId]);
                logger_1.logger.info(`Account ${accountId} completed warmup! Transitioning to ACTIVE state.`);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to check warmup completion:', error);
        }
    }
    /**
     * Pause warmup for an account
     */
    async pauseWarmup(accountId) {
        try {
            // Update account state
            await database_1.pool.query('UPDATE accounts SET account_state = $1, updated_at = NOW() WHERE id = $2', ['PAUSED', accountId]);
            logger_1.logger.info(`Warmup paused for account ${accountId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to pause warmup:', error);
            return false;
        }
    }
    /**
     * Resume warmup for an account
     */
    async resumeWarmup(accountId) {
        try {
            // Update account state back to WARMING_UP
            await database_1.pool.query('UPDATE accounts SET account_state = $1, updated_at = NOW() WHERE id = $2', ['WARMING_UP', accountId]);
            logger_1.logger.info(`Warmup resumed for account ${accountId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to resume warmup:', error);
            return false;
        }
    }
    /**
     * Skip warmup and force account to ACTIVE (risky!)
     */
    async skipToActive(accountId) {
        try {
            logger_1.logger.warn(`⚠️ SKIPPING WARMUP for account ${accountId} - This is risky!`);
            // Update account state to ACTIVE
            await database_1.pool.query('UPDATE accounts SET account_state = $1, updated_at = NOW() WHERE id = $2', ['ACTIVE', accountId]);
            // Cancel all pending warmup tasks
            await database_1.pool.query(`UPDATE warmup_tasks
         SET status = 'cancelled', error_message = 'Warmup skipped by user'
         WHERE account_id = $1 AND status = 'pending'`, [accountId]);
            return {
                success: true,
                message: 'Account transitioned to ACTIVE (warmup skipped)',
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to skip warmup:', error);
            return {
                success: false,
                message: 'Failed to skip warmup',
                error: error.message,
            };
        }
    }
    /**
     * Get all accounts currently in warmup
     */
    async getAccountsInWarmup(userId) {
        try {
            let query = `
        SELECT a.*,
               COUNT(wt.id) as total_tasks,
               COUNT(CASE WHEN wt.status = 'completed' THEN 1 END) as completed_tasks
        FROM accounts a
        LEFT JOIN warmup_tasks wt ON a.id = wt.account_id
        WHERE a.account_state = 'WARMING_UP'
      `;
            const params = [];
            if (userId) {
                query += ' AND a.user_id = $1';
                params.push(userId);
            }
            query += ' GROUP BY a.id ORDER BY a.created_at DESC';
            const result = await database_1.pool.query(query, params);
            return result.rows;
        }
        catch (error) {
            logger_1.logger.error('Failed to get accounts in warmup:', error);
            return [];
        }
    }
    /**
     * Get warmup statistics
     */
    async getWarmupStats(userId) {
        try {
            let query = `
        SELECT
          COUNT(DISTINCT a.id) as total_accounts,
          COUNT(DISTINCT CASE WHEN wt.status = 'completed' THEN a.id END) as completed_accounts,
          COUNT(wt.id) as total_tasks,
          COUNT(CASE WHEN wt.status = 'completed' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN wt.status = 'failed' THEN 1 END) as failed_tasks
        FROM accounts a
        LEFT JOIN warmup_tasks wt ON a.id = wt.account_id
        WHERE a.account_state = 'WARMING_UP'
      `;
            const params = [];
            if (userId) {
                query += ' AND a.user_id = $1';
                params.push(userId);
            }
            const result = await database_1.pool.query(query, params);
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Failed to get warmup stats:', error);
            return null;
        }
    }
    /**
     * Utility: Map database row to WarmupTask
     */
    mapTask(row) {
        return {
            id: row.id,
            account_id: row.account_id,
            day: row.day,
            task_type: row.task_type,
            target_count: row.target_count,
            completed_count: row.completed_count,
            status: row.status,
            scheduled_time: row.scheduled_time,
            completed_at: row.completed_at,
            error_message: row.error_message,
            created_at: row.created_at,
        };
    }
    /**
     * Utility: Random number between min and max (inclusive)
     */
    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
exports.WarmupAutomationService = WarmupAutomationService;
exports.warmupAutomationService = new WarmupAutomationService();
