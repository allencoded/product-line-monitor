import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import prisma from '../db/client';
import { DataAggregationJobData } from './queue';
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
 * Process data aggregation job
 * 1. Calculate statistics for time period
 * 2. Update materialized views if needed
 * 3. Generate aggregated metrics
 */
const processDataAggregation = async (job: Job<DataAggregationJobData>): Promise<void> => {
  const { equipmentId, startTime, endTime } = job.data;

  console.log(
    `Running data aggregation for equipment ${equipmentId} from ${startTime} to ${endTime}`
  );

  try {
    // Refresh TimescaleDB continuous aggregate (if needed)
    // This is typically handled automatically by TimescaleDB policies,
    // but can be triggered manually for specific time ranges
    await prisma.$executeRaw`
      CALL refresh_continuous_aggregate('sensor_events_hourly', ${new Date(startTime)}, ${new Date(endTime)})
    `;

    console.log('Continuous aggregate refreshed');

    // Calculate additional metrics
    const eventCount = await prisma.sensorEvent.count({
      where: {
        equipmentId,
        time: {
          gte: new Date(startTime),
          lte: new Date(endTime),
        },
      },
    });

    const anomalyCount = await prisma.anomaly.count({
      where: {
        equipmentId,
        time: {
          gte: new Date(startTime),
          lte: new Date(endTime),
        },
      },
    });

    console.log(
      `Aggregation complete: ${eventCount} events, ${anomalyCount} anomalies for job ${job.id}`
    );

    // Return metrics for job result
    return {
      eventCount,
      anomalyCount,
    } as any;
  } catch (error) {
    console.error(`Error in data aggregation job ${job.id}:`, error);
    throw error; // Will trigger retry
  }
};

/**
 * Create and start data aggregation worker
 */
export const createDataAggregationWorker = (): Worker<DataAggregationJobData> => {
  const worker = new Worker<DataAggregationJobData>(
    'data-aggregation',
    processDataAggregation,
    {
      connection: createRedisConnection(),
      concurrency: 2, // Process up to 2 aggregation jobs concurrently (CPU intensive)
      limiter: {
        max: 10, // Max 10 jobs
        duration: 60000, // Per minute (these are heavy operations)
      },
    }
  );

  // Worker event handlers
  worker.on('completed', (job, result) => {
    console.log(`[data-aggregation-worker] Job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, err) => {
    console.error(`[data-aggregation-worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[data-aggregation-worker] Worker error:', err);
  });

  console.log('Data aggregation worker started with concurrency: 2');

  return worker;
};

// Start worker if this file is executed directly
if (require.main === module) {
  const worker = createDataAggregationWorker();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down data aggregation worker...');
    await worker.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
