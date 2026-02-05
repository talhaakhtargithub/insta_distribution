"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupController = exports.GroupController = void 0;
const GroupService_1 = require("../../services/groups/GroupService");
const logger_1 = require("../../config/logger");
/**
 * Group Controller
 *
 * Handles API requests for account group management
 */
class GroupController {
    /**
     * POST /api/groups
     * Create a new account group
     */
    async createGroup(req, res) {
        try {
            const userId = req.headers['x-user-id'] || 'user_1';
            const { name, description, color, tags, posting_strategy } = req.body;
            if (!name) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'Group name is required',
                });
            }
            const input = {
                user_id: userId,
                name,
                description,
                color,
                tags,
                posting_strategy,
            };
            const group = await GroupService_1.groupService.createGroup(input);
            logger_1.logger.info(`Created group: ${group.name}`);
            res.status(201).json({
                success: true,
                message: 'Group created successfully',
                group,
            });
        }
        catch (error) {
            logger_1.logger.error('Create group error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to create group',
            });
        }
    }
    /**
     * GET /api/groups
     * List all groups for the user
     */
    async listGroups(req, res) {
        try {
            const userId = req.headers['x-user-id'] || 'user_1';
            const groups = await GroupService_1.groupService.listGroups(userId);
            res.json({
                groups,
                total: groups.length,
            });
        }
        catch (error) {
            logger_1.logger.error('List groups error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to list groups',
            });
        }
    }
    /**
     * GET /api/groups/:id
     * Get a specific group
     */
    async getGroup(req, res) {
        try {
            const { id } = req.params;
            const group = await GroupService_1.groupService.getGroup(id);
            if (!group) {
                return res.status(404).json({
                    error: 'Not Found',
                    message: 'Group not found',
                });
            }
            res.json({ group });
        }
        catch (error) {
            logger_1.logger.error('Get group error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to get group',
            });
        }
    }
    /**
     * PUT /api/groups/:id
     * Update a group
     */
    async updateGroup(req, res) {
        try {
            const { id } = req.params;
            const { name, description, color, tags, posting_strategy, is_active } = req.body;
            const updates = {};
            if (name !== undefined)
                updates.name = name;
            if (description !== undefined)
                updates.description = description;
            if (color !== undefined)
                updates.color = color;
            if (tags !== undefined)
                updates.tags = tags;
            if (posting_strategy !== undefined)
                updates.posting_strategy = posting_strategy;
            if (is_active !== undefined)
                updates.is_active = is_active;
            const group = await GroupService_1.groupService.updateGroup(id, updates);
            res.json({
                success: true,
                message: 'Group updated successfully',
                group,
            });
        }
        catch (error) {
            logger_1.logger.error('Update group error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to update group',
            });
        }
    }
    /**
     * DELETE /api/groups/:id
     * Delete a group
     */
    async deleteGroup(req, res) {
        try {
            const { id } = req.params;
            await GroupService_1.groupService.deleteGroup(id);
            res.json({
                success: true,
                message: 'Group deleted successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Delete group error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to delete group',
            });
        }
    }
    /**
     * GET /api/groups/:id/accounts
     * Get all accounts in a group
     */
    async getGroupAccounts(req, res) {
        try {
            const { id } = req.params;
            const accounts = await GroupService_1.groupService.getGroupAccounts(id);
            res.json({
                accounts,
                total: accounts.length,
            });
        }
        catch (error) {
            logger_1.logger.error('Get group accounts error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to get group accounts',
            });
        }
    }
    /**
     * POST /api/groups/:id/accounts
     * Add accounts to a group
     */
    async addAccounts(req, res) {
        try {
            const { id } = req.params;
            const { accountIds } = req.body;
            if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'accountIds array is required',
                });
            }
            const result = await GroupService_1.groupService.addMultipleAccounts(id, accountIds);
            res.json({
                success: true,
                message: `Added ${result.added} accounts to group`,
                ...result,
            });
        }
        catch (error) {
            logger_1.logger.error('Add accounts error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to add accounts',
            });
        }
    }
    /**
     * DELETE /api/groups/:id/accounts
     * Remove accounts from a group
     */
    async removeAccounts(req, res) {
        try {
            const { id } = req.params;
            const { accountIds } = req.body;
            if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'accountIds array is required',
                });
            }
            const removed = await GroupService_1.groupService.removeMultipleAccounts(id, accountIds);
            res.json({
                success: true,
                message: `Removed ${removed} accounts from group`,
                removed,
            });
        }
        catch (error) {
            logger_1.logger.error('Remove accounts error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to remove accounts',
            });
        }
    }
    /**
     * GET /api/groups/:id/stats
     * Get group statistics
     */
    async getGroupStats(req, res) {
        try {
            const { id } = req.params;
            const stats = await GroupService_1.groupService.getGroupStats(id);
            res.json({
                groupId: id,
                stats,
            });
        }
        catch (error) {
            logger_1.logger.error('Get group stats error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to get group stats',
            });
        }
    }
    /**
     * POST /api/groups/:id/accounts/:accountId/move
     * Move an account to another group
     */
    async moveAccount(req, res) {
        try {
            const { id, accountId } = req.params;
            const { toGroupId } = req.body;
            if (!toGroupId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'toGroupId is required',
                });
            }
            await GroupService_1.groupService.moveAccount(accountId, id, toGroupId);
            res.json({
                success: true,
                message: 'Account moved successfully',
                fromGroup: id,
                toGroup: toGroupId,
                accountId,
            });
        }
        catch (error) {
            logger_1.logger.error('Move account error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to move account',
            });
        }
    }
}
exports.GroupController = GroupController;
exports.groupController = new GroupController();
