import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { SensorType } from '@prisma/client';
import { anomalyDetectionService } from '../core';
import { AnomalyDetectionJobData } from './queue';
import 'dotenv/config';

/**
 * Create Redis connection for worker
 */
const createRedisConnection = (): Redis => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
};

/**
 * Process anomaly detection job
 * 1. Fetch rolling window of historical data
 * 2. Run Z-Score anomaly detection algorithm
 * 3. Store anomaly if detected
 * 4. Update equipment status if needed
 */
const processAnomalyDetection = async (job: Job<AnomalyDetectionJobData>): Promise<void> => {
  const { equipmentId, sensorType, value, unit, timestamp } = job.data;

  console.log(
    `Running anomaly detection: ${sensorType} for equipment ${equipmentId} - value: ${value}`
  );

  try {
    // Run anomaly detection
    const result = await anomalyDetectionService.processSensorReading(
      equipmentId,
      sensorType as SensorType,
      value,
      unit,
      new Date(timestamp)
    );

    if (result.isAnomaly) {
      console.log(
        `⚠️  ANOMALY DETECTED [${result.severity}]: ${result.description} (Z-Score: ${result.zScore.toFixed(2)})`
      );
    } else {
      console.log(
        `✓ Normal reading for ${sensorType} on equipment ${equipmentId} (Z-Score: ${result.zScore.toFixed(2)})`
      );
    }

    console.log(`Anomaly detection completed for job ${job.id}`);
  } catch (error) {
    console.error(`Error in anomaly detection job ${job.id}:`, error);
    throw error; // Will trigger retry
  }
};

/**
 * Create and start anomaly detection worker
 */
export const createAnomalyDetectionWorker = (): Worker<AnomalyDetectionJobData> => {
  const worker = new Worker<AnomalyDetectionJobData>(
    'anomaly-detection',
    processAnomalyDetection,
    {
      connection: createRedisConnection(),
      concurrency: 5, // Process up to 5 anomaly detection jobs concurrently
      limiter: {
        max: 50, // Max 50 jobs
        duration: 1000, // Per second
      },
    }
  );

  // Worker event handlers
  worker.on('completed', (job) => {
    console.log(`[anomaly-detection-worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[anomaly-detection-worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[anomaly-detection-worker] Worker error:', err);
  });

  console.log('Anomaly detection worker started with concurrency: 5');

  return worker;
};

// Start worker if this file is executed directly
if (require.main === module) {
  const worker = createAnomalyDetectionWorker();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down anomaly detection worker...');
    await worker.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
