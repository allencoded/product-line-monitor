import { SensorType, AnomalySeverity } from '@prisma/client';

/**
 * Statistical calculations for anomaly detection
 */
export class StatisticalAnalyzer {
  /**
   * Calculate mean (average) of a dataset
   */
  static calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * Calculate standard deviation of a dataset
   */
  static calculateStandardDeviation(values: number[], mean?: number): number {
    if (values.length === 0) return 0;

    const avg = mean ?? this.calculateMean(values);
    const squaredDiffs = values.map((val) => Math.pow(val - avg, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * Calculate Z-Score for a value given mean and standard deviation
   * Z-Score = (value - mean) / standardDeviation
   * 
   *   Why it works for this use case:

   * 1. No training data needed - Works immediately with just ~30-100 historical readings
   * 2. Self-adapting - The baseline (mean/stdDev) updates as new normal readings arrive
   * 3. Interpretable - "6 standard deviations from normal" is easy to explain
   * 4. Fast - Just arithmetic (mean, stdDev, division) - no ML model overhead
   * 5. Low false positives - 3σ threshold means only 0.3% of normal data triggers alerts
   *
   * For a POC it's ideal because:
   * - Quick to implement
   * - Easy to test and validate
   * - No dependencies on ML libraries
   * - Works with small datasets
   *
   * Limitations (for production):
   * - Assumes normal distribution (sensor data usually is)
   * - Doesn't catch gradual drift well (would need trend detection)
   * - Doesn't correlate multiple sensors (multivariate analysis)
   */
  static calculateZScore(value: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0; // Avoid division by zero
    return (value - mean) / stdDev;
  }

  /**
   * Check if a value is an outlier using Z-Score method
   * Default threshold is 3 (3 standard deviations from mean)
   */
  static isOutlier(zScore: number, threshold: number = 3): boolean {
    return Math.abs(zScore) > threshold;
  }
}

/**
 * Anomaly detection result
 */
export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  zScore: number;
  mean: number;
  stdDev: number;
  threshold: number;
  severity?: AnomalySeverity;
  description?: string;
}

/**
 * Anomaly severity classifier based on Z-Score
 */
export class SeverityClassifier {
  /**
   * Classify anomaly severity based on Z-Score
   *
   * Rules:
   * - |Z| > 5: CRITICAL (extreme deviation)
   * - |Z| > 4: MEDIUM (significant deviation)
   * - |Z| > 3: LOW (moderate deviation)
   */
  static classifySeverity(zScore: number): AnomalySeverity {
    const absZScore = Math.abs(zScore);

    if (absZScore > 5) {
      return AnomalySeverity.CRITICAL;
    } else if (absZScore > 4) {
      return AnomalySeverity.MEDIUM;
    } else {
      return AnomalySeverity.LOW;
    }
  }

  /**
   * Generate human-readable description for anomaly
   */
  static generateDescription(
    sensorType: SensorType,
    value: number,
    mean: number,
    zScore: number,
    unit?: string
  ): string {
    const direction = value > mean ? 'above' : 'below';
    const absZScore = Math.abs(zScore).toFixed(2);
    const unitStr = unit ? ` ${unit}` : '';

    return `${sensorType} reading of ${value.toFixed(2)}${unitStr} is ${absZScore} standard deviations ${direction} normal (mean: ${mean.toFixed(2)}${unitStr})`;
  }
}

/**
 * Main anomaly detector using Statistical Process Control (SPC) with Z-Score
 */
export class AnomalyDetector {
  private readonly threshold: number;
  private readonly minWindowSize: number;

  constructor(threshold: number = 3, minWindowSize: number = 30) {
    this.threshold = threshold;
    this.minWindowSize = minWindowSize;
  }

  /**
   * Detect if a new value is an anomaly based on historical data
   * 
   * - Checks if there is enough historical data (min 30 readings)
   * - Calculates the mean and standard deviation of the historical data
   * - Calculates Z-Score: (value - mean) / stdDev
   * If |Z-Score| > 3 → it's an anomaly
   * Classifies severity based on |Z-Score|
   *
   * @param value - New sensor reading value
   * @param historicalValues - Historical sensor readings for baseline
   * @param sensorType - Type of sensor (for description generation)
   * @param unit - Unit of measurement (optional)
   * @returns AnomalyDetectionResult
   */
  detect(
    value: number,
    historicalValues: number[],
    sensorType: SensorType,
    unit?: string
  ): AnomalyDetectionResult {
    // Need minimum data points for statistical reliability
    if (historicalValues.length < this.minWindowSize) {
      return {
        isAnomaly: false,
        zScore: 0,
        mean: 0,
        stdDev: 0,
        threshold: this.threshold,
        description: `Insufficient historical data (${historicalValues.length}/${this.minWindowSize} required)`,
      };
    }

    // Calculate statistics from historical data
    const mean = StatisticalAnalyzer.calculateMean(historicalValues);
    const stdDev = StatisticalAnalyzer.calculateStandardDeviation(historicalValues, mean);

    // Calculate Z-Score for new value
    const zScore = StatisticalAnalyzer.calculateZScore(value, mean, stdDev);

    // Determine if it's an outlier
    const isAnomaly = StatisticalAnalyzer.isOutlier(zScore, this.threshold);

    const result: AnomalyDetectionResult = {
      isAnomaly,
      zScore,
      mean,
      stdDev,
      threshold: this.threshold,
    };

    // Add severity and description if anomaly detected
    if (isAnomaly) {
      result.severity = SeverityClassifier.classifySeverity(zScore);
      result.description = SeverityClassifier.generateDescription(
        sensorType,
        value,
        mean,
        zScore,
        unit
      );
    }

    return result;
  }

  /**
   * Batch detect anomalies for multiple values
   */
  detectBatch(
    values: Array<{ value: number; sensorType: SensorType; unit?: string }>,
    historicalValues: number[]
  ): AnomalyDetectionResult[] {
    return values.map((item) =>
      this.detect(item.value, historicalValues, item.sensorType, item.unit)
    );
  }
}

/**
 * Default anomaly detector instance with standard 3-sigma threshold
 */
export const anomalyDetector = new AnomalyDetector(
  Number(process.env.ANOMALY_THRESHOLD_SIGMA) || 3,
  Number(process.env.ROLLING_WINDOW_SIZE) || 100
);
