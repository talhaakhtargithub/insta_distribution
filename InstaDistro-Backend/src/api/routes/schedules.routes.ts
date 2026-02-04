import { Router } from 'express';
import ScheduleController from '../controllers/ScheduleController';

const router = Router();

// ============================================
// SCHEDULE CRUD ROUTES
// ============================================

router.post('/', (req, res) => ScheduleController.createSchedule(req, res));
router.get('/', (req, res) => ScheduleController.getSchedules(req, res));
router.get('/:id', (req, res) => ScheduleController.getScheduleById(req, res));
router.put('/:id', (req, res) => ScheduleController.updateSchedule(req, res));
router.delete('/:id', (req, res) => ScheduleController.cancelSchedule(req, res));

// ============================================
// STATISTICS & OPTIMIZATION ROUTES
// ============================================

router.get('/stats', (req, res) => ScheduleController.getStats(req, res));
router.post('/optimize', (req, res) => ScheduleController.optimizeQueue(req, res));
router.get('/optimal-times/:accountId', (req, res) => ScheduleController.getOptimalTimes(req, res));
router.get('/optimization/:accountId', (req, res) => ScheduleController.getOptimizationReport(req, res));

// ============================================
// CALENDAR & TIMELINE ROUTES
// ============================================

router.get('/calendar/month', (req, res) => ScheduleController.getMonthCalendar(req, res));
router.get('/calendar/week', (req, res) => ScheduleController.getWeekCalendar(req, res));
router.get('/calendar/day', (req, res) => ScheduleController.getDayTimeline(req, res));
router.get('/upcoming', (req, res) => ScheduleController.getUpcoming(req, res));
router.get('/conflicts', (req, res) => ScheduleController.getConflicts(req, res));
router.get('/heatmap', (req, res) => ScheduleController.getHeatmap(req, res));

export default router;
