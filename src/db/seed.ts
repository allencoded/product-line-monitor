import prisma from './client';
import { EquipmentStatus, SensorType } from '@prisma/client';

async function seed() {
  console.log('Seeding database...');

  // Create test equipment
  const equipment1 = await prisma.equipment.create({
    data: {
      name: 'Hydraulic Press #1',
      type: 'press',
      location: 'Assembly Line A',
      status: EquipmentStatus.ONLINE,
    },
  });

  const equipment2 = await prisma.equipment.create({
    data: {
      name: 'Welding Robot #3',
      type: 'robot',
      location: 'Welding Station B',
      status: EquipmentStatus.ONLINE,
    },
  });

  const equipment3 = await prisma.equipment.create({
    data: {
      name: 'CNC Mill #7',
      type: 'mill',
      location: 'Machining Area C',
      status: EquipmentStatus.ONLINE,
    },
  });

  console.log('✓ Created 3 equipment entries');

  // Create some historical sensor data for baseline (normal readings)
  const now = new Date();
  const baselineReadings = [];

  // Generate 100 normal readings for each equipment over the past hour
  for (let i = 100; i > 0; i--) {
    const timestamp = new Date(now.getTime() - i * 36000); // Every 36 seconds

    // Equipment 1 - Temperature readings around 85°C
    baselineReadings.push({
      time: timestamp,
      equipmentId: equipment1.id,
      sensorType: SensorType.TEMPERATURE,
      measuredValue: 85 + (Math.random() - 0.5) * 4, // 83-87°C normal range
      unit: 'celsius',
    });

    // Equipment 2 - Vibration readings around 50 Hz
    baselineReadings.push({
      time: timestamp,
      equipmentId: equipment2.id,
      sensorType: SensorType.VIBRATION,
      measuredValue: 50 + (Math.random() - 0.5) * 3, // 48.5-51.5 Hz normal range
      unit: 'hz',
    });

    // Equipment 3 - Pressure readings around 120 PSI
    baselineReadings.push({
      time: timestamp,
      equipmentId: equipment3.id,
      sensorType: SensorType.PRESSURE,
      measuredValue: 120 + (Math.random() - 0.5) * 5, // 117.5-122.5 PSI normal range
      unit: 'psi',
    });
  }

  await prisma.sensorEvent.createMany({
    data: baselineReadings,
  });

  console.log(`✓ Created ${baselineReadings.length} baseline sensor readings`);

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
