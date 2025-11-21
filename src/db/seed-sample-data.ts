/**
 * Advanced Seed Script with Normal and Anomalous Data
 *
 * This generates realistic manufacturing sensor data including:
 * - Multiple equipment with different sensor types
 * - Normal operational baseline data
 * - Injected anomalies (spikes, drops, drifts)
 * - Degradation scenarios
 */

import prisma from './client';
import { EquipmentStatus, SensorType } from '@prisma/client';
import { dataGenerator, EquipmentConfig } from '../utils/data-generator';

async function seedSampleData() {
  console.log('🌱 Seeding database with sample data...\n');

  // Clean existing data (optional - comment out to append)
  console.log('🧹 Cleaning existing data...');
  await prisma.anomaly.deleteMany();
  await prisma.sensorEvent.deleteMany();
  await prisma.equipment.deleteMany();
  console.log('✓ Cleaned existing data\n');

  // Create diverse equipment
  console.log('🏭 Creating equipment...');
  const equipment1 = await prisma.equipment.create({
    data: {
      name: 'Hydraulic Press #1',
      type: 'press',
      location: 'Assembly Line A - Bay 1',
      status: EquipmentStatus.ONLINE,
    },
  });

  const equipment2 = await prisma.equipment.create({
    data: {
      name: 'Robotic Welder #3',
      type: 'robot',
      location: 'Welding Station B - Cell 3',
      status: EquipmentStatus.ONLINE,
    },
  });

  const equipment3 = await prisma.equipment.create({
    data: {
      name: 'CNC Mill #7',
      type: 'mill',
      location: 'Machining Area C - Station 7',
      status: EquipmentStatus.ONLINE,
    },
  });

  const equipment4 = await prisma.equipment.create({
    data: {
      name: 'Excavator Arm Assembly Unit #2',
      type: 'assembly',
      location: 'Heavy Equipment Line D - Unit 2',
      status: EquipmentStatus.ONLINE,
    },
  });

  const equipment5 = await prisma.equipment.create({
    data: {
      name: 'Crane Boom Test Stand #1',
      type: 'test_stand',
      location: 'Quality Control - Test Bay 1',
      status: EquipmentStatus.ANOMALY,
    },
  });

  const equipmentList = [equipment1, equipment2, equipment3, equipment4, equipment5];
  console.log(`✓ Created ${equipmentList.length} equipment entries\n`);

  // Equipment configurations for data generation
  const equipmentConfigs: EquipmentConfig[] = [
    {
      id: equipment1.id,
      name: equipment1.name,
      sensorTypes: [SensorType.TEMPERATURE, SensorType.PRESSURE],
    },
    {
      id: equipment2.id,
      name: equipment2.name,
      sensorTypes: [SensorType.TEMPERATURE, SensorType.VIBRATION, SensorType.VOLTAGE],
    },
    {
      id: equipment3.id,
      name: equipment3.name,
      sensorTypes: [SensorType.VIBRATION, SensorType.TEMPERATURE],
    },
    {
      id: equipment4.id,
      name: equipment4.name,
      sensorTypes: [SensorType.PRESSURE, SensorType.TEMPERATURE, SensorType.VOLTAGE],
    },
    {
      id: equipment5.id,
      name: equipment5.name,
      sensorTypes: [SensorType.PRESSURE, SensorType.VIBRATION],
    },
  ];

  // Scenario 1: Normal Baseline Data (last 24 hours)
  console.log('📊 Generating normal baseline data (24 hours)...');
  const baselineReadings = dataGenerator.generateNormalBatch(
    equipmentConfigs,
    1440, // One reading per minute for 24 hours
    new Date(Date.now() - 24 * 60 * 60 * 1000),
    60 * 1000 // 1 minute intervals
  );

  await prisma.sensorEvent.createMany({
    data: baselineReadings.map((r) => ({
      time: r.timestamp,
      equipmentId: r.equipmentId,
      sensorType: r.sensorType,
      measuredValue: r.value,
      unit: r.unit,
    })),
  });
  console.log(`✓ Created ${baselineReadings.length} baseline sensor readings\n`);

  // Scenario 2: Recent Data with Injected Anomalies (last 2 hours)
  console.log('⚠️  Generating recent data with anomalies (2 hours)...');
  const { readings: recentReadings, anomalyIndices } = dataGenerator.generateScenarioWithAnomalies(
    equipmentConfigs,
    100, // 100 normal readings
    20, // 20 anomalous readings
    60 * 1000 // 1 minute intervals
  );

  await prisma.sensorEvent.createMany({
    data: recentReadings.map((r) => ({
      time: r.timestamp,
      equipmentId: r.equipmentId,
      sensorType: r.sensorType,
      measuredValue: r.value,
      unit: r.unit,
    })),
  });
  console.log(`✓ Created ${recentReadings.length} recent readings`);
  console.log(`✓ Injected ${anomalyIndices.length} anomalous readings\n`);

  // Scenario 3: Degradation Pattern for Equipment #5 (Crane Test Stand)
  console.log('📉 Generating degradation scenario for Equipment #5...');
  const degradationReadings = dataGenerator.generateDegradationScenario(
    equipment5.id,
    SensorType.VIBRATION,
    100, // 100 readings
    30 * 1000, // 30 second intervals
    0.015 // 1.5% increase per reading
  );

  await prisma.sensorEvent.createMany({
    data: degradationReadings.map((r) => ({
      time: r.timestamp,
      equipmentId: r.equipmentId,
      sensorType: r.sensorType,
      measuredValue: r.value,
      unit: r.unit,
    })),
  });
  console.log(`✓ Created ${degradationReadings.length} degradation pattern readings\n`);

  // Scenario 4: Critical Anomalies (for alert testing)
  console.log('🚨 Generating critical anomalies...');
  const criticalAnomalies = [
    dataGenerator.generateAnomalousReading(
      equipment1.id,
      SensorType.TEMPERATURE,
      'spike',
      'critical',
      new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
    ),
    dataGenerator.generateAnomalousReading(
      equipment2.id,
      SensorType.VIBRATION,
      'spike',
      'critical',
      new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    ),
    dataGenerator.generateAnomalousReading(
      equipment5.id,
      SensorType.PRESSURE,
      'drop',
      'critical',
      new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
    ),
  ];

  await prisma.sensorEvent.createMany({
    data: criticalAnomalies.map((r) => ({
      time: r.timestamp,
      equipmentId: r.equipmentId,
      sensorType: r.sensorType,
      measuredValue: r.value,
      unit: r.unit,
    })),
  });
  console.log(`✓ Created ${criticalAnomalies.length} critical anomaly events\n`);

  // Summary
  const totalEvents = await prisma.sensorEvent.count();
  const totalEquipment = await prisma.equipment.count();

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📈 Summary:');
  console.log(`  Total Equipment: ${totalEquipment}`);
  console.log(`  Total Sensor Events: ${totalEvents}`);
  console.log('\n🏭 Equipment Created:');
  equipmentList.forEach((eq) => {
    console.log(`  - ${eq.name} (${eq.id})`);
    console.log(`    Location: ${eq.location}`);
    console.log(`    Status: ${eq.status}`);
  });

  console.log('\n💡 Test the system:');
  console.log('  1. GET /equipment/:id/status - Check equipment status');
  console.log('  2. GET /metrics/production - View production metrics');
  console.log('  3. GET /alerts/history - See detected anomalies');
  console.log('  4. POST /webhook/sensor-data - Send new sensor data');
  console.log('\n📚 Use these equipment IDs for testing:');
  equipmentList.forEach((eq) => console.log(`  ${eq.id}`));
}

seedSampleData()
  .catch((error) => {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
