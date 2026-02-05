"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const HealthController_1 = __importDefault(require("../controllers/HealthController"));
const router = (0, express_1.Router)();
// ============================================
// ACCOUNT HEALTH ROUTES
// ============================================
// Get account health report
router.get('/account/:id', (req, res) => HealthController_1.default.getAccountHealth(req, res));
// Queue account monitoring
router.post('/account/:id/monitor', (req, res) => HealthController_1.default.queueAccountMonitoring(req, res));
// Get account metrics
router.get('/metrics/:accountId', (req, res) => HealthController_1.default.getAccountMetrics(req, res));
// ============================================
// SWARM HEALTH ROUTES
// ============================================
// Get swarm health overview
router.get('/swarm', (req, res) => HealthController_1.default.getSwarmHealth(req, res));
// Queue swarm monitoring
router.post('/swarm/monitor', (req, res) => HealthController_1.default.queueSwarmMonitoring(req, res));
// ============================================
// ALERTS ROUTES
// ============================================
// Get active alerts
router.get('/alerts', (req, res) => HealthController_1.default.getAlerts(req, res));
// Get alerts for specific account
router.get('/alerts/account/:id', (req, res) => HealthController_1.default.getAccountAlerts(req, res));
// Get alert statistics
router.get('/alerts/stats', (req, res) => HealthController_1.default.getAlertStats(req, res));
// Acknowledge alert
router.post('/alerts/:id/acknowledge', (req, res) => HealthController_1.default.acknowledgeAlert(req, res));
// Resolve alert
router.post('/alerts/:id/resolve', (req, res) => HealthController_1.default.resolveAlert(req, res));
// ============================================
// REPORTS ROUTES
// ============================================
// Get daily report
router.get('/reports/daily', (req, res) => HealthController_1.default.getDailyReport(req, res));
// Queue daily report generation
router.post('/reports/daily/queue', (req, res) => HealthController_1.default.queueDailyReport(req, res));
// Get weekly report
router.get('/reports/weekly', (req, res) => HealthController_1.default.getWeeklyReport(req, res));
// Queue weekly report generation
router.post('/reports/weekly/queue', (req, res) => HealthController_1.default.queueWeeklyReport(req, res));
exports.default = router;
