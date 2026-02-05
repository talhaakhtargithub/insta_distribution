"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ProxyController_1 = __importDefault(require("../controllers/ProxyController"));
const router = (0, express_1.Router)();
// ============================================
// PROXY CRUD ROUTES
// ============================================
// Create proxy
router.post('/', (req, res) => ProxyController_1.default.createProxy(req, res));
// Get all proxies
router.get('/', (req, res) => ProxyController_1.default.getProxies(req, res));
// Get proxy by ID
router.get('/:id', (req, res) => ProxyController_1.default.getProxyById(req, res));
// Update proxy
router.put('/:id', (req, res) => ProxyController_1.default.updateProxy(req, res));
// Delete proxy
router.delete('/:id', (req, res) => ProxyController_1.default.deleteProxy(req, res));
// ============================================
// PROXY TESTING ROUTES
// ============================================
// Test proxy connection
router.post('/:id/test', (req, res) => ProxyController_1.default.testProxy(req, res));
// ============================================
// PROXY ASSIGNMENT ROUTES
// ============================================
// Assign proxy to account
router.post('/:id/assign/:accountId', (req, res) => ProxyController_1.default.assignProxy(req, res));
// Unassign proxy from account
router.post('/unassign/:accountId', (req, res) => ProxyController_1.default.unassignProxy(req, res));
// ============================================
// PROXY STATISTICS ROUTES
// ============================================
// Get proxy statistics
router.get('/stats', (req, res) => ProxyController_1.default.getStats(req, res));
// Get proxy performance metrics
router.get('/:id/performance', (req, res) => ProxyController_1.default.getProxyPerformance(req, res));
// Get proxy health trend
router.get('/:id/trend', (req, res) => ProxyController_1.default.getProxyTrend(req, res));
// Get rotation statistics
router.get('/rotation/stats', (req, res) => ProxyController_1.default.getRotationStats(req, res));
// ============================================
// PROXY HEALTH CHECK ROUTES
// ============================================
// Check health of all proxies
router.post('/health/check', (req, res) => ProxyController_1.default.checkHealth(req, res));
// Check health of specific proxy
router.post('/:id/health/check', (req, res) => ProxyController_1.default.checkProxyHealth(req, res));
// ============================================
// PROXY ROTATION ROUTES
// ============================================
// Rotate proxy for specific account
router.post('/rotate/:accountId', (req, res) => ProxyController_1.default.rotateProxy(req, res));
// Auto-rotate proxies
router.post('/rotate/auto', (req, res) => ProxyController_1.default.autoRotate(req, res));
// Rotate proxies for group
router.post('/rotate/group/:groupId', (req, res) => ProxyController_1.default.rotateGroupProxies(req, res));
exports.default = router;
