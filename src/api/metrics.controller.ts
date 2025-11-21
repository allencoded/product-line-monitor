import { Request, Response } from 'express';
import prisma from '../db/client';
import { anomalyRepository, equipmentRepository } from '../db/repositories';

/**
 * GET /metrics/production
 * Get production metrics and statistics
 */
export const getProductionMetrics = async (req: Request, res: Response) => {
  try {
    const { startTime, endTime, equipmentId } = req.query;

    // Default to last 24 hours if no time range provided
    const end = endTime ? new Date(endTime as string) : new Date();
    const start = startTime
      ? new Date(startTime as string)
      : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    // Calculate duration in hours
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    // Build where clause
    const whereClause: any = {
      time: {
        gte: start,
        lte: end,
      },
    };

    if (equipmentId) {
      whereClause.equipmentId = equipmentId as string;
    }

    // Get total events processed
    const totalEvents = await prisma.sensorEvent.count({
      where: whereClause,
    });

    // Calculate events per hour
    const eventsPerHour = durationHours > 0 ? Math.round(totalEvents / durationHours) : 0;

    // Get equipment count
    const equipmentCount = equipmentId
      ? 1
      : await equipmentRepository.findAll().then((equipment) => equipment.length);

    // Get anomalies in time range
    const anomalies = await prisma.anomaly.count({
      where: {
        ...whereClause,
        resolved: false,
      },
    });

    // Calculate anomaly rate (anomalies per 1000 events)
    const anomalyRate = totalEvents > 0 ? (anomalies / totalEvents) * 1000 : 0;

    // Get anomalies by severity
    const anomaliesBySeverity = await anomalyRepository.getCountBySeverity(
      equipmentId as string | undefined
    );

    // Calculate uptime percentage (equipment with ONLINE status)
    const allEquipment = await equipmentRepository.findAll();
    const onlineEquipment = allEquipment.filter((eq) => eq.status === 'ONLINE').length;
    const uptimePercentage =
      allEquipment.length > 0 ? (onlineEquipment / allEquipment.length) * 100 : 0;

    // Build response
    const response = {
      timeRange: {
        start,
        end,
      },
      totalEvents,
      eventsPerHour,
      equipmentCount,
      anomalyRate: Math.round(anomalyRate * 100) / 100, // Round to 2 decimals
      anomaliesBySeverity: anomaliesBySeverity.map((item) => ({
        severity: item.severity,
        count: item._count,
      })),
      uptimePercentage: Math.round(uptimePercentage * 100) / 100, // Round to 2 decimals
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching production metrics:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch production metrics',
      statusCode: 500,
      timestamp: new Date(),
    });
  }
};
