"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ScheduleController_1 = __importDefault(require("../controllers/ScheduleController"));
const router = (0, express_1.Router)();
// ============================================
// SCHEDULE CRUD ROUTES
// ============================================
router.post('/', (req, res) => ScheduleController_1.default.createSchedule(req, res));
router.get('/', (req, res) => ScheduleController_1.default.getSchedules(req, res));
router.get('/:id', (req, res) => ScheduleController_1.default.getScheduleById(req, res));
router.put('/:id', (req, res) => ScheduleController_1.default.updateSchedule(req, res));
router.delete('/:id', (req, res) => ScheduleController_1.default.cancelSchedule(req, res));
// ============================================
// STATISTICS & OPTIMIZATION ROUTES
// ============================================
router.get('/stats', (req, res) => ScheduleController_1.default.getStats(req, res));
router.post('/optimize', (req, res) => ScheduleController_1.default.optimizeQueue(req, res));
router.get('/optimal-times/:accountId', (req, res) => ScheduleController_1.default.getOptimalTimes(req, res));
router.get('/optimization/:accountId', (req, res) => ScheduleController_1.default.getOptimizationReport(req, res));
// ============================================
// CALENDAR & TIMELINE ROUTES
// ============================================
router.get('/calendar/month', (req, res) => ScheduleController_1.default.getMonthCalendar(req, res));
router.get('/calendar/week', (req, res) => ScheduleController_1.default.getWeekCalendar(req, res));
router.get('/calendar/day', (req, res) => ScheduleController_1.default.getDayTimeline(req, res));
router.get('/upcoming', (req, res) => ScheduleController_1.default.getUpcoming(req, res));
router.get('/conflicts', (req, res) => ScheduleController_1.default.getConflicts(req, res));
router.get('/heatmap', (req, res) => ScheduleController_1.default.getHeatmap(req, res));
exports.default = router;
