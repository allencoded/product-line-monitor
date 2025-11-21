import { SensorType, Prisma } from '@prisma/client';
import { sensorEventRepository, anomalyRepository, equipmentRepository } from '../db/repositories';
import { anomalyDetector, AnomalyDetectionResult } from './anomaly-detection';

/**
 * Service for detecting and recording anomalies in sensor data
 */
export class AnomalyDetectionService {
  /**
   * Process a sensor reading and detect anomalies
   *
   * @param equipmentId - Equipment UUID
   * @param sensorType - Type of sensor
   * @param value - Sensor reading value
   * @param unit - Unit of measurement (optional)
   * @param timestamp - Reading timestamp (optional, defaults to now)
   * @returns Anomaly detection result
   */
  async processSensorReading(
    equipmentId: string,
    sensorType: SensorType,
    value: number,
    unit?: string,
    timestamp?: Date
  ): Promise<AnomalyDetectionResult> {
    // Fetch rolling window of historical data for this equipment and sensor type
    const historicalReadings = await sensorEventRepository.getRollingWindow(
      equipmentId,
      sensorType,
      Number(process.env.ROLLING_WINDOW_SIZE) || 100
    );

    // Extract just the values for statistical analysis
    const historicalValues = historicalReadings.map((reading) => reading.measuredValue);

    // Run anomaly detection algorithm
    const detectionResult = anomalyDetector.detect(value, historicalValues, sensorType, unit);

    // If anomaly detected, record it in the database
    if (detectionResult.isAnomaly && detectionResult.severity) {
      await this.recordAnomaly(
        equipmentId,
        sensorType,
        value,
        detectionResult,
        timestamp || new Date()
      );

      // Update equipment status to ANOMALY
      await equipmentRepository.updateStatus(equipmentId, 'ANOMALY');
    }

    return detectionResult;
  }

  /**
   * Record an anomaly in the database
   */
  private async recordAnomaly(
    equipmentId: string,
    sensorType: SensorType,
    value: number,
    detection: AnomalyDetectionResult,
    timestamp: Date
  ): Promise<void> {
    const anomalyData: Prisma.AnomalyCreateInput = {
      time: timestamp,
      equipment: {
        connect: { id: equipmentId },
      },
      sensorType,
      severity: detection.severity!,
      description: detection.description || 'Anomaly detected',
      detectedValue: value,
      threshold: detection.threshold,
      zScore: detection.zScore,
      resolved: false,
    };

    await anomalyRepository.create(anomalyData);
  }

  /**
   * Batch process multiple sensor readings for anomaly detection
   *
   * @param readings - Array of sensor readings to process
   * @returns Array of detection results
   */
  async processBatch(
    readings: Array<{
      equipmentId: string;
      sensorType: SensorType;
      value: number;
      unit?: string;
      timestamp?: Date;
    }>
  ): Promise<AnomalyDetectionResult[]> {
    const results: AnomalyDetectionResult[] = [];

    // Process each reading sequentially
    // In production, this could be parallelized with Promise.all for better performance
    for (const reading of readings) {
      const result = await this.processSensorReading(
        reading.equipmentId,
        reading.sensorType,
        reading.value,
        reading.unit,
        reading.timestamp
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Check for anomalies in recent data without storing new readings
   * Useful for periodic checks on existing data
   */
  async scanRecentData(equipmentId: string, minutes: number = 5): Promise<void> {
    const startTime = new Date(Date.now() - minutes * 60 * 1000);

    // Get all sensor types for this equipment
    const recentReadings = await sensorEventRepository.getLatestByEquipment(
      equipmentId,
      1000 // Get enough readings for analysis
    );

    // Group by sensor type
    const readingsBySensorType = new Map<SensorType, typeof recentReadings>();

    for (const reading of recentReadings) {
      if (reading.time >= startTime) {
        if (!readingsBySensorType.has(reading.sensorType)) {
          readingsBySensorType.set(reading.sensorType, []);
        }
        readingsBySensorType.get(reading.sensorType)!.push(reading);
      }
    }

    // Analyze each sensor type
    for (const [sensorType, readings] of readingsBySensorType.entries()) {
      for (const reading of readings) {
        await this.processSensorReading(
          equipmentId,
          sensorType,
          reading.measuredValue,
          reading.unit || undefined,
          reading.time
        );
      }
    }
  }
}

export default new AnomalyDetectionService();
