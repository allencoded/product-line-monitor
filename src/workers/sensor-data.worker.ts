import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { SensorType } from '@prisma/client';
import { sensorEventRepository, equipmentRepository } from '../db/repositories';
import { anomalyDetectionQueue, SensorDataJobData, AnomalyDetectionJobData } from './queue';
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
 * Process sensor data job
 * 1. Store sensor reading in database
 * 2. Update equipment heartbeat
 * 3. Trigger anomaly detection job
 */
const processSensorData = async (job: Job<SensorDataJobData>): Promise<void> => {
  const { equipmentId, sensorType, value, unit, timestamp } = job.data;

  console.log(
    `Processing sensor data: ${sensorType} for equipment ${equipmentId} - value: ${value}`
  );

  try {
    // Store sensor event in database
    await sensorEventRepository.create({
      time: new Date(timestamp),
      equipment: {
        connect: { id: equipmentId },
      },
      sensorType: sensorType as SensorType,
      measuredValue: value,
      unit,
    });

    // Update equipment heartbeat
    await equipmentRepository.update(equipmentId, {
      lastHeartbeat: new Date(timestamp),
    });

    // Trigger anomaly detection in separate queue
    const anomalyJobData: AnomalyDetectionJobData = {
      equipmentId,
      sensorType,
      value,
      unit,
      timestamp,
    };

    await anomalyDetectionQueue.add('detect-anomaly', anomalyJobData, {
      priority: 1, // High priority
    });

    console.log(`Sensor data processed successfully for job ${job.id}`);
  } catch (error) {
    console.error(`Error processing sensor data job ${job.id}:`, error);
    throw error; // Will trigger retry
  }
};

/**
 * Create and start sensor data worker
 */
export const createSensorDataWorker = (): Worker<SensorDataJobData> => {
  const worker = new Worker<SensorDataJobData>('sensor-data', processSensorData, {
    connection: createRedisConnection(),
    concurrency: 10, // Process up to 10 jobs concurrently
    limiter: {
      max: 100, // Max 100 jobs
      duration: 1000, // Per second
    },
  });

  // Worker event handlers
  worker.on('completed', (job) => {
    console.log(`[sensor-data-worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[sensor-data-worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[sensor-data-worker] Worker error:', err);
  });

  console.log('Sensor data worker started with concurrency: 10');

  return worker;
};

// Start worker if this file is executed directly
if (require.main === module) {
  const worker = createSensorDataWorker();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down sensor data worker...');
    await worker.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
