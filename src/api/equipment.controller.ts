import { Request, Response } from 'express';
import { equipmentRepository, sensorEventRepository, anomalyRepository } from '../db/repositories';
import { EquipmentStatus } from '@prisma/client';

/**
 * GET /equipment/:id/status
 * Get current equipment status with latest readings and anomalies
 */
export const getEquipmentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Fetch equipment
    const equipment = await equipmentRepository.findById(id);

    if (!equipment) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Equipment with ID ${id} not found`,
        statusCode: 404,
        timestamp: new Date(),
      });
    }

    // Check if equipment is online (heartbeat within last 30 seconds)
    const isOnline = await equipmentRepository.checkOnlineStatus(id);

    // Update status to OFFLINE if heartbeat is stale
    let currentStatus = equipment.status;
    if (!isOnline && equipment.status === EquipmentStatus.ONLINE) {
      const updatedEquipment = await equipmentRepository.updateStatus(id, EquipmentStatus.OFFLINE);
      currentStatus = updatedEquipment.status;
    }

    // Get latest sensor readings (last 10)
    const latestReadings = await sensorEventRepository.getLatestByEquipment(id, 10);

    // Get count of unresolved anomalies
    const activeAnomalies = await anomalyRepository.getUnresolvedByEquipment(id);

    // Build response
    const response = {
      id: equipment.id,
      name: equipment.name,
      type: equipment.type,
      location: equipment.location,
      status: currentStatus,
      lastHeartbeat: equipment.lastHeartbeat,
      latestReadings: latestReadings.map((reading) => ({
        equipmentId: reading.equipmentId,
        sensorType: reading.sensorType,
        value: reading.measuredValue,
        unit: reading.unit,
        timestamp: reading.time,
      })),
      activeAnomalies: activeAnomalies.length,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching equipment status:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch equipment status',
      statusCode: 500,
      timestamp: new Date(),
    });
  }
};

/**
 * GET /equipment
 * Get all equipment (optional: filter by status)
 */
export const getAllEquipment = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let equipment;
    if (status && Object.values(EquipmentStatus).includes(status as EquipmentStatus)) {
      equipment = await equipmentRepository.findByStatus(status as EquipmentStatus);
    } else {
      equipment = await equipmentRepository.findAll();
    }

    return res.status(200).json({
      data: equipment,
      count: equipment.length,
    });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch equipment',
      statusCode: 500,
      timestamp: new Date(),
    });
  }
};
