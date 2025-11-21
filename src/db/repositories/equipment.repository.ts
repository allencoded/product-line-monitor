import prisma from '../client';
import { Equipment, EquipmentStatus, Prisma } from '@prisma/client';

export class EquipmentRepository {
  /**
   * Find equipment by ID
   */
  async findById(id: string): Promise<Equipment | null> {
    return prisma.equipment.findUnique({
      where: { id },
    });
  }

  /**
   * Find all equipment
   */
  async findAll(): Promise<Equipment[]> {
    return prisma.equipment.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find equipment by status
   */
  async findByStatus(status: EquipmentStatus): Promise<Equipment[]> {
    return prisma.equipment.findMany({
      where: { status },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create new equipment
   */
  async create(data: Prisma.EquipmentCreateInput): Promise<Equipment> {
    return prisma.equipment.create({
      data,
    });
  }

  /**
   * Update equipment
   */
  async update(id: string, data: Prisma.EquipmentUpdateInput): Promise<Equipment> {
    return prisma.equipment.update({
      where: { id },
      data,
    });
  }

  /**
   * Update equipment status
   */
  async updateStatus(id: string, status: EquipmentStatus): Promise<Equipment> {
    return prisma.equipment.update({
      where: { id },
      data: {
        status,
        lastHeartbeat: new Date(),
      },
    });
  }

  /**
   * Delete equipment
   */
  async delete(id: string): Promise<Equipment> {
    return prisma.equipment.delete({
      where: { id },
    });
  }

  /**
   * Check if equipment is online (heartbeat within last 30 seconds)
   */
  async checkOnlineStatus(id: string): Promise<boolean> {
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      select: { lastHeartbeat: true },
    });

    if (!equipment) return false;

    const thirtySecondsAgo = new Date(Date.now() - 30000);
    return equipment.lastHeartbeat > thirtySecondsAgo;
  }
}

export default new EquipmentRepository();
