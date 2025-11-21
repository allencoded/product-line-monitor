import { z } from 'zod';
import { SensorType, AnomalySeverity, EquipmentStatus } from '@prisma/client';

// Enums
export const sensorTypeSchema = z.nativeEnum(SensorType);
export const anomalySeveritySchema = z.nativeEnum(AnomalySeverity);
export const equipmentStatusSchema = z.nativeEnum(EquipmentStatus);

// Sensor reading response
export const sensorReadingResponseSchema = z.object({
  equipmentId: z.string().uuid(),
  sensorType: sensorTypeSchema,
  value: z.number(),
  unit: z.string().optional(),
  timestamp: z.date(),
});

// Equipment status response
export const equipmentStatusResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.string(),
  location: z.string().optional(),
  status: equipmentStatusSchema,
  lastHeartbeat: z.date(),
  latestReadings: z.array(sensorReadingResponseSchema).optional(),
  activeAnomalies: z.number().optional(),
});

// Alert item response
export const alertItemResponseSchema = z.object({
  id: z.string().uuid(),
  time: z.date(),
  equipmentId: z.string().uuid(),
  equipmentName: z.string(),
  sensorType: sensorTypeSchema,
  severity: anomalySeveritySchema,
  description: z.string(),
  value: z.number(),
  threshold: z.number().optional(),
  zScore: z.number().optional(),
  resolved: z.boolean(),
  resolvedAt: z.date().optional(),
});

// Pagination metadata
export const paginationMetadataSchema = z.object({
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// Alert history response
export const alertHistoryResponseSchema = z.object({
  data: z.array(alertItemResponseSchema),
  pagination: paginationMetadataSchema,
});

// Sensor data point
export const sensorDataPointSchema = z.object({
  time: z.date(),
  value: z.number(),
  unit: z.string().optional(),
});

// Statistics
export const statisticsSchema = z.object({
  avg: z.number(),
  min: z.number(),
  max: z.number(),
  count: z.number(),
});

// Sensor history response
export const sensorHistoryResponseSchema = z.object({
  equipmentId: z.string().uuid(),
  sensorType: sensorTypeSchema,
  timeRange: z.object({
    start: z.date(),
    end: z.date(),
  }),
  data: z.array(sensorDataPointSchema),
  statistics: statisticsSchema.optional(),
});

// Production metrics response
export const productionMetricsResponseSchema = z.object({
  timeRange: z.object({
    start: z.date(),
    end: z.date(),
  }),
  totalEvents: z.number(),
  eventsPerHour: z.number(),
  equipmentCount: z.number(),
  anomalyRate: z.number(),
  anomaliesBySeverity: z.array(
    z.object({
      severity: anomalySeveritySchema,
      count: z.number(),
    })
  ),
  uptimePercentage: z.number(),
});

// Error response
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
  timestamp: z.date(),
});

// Success response for webhook ingestion
export const webhookSuccessResponseSchema = z.object({
  message: z.string(),
  accepted: z.number(),
  timestamp: z.date(),
});

// Export types inferred from schemas
export type EquipmentStatusResponse = z.infer<typeof equipmentStatusResponseSchema>;
export type AlertHistoryResponse = z.infer<typeof alertHistoryResponseSchema>;
export type AlertItemResponse = z.infer<typeof alertItemResponseSchema>;
export type SensorHistoryResponse = z.infer<typeof sensorHistoryResponseSchema>;
export type ProductionMetricsResponse = z.infer<typeof productionMetricsResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type WebhookSuccessResponse = z.infer<typeof webhookSuccessResponseSchema>;
