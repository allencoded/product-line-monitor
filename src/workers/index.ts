import { Worker } from 'bullmq';
import { createSensorDataWorker } from './sensor-data.worker';
import { createAnomalyDetectionWorker } from './anomaly-detection.worker';
import { createDataAggregationWorker } from './data-aggregation.worker';
import { createBatchSensorDataWorker } from './batch-sensor-data.worker';

/**
 * Start all workers
 */
export const startAllWorkers = (): Worker[] => {
  console.log('Starting all workers...');

  const workers = [
    createSensorDataWorker(),
    createBatchSensorDataWorker(),
    createAnomalyDetectionWorker(),
    createDataAggregationWorker(),
  ];

  console.log(`All ${workers.length} workers started successfully`);

  return workers;
};

/**
 * Stop all workers gracefully
 */
export const stopAllWorkers = async (workers: Worker[]): Promise<void> => {
  console.log('Stopping all workers...');

  await Promise.all(workers.map((worker) => worker.close()));

  console.log('All workers stopped');
};

// Export individual worker creators
export {
  createSensorDataWorker,
  createAnomalyDetectionWorker,
  createDataAggregationWorker,
  createBatchSensorDataWorker,
};

// Export queues for external use
export * from './queue';

// Start all workers if this file is executed directly
if (require.main === module) {
  const workers = startAllWorkers();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down all workers...');
    await stopAllWorkers(workers);
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  console.log('All workers running. Press Ctrl+C to stop.');
}
