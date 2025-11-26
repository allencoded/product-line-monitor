import request from 'supertest';
import { SensorType, EquipmentStatus } from '@prisma/client';
import app from '../../index';
import prisma from '../../db/client';
import equipmentRepository from '../../db/repositories/equipment.repository';
import sensorEventRepository from '../../db/repositories/sensor-event.repository';
import { closeQueues } from '../../workers/queue';

describe('API Integration Tests', () => {
  let testEquipmentId: string;

  beforeAll(async () => {
    // Create test equipment
    const equipment = await equipmentRepository.create({
      name: 'Integration Test Equipment',
      type: 'test',
      location: 'Test Location',
      status: EquipmentStatus.ONLINE,
    });
    testEquipmentId = equipment.id;

    // Create some baseline sensor data
    const now = new Date();
    const events = Array(50)
      .fill(null)
      .map((_, i) => ({
        time: new Date(now.getTime() - (50 - i) * 60000),
        equipmentId: testEquipmentId,
        sensorType: SensorType.TEMPERATURE,
        measuredValue: 85 + (Math.random() - 0.5) * 2,
        unit: 'celsius',
      }));

    await sensorEventRepository.createMany(events);

    // Update heartbeat to ensure equipment is "online"
    await equipmentRepository.updateStatus(testEquipmentId, EquipmentStatus.ONLINE);
  });

  afterAll(async () => {
    // Cleanup database
    await prisma.sensorEvent.deleteMany({
      where: { equipmentId: testEquipmentId },
    });
    await prisma.anomaly.deleteMany({
      where: { equipmentId: testEquipmentId },
    });
    await equipmentRepository.delete(testEquipmentId);

    // Close queues and their connections
    await closeQueues();

    // Disconnect Prisma
    await prisma.$disconnect();

    // Final delay to ensure all async operations complete
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe('Health Check', () => {
    it('GET /health should return 200 and status ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeGreaterThan(0);
    });
  });

  describe('Equipment Endpoints', () => {
    describe('GET /api/equipment', () => {
      it('should return list of equipment', async () => {
        const response = await request(app).get('/api/equipment');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);

        const equipment = response.body.data.find((e: any) => e.id === testEquipmentId);
        expect(equipment).toBeDefined();
        expect(equipment.name).toBe('Integration Test Equipment');
      });
    });

    describe('GET /api/equipment/:id/status', () => {
      it('should return equipment status for valid ID', async () => {
        const response = await request(app).get(`/api/equipment/${testEquipmentId}/status`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testEquipmentId);
        expect(response.body.status).toBeDefined();
        expect(['ONLINE', 'OFFLINE', 'ANOMALY']).toContain(response.body.status);
        expect(response.body.latestReadings).toBeDefined();
        expect(Array.isArray(response.body.latestReadings)).toBe(true);
      });

      it('should return 404 for non-existent equipment', async () => {
        const response = await request(app).get(
          '/api/equipment/00000000-0000-0000-0000-000000000000/status'
        );

        expect(response.status).toBe(404);
      });

      it('should return 400 for invalid UUID format', async () => {
        const response = await request(app).get('/api/equipment/invalid-uuid/status');

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/equipment/:id/sensor-history', () => {
      it('should return sensor history with default parameters', async () => {
        const response = await request(app).get(
          `/api/equipment/${testEquipmentId}/sensor-history`
        );

        expect(response.status).toBe(200);
        expect(response.body.equipmentId).toBe(testEquipmentId);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should filter by sensor type', async () => {
        const response = await request(app)
          .get(`/api/equipment/${testEquipmentId}/sensor-history`)
          .query({ sensorType: SensorType.TEMPERATURE });

        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();

        if (response.body.data.length > 0) {
          response.body.data.forEach((reading: any) => {
            expect(reading.sensorType).toBe(SensorType.TEMPERATURE);
          });
        }
      });

      it('should filter by time range', async () => {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - 30 * 60000); // 30 minutes ago

        const response = await request(app)
          .get(`/api/equipment/${testEquipmentId}/sensor-history`)
          .query({
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
          });

        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
      });

      it('should support aggregation parameter', async () => {
        const response = await request(app)
          .get(`/api/equipment/${testEquipmentId}/sensor-history`)
          .query({ aggregation: 'hourly' });

        expect(response.status).toBe(200);
        expect(response.body.aggregation).toBe('hourly');
      });
    });
  });

  describe('Metrics Endpoints', () => {
    describe('GET /api/metrics/production', () => {
      it('should return production metrics', async () => {
        const response = await request(app).get('/api/metrics/production');

        expect(response.status).toBe(200);
        expect(response.body.totalEvents).toBeDefined();
        expect(typeof response.body.totalEvents).toBe('number');
      });

      it('should filter by time range', async () => {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - 24 * 60 * 60000); // 24 hours ago

        const response = await request(app)
          .get('/api/metrics/production')
          .query({
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
          });

        expect(response.status).toBe(200);
        expect(response.body.timeRange).toBeDefined();
      });

      it('should filter by equipment ID', async () => {
        const response = await request(app)
          .get('/api/metrics/production')
          .query({ equipmentId: testEquipmentId });

        expect(response.status).toBe(200);
        expect(response.body.totalEvents).toBeDefined();
      });
    });
  });

  describe('Alerts Endpoints', () => {
    describe('GET /api/alerts/history', () => {
      it('should return paginated alert history', async () => {
        const response = await request(app).get('/api/alerts/history');

        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.pagination).toBeDefined();
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.pageSize).toBe(50);
      });

      it('should support pagination parameters', async () => {
        const response = await request(app)
          .get('/api/alerts/history')
          .query({ page: '2', pageSize: '10' });

        expect(response.status).toBe(200);
        expect(response.body.pagination.page).toBe(2);
        expect(response.body.pagination.pageSize).toBe(10);
      });

      it('should filter by severity', async () => {
        const response = await request(app)
          .get('/api/alerts/history')
          .query({ severity: 'CRITICAL' });

        expect(response.status).toBe(200);

        if (response.body.data.length > 0) {
          response.body.data.forEach((alert: any) => {
            expect(alert.severity).toBe('CRITICAL');
          });
        }
      });

      it('should filter by equipment ID', async () => {
        const response = await request(app)
          .get('/api/alerts/history')
          .query({ equipmentId: testEquipmentId });

        expect(response.status).toBe(200);

        if (response.body.data.length > 0) {
          response.body.data.forEach((alert: any) => {
            expect(alert.equipmentId).toBe(testEquipmentId);
          });
        }
      });

      it('should return 400 for invalid pagination parameters', async () => {
        const response = await request(app).get('/api/alerts/history').query({ page: '0' });

        expect(response.status).toBe(400);
      });
    });

  });

  describe('Sensor Endpoints', () => {
    describe('GET /api/sensors/types', () => {
      it('should return list of sensor types', async () => {
        const response = await request(app).get('/api/sensors/types');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toContain('TEMPERATURE');
        expect(response.body.data).toContain('VIBRATION');
        expect(response.body.data).toContain('PRESSURE');
        expect(response.body.data).toContain('VOLTAGE');
      });
    });
  });

  describe('Webhook Endpoints', () => {
    describe('POST /api/webhook/sensor-data', () => {
      it('should accept valid sensor data payload', async () => {
        const payload = {
          readings: [
            {
              equipmentId: testEquipmentId,
              sensorType: SensorType.TEMPERATURE,
              value: 95.5,
              unit: 'celsius',
              timestamp: new Date().toISOString(),
            },
          ],
        };

        const response = await request(app).post('/api/webhook/sensor-data').send(payload);

        expect(response.status).toBe(202);
        expect(response.body.message).toBeDefined();
        expect(response.body.jobId).toBeDefined();
        expect(response.body.accepted).toBe(1);
      });

      it('should accept batch of sensor readings', async () => {
        const payload = {
          readings: Array(10)
            .fill(null)
            .map((_, i) => ({
              equipmentId: testEquipmentId,
              sensorType: SensorType.TEMPERATURE,
              value: 85 + i * 0.5,
              unit: 'celsius',
            })),
        };

        const response = await request(app).post('/api/webhook/sensor-data').send(payload);

        expect(response.status).toBe(202);
        expect(response.body.accepted).toBe(10);
      });

      it('should reject empty readings array', async () => {
        const payload = {
          readings: [],
        };

        const response = await request(app).post('/api/webhook/sensor-data').send(payload);

        expect(response.status).toBe(400);
      });

      it('should reject invalid equipment ID', async () => {
        const payload = {
          readings: [
            {
              equipmentId: 'invalid-uuid',
              sensorType: SensorType.TEMPERATURE,
              value: 85.5,
            },
          ],
        };

        const response = await request(app).post('/api/webhook/sensor-data').send(payload);

        expect(response.status).toBe(400);
      });

      it('should reject invalid sensor type', async () => {
        const payload = {
          readings: [
            {
              equipmentId: testEquipmentId,
              sensorType: 'INVALID_TYPE',
              value: 85.5,
            },
          ],
        };

        const response = await request(app).post('/api/webhook/sensor-data').send(payload);

        expect(response.status).toBe(400);
      });

      it('should reject non-finite values', async () => {
        const payload = {
          readings: [
            {
              equipmentId: testEquipmentId,
              sensorType: SensorType.TEMPERATURE,
              value: Infinity,
            },
          ],
        };

        const response = await request(app).post('/api/webhook/sensor-data').send(payload);

        expect(response.status).toBe(400);
      });

      it('should reject payload exceeding 1000 readings', async () => {
        const payload = {
          readings: Array(1001)
            .fill(null)
            .map(() => ({
              equipmentId: testEquipmentId,
              sensorType: SensorType.TEMPERATURE,
              value: 85,
            })),
        };

        const response = await request(app).post('/api/webhook/sensor-data').send(payload);

        expect(response.status).toBe(400);
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown-endpoint');

      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/webhook/sensor-data')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});
