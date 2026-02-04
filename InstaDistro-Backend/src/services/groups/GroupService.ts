import { pool } from '../../config/database';
import { Account } from '../swarm/AccountService';
import { logger } from '../../config/logger';

/**
 * Account Group Service
 *
 * Manages logical groupings of Instagram accounts for:
 * - Niche-based organization (fitness, fashion, tech, etc.)
 * - Status-based grouping (premium, standard, new)
 * - Geographic targeting (US, EU, Asia)
 * - Client-based separation
 */

// ============================================
// Types
// ============================================

export interface AccountGroup {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    color?: string;
    account_ids: string[];
    tags: string[];
    posting_strategy?: PostingStrategy;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface PostingStrategy {
    postsPerDay?: number;
    staggerMinutes?: number;
    variationLevel?: 'low' | 'medium' | 'high';
}

export interface CreateGroupInput {
    user_id: string;
    name: string;
    description?: string;
    color?: string;
    tags?: string[];
    posting_strategy?: PostingStrategy;
}

export interface UpdateGroupInput {
    name?: string;
    description?: string;
    color?: string;
    tags?: string[];
    posting_strategy?: PostingStrategy;
    is_active?: boolean;
}

export interface GroupStats {
    totalAccounts: number;
    activeAccounts: number;
    pausedAccounts: number;
    authenticatedAccounts: number;
    averageHealthScore: number;
    totalPostsToday: number;
    totalPostsWeek: number;
}

// ============================================
// Group Service Class
// ============================================

class GroupService {
    /**
     * Create a new account group
     */
    async createGroup(input: CreateGroupInput): Promise<AccountGroup> {
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

            const result = await pool.query(query, values);
            logger.info(`Created group: ${input.name} for user ${input.user_id}`);
            return this.formatGroup(result.rows[0]);
        } catch (error: any) {
            if (error.code === '23505') {
                throw new Error(`Group "${input.name}" already exists`);
            }
            logger.error('Error creating group:', error);
            throw new Error('Failed to create group');
        }
    }

    /**
     * Get a group by ID
     */
    async getGroup(groupId: string): Promise<AccountGroup | null> {
        try {
            const query = 'SELECT * FROM account_groups WHERE id = $1';
            const result = await pool.query(query, [groupId]);
            if (result.rows.length === 0) return null;
            return this.formatGroup(result.rows[0]);
        } catch (error) {
            logger.error('Error fetching group:', error);
            throw new Error('Failed to fetch group');
        }
    }

    /**
     * Get all groups for a user
     */
    async listGroups(userId: string): Promise<AccountGroup[]> {
        try {
            const query = `
        SELECT * FROM account_groups
        WHERE user_id = $1
        ORDER BY name ASC
      `;

            const result = await pool.query(query, [userId]);
            return result.rows.map((row) => this.formatGroup(row));
        } catch (error) {
            logger.error('Error listing groups:', error);
            throw new Error('Failed to list groups');
        }
    }

    /**
     * Update a group
     */
    async updateGroup(groupId: string, updates: UpdateGroupInput): Promise<AccountGroup> {
        try {
            const updateFields: string[] = [];
            const values: any[] = [];
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

            const result = await pool.query(query, values);
            if (result.rows.length === 0) {
                throw new Error('Group not found');
            }

            logger.info(`Updated group: ${groupId}`);
            return this.formatGroup(result.rows[0]);
        } catch (error: any) {
            logger.error('Error updating group:', error);
            throw new Error(error.message || 'Failed to update group');
        }
    }

    /**
     * Delete a group
     */
    async deleteGroup(groupId: string): Promise<void> {
        try {
            const result = await pool.query('DELETE FROM account_groups WHERE id = $1', [groupId]);

            if (result.rowCount === 0) {
                throw new Error('Group not found');
            }

            logger.info(`Deleted group: ${groupId}`);
        } catch (error: any) {
            logger.error('Error deleting group:', error);
            throw new Error(error.message || 'Failed to delete group');
        }
    }

    // ============================================
    // Account Management
    // ============================================

    /**
     * Add an account to a group
     */
    async addAccountToGroup(groupId: string, accountId: string): Promise<void> {
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

            await pool.query(updateQuery, [groupId, accountId]);
            logger.info(`Added account ${accountId} to group ${groupId}`);
        } catch (error) {
            logger.error('Error adding account to group:', error);
            throw new Error('Failed to add account to group');
        }
    }

    /**
     * Remove an account from a group
     */
    async removeAccountFromGroup(groupId: string, accountId: string): Promise<void> {
        try {
            const query = `
        UPDATE account_groups
        SET account_ids = array_remove(account_ids, $2),
        updated_at = NOW()
        WHERE id = $1
      `;

            await pool.query(query, [groupId, accountId]);
            logger.info(`Removed account ${accountId} from group ${groupId}`);
        } catch (error) {
            logger.error('Error removing account from group:', error);
            throw new Error('Failed to remove account from group');
        }
    }

    /**
     * Get all accounts in a group
     */
    async getGroupAccounts(groupId: string): Promise<Account[]> {
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

            const result = await pool.query(query, [group.account_ids]);
            return result.rows;
        } catch (error) {
            logger.error('Error fetching group accounts:', error);
            throw new Error('Failed to fetch group accounts');
        }
    }

    /**
     * Add multiple accounts to a group
     */
    async addMultipleAccounts(groupId: string, accountIds: string[]): Promise<{ added: number; skipped: number }> {
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

                await pool.query(query, [groupId, newIds]);
            }

            logger.info(`Added ${newIds.length} accounts to group ${groupId}, skipped ${skipped}`);
            return { added: newIds.length, skipped };
        } catch (error: any) {
            logger.error('Error adding accounts to group:', error);
            throw new Error(error.message || 'Failed to add accounts to group');
        }
    }

    /**
     * Remove multiple accounts from a group
     */
    async removeMultipleAccounts(groupId: string, accountIds: string[]): Promise<number> {
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

            await pool.query(query, [groupId, newAccountIds]);
            logger.info(`Removed ${removed} accounts from group ${groupId}`);
            return removed;
        } catch (error: any) {
            logger.error('Error removing accounts from group:', error);
            throw new Error(error.message || 'Failed to remove accounts from group');
        }
    }

    /**
     * Move an account from one group to another
     */
    async moveAccount(accountId: string, fromGroupId: string, toGroupId: string): Promise<void> {
        try {
            await pool.query('BEGIN');
            await this.removeAccountFromGroup(fromGroupId, accountId);
            await this.addAccountToGroup(toGroupId, accountId);
            await pool.query('COMMIT');
            logger.info(`Moved account ${accountId} from group ${fromGroupId} to ${toGroupId}`);
        } catch (error) {
            await pool.query('ROLLBACK');
            logger.error('Error moving account:', error);
            throw new Error('Failed to move account');
        }
    }

    /**
     * Get all groups an account belongs to
     */
    async getAccountGroups(accountId: string): Promise<AccountGroup[]> {
        try {
            const query = `
        SELECT * FROM account_groups
        WHERE $1 = ANY(account_ids)
        ORDER BY name ASC
      `;

            const result = await pool.query(query, [accountId]);
            return result.rows.map((row) => this.formatGroup(row));
        } catch (error) {
            logger.error('Error fetching account groups:', error);
            throw new Error('Failed to fetch account groups');
        }
    }

    // ============================================
    // Statistics
    // ============================================

    /**
     * Get statistics for a group
     */
    async getGroupStats(groupId: string): Promise<GroupStats> {
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

            const result = await pool.query(query, [group.account_ids]);
            const row = result.rows[0];

            // Get post counts
            const postsQuery = `
        SELECT
          COUNT(*) FILTER (WHERE posted_at >= NOW() - INTERVAL '1 day') as today,
          COUNT(*) FILTER (WHERE posted_at >= NOW() - INTERVAL '7 days') as week
        FROM post_results
        WHERE account_id = ANY($1) AND status = 'success'
      `;

            const postsResult = await pool.query(postsQuery, [group.account_ids]);
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
        } catch (error) {
            logger.error('Error fetching group stats:', error);
            throw new Error('Failed to fetch group statistics');
        }
    }

    /**
     * Get overall health score for a group
     */
    async getGroupHealthScore(groupId: string): Promise<number> {
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

            const result = await pool.query(query, [group.account_ids]);
            return parseFloat(result.rows[0]?.avg_score || '100');
        } catch (error) {
            logger.error('Error fetching group health score:', error);
            return 100;
        }
    }

    // ============================================
    // Helper Methods
    // ============================================

    private formatGroup(row: any): AccountGroup {
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

export const groupService = new GroupService();
