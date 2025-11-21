/**
 * Generate Test Data with Anomalies
 *
 * This script:
 * 1. Creates equipment records if needed
 * 2. Sends normal baseline readings to establish historical data
 * 3. Sends anomalous readings to trigger detection
 */

import axios from 'axios';
import { SensorType } from '@prisma/client';
import { dataGenerator } from '../src/utils/data-generator';

const API_URL = process.env.API_URL || 'http://localhost:3000';

interface EquipmentSetup {
  id: string;
  name: string;
  type: string;
  location: string;
}

async function main() {
  console.log('🧪 Anomaly Detection Test - Generating Test Data\n');

  // Use existing seeded equipment (from seed script)
  const equipment: EquipmentSetup = {
    id: '4776b978-de91-4eb2-ac97-127f5b960bda',
    name: 'Hydraulic Press #1',
    type: 'Press',
    location: 'Assembly Line A',
  };

  console.log(`📦 Equipment: ${equipment.name} (${equipment.id})`);
  console.log(`   Type: ${equipment.type}`);
  console.log(`   Location: ${equipment.location}\n`);

  // Step 1: Create baseline normal data (150 readings to establish pattern)
  console.log('Step 1: Generating baseline normal data...');
  console.log('   Creating 150 normal readings to establish baseline for anomaly detection');

  const normalReadings = [];
  const sensorType = SensorType.TEMPERATURE;
  const now = Date.now();

  // Generate 150 normal readings over the past 150 seconds
  for (let i = 0; i < 150; i++) {
    const timestamp = new Date(now - (150 - i) * 1000);
    const reading = dataGenerator.generateNormalReading(equipment.id, sensorType, timestamp);
    normalReadings.push({
      equipmentId: reading.equipmentId,
      sensorType: reading.sensorType,
      value: reading.value,
      unit: reading.unit,
      timestamp: reading.timestamp.toISOString(),
    });
  }

  console.log(`   Generated ${normalReadings.length} normal TEMPERATURE readings`);
  console.log(`   Mean: ~85°C, StdDev: ~2°C\n`);

  // Send baseline data
  console.log('   Sending baseline data to API...');
  try {
    const response = await axios.post(`${API_URL}/api/webhook/sensor-data`, {
      readings: normalReadings,
    });
    console.log(`   ✅ Baseline data accepted (Job ID: ${response.data.jobId})\n`);
  } catch (error: any) {
    console.error(`   ❌ Failed to send baseline data: ${error.message}`);
    process.exit(1);
  }

  // Wait for baseline to be processed
  console.log('⏳ Waiting 5 seconds for baseline data to be processed...\n');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Step 2: Generate and send anomalous readings
  console.log('Step 2: Generating anomalous readings...\n');

  const anomalyTests = [
    { type: 'spike' as const, severity: 'low' as const, description: 'Small temperature spike (3.5σ)' },
    { type: 'spike' as const, severity: 'medium' as const, description: 'Medium temperature spike (4.5σ)' },
    { type: 'spike' as const, severity: 'critical' as const, description: 'Critical temperature spike (6σ)' },
    { type: 'drop' as const, severity: 'medium' as const, description: 'Temperature drop (4.5σ)' },
  ];

  for (let i = 0; i < anomalyTests.length; i++) {
    const test = anomalyTests[i];
    const anomalyTimestamp = new Date(now + (i + 1) * 1000);

    console.log(`   Test ${i + 1}/${anomalyTests.length}: ${test.description}`);

    const anomalousReading = dataGenerator.generateAnomalousReading(
      equipment.id,
      sensorType,
      test.type,
      test.severity,
      anomalyTimestamp
    );

    console.log(`      Value: ${anomalousReading.value}°C (Normal: ~85°C ± 2°C)`);

    try {
      const response = await axios.post(`${API_URL}/api/webhook/sensor-data`, {
        readings: [
          {
            equipmentId: anomalousReading.equipmentId,
            sensorType: anomalousReading.sensorType,
            value: anomalousReading.value,
            unit: anomalousReading.unit,
            timestamp: anomalousReading.timestamp.toISOString(),
          },
        ],
      });
      console.log(`      ✅ Sent (Job ID: ${response.data.jobId})\n`);
    } catch (error: any) {
      console.error(`      ❌ Failed: ${error.message}\n`);
    }

    // Small delay between anomalies
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Wait for anomaly detection to complete
  console.log('⏳ Waiting 10 seconds for anomaly detection to complete...\n');
  await new Promise((resolve) => setTimeout(resolve, 10000));

  console.log('✅ Test data generation complete!');
  console.log('\nNext steps:');
  console.log('  1. Check queue stats: curl http://localhost:3000/api/queues/stats');
  console.log('  2. Query anomalies: curl http://localhost:3000/api/alerts/history');
  console.log('  3. Check database: psql -d production_line_monitor -c "SELECT * FROM anomalies;"');
  console.log('');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
