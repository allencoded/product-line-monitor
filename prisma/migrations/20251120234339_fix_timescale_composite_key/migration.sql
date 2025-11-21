/*
  Warnings:

  - The primary key for the `sensor_events` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "sensor_events" DROP CONSTRAINT "sensor_events_pkey",
ADD CONSTRAINT "sensor_events_pkey" PRIMARY KEY ("id", "time");
