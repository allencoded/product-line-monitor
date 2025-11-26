import prisma from './client';
import { EquipmentStatus, SensorType } from '@prisma/client';

async function seed() {
  console.log('Seeding database...');

  // Create 3 equipment
  const equipment1 = await prisma.equipment.upsert({
    where: { id: 'equipment-hydraulic-press-1' },
    update: {},
    create: {
      id: 'equipment-hydraulic-press-1',
      name: 'Hydraulic Press #1',
      type: 'press',
      location: 'Assembly Line A',
      status: EquipmentStatus.ONLINE,
    },
  });

  const equipment2 = await prisma.equipment.upsert({
    where: { id: 'equipment-welding-robot-3' },
    update: {},
    create: {
      id: 'equipment-welding-robot-3',
      name: 'Welding Robot #3',
      type: 'robot',
      location: 'Welding Station B',
      status: EquipmentStatus.ONLINE,
    },
  });

  const equipment3 = await prisma.equipment.upsert({
    where: { id: 'equipment-cnc-mill-7' },
    update: {},
    create: {
      id: 'equipment-cnc-mill-7',
      name: 'CNC Mill #7',
      type: 'mill',
      location: 'Machining Area C',
      status: EquipmentStatus.ONLINE,
    },
  });

  console.log('✓ Created 3 equipment entries');

  // Create historical sensor data for baseline (normal readings)
  // Anomaly detection needs ~100 readings per equipment+sensor combo to calculate Z-score
  const now = new Date();
  const baselineReadings = [];
  const equipmentIds = [equipment1.id, equipment2.id, equipment3.id];

  // Normal ranges for each sensor type
  const sensorConfigs = [
    { type: SensorType.TEMPERATURE, mean: 85, variance: 2, unit: 'celsius' },
    { type: SensorType.VIBRATION, mean: 50, variance: 1.5, unit: 'hz' },
    { type: SensorType.PRESSURE, mean: 120, variance: 2.5, unit: 'psi' },
    { type: SensorType.VOLTAGE, mean: 240, variance: 5, unit: 'volts' },
  ];

  // Generate 100 readings for each equipment + sensor type combo
  for (const equipmentId of equipmentIds) {
    for (const sensor of sensorConfigs) {
      for (let i = 100; i > 0; i--) {
        const timestamp = new Date(now.getTime() - i * 36000); // Every 36 seconds
        baselineReadings.push({
          time: timestamp,
          equipmentId,
          sensorType: sensor.type,
          measuredValue: sensor.mean + (Math.random() - 0.5) * sensor.variance * 2,
          unit: sensor.unit,
        });
      }
    }
  }

  await prisma.sensorEvent.createMany({
    data: baselineReadings,
  });

  console.log(`✓ Created ${baselineReadings.length} baseline sensor readings (100 per equipment+sensor combo)`);

  console.log('\n✅ Seed completed!');
  console.log('\nCreated Equipment:');
  console.log(`  - ${equipment1.name} (${equipment1.id})`);
  console.log(`  - ${equipment2.name} (${equipment2.id})`);
  console.log(`  - ${equipment3.name} (${equipment3.id})`);
  console.log('\nYou can now test the webhook with these equipment IDs');
}

seed()
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
