# Testing Guide - Production Line Monitor

This document provides comprehensive information about testing the Production Line Monitor system.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Sample Data Generation](#sample-data-generation)
- [Load Testing](#load-testing)
- [Test Coverage](#test-coverage)

## Overview

The Production Line Monitor includes a comprehensive testing suite covering:

1. **Unit Tests** - Individual component testing
2. **Integration Tests** - API endpoint testing
3. **End-to-End Tests** - Full workflow testing
4. **Load Tests** - Performance and scalability testing

## Test Structure

```
src/
├── core/__tests__/
│   └── anomaly-detection.test.ts          # Anomaly detection algorithm tests
├── schemas/__tests__/
│   ├── webhook.schema.test.ts             # Webhook validation tests
│   └── query.schema.test.ts               # Query parameter validation tests
├── db/repositories/__tests__/
│   ├── equipment.repository.test.ts       # Equipment repository tests
│   └── sensor-event.repository.test.ts    # Sensor event repository tests
├── api/__tests__/
│   └── api.integration.test.ts            # API integration tests
└── __tests__/
    └── e2e.webhook-flow.test.ts           # End-to-end workflow tests

scripts/
└── load-test.ts                           # Load testing script

src/utils/
└── data-generator.ts                      # Sample data generator

src/db/
└── seed-sample-data.ts                    # Database seeding with sample data
```

## Running Tests

### Prerequisites

Ensure the following services are running:

```bash
# Start infrastructure
docker-compose up -d timescaledb redis

# Install dependencies
npm install

# Setup database
npm run db:generate
npm run db:migrate
```

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Unit tests only
npm test -- src/core/__tests__
npm test -- src/schemas/__tests__
npm test -- src/db/repositories/__tests__

# Integration tests
npm test -- src/api/__tests__

# End-to-end tests
npm test -- src/__tests__
```

### Watch Mode (Development)

```bash
npm run test:watch
```

### Test Coverage

```bash
npm run test:coverage
```

This generates a coverage report in the `coverage/` directory.

## Sample Data Generation

### Quick Seed (Minimal Data)

```bash
npm run seed
```

Creates:
- 3 equipment entries
- 300 baseline sensor readings

### Advanced Seed (Comprehensive Data)

```bash
npm run seed:sample
```

Creates:
- 5 equipment entries with diverse types
- 24 hours of normal baseline data
- Recent data with injected anomalies
- Degradation scenarios
- Critical anomaly events

Perfect for testing and demonstrations!

### Programmatic Data Generation

Use the `DataGenerator` class in your code:

```typescript
import { dataGenerator } from './utils/data-generator';
import { SensorType } from '@prisma/client';

// Generate normal reading
const normal = dataGenerator.generateNormalReading(
  equipmentId,
  SensorType.TEMPERATURE
);

// Generate anomalous reading
const anomaly = dataGenerator.generateAnomalousReading(
  equipmentId,
  SensorType.VIBRATION,
  'spike',      // anomalyType: 'spike' | 'drop' | 'drift'
  'critical'    // severity: 'low' | 'medium' | 'critical'
);

// Generate batch scenario
const { readings, anomalyIndices } = dataGenerator.generateScenarioWithAnomalies(
  equipmentConfigs,
  100,  // normal count
  20    // anomaly count
);

// Generate degradation pattern
const degradation = dataGenerator.generateDegradationScenario(
  equipmentId,
  SensorType.TEMPERATURE,
  100,    // count
  1000,   // intervalMs
  0.02    // degradationRate (2% per reading)
);
```

## Load Testing

Load tests simulate high-volume sensor data ingestion to verify system performance under various load conditions.

### Prerequisites

Ensure the application is running:

```bash
# Terminal 1: Start API server
npm run dev

# Terminal 2: Start workers (if using background processing)
npm run workers
```

### Available Load Test Scenarios

#### Light Load
- **Purpose**: Baseline performance testing
- **Load**: 10 equipment, 100 readings/sec
- **Duration**: 60 seconds
- **Anomaly Rate**: 5%

```bash
npm run load-test:light
```

#### Medium Load
- **Purpose**: Normal production simulation
- **Load**: 50 equipment, 500 readings/sec
- **Duration**: 120 seconds
- **Anomaly Rate**: 10%

```bash
npm run load-test:medium
```

#### Heavy Load
- **Purpose**: High-volume stress testing
- **Load**: 100 equipment, 1000 readings/sec
- **Duration**: 300 seconds (5 minutes)
- **Anomaly Rate**: 15%

```bash
npm run load-test:heavy
```

#### Burst Load
- **Purpose**: Extreme stress testing
- **Load**: 200 equipment, 2000 readings/sec
- **Duration**: 60 seconds
- **Anomaly Rate**: 20%

```bash
npm run load-test:burst
```

### Custom Load Test

```bash
tsx scripts/load-test.ts <scenario>
```

### Interpreting Load Test Results

The load test script provides comprehensive metrics:

```
📊 Request Statistics:
  Total Requests:      1200
  Successful:          1195 (99.58%)
  Failed:              5

📊 Data Volume:
  Total Readings:      60,000
  Anomalies Generated: 3,000
  Avg Throughput:      1000.00 readings/sec

⏱️  Response Times (ms):
  Average:             45.23
  Min:                 12.50
  Max:                 234.67
  P50 (Median):        38.12
  P95:                 89.45
  P99:                 156.78
```

**Performance Benchmarks:**

- ✅ **Excellent**: Success rate ≥99%, P95 <500ms
- ⚠️  **Good**: Success rate ≥95%, P95 <1000ms
- ❌ **Poor**: Success rate <95% or P95 >1000ms

### Customizing Load Tests

Edit `scripts/load-test.ts` to add custom scenarios:

```typescript
const scenarios: Record<string, LoadTestConfig> = {
  custom: {
    name: 'Custom Scenario',
    equipmentCount: 75,
    readingsPerSecond: 750,
    durationSeconds: 180,
    anomalyRate: 12,
    batchSize: 150,
  },
  // ... other scenarios
};
```

## Test Coverage

### Coverage Goals

- **Unit Tests**: >80% coverage for core business logic
- **Integration Tests**: All API endpoints
- **End-to-End Tests**: Critical user workflows

### Viewing Coverage Report

After running `npm run test:coverage`:

```bash
# View HTML report
open coverage/lcov-report/index.html

# View terminal summary
cat coverage/coverage-summary.json
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: timescale/timescaledb:latest-pg17
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:8-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run db:migrate:deploy
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Testing Best Practices

### 1. Test Isolation

Each test should be independent and clean up after itself:

```typescript
afterEach(async () => {
  // Clean up test data
  await prisma.sensorEvent.deleteMany({
    where: { equipmentId: testEquipmentId }
  });
});
```

### 2. Realistic Test Data

Use the `DataGenerator` to create realistic sensor readings:

```typescript
const reading = dataGenerator.generateNormalReading(
  equipmentId,
  SensorType.TEMPERATURE
);
```

### 3. Async Testing

Always use async/await for database operations:

```typescript
it('should create sensor event', async () => {
  const event = await repository.create(data);
  expect(event).toBeDefined();
});
```

### 4. Error Cases

Test both success and failure scenarios:

```typescript
it('should return 400 for invalid UUID', async () => {
  const response = await request(app)
    .get('/api/equipment/invalid-uuid/status');

  expect(response.status).toBe(400);
});
```

## Troubleshooting

### Tests Failing to Connect to Database

```bash
# Ensure TimescaleDB is running
docker-compose ps

# Check database connection
docker-compose logs timescaledb
```

### Load Tests Showing High Failure Rate

- Ensure the API server is running
- Check if workers are processing the queue
- Verify Redis is running and accessible
- Monitor system resources (CPU, memory)

### Jest Timeout Errors

Increase timeout for slow tests:

```typescript
jest.setTimeout(30000); // 30 seconds
```

## Next Steps

After running tests:

1. Review test coverage report
2. Run load tests to establish baseline performance
3. Set up CI/CD pipeline with automated testing
4. Monitor production metrics against load test baselines

## Contributing

When adding new features:

1. Write unit tests for new functions/classes
2. Add integration tests for new API endpoints
3. Update E2E tests if user workflows change
4. Run full test suite before submitting PR
5. Ensure test coverage remains above 80%
