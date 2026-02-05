"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupService = void 0;
const database_1 = require("../../config/database");
const logger_1 = require("../../config/logger");
// ============================================
// Group Service Class
// ============================================
class GroupService {
    /**
     * Create a new account group
     */
    async createGroup(input) {
        try {
            const query = `
        INSERT INTO account_groups (user_id, name, description, color, tags, posting_strategy)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
            const values = [
                input.user_id,
                input.name,
                input.description || null,
                input.color || '#6366f1',
                input.tags || [],
                input.posting_strategy ? JSON.stringify(input.posting_strategy) : '{"postsPerDay": 10, "staggerMinutes": 30, "variationLevel": "high"}',
            ];
            const result = await database_1.pool.query(query, values);
            logger_1.logger.info(`Created group: ${input.name} for user ${input.user_id}`);
            return this.formatGroup(result.rows[0]);
        }
        catch (error) {
            if (error.code === '23505') {
                throw new Error(`Group "${input.name}" already exists`);
            }
            logger_1.logger.error('Error creating group:', error);
            throw new Error('Failed to create group');
        }
    }
    /**
     * Get a group by ID
     */
    async getGroup(groupId) {
        try {
            const query = 'SELECT * FROM account_groups WHERE id = $1';
            const result = await database_1.pool.query(query, [groupId]);
            if (result.rows.length === 0)
                return null;
            return this.formatGroup(result.rows[0]);
        }
        catch (error) {
            logger_1.logger.error('Error fetching group:', error);
            throw new Error('Failed to fetch group');
        }
    }
    /**
     * Get all groups for a user
     */
    async listGroups(userId) {
        try {
            const query = `
        SELECT * FROM account_groups
        WHERE user_id = $1
        ORDER BY name ASC
      `;
            const result = await database_1.pool.query(query, [userId]);
            return result.rows.map((row) => this.formatGroup(row));
        }
        catch (error) {
            logger_1.logger.error('Error listing groups:', error);
            throw new Error('Failed to list groups');
        }
    }
    /**
     * Update a group
     */
    async updateGroup(groupId, updates) {
        try {
            const updateFields = [];
            const values = [];
            let paramIndex = 1;
            if (updates.name !== undefined) {
                updateFields.push(`name = $${paramIndex++}`);
                values.push(updates.name);
            }
            if (updates.description !== undefined) {
                updateFields.push(`description = $${paramIndex++}`);
                values.push(updates.description);
            }
            if (updates.color !== undefined) {
                updateFields.push(`color = $${paramIndex++}`);
                values.push(updates.color);
            }
            if (updates.tags !== undefined) {
                updateFields.push(`tags = $${paramIndex++}`);
                values.push(updates.tags);
            }
            if (updates.posting_strategy !== undefined) {
                updateFields.push(`posting_strategy = $${paramIndex++}`);
                values.push(JSON.stringify(updates.posting_strategy));
            }
            if (updates.is_active !== undefined) {
                updateFields.push(`is_active = $${paramIndex++}`);
                values.push(updates.is_active);
            }
            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }
            values.push(groupId);
            const query = `
        UPDATE account_groups
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `;
            const result = await database_1.pool.query(query, values);
            if (result.rows.length === 0) {
                throw new Error('Group not found');
            }
            logger_1.logger.info(`Updated group: ${groupId}`);
            return this.formatGroup(result.rows[0]);
        }
        catch (error) {
            logger_1.logger.error('Error updating group:', error);
            throw new Error(error.message || 'Failed to update group');
        }
    }
    /**
     * Delete a group
     */
    async deleteGroup(groupId) {
        try {
            const result = await database_1.pool.query('DELETE FROM account_groups WHERE id = $1', [groupId]);
            if (result.rowCount === 0) {
                throw new Error('Group not found');
            }
            logger_1.logger.info(`Deleted group: ${groupId}`);
        }
        catch (error) {
            logger_1.logger.error('Error deleting group:', error);
            throw new Error(error.message || 'Failed to delete group');
        }
    }
    // ============================================
    // Account Management
    // ============================================
    /**
     * Add an account to a group
     */
    async addAccountToGroup(groupId, accountId) {
        try {
            const updateQuery = `
        UPDATE account_groups
        SET account_ids = CASE
          WHEN $2 = ANY(account_ids) THEN account_ids
          ELSE array_append(account_ids, $2)
        END,
        updated_at = NOW()
        WHERE id = $1
      `;
            await database_1.pool.query(updateQuery, [groupId, accountId]);
            logger_1.logger.info(`Added account ${accountId} to group ${groupId}`);
        }
        catch (error) {
            logger_1.logger.error('Error adding account to group:', error);
            throw new Error('Failed to add account to group');
        }
    }
    /**
     * Remove an account from a group
     */
    async removeAccountFromGroup(groupId, accountId) {
        try {
            const query = `
        UPDATE account_groups
        SET account_ids = array_remove(account_ids, $2),
        updated_at = NOW()
        WHERE id = $1
      `;
            await database_1.pool.query(query, [groupId, accountId]);
            logger_1.logger.info(`Removed account ${accountId} from group ${groupId}`);
        }
        catch (error) {
            logger_1.logger.error('Error removing account from group:', error);
            throw new Error('Failed to remove account from group');
        }
    }
    /**
     * Get all accounts in a group
     */
    async getGroupAccounts(groupId) {
        try {
            const group = await this.getGroup(groupId);
            if (!group || group.account_ids.length === 0) {
                return [];
            }
            const query = `
        SELECT * FROM accounts
        WHERE id = ANY($1)
        ORDER BY username ASC
      `;
            const result = await database_1.pool.query(query, [group.account_ids]);
            return result.rows;
        }
        catch (error) {
            logger_1.logger.error('Error fetching group accounts:', error);
            throw new Error('Failed to fetch group accounts');
        }
    }
    /**
     * Add multiple accounts to a group
     */
    async addMultipleAccounts(groupId, accountIds) {
        try {
            const group = await this.getGroup(groupId);
            if (!group) {
                throw new Error('Group not found');
            }
            const existingIds = new Set(group.account_ids);
            const newIds = accountIds.filter(id => !existingIds.has(id));
            const skipped = accountIds.length - newIds.length;
            if (newIds.length > 0) {
                const query = `
          UPDATE account_groups
          SET account_ids = account_ids || $2::text[],
          updated_at = NOW()
          WHERE id = $1
        `;
                await database_1.pool.query(query, [groupId, newIds]);
            }
            logger_1.logger.info(`Added ${newIds.length} accounts to group ${groupId}, skipped ${skipped}`);
            return { added: newIds.length, skipped };
        }
        catch (error) {
            logger_1.logger.error('Error adding accounts to group:', error);
            throw new Error(error.message || 'Failed to add accounts to group');
        }
    }
    /**
     * Remove multiple accounts from a group
     */
    async removeMultipleAccounts(groupId, accountIds) {
        try {
            const group = await this.getGroup(groupId);
            if (!group) {
                throw new Error('Group not found');
            }
            const idsToRemove = new Set(accountIds);
            const newAccountIds = group.account_ids.filter(id => !idsToRemove.has(id));
            const removed = group.account_ids.length - newAccountIds.length;
            const query = `
        UPDATE account_groups
        SET account_ids = $2,
        updated_at = NOW()
        WHERE id = $1
      `;
            await database_1.pool.query(query, [groupId, newAccountIds]);
            logger_1.logger.info(`Removed ${removed} accounts from group ${groupId}`);
            return removed;
        }
        catch (error) {
            logger_1.logger.error('Error removing accounts from group:', error);
            throw new Error(error.message || 'Failed to remove accounts from group');
        }
    }
    /**
     * Move an account from one group to another
     */
    async moveAccount(accountId, fromGroupId, toGroupId) {
        try {
            await database_1.pool.query('BEGIN');
            await this.removeAccountFromGroup(fromGroupId, accountId);
            await this.addAccountToGroup(toGroupId, accountId);
            await database_1.pool.query('COMMIT');
            logger_1.logger.info(`Moved account ${accountId} from group ${fromGroupId} to ${toGroupId}`);
        }
        catch (error) {
            await database_1.pool.query('ROLLBACK');
            logger_1.logger.error('Error moving account:', error);
            throw new Error('Failed to move account');
        }
    }
    /**
     * Get all groups an account belongs to
     */
    async getAccountGroups(accountId) {
        try {
            const query = `
        SELECT * FROM account_groups
        WHERE $1 = ANY(account_ids)
        ORDER BY name ASC
      `;
            const result = await database_1.pool.query(query, [accountId]);
            return result.rows.map((row) => this.formatGroup(row));
        }
        catch (error) {
            logger_1.logger.error('Error fetching account groups:', error);
            throw new Error('Failed to fetch account groups');
        }
    }
    // ============================================
    // Statistics
    // ============================================
    /**
     * Get statistics for a group
     */
    async getGroupStats(groupId) {
        try {
            const group = await this.getGroup(groupId);
            if (!group || group.account_ids.length === 0) {
                return {
                    totalAccounts: 0,
                    activeAccounts: 0,
                    pausedAccounts: 0,
                    authenticatedAccounts: 0,
                    averageHealthScore: 100,
                    totalPostsToday: 0,
                    totalPostsWeek: 0,
                };
            }
            const query = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE account_state = 'ACTIVE') as active,
          COUNT(*) FILTER (WHERE account_state = 'PAUSED') as paused,
          COUNT(*) FILTER (WHERE is_authenticated = true) as authenticated
        FROM accounts
        WHERE id = ANY($1)
      `;
            const result = await database_1.pool.query(query, [group.account_ids]);
            const row = result.rows[0];
            // Get post counts
            const postsQuery = `
        SELECT
          COUNT(*) FILTER (WHERE posted_at >= NOW() - INTERVAL '1 day') as today,
          COUNT(*) FILTER (WHERE posted_at >= NOW() - INTERVAL '7 days') as week
        FROM post_results
        WHERE account_id = ANY($1) AND status = 'success'
      `;
            const postsResult = await database_1.pool.query(postsQuery, [group.account_ids]);
            const postsRow = postsResult.rows[0];
            return {
                totalAccounts: parseInt(row.total || '0'),
                activeAccounts: parseInt(row.active || '0'),
                pausedAccounts: parseInt(row.paused || '0'),
                authenticatedAccounts: parseInt(row.authenticated || '0'),
                averageHealthScore: await this.getGroupHealthScore(groupId),
                totalPostsToday: parseInt(postsRow?.today || '0'),
                totalPostsWeek: parseInt(postsRow?.week || '0'),
            };
        }
        catch (error) {
            logger_1.logger.error('Error fetching group stats:', error);
            throw new Error('Failed to fetch group statistics');
        }
    }
    /**
     * Get overall health score for a group
     */
    async getGroupHealthScore(groupId) {
        try {
            const group = await this.getGroup(groupId);
            if (!group || group.account_ids.length === 0) {
                return 100;
            }
            const query = `
        SELECT AVG(overall_score) as avg_score
        FROM account_health_scores
        WHERE account_id = ANY($1)
      `;
            const result = await database_1.pool.query(query, [group.account_ids]);
            return parseFloat(result.rows[0]?.avg_score || '100');
        }
        catch (error) {
            logger_1.logger.error('Error fetching group health score:', error);
            return 100;
        }
    }
    // ============================================
    // Helper Methods
    // ============================================
    formatGroup(row) {
        return {
            id: row.id,
            user_id: row.user_id,
            name: row.name,
            description: row.description,
            color: row.color,
            account_ids: row.account_ids || [],
            tags: row.tags || [],
            posting_strategy: row.posting_strategy ? (typeof row.posting_strategy === 'string' ? JSON.parse(row.posting_strategy) : row.posting_strategy) : undefined,
            is_active: row.is_active,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }
}
// ============================================
// Export Singleton
// ============================================
exports.groupService = new GroupService();
