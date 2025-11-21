import { Request, Response } from 'express';
import { anomalyRepository } from '../db/repositories';
import { SensorType, AnomalySeverity } from '@prisma/client';

/**
 * GET /alerts/history
 * Get alert/anomaly history with filtering and pagination
 */
export const getAlertHistory = async (req: Request, res: Response) => {
  try {
    const {
      equipmentId,
      severity,
      sensorType,
      resolved,
      startTime,
      endTime,
      page = 1,
      pageSize = 50,
    } = req.query;

    // Build filter parameters
    const filters: any = {
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize),
    };

    if (equipmentId) filters.equipmentId = equipmentId as string;
    if (severity) filters.severity = severity as AnomalySeverity;
    if (sensorType) filters.sensorType = sensorType as SensorType;
    if (resolved !== undefined) {
      filters.resolved = resolved === 'true';
    }
    if (startTime) filters.startTime = new Date(startTime as string);
    if (endTime) filters.endTime = new Date(endTime as string);

    // Fetch anomaly history
    const { data, total } = await anomalyRepository.getHistory(filters);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(pageSize));

    // Format response
    const response = {
      data: data.map((anomaly: any) => ({
        id: anomaly.id,
        time: anomaly.time,
        equipmentId: anomaly.equipmentId,
        equipmentName: anomaly.equipment?.name || 'Unknown',
        sensorType: anomaly.sensorType,
        severity: anomaly.severity,
        description: anomaly.description,
        value: anomaly.detectedValue,
        threshold: anomaly.threshold,
        zScore: anomaly.zScore,
        resolved: anomaly.resolved,
        resolvedAt: anomaly.resolvedAt,
      })),
      pagination: {
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching alert history:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch alert history',
      statusCode: 500,
      timestamp: new Date(),
    });
  }
};

/**
 * GET /alerts/critical
 * Get recent critical alerts
 */
export const getCriticalAlerts = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const criticalAlerts = await anomalyRepository.getRecentCritical(Number(limit));

    const response = {
      data: criticalAlerts.map((anomaly: any) => ({
        id: anomaly.id,
        time: anomaly.time,
        equipmentId: anomaly.equipmentId,
        equipmentName: anomaly.equipment?.name || 'Unknown',
        sensorType: anomaly.sensorType,
        severity: anomaly.severity,
        description: anomaly.description,
        value: anomaly.detectedValue,
        zScore: anomaly.zScore,
      })),
      count: criticalAlerts.length,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching critical alerts:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch critical alerts',
      statusCode: 500,
      timestamp: new Date(),
    });
  }
};

/**
 * PATCH /alerts/:id/resolve
 * Mark an alert as resolved
 */
export const resolveAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const anomaly = await anomalyRepository.findById(id);

    if (!anomaly) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Alert with ID ${id} not found`,
        statusCode: 404,
        timestamp: new Date(),
      });
    }

    if (anomaly.resolved) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Alert is already resolved',
        statusCode: 400,
        timestamp: new Date(),
      });
    }

    const resolvedAnomaly = await anomalyRepository.resolve(id);

    return res.status(200).json({
      message: 'Alert resolved successfully',
      data: {
        id: resolvedAnomaly.id,
        resolved: resolvedAnomaly.resolved,
        resolvedAt: resolvedAnomaly.resolvedAt,
      },
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to resolve alert',
      statusCode: 500,
      timestamp: new Date(),
    });
  }
};
