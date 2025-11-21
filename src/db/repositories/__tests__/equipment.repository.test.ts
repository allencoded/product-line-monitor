import { EquipmentRepository } from '../equipment.repository';
import { EquipmentStatus } from '@prisma/client';
import prisma from '../../client';

describe('EquipmentRepository', () => {
  let repository: EquipmentRepository;
  let testEquipmentIds: string[] = [];

  beforeAll(async () => {
    repository = new EquipmentRepository();
  });

  afterEach(async () => {
    // Clean up test equipment after each test
    if (testEquipmentIds.length > 0) {
      await prisma.equipment.deleteMany({
        where: {
          id: {
            in: testEquipmentIds,
          },
        },
      });
      testEquipmentIds = [];
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('create', () => {
    it('should create new equipment', async () => {
      const equipment = await repository.create({
        name: 'Test Press #1',
        type: 'press',
        location: 'Test Location A',
        status: EquipmentStatus.ONLINE,
      });

      testEquipmentIds.push(equipment.id);

      expect(equipment).toBeDefined();
      expect(equipment.id).toBeDefined();
      expect(equipment.name).toBe('Test Press #1');
      expect(equipment.type).toBe('press');
      expect(equipment.status).toBe(EquipmentStatus.ONLINE);
    });

    it('should set default status to OFFLINE if not provided', async () => {
      const equipment = await repository.create({
        name: 'Test Welder #2',
        type: 'welder',
        location: 'Test Location B',
      });

      testEquipmentIds.push(equipment.id);

      expect(equipment.status).toBe(EquipmentStatus.OFFLINE);
    });
  });

  describe('findById', () => {
    it('should find equipment by ID', async () => {
      const created = await repository.create({
        name: 'Test Mill #3',
        type: 'mill',
        location: 'Test Location C',
        status: EquipmentStatus.ONLINE,
      });
      testEquipmentIds.push(created.id);

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Test Mill #3');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all equipment ordered by name', async () => {
      const equipment1 = await repository.create({
        name: 'B Equipment',
        type: 'type1',
        location: 'Loc1',
        status: EquipmentStatus.ONLINE,
      });
      const equipment2 = await repository.create({
        name: 'A Equipment',
        type: 'type2',
        location: 'Loc2',
        status: EquipmentStatus.OFFLINE,
      });

      testEquipmentIds.push(equipment1.id, equipment2.id);

      const all = await repository.findAll();

      expect(all.length).toBeGreaterThanOrEqual(2);

      // Find our test equipment in results
      const ourEquipment = all.filter(e => testEquipmentIds.includes(e.id));
      expect(ourEquipment).toHaveLength(2);

      // Check they're ordered by name
      expect(ourEquipment[0].name).toBe('A Equipment');
      expect(ourEquipment[1].name).toBe('B Equipment');
    });
  });

  describe('findByStatus', () => {
    it('should return only equipment with specified status', async () => {
      const onlineEquipment = await repository.create({
        name: 'Online Test',
        type: 'test',
        location: 'Test',
        status: EquipmentStatus.ONLINE,
      });
      const offlineEquipment = await repository.create({
        name: 'Offline Test',
        type: 'test',
        location: 'Test',
        status: EquipmentStatus.OFFLINE,
      });

      testEquipmentIds.push(onlineEquipment.id, offlineEquipment.id);

      const onlineResults = await repository.findByStatus(EquipmentStatus.ONLINE);
      const onlineIds = onlineResults.map(e => e.id);

      expect(onlineIds).toContain(onlineEquipment.id);
      expect(onlineIds).not.toContain(offlineEquipment.id);
    });

    it('should return equipment with ANOMALY status', async () => {
      const anomalyEquipment = await repository.create({
        name: 'Anomaly Test',
        type: 'test',
        location: 'Test',
        status: EquipmentStatus.ANOMALY,
      });

      testEquipmentIds.push(anomalyEquipment.id);

      const results = await repository.findByStatus(EquipmentStatus.ANOMALY);
      const resultIds = results.map(e => e.id);

      expect(resultIds).toContain(anomalyEquipment.id);
    });
  });

  describe('update', () => {
    it('should update equipment fields', async () => {
      const equipment = await repository.create({
        name: 'Original Name',
        type: 'original_type',
        location: 'Original Location',
        status: EquipmentStatus.OFFLINE,
      });
      testEquipmentIds.push(equipment.id);

      const updated = await repository.update(equipment.id, {
        name: 'Updated Name',
        location: 'Updated Location',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.location).toBe('Updated Location');
      expect(updated.type).toBe('original_type'); // Unchanged
    });
  });

  describe('updateStatus', () => {
    it('should update equipment status and heartbeat', async () => {
      const equipment = await repository.create({
        name: 'Status Test',
        type: 'test',
        location: 'Test',
        status: EquipmentStatus.OFFLINE,
      });
      testEquipmentIds.push(equipment.id);

      const beforeUpdate = new Date();
      const updated = await repository.updateStatus(equipment.id, EquipmentStatus.ONLINE);

      expect(updated.status).toBe(EquipmentStatus.ONLINE);
      expect(updated.lastHeartbeat.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    it('should transition from ONLINE to ANOMALY', async () => {
      const equipment = await repository.create({
        name: 'Transition Test',
        type: 'test',
        location: 'Test',
        status: EquipmentStatus.ONLINE,
      });
      testEquipmentIds.push(equipment.id);

      const updated = await repository.updateStatus(equipment.id, EquipmentStatus.ANOMALY);

      expect(updated.status).toBe(EquipmentStatus.ANOMALY);
    });
  });

  describe('checkOnlineStatus', () => {
    it('should return true for recent heartbeat', async () => {
      const equipment = await repository.create({
        name: 'Heartbeat Test',
        type: 'test',
        location: 'Test',
        status: EquipmentStatus.ONLINE,
      });
      testEquipmentIds.push(equipment.id);

      // Update heartbeat to now
      await repository.updateStatus(equipment.id, EquipmentStatus.ONLINE);

      const isOnline = await repository.checkOnlineStatus(equipment.id);
      expect(isOnline).toBe(true);
    });

    it('should return false for old heartbeat (>30s)', async () => {
      const equipment = await repository.create({
        name: 'Old Heartbeat Test',
        type: 'test',
        location: 'Test',
        status: EquipmentStatus.ONLINE,
      });
      testEquipmentIds.push(equipment.id);

      // Set heartbeat to 60 seconds ago
      await prisma.equipment.update({
        where: { id: equipment.id },
        data: {
          lastHeartbeat: new Date(Date.now() - 60000),
        },
      });

      const isOnline = await repository.checkOnlineStatus(equipment.id);
      expect(isOnline).toBe(false);
    });

    it('should return false for non-existent equipment', async () => {
      const isOnline = await repository.checkOnlineStatus('00000000-0000-0000-0000-000000000000');
      expect(isOnline).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete equipment', async () => {
      const equipment = await repository.create({
        name: 'Delete Test',
        type: 'test',
        location: 'Test',
        status: EquipmentStatus.OFFLINE,
      });

      const deleted = await repository.delete(equipment.id);

      expect(deleted.id).toBe(equipment.id);

      const found = await repository.findById(equipment.id);
      expect(found).toBeNull();
    });
  });
});
