import { StatisticalAnalyzer, SeverityClassifier, AnomalyDetector } from '../anomaly-detection';
import { SensorType, AnomalySeverity } from '@prisma/client';

describe('StatisticalAnalyzer', () => {
  describe('calculateMean', () => {
    it('should calculate mean correctly', () => {
      expect(StatisticalAnalyzer.calculateMean([1, 2, 3, 4, 5])).toBe(3);
      expect(StatisticalAnalyzer.calculateMean([10, 20, 30])).toBe(20);
    });

    it('should return 0 for empty array', () => {
      expect(StatisticalAnalyzer.calculateMean([])).toBe(0);
    });
  });

  describe('calculateStandardDeviation', () => {
    it('should calculate standard deviation correctly', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const mean = 5;
      const stdDev = StatisticalAnalyzer.calculateStandardDeviation(values, mean);
      expect(stdDev).toBeCloseTo(2, 1);
    });

    it('should return 0 for empty array', () => {
      expect(StatisticalAnalyzer.calculateStandardDeviation([])).toBe(0);
    });
  });

  describe('calculateZScore', () => {
    it('should calculate Z-Score correctly', () => {
      expect(StatisticalAnalyzer.calculateZScore(10, 5, 2)).toBe(2.5);
      expect(StatisticalAnalyzer.calculateZScore(5, 5, 2)).toBe(0);
      expect(StatisticalAnalyzer.calculateZScore(0, 5, 2)).toBe(-2.5);
    });

    it('should return 0 when stdDev is 0', () => {
      expect(StatisticalAnalyzer.calculateZScore(10, 5, 0)).toBe(0);
    });
  });

  describe('isOutlier', () => {
    it('should detect outliers with default threshold', () => {
      expect(StatisticalAnalyzer.isOutlier(3.5)).toBe(true);
      expect(StatisticalAnalyzer.isOutlier(-3.5)).toBe(true);
      expect(StatisticalAnalyzer.isOutlier(2.5)).toBe(false);
    });

    it('should respect custom threshold', () => {
      expect(StatisticalAnalyzer.isOutlier(2.5, 2)).toBe(true);
      expect(StatisticalAnalyzer.isOutlier(1.5, 2)).toBe(false);
    });
  });
});

describe('SeverityClassifier', () => {
  describe('classifySeverity', () => {
    it('should classify CRITICAL for |Z| > 5', () => {
      expect(SeverityClassifier.classifySeverity(5.5)).toBe(AnomalySeverity.CRITICAL);
      expect(SeverityClassifier.classifySeverity(-6)).toBe(AnomalySeverity.CRITICAL);
    });

    it('should classify MEDIUM for 4 < |Z| <= 5', () => {
      expect(SeverityClassifier.classifySeverity(4.5)).toBe(AnomalySeverity.MEDIUM);
      expect(SeverityClassifier.classifySeverity(-4.2)).toBe(AnomalySeverity.MEDIUM);
    });

    it('should classify LOW for 3 < |Z| <= 4', () => {
      expect(SeverityClassifier.classifySeverity(3.5)).toBe(AnomalySeverity.LOW);
      expect(SeverityClassifier.classifySeverity(-3.8)).toBe(AnomalySeverity.LOW);
    });
  });

  describe('generateDescription', () => {
    it('should generate description for above-normal reading', () => {
      const desc = SeverityClassifier.generateDescription(
        SensorType.TEMPERATURE,
        150,
        100,
        4.2,
        'celsius'
      );
      expect(desc).toContain('TEMPERATURE');
      expect(desc).toContain('150');
      expect(desc).toContain('above');
      expect(desc).toContain('4.20');
      expect(desc).toContain('celsius');
    });

    it('should generate description for below-normal reading', () => {
      const desc = SeverityClassifier.generateDescription(SensorType.PRESSURE, 50, 100, -3.5, 'psi');
      expect(desc).toContain('PRESSURE');
      expect(desc).toContain('50');
      expect(desc).toContain('below');
      expect(desc).toContain('3.50');
    });
  });
});

describe('AnomalyDetector', () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    detector = new AnomalyDetector(3, 30);
  });

  describe('detect', () => {
    it('should not detect anomaly with insufficient data', () => {
      const historicalValues = Array(20).fill(100); // Less than minWindowSize
      const result = detector.detect(150, historicalValues, SensorType.TEMPERATURE);

      expect(result.isAnomaly).toBe(false);
      expect(result.description).toContain('Insufficient historical data');
    });

    it('should detect anomaly when value exceeds threshold', () => {
      // Normal distribution around 100 with small variance
      const historicalValues = Array(50)
        .fill(0)
        .map(() => 100 + (Math.random() - 0.5) * 4);

      const result = detector.detect(150, historicalValues, SensorType.TEMPERATURE, 'celsius');

      expect(result.isAnomaly).toBe(true);
      expect(result.zScore).toBeGreaterThan(3);
      expect(result.severity).toBeDefined();
      expect(result.description).toBeDefined();
    });

    it('should not detect anomaly for normal value', () => {
      const historicalValues = Array(50)
        .fill(0)
        .map(() => 100 + (Math.random() - 0.5) * 4);

      const result = detector.detect(101, historicalValues, SensorType.TEMPERATURE);

      expect(result.isAnomaly).toBe(false);
      expect(Math.abs(result.zScore)).toBeLessThan(3);
    });

    it('should calculate statistics correctly', () => {
      const historicalValues = [95, 98, 100, 102, 105];
      historicalValues.push(...Array(30).fill(100)); // Ensure min window size

      const result = detector.detect(100, historicalValues, SensorType.TEMPERATURE);

      expect(result.mean).toBeCloseTo(100, 0);
      expect(result.stdDev).toBeGreaterThan(0);
      expect(result.threshold).toBe(3);
    });
  });

  describe('detectBatch', () => {
    it('should process multiple readings', () => {
      // Create historical values with small variance
      const historicalValues = Array(50)
        .fill(0)
        .map(() => 100 + (Math.random() - 0.5) * 2); // 99-101 range

      const values = [
        { value: 100, sensorType: SensorType.TEMPERATURE, unit: 'celsius' },
        { value: 150, sensorType: SensorType.TEMPERATURE, unit: 'celsius' }, // Significant outlier
        { value: 99, sensorType: SensorType.VIBRATION, unit: 'hz' },
      ];

      const results = detector.detectBatch(values, historicalValues);

      expect(results).toHaveLength(3);
      expect(results[0].isAnomaly).toBe(false); // Normal value
      expect(results[1].isAnomaly).toBe(true); // Outlier (150 vs 100 baseline)
    });
  });
});
