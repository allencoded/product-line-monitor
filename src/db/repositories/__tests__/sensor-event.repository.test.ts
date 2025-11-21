import { SensorEventRepository } from '../sensor-event.repository';
import { EquipmentRepository } from '../equipment.repository';
import { SensorType, EquipmentStatus } from '@prisma/client';
import prisma from '../../client';

describe('SensorEventRepository', () => {
  let repository: SensorEventRepository;
  let equipmentRepository: EquipmentRepository;
  let testEquipmentId: string;

  beforeAll(async () => {
    repository = new SensorEventRepository();
    equipmentRepository = new EquipmentRepository();

    // Create test equipment
    const equipment = await equipmentRepository.create({
      name: 'Test Equipment for Sensor Events',
      type: 'test',
      location: 'Test Location',
      status: EquipmentStatus.ONLINE,
    });
    testEquipmentId = equipment.id;
  });

  afterAll(async () => {
    // Clean up all sensor events for test equipment
    await prisma.sensorEvent.deleteMany({
      where: { equipmentId: testEquipmentId },
    });

    // Delete test equipment
    await equipmentRepository.delete(testEquipmentId);

    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean sensor events before each test
    await prisma.sensorEvent.deleteMany({
      where: { equipmentId: testEquipmentId },
    });
  });

  describe('create', () => {
    it('should create a new sensor event', async () => {
      const event = await repository.create({
        time: new Date(),
        equipment: { connect: { id: testEquipmentId } },
        sensorType: SensorType.TEMPERATURE,
        measuredValue: 85.5,
        unit: 'celsius',
      });

      expect(event).toBeDefined();
      expect(event.equipmentId).toBe(testEquipmentId);
      expect(event.sensorType).toBe(SensorType.TEMPERATURE);
      expect(event.measuredValue).toBe(85.5);
      expect(event.unit).toBe('celsius');
    });

    it('should create events with different sensor types', async () => {
      const types = [
        { type: SensorType.TEMPERATURE, measuredValue: 85, unit: 'celsius' },
        { type: SensorType.VIBRATION, measuredValue: 50, unit: 'hz' },
        { type: SensorType.PRESSURE, measuredValue: 120, unit: 'psi' },
        { type: SensorType.VOLTAGE, measuredValue: 24, unit: 'volts' },
      ];

      for (const t of types) {
        const event = await repository.create({
          time: new Date(),
          equipment: { connect: { id: testEquipmentId } },
          sensorType: t.type,
          measuredValue: t.measuredValue,
          unit: t.unit,
        });

        expect(event.sensorType).toBe(t.type);
        expect(event.measuredValue).toBe(t.measuredValue);
      }
    });
  });

  describe('createMany', () => {
    it('should batch create multiple sensor events', async () => {
      const now = new Date();
      const events = Array(10)
        .fill(null)
        .map((_, i) => ({
          time: new Date(now.getTime() + i * 1000),
          equipmentId: testEquipmentId,
          sensorType: SensorType.TEMPERATURE,
          measuredValue: 85 + i * 0.1,
          unit: 'celsius',
        }));

      const count = await repository.createMany(events);

      expect(count).toBe(10);

      const allEvents = await repository.getLatestByEquipment(testEquipmentId, 100);
      expect(allEvents.length).toBe(10);
    });

    it('should handle duplicate creation attempts', async () => {
      const now = new Date();
      const event = {
        time: now,
        equipmentId: testEquipmentId,
        sensorType: SensorType.TEMPERATURE,
        measuredValue: 85,
        unit: 'celsius',
      };

      const count1 = await repository.createMany([event]);
      expect(count1).toBe(1);

      // Create different events (different timestamps)
      const event2 = {
        time: new Date(now.getTime() + 1000),
        equipmentId: testEquipmentId,
        sensorType: SensorType.TEMPERATURE,
        measuredValue: 86,
        unit: 'celsius',
      };

      const count2 = await repository.createMany([event2]);
      expect(count2).toBe(1);
    });
  });

  describe('getLatestByEquipment', () => {
    it('should return latest sensor readings', async () => {
      const now = new Date();
      const events = Array(20)
        .fill(null)
        .map((_, i) => ({
          time: new Date(now.getTime() + i * 1000),
          equipmentId: testEquipmentId,
          sensorType: SensorType.TEMPERATURE,
          measuredValue: 85 + i,
          unit: 'celsius',
        }));

      await repository.createMany(events);

      const latest = await repository.getLatestByEquipment(testEquipmentId, 5);

      expect(latest).toHaveLength(5);
      // Should be in descending order (latest first)
      expect(latest[0].measuredValue).toBeGreaterThan(latest[4].measuredValue);
    });

    it('should respect limit parameter', async () => {
      const now = new Date();
      const events = Array(50)
        .fill(null)
        .map((_, i) => ({
          time: new Date(now.getTime() + i * 1000),
          equipmentId: testEquipmentId,
          sensorType: SensorType.VIBRATION,
          measuredValue: 50 + i * 0.1,
          unit: 'hz',
        }));

      await repository.createMany(events);

      const latest10 = await repository.getLatestByEquipment(testEquipmentId, 10);
      const latest25 = await repository.getLatestByEquipment(testEquipmentId, 25);

      expect(latest10).toHaveLength(10);
      expect(latest25).toHaveLength(25);
    });
  });

  describe('getByEquipmentAndType', () => {
    beforeEach(async () => {
      const now = new Date();
      const events = [
        ...Array(10)
          .fill(null)
          .map((_, i) => ({
            time: new Date(now.getTime() - (10 - i) * 60000), // 10-1 minutes ago
            equipmentId: testEquipmentId,
            sensorType: SensorType.TEMPERATURE,
            measuredValue: 85 + i,
            unit: 'celsius',
          })),
        ...Array(5)
          .fill(null)
          .map((_, i) => ({
            time: new Date(now.getTime() - (5 - i) * 60000),
            equipmentId: testEquipmentId,
            sensorType: SensorType.VIBRATION,
            measuredValue: 50 + i,
            unit: 'hz',
          })),
      ];

      await repository.createMany(events);
    });

    it('should filter by sensor type', async () => {
      const tempEvents = await repository.getByEquipmentAndType(
        testEquipmentId,
        SensorType.TEMPERATURE
      );
      const vibEvents = await repository.getByEquipmentAndType(
        testEquipmentId,
        SensorType.VIBRATION
      );

      expect(tempEvents).toHaveLength(10);
      expect(vibEvents).toHaveLength(5);

      tempEvents.forEach((e) => expect(e.sensorType).toBe(SensorType.TEMPERATURE));
      vibEvents.forEach((e) => expect(e.sensorType).toBe(SensorType.VIBRATION));
    });

    it('should filter by time range', async () => {
      const startTime = new Date(Date.now() - 6 * 60000); // 6 minutes ago
      const endTime = new Date(Date.now() - 2 * 60000); // 2 minutes ago

      const events = await repository.getByEquipmentAndType(
        testEquipmentId,
        SensorType.TEMPERATURE,
        startTime,
        endTime
      );

      events.forEach((e) => {
        expect(e.time.getTime()).toBeGreaterThanOrEqual(startTime.getTime());
        expect(e.time.getTime()).toBeLessThanOrEqual(endTime.getTime());
      });
    });

    it('should work with only startTime', async () => {
      const startTime = new Date(Date.now() - 5 * 60000); // 5 minutes ago

      const events = await repository.getByEquipmentAndType(
        testEquipmentId,
        SensorType.TEMPERATURE,
        startTime
      );

      events.forEach((e) => {
        expect(e.time.getTime()).toBeGreaterThanOrEqual(startTime.getTime());
      });
    });
  });

  describe('getRollingWindow', () => {
    it('should return specified number of latest readings', async () => {
      const now = new Date();
      const events = Array(200)
        .fill(null)
        .map((_, i) => ({
          time: new Date(now.getTime() + i * 1000),
          equipmentId: testEquipmentId,
          sensorType: SensorType.TEMPERATURE,
          measuredValue: 85 + (Math.random() - 0.5) * 2,
          unit: 'celsius',
        }));

      await repository.createMany(events);

      const window50 = await repository.getRollingWindow(
        testEquipmentId,
        SensorType.TEMPERATURE,
        50
      );
      const window100 = await repository.getRollingWindow(
        testEquipmentId,
        SensorType.TEMPERATURE,
        100
      );

      expect(window50).toHaveLength(50);
      expect(window100).toHaveLength(100);
    });

    it('should return readings in descending time order', async () => {
      const now = new Date();
      const events = Array(10)
        .fill(null)
        .map((_, i) => ({
          time: new Date(now.getTime() + i * 1000),
          equipmentId: testEquipmentId,
          sensorType: SensorType.VIBRATION,
          measuredValue: 50 + i,
          unit: 'hz',
        }));

      await repository.createMany(events);

      const window = await repository.getRollingWindow(
        testEquipmentId,
        SensorType.VIBRATION,
        10
      );

      // Latest should be first
      for (let i = 0; i < window.length - 1; i++) {
        expect(window[i].time.getTime()).toBeGreaterThanOrEqual(window[i + 1].time.getTime());
      }
    });
  });

  describe('getStatistics', () => {
    it('should calculate statistics for time range', async () => {
      const now = new Date();
      const values = [80, 85, 90, 95, 100];
      const events = values.map((value, i) => ({
        time: new Date(now.getTime() + i * 1000),
        equipmentId: testEquipmentId,
        sensorType: SensorType.TEMPERATURE,
        measuredValue: value,
        unit: 'celsius',
      }));

      await repository.createMany(events);

      const stats = await repository.getStatistics(
        testEquipmentId,
        SensorType.TEMPERATURE,
        new Date(now.getTime() - 1000),
        new Date(now.getTime() + 10000)
      );

      expect(stats).toBeDefined();
      if (stats) {
        expect(stats.count).toBe(5);
        expect(stats.avg).toBe(90); // Mean of [80, 85, 90, 95, 100]
        expect(stats.min).toBe(80);
        expect(stats.max).toBe(100);
      }
    });

    it('should return null for no matching data', async () => {
      const stats = await repository.getStatistics(
        testEquipmentId,
        SensorType.PRESSURE,
        new Date(Date.now() - 10000),
        new Date(Date.now() - 5000)
      );

      expect(stats).toBeNull();
    });

    it('should only include data within time range', async () => {
      const now = new Date();
      const events = [
        {
          time: new Date(now.getTime() - 10000), // Too old
          equipmentId: testEquipmentId,
          sensorType: SensorType.TEMPERATURE,
          measuredValue: 50,
          unit: 'celsius',
        },
        {
          time: new Date(now.getTime() - 5000), // In range
          equipmentId: testEquipmentId,
          sensorType: SensorType.TEMPERATURE,
          measuredValue: 85,
          unit: 'celsius',
        },
        {
          time: new Date(now.getTime()), // In range
          equipmentId: testEquipmentId,
          sensorType: SensorType.TEMPERATURE,
          measuredValue: 95,
          unit: 'celsius',
        },
      ];

      await repository.createMany(events);

      const stats = await repository.getStatistics(
        testEquipmentId,
        SensorType.TEMPERATURE,
        new Date(now.getTime() - 6000),
        new Date(now.getTime() + 1000)
      );

      expect(stats).toBeDefined();
      if (stats) {
        expect(stats.count).toBe(2);
        expect(stats.avg).toBe(90); // Mean of [85, 95]
      }
    });
  });
});
