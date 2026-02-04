import { Router } from 'express';
import { accountController } from '../controllers/AccountController';

const router = Router();

/**
 * Account Management Routes
 */

// Create new account
router.post('/', (req, res) => accountController.createAccount(req, res));

// Get all accounts (with optional state filter)
router.get('/', (req, res) => accountController.getAccounts(req, res));

// Get swarm dashboard statistics
router.get('/stats/swarm', (req, res) => accountController.getSwarmStats(req, res));

// Bulk import accounts
router.post('/bulk-import', (req, res) => accountController.bulkImport(req, res));

// Get single account by ID
router.get('/:id', (req, res) => accountController.getAccountById(req, res));

// Update account
router.put('/:id', (req, res) => accountController.updateAccount(req, res));

// Delete account
router.delete('/:id', (req, res) => accountController.deleteAccount(req, res));

// Verify Instagram credentials
router.post('/:id/verify', (req, res) => accountController.verifyAccount(req, res));

export default router;
