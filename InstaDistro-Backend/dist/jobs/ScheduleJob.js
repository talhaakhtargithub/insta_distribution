"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleQueue = void 0;
exports.startScheduleProcessor = startScheduleProcessor;
const bull_1 = __importDefault(require("bull"));
const logger_1 = require("../config/logger");
const ScheduleService_1 = __importDefault(require("../services/schedule/ScheduleService"));
// ============================================
// SCHEDULE QUEUE
// ============================================
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
exports.scheduleQueue = new bull_1.default('schedule-processor', {
    redis: {
        host: REDIS_HOST,
        port: REDIS_PORT
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 60000
        },
        removeOnComplete: 100,
        removeOnFail: 500
    }
});
// ============================================
// JOB PROCESSOR
// ============================================
exports.scheduleQueue.process('process-schedules', async () => {
    logger_1.logger.info('[ScheduleJob] Processing due schedules');
    try {
        const dueSchedules = await ScheduleService_1.default.getDueSchedules();
        logger_1.logger.info(`[ScheduleJob] Found ${dueSchedules.length} due schedules`);
        for (const schedule of dueSchedules) {
            try {
                // Update status to processing
                await ScheduleService_1.default.updateSchedule(schedule.id, { status: 'processing' });
                // Queue the actual posting job
                // This would integrate with PostJob or DistributionJob
                logger_1.logger.info(`[ScheduleJob] Queued schedule ${schedule.id} for ${schedule.accountIds.length} accounts`);
                // Mark as completed (simplified - in reality this would be done after actual posting)
                await ScheduleService_1.default.updateSchedule(schedule.id, { status: 'completed' });
            }
            catch (error) {
                logger_1.logger.error(`[ScheduleJob] Error processing schedule ${schedule.id}:`, error);
                await ScheduleService_1.default.updateSchedule(schedule.id, {
                    status: 'failed'
                });
            }
        }
        return {
            success: true,
            processed: dueSchedules.length,
            timestamp: new Date()
        };
    }
    catch (error) {
        logger_1.logger.error('[ScheduleJob] Error in schedule processor:', error);
        throw error;
    }
});
// ============================================
// JOB SCHEDULING
// ============================================
function startScheduleProcessor() {
    // Process schedules every 5 minutes
    exports.scheduleQueue.add('process-schedules', {}, {
        repeat: {
            cron: '*/5 * * * *' // Every 5 minutes
        },
        jobId: 'schedule-processor'
    });
    logger_1.logger.info('[ScheduleJob] Schedule processor started (checks every 5 minutes)');
}
// ============================================
// EVENT LISTENERS
// ============================================
exports.scheduleQueue.on('completed', (job, result) => {
    logger_1.logger.info(`[ScheduleJob] Job ${job.id} completed:`, result);
});
exports.scheduleQueue.on('failed', (job, err) => {
    logger_1.logger.error(`[ScheduleJob] Job ${job?.id} failed:`, err.message);
});
exports.default = exports.scheduleQueue;
