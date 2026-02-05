"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const GroupController_1 = require("../controllers/GroupController");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
/**
 * All routes require authentication
 */
router.use(auth_middleware_1.authMiddleware);
// ============================================
// Group CRUD
// ============================================
/**
 * POST /api/groups
 * Create a new account group
 */
router.post('/', GroupController_1.groupController.createGroup.bind(GroupController_1.groupController));
/**
 * GET /api/groups
 * List all groups for the user
 */
router.get('/', GroupController_1.groupController.listGroups.bind(GroupController_1.groupController));
/**
 * GET /api/groups/:id
 * Get a specific group
 */
router.get('/:id', GroupController_1.groupController.getGroup.bind(GroupController_1.groupController));
/**
 * PUT /api/groups/:id
 * Update a group
 */
router.put('/:id', GroupController_1.groupController.updateGroup.bind(GroupController_1.groupController));
/**
 * DELETE /api/groups/:id
 * Delete a group
 */
router.delete('/:id', GroupController_1.groupController.deleteGroup.bind(GroupController_1.groupController));
// ============================================
// Account Management
// ============================================
/**
 * GET /api/groups/:id/accounts
 * Get all accounts in a group
 */
router.get('/:id/accounts', GroupController_1.groupController.getGroupAccounts.bind(GroupController_1.groupController));
/**
 * POST /api/groups/:id/accounts
 * Add accounts to a group
 */
router.post('/:id/accounts', GroupController_1.groupController.addAccounts.bind(GroupController_1.groupController));
/**
 * DELETE /api/groups/:id/accounts
 * Remove accounts from a group
 */
router.delete('/:id/accounts', GroupController_1.groupController.removeAccounts.bind(GroupController_1.groupController));
/**
 * POST /api/groups/:id/accounts/:accountId/move
 * Move an account to another group
 */
router.post('/:id/accounts/:accountId/move', GroupController_1.groupController.moveAccount.bind(GroupController_1.groupController));
// ============================================
// Statistics
// ============================================
/**
 * GET /api/groups/:id/stats
 * Get group statistics
 */
router.get('/:id/stats', GroupController_1.groupController.getGroupStats.bind(GroupController_1.groupController));
exports.default = router;
