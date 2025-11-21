import { z } from 'zod';
import { SensorType, AnomalySeverity } from '@prisma/client';

// Sensor type and severity enums
export const sensorTypeSchema = z.nativeEnum(SensorType);
export const anomalySeveritySchema = z.nativeEnum(AnomalySeverity);

// Pagination schema
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'Page must be greater than 0'),
  pageSize: z
    .string()
    .optional()
    .default('50')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val <= 100, 'Page size must be between 1 and 100'),
});

// Time range schema
export const timeRangeSchema = z.object({
  startTime: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  endTime: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

// Alert history query parameters
export const alertHistoryQuerySchema = paginationSchema
  .merge(timeRangeSchema)
  .extend({
    equipmentId: z.string().uuid().optional(),
    severity: anomalySeveritySchema.optional(),
    sensorType: sensorTypeSchema.optional(),
    resolved: z
      .string()
      .optional()
      .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  });

// Sensor history query parameters
export const sensorHistoryQuerySchema = timeRangeSchema.extend({
  sensorType: sensorTypeSchema.optional(),
  aggregation: z.enum(['raw', 'hourly', 'daily']).optional().default('raw'),
});

// Production metrics query parameters
export const productionMetricsQuerySchema = timeRangeSchema.extend({
  equipmentId: z.string().uuid().optional(),
});

// Equipment ID parameter
export const equipmentIdParamSchema = z.object({
  id: z.string().uuid('Invalid equipment ID format'),
});

// Export types inferred from schemas
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type TimeRangeQuery = z.infer<typeof timeRangeSchema>;
export type AlertHistoryQuery = z.infer<typeof alertHistoryQuerySchema>;
export type SensorHistoryQuery = z.infer<typeof sensorHistoryQuerySchema>;
export type ProductionMetricsQuery = z.infer<typeof productionMetricsQuerySchema>;
export type EquipmentIdParam = z.infer<typeof equipmentIdParamSchema>;
