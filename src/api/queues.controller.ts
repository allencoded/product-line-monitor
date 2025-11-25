import { Request, Response } from 'express';
import {
  batchSensorDataQueue,
  sensorDataQueue,
  anomalyDetectionQueue,
} from '../workers/queue';

/**
 * Get statistics for all queues
 */
export async function getQueueStats(_req: Request, res: Response): Promise<Response> {
  try {
    const [batchStats, sensorStats, anomalyStats] = await Promise.all([
      getQueueJobCounts(batchSensorDataQueue),
      getQueueJobCounts(sensorDataQueue),
      getQueueJobCounts(anomalyDetectionQueue),
    ]);

    return res.json({
      timestamp: new Date().toISOString(),
      queues: {
        'batch-sensor-data': batchStats,
        'sensor-data': sensorStats,
        'anomaly-detection': anomalyStats,
      },
      totals: {
        waiting: batchStats.waiting + sensorStats.waiting + anomalyStats.waiting,
        active: batchStats.active + sensorStats.active + anomalyStats.active,
        completed: batchStats.completed + sensorStats.completed + anomalyStats.completed,
        failed: batchStats.failed + sensorStats.failed + anomalyStats.failed,
        delayed: batchStats.delayed + sensorStats.delayed + anomalyStats.delayed,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve queue statistics',
      details: error.message,
    });
  }
}

/**
 * Helper function to get job counts for a queue
 */
async function getQueueJobCounts(queue: any) {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
  };
}
