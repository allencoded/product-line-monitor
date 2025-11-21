import { SensorType, AnomalySeverity } from '@prisma/client';
import {
  paginationSchema,
  timeRangeSchema,
  alertHistoryQuerySchema,
  sensorHistoryQuerySchema,
  productionMetricsQuerySchema,
  equipmentIdParamSchema,
} from '../query.schema';

describe('Query Schema Validation', () => {
  describe('paginationSchema', () => {
    it('should use default values when not provided', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(50);
      }
    });

    it('should parse valid pagination parameters', () => {
      const result = paginationSchema.safeParse({ page: '3', pageSize: '25' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.pageSize).toBe(25);
      }
    });

    it('should reject page less than 1', () => {
      const result = paginationSchema.safeParse({ page: '0' });
      expect(result.success).toBe(false);
    });

    it('should reject negative page numbers', () => {
      const result = paginationSchema.safeParse({ page: '-1' });
      expect(result.success).toBe(false);
    });

    it('should reject page size greater than 100', () => {
      const result = paginationSchema.safeParse({ pageSize: '101' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('between 1 and 100');
      }
    });

    it('should accept maximum page size of 100', () => {
      const result = paginationSchema.safeParse({ pageSize: '100' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pageSize).toBe(100);
      }
    });

    it('should reject invalid string values', () => {
      const result = paginationSchema.safeParse({ page: 'abc' });
      expect(result.success).toBe(false);
    });
  });

  describe('timeRangeSchema', () => {
    it('should parse valid ISO datetime strings', () => {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 3600000);

      const result = timeRangeSchema.safeParse({
        startTime: hourAgo.toISOString(),
        endTime: now.toISOString(),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startTime).toBeInstanceOf(Date);
        expect(result.data.endTime).toBeInstanceOf(Date);
      }
    });

    it('should allow undefined values', () => {
      const result = timeRangeSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startTime).toBeUndefined();
        expect(result.data.endTime).toBeUndefined();
      }
    });

    it('should reject invalid datetime format', () => {
      const result = timeRangeSchema.safeParse({
        startTime: '2024-13-45', // Invalid date
      });
      expect(result.success).toBe(false);
    });

    it('should accept only startTime without endTime', () => {
      const result = timeRangeSchema.safeParse({
        startTime: new Date().toISOString(),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('alertHistoryQuerySchema', () => {
    it('should validate complete alert query with all parameters', () => {
      const query = {
        page: '2',
        pageSize: '20',
        startTime: new Date(Date.now() - 86400000).toISOString(),
        endTime: new Date().toISOString(),
        equipmentId: '123e4567-e89b-12d3-a456-426614174000',
        severity: AnomalySeverity.CRITICAL,
        sensorType: SensorType.TEMPERATURE,
        resolved: 'false',
      };

      const result = alertHistoryQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.pageSize).toBe(20);
        expect(result.data.equipmentId).toBe(query.equipmentId);
        expect(result.data.severity).toBe(AnomalySeverity.CRITICAL);
        expect(result.data.sensorType).toBe(SensorType.TEMPERATURE);
        expect(result.data.resolved).toBe(false);
      }
    });

    it('should work with only required parameters (defaults)', () => {
      const result = alertHistoryQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(50);
      }
    });

    it('should validate all severity levels', () => {
      const severities = [AnomalySeverity.LOW, AnomalySeverity.MEDIUM, AnomalySeverity.CRITICAL];

      severities.forEach((severity) => {
        const result = alertHistoryQuerySchema.safeParse({ severity });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid equipment ID format', () => {
      const result = alertHistoryQuerySchema.safeParse({
        equipmentId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should parse resolved as boolean', () => {
      const trueResult = alertHistoryQuerySchema.safeParse({ resolved: 'true' });
      expect(trueResult.success).toBe(true);
      if (trueResult.success) {
        expect(trueResult.data.resolved).toBe(true);
      }

      const falseResult = alertHistoryQuerySchema.safeParse({ resolved: 'false' });
      expect(falseResult.success).toBe(true);
      if (falseResult.success) {
        expect(falseResult.data.resolved).toBe(false);
      }
    });

    it('should filter by specific sensor type', () => {
      const result = alertHistoryQuerySchema.safeParse({
        sensorType: SensorType.VIBRATION,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sensorType).toBe(SensorType.VIBRATION);
      }
    });
  });

  describe('sensorHistoryQuerySchema', () => {
    it('should use default aggregation when not specified', () => {
      const result = sensorHistoryQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.aggregation).toBe('raw');
      }
    });

    it('should validate all aggregation options', () => {
      const aggregations = ['raw', 'hourly', 'daily'] as const;

      aggregations.forEach((aggregation) => {
        const result = sensorHistoryQuerySchema.safeParse({ aggregation });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.aggregation).toBe(aggregation);
        }
      });
    });

    it('should reject invalid aggregation type', () => {
      const result = sensorHistoryQuerySchema.safeParse({
        aggregation: 'weekly', // Not in enum
      });
      expect(result.success).toBe(false);
    });

    it('should accept time range with aggregation', () => {
      const result = sensorHistoryQuerySchema.safeParse({
        startTime: new Date(Date.now() - 86400000).toISOString(),
        endTime: new Date().toISOString(),
        aggregation: 'hourly',
      });
      expect(result.success).toBe(true);
    });

    it('should filter by sensor type', () => {
      const result = sensorHistoryQuerySchema.safeParse({
        sensorType: SensorType.PRESSURE,
        aggregation: 'daily',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sensorType).toBe(SensorType.PRESSURE);
      }
    });
  });

  describe('productionMetricsQuerySchema', () => {
    it('should validate with time range', () => {
      const result = productionMetricsQuerySchema.safeParse({
        startTime: new Date(Date.now() - 86400000).toISOString(),
        endTime: new Date().toISOString(),
      });
      expect(result.success).toBe(true);
    });

    it('should filter by equipment ID', () => {
      const result = productionMetricsQuerySchema.safeParse({
        equipmentId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });

    it('should work with no parameters', () => {
      const result = productionMetricsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject invalid equipment ID', () => {
      const result = productionMetricsQuerySchema.safeParse({
        equipmentId: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('equipmentIdParamSchema', () => {
    it('should validate a valid UUID', () => {
      const result = equipmentIdParamSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      }
    });

    it('should reject invalid UUID format', () => {
      const result = equipmentIdParamSchema.safeParse({
        id: 'not-a-valid-uuid',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid equipment ID');
      }
    });

    it('should reject missing ID', () => {
      const result = equipmentIdParamSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject numeric ID', () => {
      const result = equipmentIdParamSchema.safeParse({
        id: 123,
      });
      expect(result.success).toBe(false);
    });
  });
});
