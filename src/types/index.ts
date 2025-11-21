import { EquipmentStatus, SensorType, AnomalySeverity } from '@prisma/client';

// Re-export Prisma enums for convenience
export { EquipmentStatus, SensorType, AnomalySeverity };

// Sensor Reading from webhook
export interface SensorReading {
  equipmentId: string;
  sensorType: SensorType;
  value: number;
  unit?: string;
  timestamp?: Date | string;
}

// Batch sensor readings payload
export interface SensorDataPayload {
  readings: SensorReading[];
}

// Equipment status response
export interface EquipmentStatusResponse {
  id: string;
  name: string;
  type: string;
  location?: string;
  status: EquipmentStatus;
  lastHeartbeat: Date;
  latestReadings?: SensorReading[];
  activeAnomalies?: number;
}

// Production metrics response
export interface ProductionMetricsResponse {
  timeRange: {
    start: Date;
    end: Date;
  };
  totalEvents: number;
  eventsPerHour: number;
  equipmentCount: number;
  anomalyRate: number;
  anomaliesBySeverity: {
    severity: AnomalySeverity;
    count: number;
  }[];
  uptimePercentage: number;
}

// Alert/Anomaly history response
export interface AlertHistoryResponse {
  data: AlertItem[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface AlertItem {
  id: string;
  time: Date;
  equipmentId: string;
  equipmentName: string;
  sensorType: SensorType;
  severity: AnomalySeverity;
  description: string;
  value: number;
  threshold?: number;
  zScore?: number;
  resolved: boolean;
  resolvedAt?: Date;
}

// Sensor history response
export interface SensorHistoryResponse {
  equipmentId: string;
  sensorType: SensorType;
  timeRange: {
    start: Date;
    end: Date;
  };
  data: SensorDataPoint[];
  statistics?: {
    avg: number;
    min: number;
    max: number;
    count: number;
  };
}

export interface SensorDataPoint {
  time: Date;
  value: number;
  unit?: string;
}

// Anomaly detection result
export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  zScore?: number;
  threshold?: number;
  severity?: AnomalySeverity;
  description?: string;
}

// Query filters
export interface AlertHistoryFilters {
  equipmentId?: string;
  severity?: AnomalySeverity;
  sensorType?: SensorType;
  resolved?: boolean;
  startTime?: Date;
  endTime?: Date;
  page?: number;
  pageSize?: number;
}

export interface SensorHistoryFilters {
  startTime?: Date;
  endTime?: Date;
  aggregation?: 'raw' | 'hourly' | 'daily';
}

// Error response
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: Date;
}
