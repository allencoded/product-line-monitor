-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('ONLINE', 'OFFLINE', 'ANOMALY', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "SensorType" AS ENUM ('TEMPERATURE', 'VIBRATION', 'PRESSURE', 'VOLTAGE', 'CURRENT', 'SPEED', 'HUMIDITY');

-- CreateEnum
CREATE TYPE "AnomalySeverity" AS ENUM ('LOW', 'MEDIUM', 'CRITICAL');

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "location" TEXT,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'ONLINE',
    "lastHeartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_events" (
    "id" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "equipmentId" TEXT NOT NULL,
    "sensorType" "SensorType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,

    CONSTRAINT "sensor_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomalies" (
    "id" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "equipmentId" TEXT NOT NULL,
    "sensorType" "SensorType" NOT NULL,
    "severity" "AnomalySeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION,
    "zScore" DOUBLE PRECISION,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equipment_status_idx" ON "equipment"("status");

-- CreateIndex
CREATE INDEX "equipment_lastHeartbeat_idx" ON "equipment"("lastHeartbeat");

-- CreateIndex
CREATE INDEX "sensor_events_equipmentId_time_idx" ON "sensor_events"("equipmentId", "time" DESC);

-- CreateIndex
CREATE INDEX "sensor_events_sensorType_time_idx" ON "sensor_events"("sensorType", "time" DESC);

-- CreateIndex
CREATE INDEX "sensor_events_time_idx" ON "sensor_events"("time" DESC);

-- CreateIndex
CREATE INDEX "anomalies_equipmentId_time_idx" ON "anomalies"("equipmentId", "time" DESC);

-- CreateIndex
CREATE INDEX "anomalies_severity_resolved_idx" ON "anomalies"("severity", "resolved");

-- CreateIndex
CREATE INDEX "anomalies_time_idx" ON "anomalies"("time" DESC);

-- AddForeignKey
ALTER TABLE "sensor_events" ADD CONSTRAINT "sensor_events_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
