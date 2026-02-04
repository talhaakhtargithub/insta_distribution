import { Router } from 'express';
import HealthController from '../controllers/HealthController';

const router = Router();

// ============================================
// ACCOUNT HEALTH ROUTES
// ============================================

// Get account health report
router.get('/account/:id', (req, res) => HealthController.getAccountHealth(req, res));

// Queue account monitoring
router.post('/account/:id/monitor', (req, res) => HealthController.queueAccountMonitoring(req, res));

// Get account metrics
router.get('/metrics/:accountId', (req, res) => HealthController.getAccountMetrics(req, res));

// ============================================
// SWARM HEALTH ROUTES
// ============================================

// Get swarm health overview
router.get('/swarm', (req, res) => HealthController.getSwarmHealth(req, res));

// Queue swarm monitoring
router.post('/swarm/monitor', (req, res) => HealthController.queueSwarmMonitoring(req, res));

// ============================================
// ALERTS ROUTES
// ============================================

// Get active alerts
router.get('/alerts', (req, res) => HealthController.getAlerts(req, res));

// Get alerts for specific account
router.get('/alerts/account/:id', (req, res) => HealthController.getAccountAlerts(req, res));

// Get alert statistics
router.get('/alerts/stats', (req, res) => HealthController.getAlertStats(req, res));

// Acknowledge alert
router.post('/alerts/:id/acknowledge', (req, res) => HealthController.acknowledgeAlert(req, res));

// Resolve alert
router.post('/alerts/:id/resolve', (req, res) => HealthController.resolveAlert(req, res));

// ============================================
// REPORTS ROUTES
// ============================================

// Get daily report
router.get('/reports/daily', (req, res) => HealthController.getDailyReport(req, res));

// Queue daily report generation
router.post('/reports/daily/queue', (req, res) => HealthController.queueDailyReport(req, res));

// Get weekly report
router.get('/reports/weekly', (req, res) => HealthController.getWeeklyReport(req, res));

// Queue weekly report generation
router.post('/reports/weekly/queue', (req, res) => HealthController.queueWeeklyReport(req, res));

export default router;
