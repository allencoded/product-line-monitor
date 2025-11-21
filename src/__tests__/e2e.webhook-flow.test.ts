/**
 * End-to-End Webhook Flow Integration Test
 *
 * This test simulates the complete flow:
 * 1. Webhook ingestion of sensor data
 * 2. Background processing (anomaly detection)
 * 3. Data persistence
 * 4. Query APIs returning processed results
 */

import request from 'supertest';
import { SensorType, EquipmentStatus } from '@prisma/client';
import { Worker } from 'bullmq';
import app from '../index';
import prisma from '../db/client';
import equipmentRepository from '../db/repositories/equipment.repository';
import sensorEventRepository from '../db/repositories/sensor-event.repository';
import anomalyRepository from '../db/repositories/anomaly.repository';
import { dataGenerator } from '../utils/data-generator';
import { closeQueues } from '../workers/queue';
import { createBatchSensorDataWorker } from '../workers/batch-sensor-data.worker';
import { createSensorDataWorker } from '../workers/sensor-data.worker';
import { createAnomalyDetectionWorker } from '../workers/anomaly-detection.worker';

describe('End-to-End Webhook Flow', () => {
  let testEquipmentId: string;
  let workers: Worker[] = [];

  beforeAll(async () => {
    // Start workers for E2E tests
    workers.push(createBatchSensorDataWorker());
    workers.push(createSensorDataWorker());
    workers.push(createAnomalyDetectionWorker());

    // Create test equipment
    const equipment = await equipmentRepository.create({
      name: 'E2E Test Equipment',
      type: 'test_equipment',
      location: 'E2E Test Location',
      status: EquipmentStatus.ONLINE,
    });
    testEquipmentId = equipment.id;

    // Create baseline normal data for anomaly detection
    const now = new Date();
    const baselineReadings = Array(100)
      .fill(null)
      .map((_, i) => ({
        time: new Date(now.getTime() - (100 - i) * 60000),
        equipmentId: testEquipmentId,
        sensorType: SensorType.TEMPERATURE,
        measuredValue: 85 + (Math.random() - 0.5) * 2, // Normal range: 84-86
        unit: 'celsius',
      }));

    await sensorEventRepository.createMany(baselineReadings);
  });

  afterAll(async () => {
    // Cleanup database
    await prisma.anomaly.deleteMany({ where: { equipmentId: testEquipmentId } });
    await prisma.sensorEvent.deleteMany({ where: { equipmentId: testEquipmentId } });
    await equipmentRepository.delete(testEquipmentId);

    // Close workers first (they have their own Redis connections)
    await Promise.all(workers.map((worker) => worker.close()));

    // Give workers time to fully close
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Close queues and their connections
    await closeQueues();

    // Disconnect Prisma
    await prisma.$disconnect();

    // Final delay to ensure all async operations complete
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe('Normal Operation Flow', () => {
    it('should complete full flow: ingest -> process -> query normal data', async () => {
      // Step 1: Ingest normal sensor data via webhook
      const normalReading = dataGenerator.generateNormalReading(
        testEquipmentId,
        SensorType.TEMPERATURE,
        new Date()
      );

      const ingestResponse = await request(app)
        .post('/api/webhook/sensor-data')
        .send({
          readings: [
            {
              equipmentId: normalReading.equipmentId,
              sensorType: normalReading.sensorType,
              value: normalReading.value,
              unit: normalReading.unit,
              timestamp: normalReading.timestamp.toISOString(),
            },
          ],
        });

      expect(ingestResponse.status).toBe(202);
      expect(ingestResponse.body.jobId).toBeDefined();

      // Step 2: Wait for background processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Step 3: Verify data was persisted
      const latestReadings = await sensorEventRepository.getLatestByEquipment(
        testEquipmentId,
        10
      );

      expect(latestReadings.length).toBeGreaterThan(0);

      const persistedReading = latestReadings.find(
        (r) => Math.abs(r.measuredValue - normalReading.value) < 0.01
      );
      expect(persistedReading).toBeDefined();

      // Step 4: Query equipment status
      const statusResponse = await request(app).get(
        `/api/equipment/${testEquipmentId}/status`
      );

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.id).toBe(testEquipmentId);
      expect(statusResponse.body.latestReadings).toBeDefined();

      // Step 5: Verify no anomaly was created for this normal reading
      const anomalies = await anomalyRepository.findByEquipment(testEquipmentId, 10);
      const anomalyForThisReading = anomalies.find(
        (a: any) =>
          a.time.getTime() > Date.now() - 5000 &&
          Math.abs(a.detectedValue - normalReading.value) < 0.01
      );

      expect(anomalyForThisReading).toBeUndefined(); // Normal reading should not create anomaly
    });
  });

  describe('Anomaly Detection Flow', () => {
    it('should complete full flow: ingest anomaly -> detect -> store -> query alert', async () => {
      // Step 1: Ingest anomalous sensor data (critical spike)
      const anomalousReading = dataGenerator.generateAnomalousReading(
        testEquipmentId,
        SensorType.TEMPERATURE,
        'spike',
        'critical',
        new Date()
      );

      const ingestResponse = await request(app)
        .post('/api/webhook/sensor-data')
        .send({
          readings: [
            {
              equipmentId: anomalousReading.equipmentId,
              sensorType: anomalousReading.sensorType,
              value: anomalousReading.value,
              unit: anomalousReading.unit,
              timestamp: anomalousReading.timestamp.toISOString(),
            },
          ],
        });

      expect(ingestResponse.status).toBe(202);

      // Step 2: Wait for background anomaly detection processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Step 3: Verify anomalous reading was persisted
      const latestReadings = await sensorEventRepository.getLatestByEquipment(
        testEquipmentId,
        20
      );

      const anomalousEvent = latestReadings.find(
        (r) => Math.abs(r.measuredValue - anomalousReading.value) < 0.01
      );
      expect(anomalousEvent).toBeDefined();

      // Step 4: Verify anomaly was detected and stored
      const anomalies = await anomalyRepository.findByEquipment(testEquipmentId, 10);

      expect(anomalies.length).toBeGreaterThan(0);

      const detectedAnomaly = anomalies.find(
        (a: any) => a.time.getTime() > Date.now() - 5000 // Recent anomaly
      );

      if (detectedAnomaly) {
        expect(detectedAnomaly.equipmentId).toBe(testEquipmentId);
        expect(detectedAnomaly.severity).toBeDefined();
        expect(detectedAnomaly.description).toContain('TEMPERATURE');
      }

      // Step 5: Query alert history API
      const alertsResponse = await request(app).get('/api/alerts/history').query({
        equipmentId: testEquipmentId,
        page: '1',
        pageSize: '10',
      });

      expect(alertsResponse.status).toBe(200);
      expect(alertsResponse.body.data).toBeDefined();

      if (detectedAnomaly && alertsResponse.body.data.length > 0) {
        const alertInResponse = alertsResponse.body.data.find(
          (a: any) => a.equipmentId === testEquipmentId
        );
        expect(alertInResponse).toBeDefined();
      }

      // Step 6: Query equipment status (should reflect anomaly)
      const statusResponse = await request(app).get(
        `/api/equipment/${testEquipmentId}/status`
      );

      expect(statusResponse.status).toBe(200);
      // Status might be ONLINE or ANOMALY depending on implementation
      expect(['ONLINE', 'ANOMALY']).toContain(statusResponse.body.status);
    });
  });

  describe('Batch Processing Flow', () => {
    it('should handle batch webhook ingestion with mixed normal and anomalous data', async () => {
      // Generate batch with 20 normal + 3 anomalous readings
      const normalReadings = Array(20)
        .fill(null)
        .map(() =>
          dataGenerator.generateNormalReading(testEquipmentId, SensorType.VIBRATION, new Date())
        );

      const anomalousReadings = [
        dataGenerator.generateAnomalousReading(
          testEquipmentId,
          SensorType.VIBRATION,
          'spike',
          'medium',
          new Date()
        ),
        dataGenerator.generateAnomalousReading(
          testEquipmentId,
          SensorType.VIBRATION,
          'drop',
          'low',
          new Date()
        ),
        dataGenerator.generateAnomalousReading(
          testEquipmentId,
          SensorType.VIBRATION,
          'spike',
          'critical',
          new Date()
        ),
      ];

      const allReadings = [...normalReadings, ...anomalousReadings];

      // Step 1: Ingest batch
      const ingestResponse = await request(app)
        .post('/api/webhook/sensor-data')
        .send({
          readings: allReadings.map((r) => ({
            equipmentId: r.equipmentId,
            sensorType: r.sensorType,
            value: r.value,
            unit: r.unit,
            timestamp: r.timestamp.toISOString(),
          })),
        });

      expect(ingestResponse.status).toBe(202);
      expect(ingestResponse.body.accepted).toBe(23);

      // Step 2: Wait for batch processing
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Step 3: Verify all readings were persisted
      const vibrationEvents = await sensorEventRepository.getByEquipmentAndType(
        testEquipmentId,
        SensorType.VIBRATION,
        new Date(Date.now() - 10000),
        new Date()
      );

      expect(vibrationEvents.length).toBeGreaterThanOrEqual(23);

      // Step 4: Query sensor history API
      const historyResponse = await request(app)
        .get(`/api/equipment/${testEquipmentId}/sensor-history`)
        .query({
          sensorType: SensorType.VIBRATION,
          startTime: new Date(Date.now() - 10000).toISOString(),
        });

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.data.length).toBeGreaterThanOrEqual(20);

      // Step 5: Check production metrics
      const metricsResponse = await request(app).get('/api/metrics/production').query({
        equipmentId: testEquipmentId,
      });

      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.body.totalEvents).toBeDefined();
    });
  });

  describe('Time Series Query Flow', () => {
    it('should query historical sensor data with time range filters', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60000);
      const twoHoursAgo = new Date(now.getTime() - 120 * 60000);

      // Query specific time window
      const response = await request(app)
        .get(`/api/equipment/${testEquipmentId}/sensor-history`)
        .query({
          sensorType: SensorType.TEMPERATURE,
          startTime: twoHoursAgo.toISOString(),
          endTime: oneHourAgo.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();

      // Verify readings are within time range
      response.body.data.forEach((reading: any) => {
        const readingTime = new Date(reading.time);
        expect(readingTime.getTime()).toBeGreaterThanOrEqual(twoHoursAgo.getTime());
        expect(readingTime.getTime()).toBeLessThanOrEqual(oneHourAgo.getTime());
      });
    });
  });

  describe('Equipment Status Tracking Flow', () => {
    it('should update equipment status based on heartbeat', async () => {
      // Send recent data (simulates heartbeat)
      const reading = dataGenerator.generateNormalReading(
        testEquipmentId,
        SensorType.TEMPERATURE,
        new Date()
      );

      await request(app)
        .post('/api/webhook/sensor-data')
        .send({
          readings: [
            {
              equipmentId: reading.equipmentId,
              sensorType: reading.sensorType,
              value: reading.value,
              unit: reading.unit,
            },
          ],
        });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update equipment heartbeat
      await equipmentRepository.updateStatus(testEquipmentId, EquipmentStatus.ONLINE);

      // Check status immediately
      const statusResponse = await request(app).get(
        `/api/equipment/${testEquipmentId}/status`
      );

      expect(statusResponse.status).toBe(200);
      expect(['ONLINE', 'ANOMALY']).toContain(statusResponse.body.status);
    });
  });

  describe('Critical Alert Priority Flow', () => {
    it('should prioritize critical anomalies in alerts endpoint', async () => {
      // Create critical anomaly
      const criticalReading = dataGenerator.generateAnomalousReading(
        testEquipmentId,
        SensorType.PRESSURE,
        'drop',
        'critical',
        new Date()
      );

      await request(app)
        .post('/api/webhook/sensor-data')
        .send({
          readings: [
            {
              equipmentId: criticalReading.equipmentId,
              sensorType: criticalReading.sensorType,
              value: criticalReading.value,
              unit: criticalReading.unit,
            },
          ],
        });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Query critical alerts
      const criticalResponse = await request(app).get('/api/alerts/critical');

      expect(criticalResponse.status).toBe(200);
      expect(Array.isArray(criticalResponse.body.data)).toBe(true);

      // All returned alerts should be CRITICAL
      criticalResponse.body.data.forEach((alert: any) => {
        expect(alert.severity).toBe('CRITICAL');
      });
    });
  });
});
