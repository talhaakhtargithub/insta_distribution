"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.warmupController = exports.WarmupController = void 0;
const WarmupAutomation_1 = require("../../services/swarm/WarmupAutomation");
const WarmupJob_1 = require("../../jobs/WarmupJob");
const logger_1 = require("../../config/logger");
/**
 * Warmup Controller
 *
 * Handles API endpoints for warmup protocol management
 */
class WarmupController {
    /**
     * POST /api/warmup/start/:accountId
     * Start warmup protocol for an account
     */
    async startWarmup(req, res) {
        try {
            const { accountId } = req.params;
            if (!accountId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'accountId is required',
                });
            }
            logger_1.logger.info(`Starting warmup for account ${accountId}`);
            const result = await WarmupAutomation_1.warmupAutomationService.startWarmup(accountId);
            if (!result.success) {
                return res.status(400).json({
                    error: 'Warmup Start Failed',
                    message: result.message,
                    details: result.error,
                });
            }
            res.json({
                success: true,
                message: result.message,
                tasksGenerated: result.tasksGenerated,
            });
        }
        catch (error) {
            logger_1.logger.error('Start warmup error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to start warmup',
            });
        }
    }
    /**
     * GET /api/warmup/progress/:accountId
     * Get warmup progress for an account
     */
    async getProgress(req, res) {
        try {
            const { accountId } = req.params;
            if (!accountId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'accountId is required',
                });
            }
            const progress = await WarmupAutomation_1.warmupAutomationService.getProgress(accountId);
            if (!progress) {
                return res.status(404).json({
                    error: 'Not Found',
                    message: 'No warmup progress found for this account',
                });
            }
            res.json({
                success: true,
                progress,
            });
        }
        catch (error) {
            logger_1.logger.error('Get warmup progress error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to get warmup progress',
            });
        }
    }
    /**
     * GET /api/warmup/tasks/:accountId/:day
     * Get warmup tasks for specific account and day
     */
    async getTasksForDay(req, res) {
        try {
            const { accountId, day } = req.params;
            if (!accountId || !day) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'accountId and day are required',
                });
            }
            const dayNumber = parseInt(day);
            if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 14) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'day must be between 1 and 14',
                });
            }
            const tasks = await WarmupAutomation_1.warmupAutomationService.getTasksForDay(accountId, dayNumber);
            res.json({
                success: true,
                day: dayNumber,
                tasks,
                count: tasks.length,
            });
        }
        catch (error) {
            logger_1.logger.error('Get tasks for day error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to get tasks',
            });
        }
    }
    /**
     * POST /api/warmup/pause/:accountId
     * Pause warmup for an account
     */
    async pauseWarmup(req, res) {
        try {
            const { accountId } = req.params;
            if (!accountId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'accountId is required',
                });
            }
            logger_1.logger.info(`Pausing warmup for account ${accountId}`);
            const success = await WarmupAutomation_1.warmupAutomationService.pauseWarmup(accountId);
            if (!success) {
                return res.status(400).json({
                    error: 'Pause Failed',
                    message: 'Failed to pause warmup',
                });
            }
            res.json({
                success: true,
                message: 'Warmup paused successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Pause warmup error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to pause warmup',
            });
        }
    }
    /**
     * POST /api/warmup/resume/:accountId
     * Resume warmup for an account
     */
    async resumeWarmup(req, res) {
        try {
            const { accountId } = req.params;
            if (!accountId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'accountId is required',
                });
            }
            logger_1.logger.info(`Resuming warmup for account ${accountId}`);
            const success = await WarmupAutomation_1.warmupAutomationService.resumeWarmup(accountId);
            if (!success) {
                return res.status(400).json({
                    error: 'Resume Failed',
                    message: 'Failed to resume warmup',
                });
            }
            res.json({
                success: true,
                message: 'Warmup resumed successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Resume warmup error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to resume warmup',
            });
        }
    }
    /**
     * POST /api/warmup/skip-to-active/:accountId
     * Skip warmup and force account to ACTIVE (risky!)
     */
    async skipToActive(req, res) {
        try {
            const { accountId } = req.params;
            const { confirmed } = req.body;
            if (!accountId) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'accountId is required',
                });
            }
            if (!confirmed) {
                return res.status(400).json({
                    error: 'Confirmation Required',
                    message: 'You must confirm this risky action by setting confirmed: true',
                    warning: 'Skipping warmup increases the risk of account suspension. This action cannot be undone.',
                });
            }
            logger_1.logger.warn(`⚠️ Skipping warmup for account ${accountId} (RISKY!)`);
            const result = await WarmupAutomation_1.warmupAutomationService.skipToActive(accountId);
            if (!result.success) {
                return res.status(400).json({
                    error: 'Skip Failed',
                    message: result.message,
                    details: result.error,
                });
            }
            res.json({
                success: true,
                message: result.message,
                warning: 'Account is now ACTIVE. Monitor closely for any issues.',
            });
        }
        catch (error) {
            logger_1.logger.error('Skip to active error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to skip warmup',
            });
        }
    }
    /**
     * GET /api/warmup/accounts
     * Get all accounts currently in warmup
     */
    async getAccountsInWarmup(req, res) {
        try {
            const userId = req.user?.userId;
            const accounts = await WarmupAutomation_1.warmupAutomationService.getAccountsInWarmup(userId);
            res.json({
                success: true,
                accounts,
                count: accounts.length,
            });
        }
        catch (error) {
            logger_1.logger.error('Get accounts in warmup error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to get accounts in warmup',
            });
        }
    }
    /**
     * GET /api/warmup/stats
     * Get warmup statistics
     */
    async getStats(req, res) {
        try {
            const userId = req.user?.userId;
            const stats = await WarmupAutomation_1.warmupAutomationService.getWarmupStats(userId);
            const queueStats = await (0, WarmupJob_1.getWarmupQueueStats)();
            res.json({
                success: true,
                stats: {
                    ...stats,
                    queue: queueStats,
                },
            });
        }
        catch (error) {
            logger_1.logger.error('Get warmup stats error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to get warmup stats',
            });
        }
    }
    /**
     * POST /api/warmup/process-now
     * Manually trigger warmup task processing (admin only)
     */
    async processNow(req, res) {
        try {
            logger_1.logger.info('Manually triggering warmup task processing');
            await (0, WarmupJob_1.processWarmupTasksNow)();
            res.json({
                success: true,
                message: 'Warmup task processing triggered',
            });
        }
        catch (error) {
            logger_1.logger.error('Process now error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to trigger processing',
            });
        }
    }
    /**
     * GET /api/warmup/protocol
     * Get the warmup protocol details (14-day schedule)
     */
    async getProtocol(req, res) {
        try {
            const { WARMUP_PROTOCOL } = await Promise.resolve().then(() => __importStar(require('../../models/WarmupTask')));
            res.json({
                success: true,
                protocol: WARMUP_PROTOCOL,
                totalDays: 14,
                description: '14-day aggressive warmup protocol for new Instagram accounts',
            });
        }
        catch (error) {
            logger_1.logger.error('Get protocol error:', error);
            res.status(500).json({
                error: 'Server Error',
                message: error.message || 'Failed to get protocol',
            });
        }
    }
}
exports.WarmupController = WarmupController;
exports.warmupController = new WarmupController();
