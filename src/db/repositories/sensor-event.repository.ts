import prisma from '../client';
import { SensorEvent, SensorType, Prisma } from '@prisma/client';

export class SensorEventRepository {
  /**
   * Create a new sensor event
   */
  async create(data: Prisma.SensorEventCreateInput): Promise<SensorEvent> {
    return prisma.sensorEvent.create({
      data,
    });
  }

  /**
   * Batch create sensor events (for bulk ingestion)
   */
  async createMany(data: Prisma.SensorEventCreateManyInput[]): Promise<number> {
    const result = await prisma.sensorEvent.createMany({
      data,
      skipDuplicates: true,
    });
    return result.count;
  }

  /**
   * Get latest sensor readings for equipment
   */
  async getLatestByEquipment(
    equipmentId: string,
    limit: number = 10
  ): Promise<SensorEvent[]> {
    return prisma.sensorEvent.findMany({
      where: { equipmentId },
      orderBy: { time: 'desc' },
      take: limit,
    });
  }

  /**
   * Get sensor readings by type for equipment
   */
  async getByEquipmentAndType(
    equipmentId: string,
    sensorType: SensorType,
    startTime?: Date,
    endTime?: Date
  ): Promise<SensorEvent[]> {
    const where: Prisma.SensorEventWhereInput = {
      equipmentId,
      sensorType,
    };

    if (startTime || endTime) {
      where.time = {};
      if (startTime) where.time.gte = startTime;
      if (endTime) where.time.lte = endTime;
    }

    return prisma.sensorEvent.findMany({
      where,
      orderBy: { time: 'desc' },
    });
  }

  /**
   * Get rolling window of sensor readings for anomaly detection
   */
  async getRollingWindow(
    equipmentId: string,
    sensorType: SensorType,
    windowSize: number = 100
  ): Promise<SensorEvent[]> {
    return prisma.sensorEvent.findMany({
      where: {
        equipmentId,
        sensorType,
      },
      orderBy: { time: 'desc' },
      take: windowSize,
    });
  }

  /**
   * Get aggregated sensor statistics
   */
  async getStatistics(
    equipmentId: string,
    sensorType: SensorType,
    startTime: Date,
    endTime: Date
  ): Promise<{ avg: number; min: number; max: number; count: number } | null> {
    const result = await prisma.sensorEvent.aggregate({
      where: {
        equipmentId,
        sensorType,
        time: {
          gte: startTime,
          lte: endTime,
        },
      },
      _avg: { measuredValue: true },
      _min: { measuredValue: true },
      _max: { measuredValue: true },
      _count: true,
    });

    if (!result._count) return null;

    return {
      avg: result._avg?.measuredValue || 0,
      min: result._min?.measuredValue || 0,
      max: result._max?.measuredValue || 0,
      count: result._count,
    };
  }
}

export default new SensorEventRepository();
