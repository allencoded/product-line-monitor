# Production Line Monitor - Demo Script

Comprehensive demo script for showcasing the Production Line Monitor platform capabilities.

## Pre-Demo Setup Checklist

### 1. Start Infrastructure
```bash
# Terminal 1: Infrastructure
docker-compose up -d timescaledb redis
docker-compose ps  # Verify services are healthy
```

### 2. Prepare Database
```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed equipment data
npm run seed
```

### 3. Start Application
```bash
# Terminal 2: API Server
npm run dev

# Terminal 3: Background Workers
npm run workers
```

### 4. Verify System Health
```bash
# Check API is running
curl http://localhost:3000/health

# Check equipment exists
curl http://localhost:3000/api/equipment | jq '.count'
```

### 5. Set Environment Variables
```bash
export API_URL="http://localhost:3000/api"
export API_KEY="your-secret-api-key-here"
```

---

## Demo Flow

### Part 1: System Overview (2-3 minutes)

**Talking Points:**
- Real-time manufacturing equipment monitoring platform
- Ingests sensor data (temperature, vibration, pressure, voltage)
- Automated anomaly detection using Z-score algorithm
- Background job processing for high throughput
- RESTful APIs for querying data and metrics

**Show:**
```bash
# Project structure
tree -L 2 src/

# Tech stack in package.json
cat package.json | jq '.dependencies | keys'
```

---

### Part 2: Data Ingestion (5 minutes)

#### 2.1 Show Equipment List
```bash
curl -s "$API_URL/equipment" | jq '.data[] | {id, name, status}'
```

**Expected Output:**
```json
{
  "id": "pump-001",
  "name": "Hydraulic Pump #1",
  "status": "ONLINE"
}
...
```

#### 2.2 Send Normal Sensor Readings
```bash
curl -X POST "$API_URL/webhook/sensor-data" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "readings": [
      {
        "equipmentId": "pump-001",
        "sensorType": "TEMPERATURE",
        "value": 85.5,
        "unit": "°C"
      },
      {
        "equipmentId": "pump-001",
        "sensorType": "VIBRATION",
        "value": 2.1,
        "unit": "mm/s"
      }
    ]
  }' | jq '.'
```

**Talking Points:**
- Returns 202 Accepted immediately (async processing)
- Job queued in Redis via BullMQ
- Background worker processes data
- Returns jobId for status tracking

**Expected Output:**
```json
{
  "message": "Sensor data accepted for processing",
  "accepted": 2,
  "jobId": "1234567890",
  "timestamp": "2025-11-20T10:30:01.234Z"
}
```

#### 2.3 Check Job Status
```bash
# Save job ID from previous response
JOB_ID="1234567890"

curl -s "$API_URL/webhook/status/$JOB_ID" | jq '.'
```

**Expected Output:**
```json
{
  "jobId": "1234567890",
  "name": "process-batch",
  "state": "completed",
  "progress": 100,
  "result": {
    "processed": 2,
    "anomaliesDetected": 0
  }
}
```

---

### Part 3: Anomaly Detection (7 minutes)

#### 3.1 Establish Baseline (Generate Normal Data)
```bash
# Generate 100 normal readings for baseline
for i in {1..100}; do
  TEMP=$(echo "scale=1; 80 + ($RANDOM % 20) / 10" | bc)
  curl -s -X POST "$API_URL/webhook/sensor-data" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "{
      \"readings\": [
        {
          \"equipmentId\": \"pump-001\",
          \"sensorType\": \"TEMPERATURE\",
          \"value\": $TEMP,
          \"unit\": \"°C\"
        }
      ]
    }" > /dev/null
  echo "Sent reading $i: ${TEMP}°C"
done
```

**Talking Points:**
- Anomaly detection uses Z-score algorithm
- Requires baseline of last 100 readings
- Calculates mean and standard deviation
- 3σ threshold (99.7% confidence interval)

**Wait 10-15 seconds for processing**

#### 3.2 Check Equipment Status (Before Anomaly)
```bash
curl -s "$API_URL/equipment/pump-001/status" | jq '{
  status,
  activeAnomalies,
  latestReadings: .latestReadings[:3]
}'
```

**Expected Output:**
```json
{
  "status": "ONLINE",
  "activeAnomalies": 0,
  "latestReadings": [...]
}
```

#### 3.3 Trigger Anomaly (Temperature Spike)
```bash
curl -X POST "$API_URL/webhook/sensor-data" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "readings": [
      {
        "equipmentId": "pump-001",
        "sensorType": "TEMPERATURE",
        "value": 150.0,
        "unit": "°C"
      }
    ]
  }' | jq '.'
```

**Talking Points:**
- Normal temperature: ~80-82°C
- Sending 150°C (way above normal)
- Should trigger CRITICAL anomaly

**Wait 5-10 seconds for anomaly detection**

#### 3.4 Check Equipment Status (After Anomaly)
```bash
curl -s "$API_URL/equipment/pump-001/status" | jq '{
  status,
  activeAnomalies,
  latestReading: .latestReadings[0]
}'
```

**Expected Output:**
```json
{
  "status": "ANOMALY",
  "activeAnomalies": 1,
  "latestReading": {
    "sensorType": "TEMPERATURE",
    "value": 150.0,
    "unit": "°C"
  }
}
```

#### 3.5 View Critical Alerts
```bash
curl -s "$API_URL/alerts/critical" | jq '.data[] | select(.equipmentId=="pump-001")'
```

**Expected Output:**
```json
{
  "id": "anomaly-xxx",
  "time": "2025-11-20T10:35:00Z",
  "equipmentId": "pump-001",
  "equipmentName": "Hydraulic Pump #1",
  "sensorType": "TEMPERATURE",
  "severity": "CRITICAL",
  "description": "Temperature reading significantly higher than normal",
  "value": 150.0,
  "zScore": 35.2
}
```

**Talking Points:**
- Anomaly detected with Z-score of ~35
- Severity: CRITICAL (>5σ)
- Equipment status changed to ANOMALY
- Alert created automatically

---

### Part 4: Live Code Demo - Add Feature (8-10 minutes)

**Scenario:** Add a new endpoint to get equipment by location

#### 4.1 Show Current Code Structure
```bash
# Show equipment controller
cat src/api/equipment.controller.ts | head -30
```

#### 4.2 Add New Controller Function

**Open:** `src/api/equipment.controller.ts`

**Add after `getAllEquipment` function:**
```typescript
/**
 * GET /equipment/by-location/:location
 * Get equipment by location
 */
export const getEquipmentByLocation = async (req: Request, res: Response) => {
  try {
    const { location } = req.params;

    const equipment = await equipmentRepository.findAll();
    const filtered = equipment.filter(
      (eq) => eq.location.toLowerCase().includes(location.toLowerCase())
    );

    return res.status(200).json({
      location,
      data: filtered,
      count: filtered.length,
    });
  } catch (error) {
    console.error('Error fetching equipment by location:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch equipment by location',
      statusCode: 500,
      timestamp: new Date(),
    });
  }
};
```

**Talking Points:**
- TypeScript provides type safety
- Uses existing repository pattern
- Standard error handling
- RESTful response format

#### 4.3 Add Route

**Open:** `src/api/routes.ts`

**Add after equipment routes:**
```typescript
router.get('/equipment/by-location/:location', equipmentController.getEquipmentByLocation);
```

#### 4.4 Test Hot Reload

**Watch Terminal 2 (API Server):**
- Should automatically restart with changes

#### 4.5 Test New Endpoint
```bash
curl -s "$API_URL/equipment/by-location/Assembly" | jq '.'
```

**Expected Output:**
```json
{
  "location": "Assembly",
  "data": [
    {
      "id": "pump-001",
      "name": "Hydraulic Pump #1",
      "location": "Assembly Line A"
    }
  ],
  "count": 1
}
```

**Talking Points:**
- Hot reload in development
- Changes applied immediately
- No service restart needed
- Production-ready TypeScript compilation

---

### Part 5: Query APIs & Metrics (5 minutes)

#### 5.1 Get Production Metrics
```bash
curl -s "$API_URL/metrics/production" | jq '{
  totalEvents,
  eventsPerHour,
  anomalyRate,
  uptimePercentage
}'
```

**Talking Points:**
- Real-time aggregation queries
- TimescaleDB optimizations for time-series data
- Metrics across all equipment

#### 5.2 Get Alert History with Filters
```bash
# Unresolved critical alerts
curl -s "$API_URL/alerts/history?severity=CRITICAL&resolved=false" | jq '{
  total: .pagination.total,
  alerts: .data[:3]
}'
```

#### 5.3 Get Sensor History with Statistics
```bash
curl -s "$API_URL/equipment/pump-001/sensor-history?sensorType=TEMPERATURE" | jq '{
  equipmentId,
  sensorType,
  statistics,
  dataPoints: (.data | length)
}'
```

**Expected Output:**
```json
{
  "equipmentId": "pump-001",
  "sensorType": "TEMPERATURE",
  "statistics": {
    "avg": 83.5,
    "min": 78.2,
    "max": 150.0,
    "count": 101
  },
  "dataPoints": 101
}
```

#### 5.4 Resolve Alert
```bash
# Get latest unresolved alert
ALERT_ID=$(curl -s "$API_URL/alerts/history?resolved=false&limit=1" | jq -r '.data[0].id')

# Resolve it
curl -s -X PATCH "$API_URL/alerts/$ALERT_ID/resolve" | jq '.'
```

**Expected Output:**
```json
{
  "message": "Alert resolved successfully",
  "data": {
    "id": "anomaly-xxx",
    "resolved": true,
    "resolvedAt": "2025-11-20T10:45:00Z"
  }
}
```

---

### Part 6: Performance & Scalability (3 minutes)

#### 6.1 Show Load Test Results
```bash
cat docs/PHASE_8_SUMMARY.md | grep -A 20 "Load Test Results"
```

**Talking Points:**
- Tested up to 2000 readings/sec
- 99.5% success rate at burst load
- Background job processing prevents blocking
- Redis queue with BullMQ for reliability

#### 6.2 Run Quick Load Test (Optional)
```bash
npm run load-test:light
```

**Talking Points:**
- 100 readings/sec for 10 seconds
- 1000 total readings
- Async processing via job queue
- Real-time anomaly detection

---

### Part 7: Database & Monitoring (3 minutes)

#### 7.1 Open Prisma Studio
```bash
npm run db:studio
# Opens http://localhost:5555
```

**Show:**
- Equipment table
- SensorEvent table (time-series data)
- Anomaly table
- TimescaleDB hypertable partitioning

**Talking Points:**
- Prisma provides type-safe database access
- TimescaleDB hypertables for automatic partitioning
- Compression policies for older data
- Optimized indexes for time-based queries

#### 7.2 Check Database Size
```bash
docker-compose exec timescaledb psql -U plm_user -d production_line_monitor -c "
SELECT
  hypertable_name,
  pg_size_pretty(hypertable_size(format('%I.%I', hypertable_schema, hypertable_name))) as size
FROM timescaledb_information.hypertables;
"
```

#### 7.3 Show Worker Jobs in Redis
```bash
docker-compose exec redis redis-cli KEYS "bull:*" | head -10
```

**Talking Points:**
- BullMQ stores jobs in Redis
- Reliable job processing with retries
- Job monitoring and failure handling

---

### Part 8: Testing (2 minutes)

#### 8.1 Run Tests
```bash
npm test
```

**Show:**
- Unit tests: Anomaly detection algorithm
- Integration tests: API endpoints
- Repository tests: Database operations

**Talking Points:**
- Comprehensive test coverage
- Jest for testing framework
- Supertest for API testing
- In-memory database for test isolation

#### 8.2 Show Test Coverage
```bash
npm run test:coverage
```

---

## Advanced Demos (Optional)

### Demo A: Multiple Equipment Simulation
```bash
# Send readings for multiple equipment
curl -X POST "$API_URL/webhook/sensor-data" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "readings": [
      {"equipmentId": "pump-001", "sensorType": "TEMPERATURE", "value": 85.0, "unit": "°C"},
      {"equipmentId": "conveyor-002", "sensorType": "VIBRATION", "value": 1.8, "unit": "mm/s"},
      {"equipmentId": "press-003", "sensorType": "PRESSURE", "value": 145.2, "unit": "bar"},
      {"equipmentId": "motor-004", "sensorType": "VOLTAGE", "value": 220.5, "unit": "V"}
    ]
  }'

# Check all equipment status
curl -s "$API_URL/equipment" | jq '.data[] | {name, status, activeAnomalies}'
```

### Demo B: Time-Series Query
```bash
# Get sensor history for last hour
START_TIME=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)
END_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

curl -s "$API_URL/equipment/pump-001/sensor-history?sensorType=TEMPERATURE&startTime=$START_TIME&endTime=$END_TIME" | jq '{
  dataPoints: (.data | length),
  statistics,
  latestValue: .data[-1]
}'
```

### Demo C: Production Dashboard View
```bash
# Combine multiple API calls for dashboard
echo "=== Production Overview ==="
echo ""
echo "Equipment Status:"
curl -s "$API_URL/equipment" | jq -r '.data[] | "\(.name): \(.status)"'
echo ""
echo "Metrics (Last 24h):"
curl -s "$API_URL/metrics/production" | jq '{eventsPerHour, anomalyRate, uptimePercentage}'
echo ""
echo "Critical Alerts:"
curl -s "$API_URL/alerts/critical?limit=5" | jq -r '.data[] | "\(.time) - \(.equipmentName): \(.sensorType) = \(.value)"'
```

---

## Cleanup

### Stop Services
```bash
# Stop application
# Ctrl+C in Terminal 2 and 3

# Stop infrastructure
docker-compose down

# (Optional) Remove all data
docker-compose down -v
```

---

## Common Issues & Troubleshooting

### Issue: API not responding
```bash
# Check if API is running
curl http://localhost:3000/health

# Check logs
docker-compose logs app
```

### Issue: Workers not processing jobs
```bash
# Check worker logs
docker-compose logs workers

# Check Redis connection
docker-compose exec redis redis-cli ping
```

### Issue: Database connection error
```bash
# Check TimescaleDB status
docker-compose ps timescaledb

# Check database logs
docker-compose logs timescaledb
```

---

## Key Talking Points Summary

### Technical Excellence
- **TypeScript**: Full type safety, better developer experience
- **Prisma 7.0**: Latest ORM with auto-migrations and type generation
- **TimescaleDB**: Time-series optimizations, compression, partitioning
- **BullMQ**: Reliable job queue with Redis, high throughput
- **Zod**: Runtime validation for API requests

### Architecture Highlights
- **Async Processing**: 202 Accepted pattern for high throughput
- **Anomaly Detection**: Z-score algorithm (3σ threshold)
- **RESTful APIs**: Clean, documented, consistent
- **Background Workers**: Separate processes for scalability
- **Hot Reload**: Fast development iteration

### Production Ready
- **Testing**: Unit, integration, and load tests
- **Error Handling**: Comprehensive error responses
- **Monitoring**: Health checks, job status, Prisma Studio
- **Documentation**: OpenAPI spec, README, API examples
- **Performance**: Tested up to 2000 readings/sec

---

## Quick Commands Reference

```bash
# Start system
docker-compose up -d timescaledb redis
npm run db:migrate
npm run seed
npm run dev          # Terminal 2
npm run workers      # Terminal 3

# Send data
curl -X POST "$API_URL/webhook/sensor-data" -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" -d '{"readings":[...]}'

# Query data
curl "$API_URL/equipment"
curl "$API_URL/equipment/pump-001/status"
curl "$API_URL/metrics/production"
curl "$API_URL/alerts/history"

# Testing
npm test
npm run load-test:light

# Monitoring
npm run db:studio
docker-compose logs -f workers
```
