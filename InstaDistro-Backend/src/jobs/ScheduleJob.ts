import Bull from 'bull';
import ScheduleService from '../services/schedule/ScheduleService';

// ============================================
// SCHEDULE QUEUE
// ============================================

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

export const scheduleQueue = new Bull('schedule-processor', {
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

scheduleQueue.process('process-schedules', async () => {
  console.log('[ScheduleJob] Processing due schedules');

  try {
    const dueSchedules = await ScheduleService.getDueSchedules();

    console.log(`[ScheduleJob] Found ${dueSchedules.length} due schedules`);

    for (const schedule of dueSchedules) {
      try {
        // Update status to processing
        await ScheduleService.updateSchedule(schedule.id, { status: 'processing' });

        // Queue the actual posting job
        // This would integrate with PostJob or DistributionJob
        console.log(`[ScheduleJob] Queued schedule ${schedule.id} for ${schedule.accountIds.length} accounts`);

        // Mark as completed (simplified - in reality this would be done after actual posting)
        await ScheduleService.updateSchedule(schedule.id, { status: 'completed' });

      } catch (error: any) {
        console.error(`[ScheduleJob] Error processing schedule ${schedule.id}:`, error);
        await ScheduleService.updateSchedule(schedule.id, {
          status: 'failed'
        });
      }
    }

    return {
      success: true,
      processed: dueSchedules.length,
      timestamp: new Date()
    };

  } catch (error: any) {
    console.error('[ScheduleJob] Error in schedule processor:', error);
    throw error;
  }
});

// ============================================
// JOB SCHEDULING
// ============================================

export function startScheduleProcessor() {
  // Process schedules every 5 minutes
  scheduleQueue.add(
    'process-schedules',
    {},
    {
      repeat: {
        cron: '*/5 * * * *' // Every 5 minutes
      },
      jobId: 'schedule-processor'
    }
  );

  console.log('[ScheduleJob] Schedule processor started (checks every 5 minutes)');
}

// ============================================
// EVENT LISTENERS
// ============================================

scheduleQueue.on('completed', (job, result) => {
  console.log(`[ScheduleJob] Job ${job.id} completed:`, result);
});

scheduleQueue.on('failed', (job, err) => {
  console.error(`[ScheduleJob] Job ${job?.id} failed:`, err.message);
});

export default scheduleQueue;
