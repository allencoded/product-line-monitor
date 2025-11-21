import { Queue, QueueEvents, QueueOptions } from 'bullmq';
import Redis from 'ioredis';
import 'dotenv/config';

/**
 * Track all Redis connections for cleanup
 */
const redisConnections: Redis[] = [];

/**
 * Create Redis connection for BullMQ
 */
const createRedisConnection = (): Redis => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
  });
  redisConnections.push(connection);
  return connection;
};

/**
 * Default queue options
 */
const defaultQueueOptions: QueueOptions = {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay, doubles each retry
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours for debugging
    },
  },
};

/**
 * Job data types
 */

// Sensor data processing job
export interface SensorDataJobData {
  equipmentId: string;
  sensorType: string;
  value: number;
  unit?: string;
  timestamp: string; // ISO string
}

// Batch sensor data job
export interface BatchSensorDataJobData {
  readings: SensorDataJobData[];
}

// Anomaly detection job
export interface AnomalyDetectionJobData {
  equipmentId: string;
  sensorType: string;
  value: number;
  unit?: string;
  timestamp: string;
}

// Data aggregation job
export interface DataAggregationJobData {
  equipmentId: string;
  startTime: string;
  endTime: string;
}

/**
 * Queue definitions
 */

// Queue for processing incoming sensor data
export const sensorDataQueue = new Queue<SensorDataJobData>('sensor-data', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    priority: 1, // High priority for real-time data
  },
});

// Queue for batch sensor data processing
export const batchSensorDataQueue = new Queue<BatchSensorDataJobData>('batch-sensor-data', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    priority: 2, // Medium priority
  },
});

// Queue for anomaly detection (triggered after sensor data is stored)
export const anomalyDetectionQueue = new Queue<AnomalyDetectionJobData>('anomaly-detection', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    priority: 1, // High priority for safety-critical detection
  },
});

// Queue for data aggregation tasks (can be delayed/scheduled)
export const dataAggregationQueue = new Queue<DataAggregationJobData>('data-aggregation', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    priority: 3, // Lower priority for batch operations
  },
});

/**
 * Queue event listeners for monitoring
 */
const queueEventsList: QueueEvents[] = [];

const setupQueueEvents = (queue: Queue, queueName: string) => {
  // Queue error events
  queue.on('error', (error) => {
    console.error(`[${queueName}] Queue error:`, error);
  });

  // Create QueueEvents for job lifecycle events
  const queueEvents = new QueueEvents(queueName, {
    connection: createRedisConnection(),
  });

  // Track for cleanup
  queueEventsList.push(queueEvents);

  queueEvents.on('waiting', ({ jobId }) => {
    console.log(`[${queueName}] Job ${jobId} is waiting`);
  });

  queueEvents.on('active', ({ jobId }) => {
    console.log(`[${queueName}] Job ${jobId} is now active`);
  });

  queueEvents.on('completed', ({ jobId }) => {
    console.log(`[${queueName}] Job ${jobId} completed`);
  });

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`[${queueName}] Job ${jobId} failed:`, failedReason);
  });

  return queueEvents;
};

// Set up event listeners
setupQueueEvents(sensorDataQueue, 'sensor-data');
setupQueueEvents(batchSensorDataQueue, 'batch-sensor-data');
setupQueueEvents(anomalyDetectionQueue, 'anomaly-detection');
setupQueueEvents(dataAggregationQueue, 'data-aggregation');

/**
 * Graceful shutdown handler
 */
export const closeQueues = async (): Promise<void> => {
  console.log('Closing queues...');

  // Close all queue event listeners
  await Promise.all(queueEventsList.map((qe) => qe.close()));

  // Close all queues
  await Promise.all([
    sensorDataQueue.close(),
    batchSensorDataQueue.close(),
    anomalyDetectionQueue.close(),
    dataAggregationQueue.close(),
  ]);

  // Close all Redis connections
  await Promise.all(
    redisConnections.map((conn) => {
      if (conn.status !== 'end') {
        return conn.quit();
      }
      return Promise.resolve();
    })
  );

  console.log('All queues and connections closed');
};

// Handle process termination
process.on('SIGTERM', closeQueues);
process.on('SIGINT', closeQueues);
