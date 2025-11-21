import prisma from '../client';
import { Anomaly, AnomalySeverity, SensorType, Prisma } from '@prisma/client';

export class AnomalyRepository {
  /**
   * Create a new anomaly
   */
  async create(data: Prisma.AnomalyCreateInput): Promise<Anomaly> {
    return prisma.anomaly.create({
      data,
    });
  }

  /**
   * Find anomaly by ID
   */
  async findById(id: string): Promise<Anomaly | null> {
    return prisma.anomaly.findUnique({
      where: { id },
      include: { equipment: true },
    });
  }

  /**
   * Get anomaly history with filtering
   */
  async getHistory(params: {
    equipmentId?: string;
    severity?: AnomalySeverity;
    sensorType?: SensorType;
    resolved?: boolean;
    startTime?: Date;
    endTime?: Date;
    skip?: number;
    take?: number;
  }): Promise<{ data: Anomaly[]; total: number }> {
    const where: Prisma.AnomalyWhereInput = {};

    if (params.equipmentId) where.equipmentId = params.equipmentId;
    if (params.severity) where.severity = params.severity;
    if (params.sensorType) where.sensorType = params.sensorType;
    if (params.resolved !== undefined) where.resolved = params.resolved;

    if (params.startTime || params.endTime) {
      where.time = {};
      if (params.startTime) where.time.gte = params.startTime;
      if (params.endTime) where.time.lte = params.endTime;
    }

    const [data, total] = await Promise.all([
      prisma.anomaly.findMany({
        where,
        include: { equipment: true },
        orderBy: { time: 'desc' },
        skip: params.skip || 0,
        take: params.take || 50,
      }),
      prisma.anomaly.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Find anomalies by equipment ID
   */
  async findByEquipment(equipmentId: string, limit: number = 50): Promise<any[]> {
    return prisma.anomaly.findMany({
      where: { equipmentId },
      include: { equipment: true },
      orderBy: { time: 'desc' },
      take: limit,
    });
  }

  /**
   * Get unresolved anomalies for equipment
   */
  async getUnresolvedByEquipment(equipmentId: string): Promise<Anomaly[]> {
    return prisma.anomaly.findMany({
      where: {
        equipmentId,
        resolved: false,
      },
      orderBy: { time: 'desc' },
    });
  }

  /**
   * Mark anomaly as resolved
   */
  async resolve(id: string): Promise<Anomaly> {
    return prisma.anomaly.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * Get anomaly count by severity
   */
  async getCountBySeverity(equipmentId?: string): Promise<
    {
      severity: AnomalySeverity;
      _count: number;
    }[]
  > {
    const where: Prisma.AnomalyWhereInput = { resolved: false };
    if (equipmentId) where.equipmentId = equipmentId;

    const results = await prisma.anomaly.groupBy({
      by: ['severity'],
      where,
      _count: { _all: true },
    });

    return results.map((r) => ({
      severity: r.severity,
      _count: r._count._all,
    }));
  }

  /**
   * Get recent critical anomalies
   */
  async getRecentCritical(limit: number = 10): Promise<Anomaly[]> {
    return prisma.anomaly.findMany({
      where: {
        severity: 'CRITICAL',
        resolved: false,
      },
      include: { equipment: true },
      orderBy: { time: 'desc' },
      take: limit,
    });
  }
}

export default new AnomalyRepository();
