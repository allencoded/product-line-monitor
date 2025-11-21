/**
 * Load Testing Script for Production Line Monitor
 *
 * This script simulates high-volume sensor data ingestion to test:
 * - Webhook endpoint throughput
 * - Background worker capacity
 * - Database write performance
 * - Anomaly detection under load
 *
 * Usage:
 *   tsx scripts/load-test.ts [scenario]
 *
 * Scenarios:
 *   - light: 10 equipment, 100 readings/sec
 *   - medium: 50 equipment, 500 readings/sec
 *   - heavy: 100 equipment, 1000 readings/sec
 */

import axios from 'axios';
import { SensorType } from '@prisma/client';
import { dataGenerator } from '../src/utils/data-generator';

interface LoadTestConfig {
  name: string;
  equipmentCount: number;
  readingsPerSecond: number;
  durationSeconds: number;
  anomalyRate: number; // Percentage of anomalous readings (0-100)
  batchSize: number; // Readings per HTTP request
}

const scenarios: Record<string, LoadTestConfig> = {
  light: {
    name: 'Light Load',
    equipmentCount: 10,
    readingsPerSecond: 100,
    durationSeconds: 60,
    anomalyRate: 5,
    batchSize: 50,
  },
  medium: {
    name: 'Medium Load',
    equipmentCount: 50,
    readingsPerSecond: 500,
    durationSeconds: 120,
    anomalyRate: 10,
    batchSize: 100,
  },
  heavy: {
    name: 'Heavy Load',
    equipmentCount: 100,
    readingsPerSecond: 1000,
    durationSeconds: 300,
    anomalyRate: 15,
    batchSize: 200,
  },
  burst: {
    name: 'Burst Load (Stress Test)',
    equipmentCount: 200,
    readingsPerSecond: 2000,
    durationSeconds: 60,
    anomalyRate: 20,
    batchSize: 500,
  },
};

class LoadTester {
  private config: LoadTestConfig;
  private apiUrl: string;
  private equipmentIds: string[] = [];
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalReadings: 0,
    totalAnomalies: 0,
    responseTimes: [] as number[],
    errors: [] as string[],
  };

  constructor(config: LoadTestConfig, apiUrl: string = 'http://localhost:3000') {
    this.config = config;
    this.apiUrl = apiUrl;
  }

  /**
   * Generate mock equipment IDs
   */
  private setupEquipment(): void {
    console.log(`📦 Setting up ${this.config.equipmentCount} virtual equipment...`);
    this.equipmentIds = Array(this.config.equipmentCount)
      .fill(null)
      .map((_, i) => {
        // Generate deterministic UUIDs for testing
        const hex = i.toString(16).padStart(12, '0');
        return `00000000-0000-0000-0000-${hex}`;
      });
  }

  /**
   * Generate a batch of sensor readings
   */
  private generateBatch(): any[] {
    const readings = [];
    const shouldIncludeAnomaly = Math.random() * 100 < this.config.anomalyRate;

    for (let i = 0; i < this.config.batchSize; i++) {
      const equipmentId = this.equipmentIds[Math.floor(Math.random() * this.equipmentIds.length)];
      const sensorTypes = [
        SensorType.TEMPERATURE,
        SensorType.VIBRATION,
        SensorType.PRESSURE,
        SensorType.VOLTAGE,
      ];
      const sensorType = sensorTypes[Math.floor(Math.random() * sensorTypes.length)];

      let reading;
      if (shouldIncludeAnomaly && i === 0) {
        // First reading in batch is anomalous
        const severities: Array<'low' | 'medium' | 'critical'> = ['low', 'medium', 'critical'];
        const severity = severities[Math.floor(Math.random() * severities.length)];
        reading = dataGenerator.generateAnomalousReading(
          equipmentId,
          sensorType,
          'spike',
          severity
        );
        this.stats.totalAnomalies++;
      } else {
        reading = dataGenerator.generateNormalReading(equipmentId, sensorType);
      }

      readings.push({
        equipmentId: reading.equipmentId,
        sensorType: reading.sensorType,
        value: reading.value,
        unit: reading.unit,
        timestamp: reading.timestamp.toISOString(),
      });
    }

    return readings;
  }

  /**
   * Send a batch of readings to the webhook endpoint
   */
  private async sendBatch(): Promise<void> {
    const readings = this.generateBatch();
    const startTime = Date.now();

    try {
      const response = await axios.post(`${this.apiUrl}/api/webhook/sensor-data`, {
        readings,
      });

      const responseTime = Date.now() - startTime;
      this.stats.responseTimes.push(responseTime);
      this.stats.successfulRequests++;
      this.stats.totalReadings += readings.length;

      if (response.status !== 202) {
        console.warn(`⚠️  Unexpected status code: ${response.status}`);
      }
    } catch (error: any) {
      this.stats.failedRequests++;
      this.stats.errors.push(error.message);
      console.error(`❌ Request failed: ${error.message}`);
    }

    this.stats.totalRequests++;
  }

  /**
   * Calculate statistics
   */
  private calculateStats() {
    const responseTimes = this.stats.responseTimes.sort((a, b) => a - b);
    const sum = responseTimes.reduce((acc, val) => acc + val, 0);

    return {
      avgResponseTime: sum / responseTimes.length || 0,
      minResponseTime: responseTimes[0] || 0,
      maxResponseTime: responseTimes[responseTimes.length - 1] || 0,
      p50: responseTimes[Math.floor(responseTimes.length * 0.5)] || 0,
      p95: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
      p99: responseTimes[Math.floor(responseTimes.length * 0.99)] || 0,
      successRate: (this.stats.successfulRequests / this.stats.totalRequests) * 100 || 0,
      readingsPerSecond: this.stats.totalReadings / this.config.durationSeconds || 0,
    };
  }

  /**
   * Run the load test
   */
  async run(): Promise<void> {
    console.log('\n🚀 Production Line Monitor - Load Test\n');
    console.log(`Scenario: ${this.config.name}`);
    console.log(`Equipment Count: ${this.config.equipmentCount}`);
    console.log(`Target: ${this.config.readingsPerSecond} readings/sec`);
    console.log(`Duration: ${this.config.durationSeconds}s`);
    console.log(`Anomaly Rate: ${this.config.anomalyRate}%`);
    console.log(`Batch Size: ${this.config.batchSize} readings/request`);
    console.log('\n');

    // Setup
    this.setupEquipment();

    // Health check
    try {
      await axios.get(`${this.apiUrl}/health`);
      console.log('✅ API is healthy, starting load test...\n');
    } catch (error) {
      console.error('❌ API health check failed. Is the server running?');
      process.exit(1);
    }

    // Calculate request rate
    const requestsPerSecond = this.config.readingsPerSecond / this.config.batchSize;
    const intervalMs = 1000 / requestsPerSecond;

    console.log(`Sending ~${requestsPerSecond.toFixed(2)} requests/sec (1 every ${intervalMs.toFixed(0)}ms)\n`);

    const startTime = Date.now();
    const endTime = startTime + this.config.durationSeconds * 1000;

    // Progress reporting
    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = (elapsed / this.config.durationSeconds) * 100;
      const currentRps = this.stats.totalReadings / elapsed;

      process.stdout.write(
        `\r📊 Progress: ${progress.toFixed(1)}% | ` +
          `Requests: ${this.stats.successfulRequests}/${this.stats.totalRequests} | ` +
          `Readings: ${this.stats.totalReadings} | ` +
          `RPS: ${currentRps.toFixed(0)} | ` +
          `Failures: ${this.stats.failedRequests}`
      );
    }, 1000);

    // Main load generation loop
    while (Date.now() < endTime) {
      const batchStartTime = Date.now();

      // Send batch
      this.sendBatch().catch((err) => {
        console.error('\n❌ Batch send error:', err.message);
      });

      // Calculate sleep time to maintain rate
      const elapsed = Date.now() - batchStartTime;
      const sleepTime = Math.max(0, intervalMs - elapsed);

      if (sleepTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, sleepTime));
      }
    }

    clearInterval(progressInterval);

    // Wait for pending requests
    console.log('\n\n⏳ Waiting for pending requests to complete...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Print results
    this.printResults();
  }

  /**
   * Print test results
   */
  private printResults(): void {
    const stats = this.calculateStats();

    console.log('\n\n' + '='.repeat(70));
    console.log('📊 LOAD TEST RESULTS');
    console.log('='.repeat(70));
    console.log(`\nScenario: ${this.config.name}`);
    console.log(`Duration: ${this.config.durationSeconds}s`);
    console.log(`\n📈 Request Statistics:`);
    console.log(`  Total Requests:      ${this.stats.totalRequests}`);
    console.log(`  Successful:          ${this.stats.successfulRequests} (${stats.successRate.toFixed(2)}%)`);
    console.log(`  Failed:              ${this.stats.failedRequests}`);
    console.log(`\n📊 Data Volume:`);
    console.log(`  Total Readings:      ${this.stats.totalReadings.toLocaleString()}`);
    console.log(`  Anomalies Generated: ${this.stats.totalAnomalies}`);
    console.log(`  Avg Throughput:      ${stats.readingsPerSecond.toFixed(2)} readings/sec`);
    console.log(`\n⏱️  Response Times (ms):`);
    console.log(`  Average:             ${stats.avgResponseTime.toFixed(2)}`);
    console.log(`  Min:                 ${stats.minResponseTime.toFixed(2)}`);
    console.log(`  Max:                 ${stats.maxResponseTime.toFixed(2)}`);
    console.log(`  P50 (Median):        ${stats.p50.toFixed(2)}`);
    console.log(`  P95:                 ${stats.p95.toFixed(2)}`);
    console.log(`  P99:                 ${stats.p99.toFixed(2)}`);

    if (this.stats.errors.length > 0) {
      console.log(`\n⚠️  Errors (showing first 10):`);
      const uniqueErrors = [...new Set(this.stats.errors)];
      uniqueErrors.slice(0, 10).forEach((err, i) => {
        const count = this.stats.errors.filter((e) => e === err).length;
        console.log(`  ${i + 1}. ${err} (${count}x)`);
      });
    }

    console.log('\n' + '='.repeat(70));

    // Performance assessment
    console.log('\n📋 Assessment:');
    if (stats.successRate >= 99) {
      console.log('  ✅ Excellent success rate!');
    } else if (stats.successRate >= 95) {
      console.log('  ⚠️  Good success rate, but some failures detected');
    } else {
      console.log('  ❌ Poor success rate, system may be overloaded');
    }

    if (stats.p95 < 500) {
      console.log('  ✅ Good response times (P95 < 500ms)');
    } else if (stats.p95 < 1000) {
      console.log('  ⚠️  Acceptable response times (P95 < 1000ms)');
    } else {
      console.log('  ❌ Slow response times (P95 > 1000ms)');
    }

    console.log('\n');
  }
}

// Main execution
async function main() {
  const scenarioName = process.argv[2] || 'light';
  const scenario = scenarios[scenarioName];

  if (!scenario) {
    console.error(`Unknown scenario: ${scenarioName}`);
    console.log('\nAvailable scenarios:');
    Object.keys(scenarios).forEach((key) => {
      console.log(`  - ${key}: ${scenarios[key].name}`);
    });
    process.exit(1);
  }

  const apiUrl = process.env.API_URL || 'http://localhost:3000';
  const tester = new LoadTester(scenario, apiUrl);

  try {
    await tester.run();
    console.log('✅ Load test completed successfully\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Load test failed:', error.message);
    process.exit(1);
  }
}

main();
