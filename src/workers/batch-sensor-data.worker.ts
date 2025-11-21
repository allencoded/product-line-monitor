import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { sensorDataQueue, BatchSensorDataJobData, SensorDataJobData } from './queue';
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
 * Process batch sensor data job
 * Splits batch into individual sensor data jobs for parallel processing
 */
const processBatchSensorData = async (job: Job<BatchSensorDataJobData>): Promise<void> => {
  const { readings } = job.data;

  console.log(`Processing batch of ${readings.length} sensor readings`);

  try {
    // Add each reading as a separate job to sensor-data queue
    const jobs: Promise<any>[] = readings.map((reading) => {
      const jobData: SensorDataJobData = {
        equipmentId: reading.equipmentId,
        sensorType: reading.sensorType,
        value: reading.value,
        unit: reading.unit,
        timestamp: reading.timestamp,
      };

      return sensorDataQueue.add('process-sensor-data', jobData, {
        priority: 2, // Medium priority for batch items
      });
    });

    // Wait for all jobs to be added to queue
    await Promise.all(jobs);

    console.log(`Batch job ${job.id} split into ${readings.length} individual jobs`);
  } catch (error) {
    console.error(`Error processing batch sensor data job ${job.id}:`, error);
    throw error; // Will trigger retry
  }
};

/**
 * Create and start batch sensor data worker
 */
export const createBatchSensorDataWorker = (): Worker<BatchSensorDataJobData> => {
  const worker = new Worker<BatchSensorDataJobData>(
    'batch-sensor-data',
    processBatchSensorData,
    {
      connection: createRedisConnection(),
      concurrency: 3, // Process up to 3 batch jobs concurrently
      limiter: {
        max: 20, // Max 20 batch jobs
        duration: 1000, // Per second
      },
    }
  );

  // Worker event handlers
  worker.on('completed', (job) => {
    console.log(`[batch-sensor-data-worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[batch-sensor-data-worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[batch-sensor-data-worker] Worker error:', err);
  });

  console.log('Batch sensor data worker started with concurrency: 3');

  return worker;
};

// Start worker if this file is executed directly
if (require.main === module) {
  const worker = createBatchSensorDataWorker();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down batch sensor data worker...');
    await worker.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
