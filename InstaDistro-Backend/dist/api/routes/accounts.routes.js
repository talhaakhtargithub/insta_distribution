"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AccountController_1 = require("../controllers/AccountController");
const router = (0, express_1.Router)();
/**
 * Account Management Routes
 */
// Create new account
router.post('/', (req, res) => AccountController_1.accountController.createAccount(req, res));
// Get all accounts (with optional state filter)
router.get('/', (req, res) => AccountController_1.accountController.getAccounts(req, res));
// Get swarm dashboard statistics
router.get('/stats/swarm', (req, res) => AccountController_1.accountController.getSwarmStats(req, res));
// Bulk import accounts
router.post('/bulk-import', (req, res) => AccountController_1.accountController.bulkImport(req, res));
// Get single account by ID
router.get('/:id', (req, res) => AccountController_1.accountController.getAccountById(req, res));
// Update account
router.put('/:id', (req, res) => AccountController_1.accountController.updateAccount(req, res));
// Delete account
router.delete('/:id', (req, res) => AccountController_1.accountController.deleteAccount(req, res));
// Verify Instagram credentials
router.post('/:id/verify', (req, res) => AccountController_1.accountController.verifyAccount(req, res));
exports.default = router;
