import { SensorType } from '@prisma/client';

export interface SensorReading {
  equipmentId: string;
  sensorType: SensorType;
  value: number;
  unit: string;
  timestamp: Date;
}

export interface EquipmentConfig {
  id: string;
  name: string;
  sensorTypes: SensorType[];
}

export interface SensorProfile {
  sensorType: SensorType;
  normalMean: number;
  normalStdDev: number;
  unit: string;
  min?: number;
  max?: number;
}

export class DataGenerator {
  private sensorProfiles: Map<SensorType, SensorProfile> = new Map([
    [
      SensorType.TEMPERATURE,
      {
        sensorType: SensorType.TEMPERATURE,
        normalMean: 85,
        normalStdDev: 2,
        unit: 'celsius',
        min: 0,
        max: 200,
      },
    ],
    [
      SensorType.VIBRATION,
      {
        sensorType: SensorType.VIBRATION,
        normalMean: 50,
        normalStdDev: 1.5,
        unit: 'hz',
        min: 0,
        max: 150,
      },
    ],
    [
      SensorType.PRESSURE,
      {
        sensorType: SensorType.PRESSURE,
        normalMean: 120,
        normalStdDev: 2.5,
        unit: 'psi',
        min: 0,
        max: 300,
      },
    ],
    [
      SensorType.VOLTAGE,
      {
        sensorType: SensorType.VOLTAGE,
        normalMean: 24,
        normalStdDev: 0.5,
        unit: 'volts',
        min: 0,
        max: 50,
      },
    ],
  ]);

  /**
   * Generate a normal (non-anomalous) sensor reading using Gaussian distribution
   */
  generateNormalReading(
    equipmentId: string,
    sensorType: SensorType,
    timestamp: Date = new Date()
  ): SensorReading {
    const profile = this.sensorProfiles.get(sensorType);
    if (!profile) {
      throw new Error(`Unknown sensor type: ${sensorType}`);
    }

    const value = this.gaussianRandom(profile.normalMean, profile.normalStdDev);
    const clampedValue = this.clamp(value, profile.min, profile.max);

    return {
      equipmentId,
      sensorType,
      value: clampedValue,
      unit: profile.unit,
      timestamp,
    };
  }

  /**
   * Generate an anomalous sensor reading (spike, drop, or drift)
   */
  generateAnomalousReading(
    equipmentId: string,
    sensorType: SensorType,
    anomalyType: 'spike' | 'drop' | 'drift' = 'spike',
    severity: 'low' | 'medium' | 'critical' = 'medium',
    timestamp: Date = new Date()
  ): SensorReading {
    const profile = this.sensorProfiles.get(sensorType);
    if (!profile) {
      throw new Error(`Unknown sensor type: ${sensorType}`);
    }

    let value: number;
    const severityMultiplier = {
      low: 3.5, // Just above detection threshold (3 sigma)
      medium: 4.5,
      critical: 6,
    };

    const deviationMultiplier = severityMultiplier[severity];

    switch (anomalyType) {
      case 'spike':
        // Positive anomaly
        value = profile.normalMean + deviationMultiplier * profile.normalStdDev;
        break;
      case 'drop':
        // Negative anomaly
        value = profile.normalMean - deviationMultiplier * profile.normalStdDev;
        break;
      case 'drift':
        // Slow drift (still anomalous but more subtle)
        const driftDirection = Math.random() > 0.5 ? 1 : -1;
        value = profile.normalMean + driftDirection * deviationMultiplier * profile.normalStdDev;
        break;
    }

    const clampedValue = this.clamp(value, profile.min, profile.max);

    return {
      equipmentId,
      sensorType,
      value: clampedValue,
      unit: profile.unit,
      timestamp,
    };
  }

  /**
   * Generate a batch of normal readings for multiple equipment over a time range
   */
  generateNormalBatch(
    equipmentConfigs: EquipmentConfig[],
    count: number,
    startTime?: Date,
    intervalMs: number = 1000
  ): SensorReading[] {
    const readings: SensorReading[] = [];
    const start = startTime || new Date(Date.now() - count * intervalMs);

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(start.getTime() + i * intervalMs);

      for (const config of equipmentConfigs) {
        for (const sensorType of config.sensorTypes) {
          readings.push(this.generateNormalReading(config.id, sensorType, timestamp));
        }
      }
    }

    return readings;
  }

  /**
   * Generate a scenario with normal data plus injected anomalies
   */
  generateScenarioWithAnomalies(
    equipmentConfigs: EquipmentConfig[],
    normalCount: number,
    anomalyCount: number,
    intervalMs: number = 1000
  ): { readings: SensorReading[]; anomalyIndices: number[] } {
    const readings: SensorReading[] = [];
    const anomalyIndices: number[] = [];
    const totalCount = normalCount + anomalyCount;
    const startTime = new Date(Date.now() - totalCount * intervalMs);

    // Generate positions for anomalies (spread throughout the dataset)
    const anomalyPositions = new Set<number>();
    while (anomalyPositions.size < anomalyCount) {
      anomalyPositions.add(Math.floor(Math.random() * totalCount));
    }

    for (let i = 0; i < totalCount; i++) {
      const timestamp = new Date(startTime.getTime() + i * intervalMs);

      for (const config of equipmentConfigs) {
        for (const sensorType of config.sensorTypes) {
          if (anomalyPositions.has(i)) {
            // Generate anomaly
            const anomalyTypes: Array<'spike' | 'drop' | 'drift'> = ['spike', 'drop', 'drift'];
            const severities: Array<'low' | 'medium' | 'critical'> = ['low', 'medium', 'critical'];

            const anomalyType = anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)];
            const severity = severities[Math.floor(Math.random() * severities.length)];

            readings.push(
              this.generateAnomalousReading(config.id, sensorType, anomalyType, severity, timestamp)
            );
            anomalyIndices.push(readings.length - 1);
          } else {
            // Generate normal reading
            readings.push(this.generateNormalReading(config.id, sensorType, timestamp));
          }
        }
      }
    }

    return { readings, anomalyIndices };
  }

  /**
   * Generate a degradation scenario (gradual drift to failure)
   */
  generateDegradationScenario(
    equipmentId: string,
    sensorType: SensorType,
    count: number,
    intervalMs: number = 1000,
    degradationRate: number = 0.02 // Percentage increase per reading
  ): SensorReading[] {
    const profile = this.sensorProfiles.get(sensorType);
    if (!profile) {
      throw new Error(`Unknown sensor type: ${sensorType}`);
    }

    const readings: SensorReading[] = [];
    const startTime = new Date(Date.now() - count * intervalMs);
    let currentMean = profile.normalMean;

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(startTime.getTime() + i * intervalMs);

      // Gradually increase the mean to simulate degradation
      currentMean += currentMean * degradationRate;

      const value = this.gaussianRandom(currentMean, profile.normalStdDev);
      const clampedValue = this.clamp(value, profile.min, profile.max);

      readings.push({
        equipmentId,
        sensorType,
        value: clampedValue,
        unit: profile.unit,
        timestamp,
      });
    }

    return readings;
  }

  /**
   * Generate load testing data (high volume, streaming scenario)
   */
  generateLoadTestData(
    equipmentCount: number,
    readingsPerEquipment: number,
    intervalMs: number = 100
  ): SensorReading[] {
    const equipmentConfigs: EquipmentConfig[] = [];
    const allSensorTypes = Array.from(this.sensorProfiles.keys());

    for (let i = 0; i < equipmentCount; i++) {
      equipmentConfigs.push({
        id: `equipment-${i}`,
        name: `Equipment ${i}`,
        sensorTypes: allSensorTypes,
      });
    }

    return this.generateNormalBatch(equipmentConfigs, readingsPerEquipment, undefined, intervalMs);
  }

  /**
   * Generate Box-Muller Gaussian random number
   */
  private gaussianRandom(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Clamp value between min and max
   */
  private clamp(value: number, min?: number, max?: number): number {
    let result = value;
    if (min !== undefined && result < min) result = min;
    if (max !== undefined && result > max) result = max;
    return Math.round(result * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Update sensor profile for custom scenarios
   */
  updateSensorProfile(sensorType: SensorType, updates: Partial<SensorProfile>): void {
    const current = this.sensorProfiles.get(sensorType);
    if (current) {
      this.sensorProfiles.set(sensorType, { ...current, ...updates });
    }
  }
}

// Singleton instance for convenience
export const dataGenerator = new DataGenerator();
