import { Request, Response } from 'express';
import { sensorEventRepository, equipmentRepository } from '../db/repositories';
import { SensorType } from '@prisma/client';

/**
 * GET /equipment/:id/sensor-history
 * Get historical sensor data for equipment
 */
export const getSensorHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sensorType, startTime, endTime, aggregation = 'raw' } = req.query;

    // Verify equipment exists
    const equipment = await equipmentRepository.findById(id);
    if (!equipment) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Equipment with ID ${id} not found`,
        statusCode: 404,
        timestamp: new Date(),
      });
    }

    // Default to last 24 hours if no time range provided
    const end = endTime ? new Date(endTime as string) : new Date();
    const start = startTime
      ? new Date(startTime as string)
      : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    let sensorData;
    let statistics;

    if (sensorType) {
      // Get data for specific sensor type
      sensorData = await sensorEventRepository.getByEquipmentAndType(
        id,
        sensorType as SensorType,
        start,
        end
      );

      // Calculate statistics
      statistics = await sensorEventRepository.getStatistics(
        id,
        sensorType as SensorType,
        start,
        end
      );
    } else {
      // Get all sensor data for equipment in time range
      sensorData = await sensorEventRepository.getLatestByEquipment(id, 1000);
      sensorData = sensorData.filter((reading) => reading.time >= start && reading.time <= end);
    }

    // Format response based on aggregation type
    let formattedData;

    if (aggregation === 'hourly' || aggregation === 'daily') {
      // For aggregated data, we could use TimescaleDB continuous aggregates
      // For now, return raw data with a note
      formattedData = sensorData.map((reading) => ({
        time: reading.time,
        value: reading.measuredValue,
        unit: reading.unit,
        sensorType: reading.sensorType,
      }));
    } else {
      // Raw data
      formattedData = sensorData.map((reading) => ({
        time: reading.time,
        value: reading.measuredValue,
        unit: reading.unit,
        sensorType: reading.sensorType,
      }));
    }

    const response = {
      equipmentId: id,
      sensorType: sensorType || 'all',
      timeRange: {
        start,
        end,
      },
      data: formattedData,
      statistics: statistics
        ? {
            avg: statistics.avg,
            min: statistics.min,
            max: statistics.max,
            count: statistics.count,
          }
        : undefined,
      aggregation,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching sensor history:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch sensor history',
      statusCode: 500,
      timestamp: new Date(),
    });
  }
};

/**
 * GET /sensors/types
 * Get available sensor types
 */
export const getSensorTypes = async (_req: Request, res: Response) => {
  try {
    const sensorTypes = Object.values(SensorType);

    return res.status(200).json({
      data: sensorTypes,
      count: sensorTypes.length,
    });
  } catch (error) {
    console.error('Error fetching sensor types:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch sensor types',
      statusCode: 500,
      timestamp: new Date(),
    });
  }
};
