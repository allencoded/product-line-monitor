import { z } from 'zod';
import { SensorType } from '@prisma/client';

// Sensor type enum schema
export const sensorTypeSchema = z.nativeEnum(SensorType);

// Single sensor reading schema
export const sensorReadingSchema = z.object({
  equipmentId: z.string().uuid('Invalid equipment ID format'),
  sensorType: sensorTypeSchema,
  value: z.number().finite('Value must be a finite number'),
  unit: z.string().optional(),
  timestamp: z
    .union([z.string().datetime(), z.date()])
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
});

// Webhook payload schema - accepts batch of readings
export const sensorDataPayloadSchema = z.object({
  readings: z
    .array(sensorReadingSchema)
    .min(1, 'At least one reading is required')
    .max(1000, 'Maximum 1000 readings per batch'),
});

// Export types inferred from schemas
export type SensorReadingInput = z.infer<typeof sensorReadingSchema>;
export type SensorDataPayloadInput = z.infer<typeof sensorDataPayloadSchema>;
