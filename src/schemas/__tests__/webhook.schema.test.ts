import { SensorType } from '@prisma/client';
import { sensorReadingSchema, sensorDataPayloadSchema } from '../webhook.schema';

describe('Webhook Schema Validation', () => {
  describe('sensorReadingSchema', () => {
    it('should validate a valid sensor reading', () => {
      const validReading = {
        equipmentId: '123e4567-e89b-12d3-a456-426614174000',
        sensorType: SensorType.TEMPERATURE,
        value: 85.5,
        unit: 'celsius',
        timestamp: new Date().toISOString(),
      };

      const result = sensorReadingSchema.safeParse(validReading);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.equipmentId).toBe(validReading.equipmentId);
        expect(result.data.sensorType).toBe(SensorType.TEMPERATURE);
        expect(result.data.value).toBe(85.5);
      }
    });

    it('should accept Date object for timestamp', () => {
      const validReading = {
        equipmentId: '123e4567-e89b-12d3-a456-426614174000',
        sensorType: SensorType.VIBRATION,
        value: 50.2,
        timestamp: new Date(),
      };

      const result = sensorReadingSchema.safeParse(validReading);
      expect(result.success).toBe(true);
    });

    it('should default timestamp to now if not provided', () => {
      const validReading = {
        equipmentId: '123e4567-e89b-12d3-a456-426614174000',
        sensorType: SensorType.PRESSURE,
        value: 120,
      };

      const result = sensorReadingSchema.safeParse(validReading);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timestamp).toBeInstanceOf(Date);
      }
    });

    it('should reject invalid equipment ID format', () => {
      const invalidReading = {
        equipmentId: 'not-a-uuid',
        sensorType: SensorType.TEMPERATURE,
        value: 85.5,
      };

      const result = sensorReadingSchema.safeParse(invalidReading);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid equipment ID');
      }
    });

    it('should reject invalid sensor type', () => {
      const invalidReading = {
        equipmentId: '123e4567-e89b-12d3-a456-426614174000',
        sensorType: 'INVALID_TYPE',
        value: 85.5,
      };

      const result = sensorReadingSchema.safeParse(invalidReading);
      expect(result.success).toBe(false);
    });

    it('should reject non-finite numbers (Infinity, NaN)', () => {
      const infinityReading = {
        equipmentId: '123e4567-e89b-12d3-a456-426614174000',
        sensorType: SensorType.TEMPERATURE,
        value: Infinity,
      };

      const result = sensorReadingSchema.safeParse(infinityReading);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('finite');
      }
    });

    it('should reject missing required fields', () => {
      const incompleteReading = {
        equipmentId: '123e4567-e89b-12d3-a456-426614174000',
        value: 85.5,
        // Missing sensorType
      };

      const result = sensorReadingSchema.safeParse(incompleteReading);
      expect(result.success).toBe(false);
    });

    it('should validate all sensor types', () => {
      const sensorTypes = [
        SensorType.TEMPERATURE,
        SensorType.VIBRATION,
        SensorType.PRESSURE,
        SensorType.VOLTAGE,
      ];

      sensorTypes.forEach((sensorType) => {
        const reading = {
          equipmentId: '123e4567-e89b-12d3-a456-426614174000',
          sensorType,
          value: 100,
        };

        const result = sensorReadingSchema.safeParse(reading);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('sensorDataPayloadSchema', () => {
    it('should validate a valid payload with single reading', () => {
      const payload = {
        readings: [
          {
            equipmentId: '123e4567-e89b-12d3-a456-426614174000',
            sensorType: SensorType.TEMPERATURE,
            value: 85.5,
            unit: 'celsius',
          },
        ],
      };

      const result = sensorDataPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should validate a payload with multiple readings', () => {
      const payload = {
        readings: [
          {
            equipmentId: '123e4567-e89b-12d3-a456-426614174000',
            sensorType: SensorType.TEMPERATURE,
            value: 85.5,
          },
          {
            equipmentId: '123e4567-e89b-12d3-a456-426614174001',
            sensorType: SensorType.VIBRATION,
            value: 50.2,
          },
          {
            equipmentId: '123e4567-e89b-12d3-a456-426614174002',
            sensorType: SensorType.PRESSURE,
            value: 120.0,
          },
        ],
      };

      const result = sensorDataPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject empty readings array', () => {
      const payload = {
        readings: [],
      };

      const result = sensorDataPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('At least one reading');
      }
    });

    it('should reject payload with too many readings', () => {
      const payload = {
        readings: Array(1001)
          .fill(null)
          .map((_, i) => ({
            equipmentId: '123e4567-e89b-12d3-a456-426614174000',
            sensorType: SensorType.TEMPERATURE,
            value: 85 + i * 0.1,
          })),
      };

      const result = sensorDataPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Maximum 1000');
      }
    });

    it('should accept exactly 1000 readings', () => {
      const payload = {
        readings: Array(1000)
          .fill(null)
          .map((_, i) => ({
            equipmentId: '123e4567-e89b-12d3-a456-426614174000',
            sensorType: SensorType.TEMPERATURE,
            value: 85 + i * 0.1,
          })),
      };

      const result = sensorDataPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject if any reading in batch is invalid', () => {
      const payload = {
        readings: [
          {
            equipmentId: '123e4567-e89b-12d3-a456-426614174000',
            sensorType: SensorType.TEMPERATURE,
            value: 85.5,
          },
          {
            equipmentId: 'invalid-uuid',
            sensorType: SensorType.VIBRATION,
            value: 50.2,
          },
        ],
      };

      const result = sensorDataPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should handle mixed sensor types and units', () => {
      const payload = {
        readings: [
          {
            equipmentId: '123e4567-e89b-12d3-a456-426614174000',
            sensorType: SensorType.TEMPERATURE,
            value: 85.5,
            unit: 'celsius',
          },
          {
            equipmentId: '123e4567-e89b-12d3-a456-426614174001',
            sensorType: SensorType.VIBRATION,
            value: 50.2,
            unit: 'hz',
          },
          {
            equipmentId: '123e4567-e89b-12d3-a456-426614174002',
            sensorType: SensorType.PRESSURE,
            value: 120.0,
            unit: 'psi',
          },
          {
            equipmentId: '123e4567-e89b-12d3-a456-426614174003',
            sensorType: SensorType.VOLTAGE,
            value: 24.0,
            unit: 'volts',
          },
        ],
      };

      const result = sensorDataPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.readings).toHaveLength(4);
      }
    });
  });
});
