import { Router } from 'express';
import { groupController } from '../controllers/GroupController';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authMiddleware);

// ============================================
// Group CRUD
// ============================================

/**
 * POST /api/groups
 * Create a new account group
 */
router.post('/', groupController.createGroup.bind(groupController));

/**
 * GET /api/groups
 * List all groups for the user
 */
router.get('/', groupController.listGroups.bind(groupController));

/**
 * GET /api/groups/:id
 * Get a specific group
 */
router.get('/:id', groupController.getGroup.bind(groupController));

/**
 * PUT /api/groups/:id
 * Update a group
 */
router.put('/:id', groupController.updateGroup.bind(groupController));

/**
 * DELETE /api/groups/:id
 * Delete a group
 */
router.delete('/:id', groupController.deleteGroup.bind(groupController));

// ============================================
// Account Management
// ============================================

/**
 * GET /api/groups/:id/accounts
 * Get all accounts in a group
 */
router.get('/:id/accounts', groupController.getGroupAccounts.bind(groupController));

/**
 * POST /api/groups/:id/accounts
 * Add accounts to a group
 */
router.post('/:id/accounts', groupController.addAccounts.bind(groupController));

/**
 * DELETE /api/groups/:id/accounts
 * Remove accounts from a group
 */
router.delete('/:id/accounts', groupController.removeAccounts.bind(groupController));

/**
 * POST /api/groups/:id/accounts/:accountId/move
 * Move an account to another group
 */
router.post('/:id/accounts/:accountId/move', groupController.moveAccount.bind(groupController));

// ============================================
// Statistics
// ============================================

/**
 * GET /api/groups/:id/stats
 * Get group statistics
 */
router.get('/:id/stats', groupController.getGroupStats.bind(groupController));

export default router;
