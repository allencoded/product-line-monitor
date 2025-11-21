import { Request, Response } from 'express';
import { batchSensorDataQueue, BatchSensorDataJobData } from '../workers/queue';

/**
 * POST /webhook/sensor-data
 * Webhook endpoint for ingesting sensor data from manufacturing equipment
 *
 * Accepts batch of sensor readings and queues them for processing
 * Returns 202 Accepted immediately for high throughput
 */
export const ingestSensorData = async (req: Request, res: Response) => {
  try {
    const { readings } = req.body;

    console.log(`Webhook received ${readings.length} sensor readings`);

    // Prepare job data for queue
    const jobData: BatchSensorDataJobData = {
      readings: readings.map((reading: any) => ({
        equipmentId: reading.equipmentId,
        sensorType: reading.sensorType,
        value: reading.value,
        unit: reading.unit,
        timestamp: reading.timestamp || new Date().toISOString(),
      })),
    };

    // Add to queue for background processing
    const job = await batchSensorDataQueue.add('process-batch', jobData, {
      priority: 1, // High priority for webhook ingestion
      attempts: 3,
    });

    console.log(`Batch queued with job ID: ${job.id}`);

    // Return 202 Accepted immediately (don't wait for processing)
    return res.status(202).json({
      message: 'Sensor data accepted for processing',
      accepted: readings.length,
      jobId: job.id,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process sensor data',
      statusCode: 500,
      timestamp: new Date(),
    });
  }
};

/**
 * GET /webhook/status/:jobId
 * Check status of a webhook job
 */
export const getWebhookJobStatus = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const job = await batchSensorDataQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Job with ID ${jobId} not found`,
        statusCode: 404,
        timestamp: new Date(),
      });
    }

    const state = await job.getState();
    const progress = job.progress;
    const returnValue = job.returnvalue;
    const failedReason = job.failedReason;

    return res.status(200).json({
      jobId: job.id,
      name: job.name,
      state,
      progress,
      result: returnValue,
      failedReason,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch job status',
      statusCode: 500,
      timestamp: new Date(),
    });
  }
};
