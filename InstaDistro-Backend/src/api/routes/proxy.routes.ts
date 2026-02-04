import { Router } from 'express';
import ProxyController from '../controllers/ProxyController';

const router = Router();

// ============================================
// PROXY CRUD ROUTES
// ============================================

// Create proxy
router.post('/', (req, res) => ProxyController.createProxy(req, res));

// Get all proxies
router.get('/', (req, res) => ProxyController.getProxies(req, res));

// Get proxy by ID
router.get('/:id', (req, res) => ProxyController.getProxyById(req, res));

// Update proxy
router.put('/:id', (req, res) => ProxyController.updateProxy(req, res));

// Delete proxy
router.delete('/:id', (req, res) => ProxyController.deleteProxy(req, res));

// ============================================
// PROXY TESTING ROUTES
// ============================================

// Test proxy connection
router.post('/:id/test', (req, res) => ProxyController.testProxy(req, res));

// ============================================
// PROXY ASSIGNMENT ROUTES
// ============================================

// Assign proxy to account
router.post('/:id/assign/:accountId', (req, res) => ProxyController.assignProxy(req, res));

// Unassign proxy from account
router.post('/unassign/:accountId', (req, res) => ProxyController.unassignProxy(req, res));

// ============================================
// PROXY STATISTICS ROUTES
// ============================================

// Get proxy statistics
router.get('/stats', (req, res) => ProxyController.getStats(req, res));

// Get proxy performance metrics
router.get('/:id/performance', (req, res) => ProxyController.getProxyPerformance(req, res));

// Get proxy health trend
router.get('/:id/trend', (req, res) => ProxyController.getProxyTrend(req, res));

// Get rotation statistics
router.get('/rotation/stats', (req, res) => ProxyController.getRotationStats(req, res));

// ============================================
// PROXY HEALTH CHECK ROUTES
// ============================================

// Check health of all proxies
router.post('/health/check', (req, res) => ProxyController.checkHealth(req, res));

// Check health of specific proxy
router.post('/:id/health/check', (req, res) => ProxyController.checkProxyHealth(req, res));

// ============================================
// PROXY ROTATION ROUTES
// ============================================

// Rotate proxy for specific account
router.post('/rotate/:accountId', (req, res) => ProxyController.rotateProxy(req, res));

// Auto-rotate proxies
router.post('/rotate/auto', (req, res) => ProxyController.autoRotate(req, res));

// Rotate proxies for group
router.post('/rotate/group/:groupId', (req, res) => ProxyController.rotateGroupProxies(req, res));

export default router;
