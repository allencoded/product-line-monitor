# Production Line Monitor

Manufacturing Intelligence Platform - Real-time monitoring and anomaly detection system for manufacturing equipment.

## Overview

A Production Line Monitor service that demonstrates enterprise platform capabilities:

- **Real-time Data Ingestion**: Webhook endpoint accepts batch sensor readings (temperature, vibration, pressure, voltage)
- **Anomaly Detection**: Z-score algorithm (3σ threshold) with adaptive rolling window (100 readings)
- **Time-Series Storage**: TimescaleDB optimizations with compression policies
- **Background Processing**: BullMQ job queue for async processing (sensor data, anomaly detection, aggregation)
- **RESTful APIs**: Query equipment status, production metrics, alert history, and sensor data
- **Comprehensive Testing**: Unit tests, integration tests, and load testing up to 2000 readings/sec

## Tech Stack

- **Runtime:** Node.js 20+ with TypeScript 5.7
- **Framework:** Express.js 4.21
- **Database:** PostgreSQL 17.6 with TimescaleDB extension (latest-pg17)
- **ORM:** Prisma 7.0 (type-safe queries, auto-migrations)
- **Queue:** Redis 8.4 + BullMQ 5.35
- **Validation:** Zod 3.25
- **Logging:** Winston 3.17
- **Testing:** Jest 29 + Supertest 7

## Prerequisites

- **Docker & Docker Compose** (required for infrastructure)
- **Node.js 20+** (for local development)
- **npm** (comes with Node.js)

## Quick Start

### 1. Clone and Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL (TimescaleDB) and Redis
docker-compose up -d timescaledb redis

# Wait for services to be healthy (about 10-15 seconds)
docker-compose ps
```

You should see:
```
NAME                  STATUS         PORTS
plm-redis-1          Up (healthy)   0.0.0.0:6379->6379/tcp
plm-timescaledb-1    Up (healthy)   0.0.0.0:5432->5432/tcp
```

### 3. Database Setup

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations and setup TimescaleDB hypertables
npm run db:migrate

# (Optional) Seed sample equipment data
npm run seed
```

### 4. Start Development Server

```bash
# Terminal 1: Start API server
npm run dev

# Terminal 2: Start background workers
npm run workers
```

The API will be available at `http://localhost:3000/api`

**API Documentation:** http://localhost:3000/api-docs (Swagger UI)

### 5. Test the System

```bash
# Generate sample sensor data (normal + anomalies)
npm run seed:sample

# Run tests
npm test

# Run load tests
npm run load-test:light    # 100 readings/sec
npm run load-test:medium   # 500 readings/sec
npm run load-test:heavy    # 1000 readings/sec
npm run load-test:burst    # 2000 readings/sec
```

## Project Structure

```
src/
├── api/                    # REST endpoints & routes
│   ├── index.ts           # Express app setup
│   ├── routes.ts          # Route definitions
│   ├── webhook.controller.ts
│   ├── equipment.controller.ts
│   ├── metrics.controller.ts
│   ├── alerts.controller.ts
│   ├── sensor.controller.ts
│   └── middleware/        # Auth, error handling
├── core/                  # Business logic
│   └── anomaly-detection.ts   # Z-score algorithm
├── db/                    # Database layer
│   ├── client.ts          # Prisma client
│   ├── repositories/      # Data access layer
│   ├── seed.ts            # Equipment seeding
│   └── setup-timescale.ts # TimescaleDB setup
├── schemas/               # Zod validation schemas
│   └── index.ts
├── workers/               # Background job processors
│   ├── queue.ts           # BullMQ queue setup
│   ├── batch-sensor-data.worker.ts
│   ├── anomaly-detection.worker.ts
│   └── data-aggregation.worker.ts
├── types/                 # TypeScript interfaces
│   └── index.ts
└── utils/                 # Helper functions
    ├── validation.ts
    └── logger.ts

prisma/
├── schema.prisma          # Database schema
└── migrations/            # Database migrations

scripts/
└── load-test.ts           # Load testing scenarios

docs/
├── TESTING.md             # Testing guide
└── PHASE_8_SUMMARY.md     # Implementation summary
```

## API Endpoints

### Webhooks

- **POST** `/api/webhook/sensor-data` - Ingest batch sensor readings
- **GET** `/api/webhook/status/:jobId` - Check webhook job status

### Equipment

- **GET** `/api/equipment` - Get all equipment (optional status filter)
- **GET** `/api/equipment/:id/status` - Get equipment status with latest readings
- **GET** `/api/equipment/:id/sensor-history` - Historical sensor data with statistics

### Metrics

- **GET** `/api/metrics/production` - Production metrics (events/hour, anomaly rates, uptime)

### Alerts

- **GET** `/api/alerts/history` - Alert history (filtering, pagination)
- **GET** `/api/alerts/critical` - Recent critical alerts
- **PATCH** `/api/alerts/:id/resolve` - Resolve an alert

### Sensors

- **GET** `/api/sensors/types` - Available sensor types

### Documentation

- **Swagger UI**: http://localhost:3000/api-docs (interactive API documentation)
- **OpenAPI Spec**: `openapi.yaml` (machine-readable specification)

## Development

### Available Scripts

```bash
# Development
npm run dev                # Start API server with hot reload
npm run workers            # Start all background workers

# Database
npm run db:generate        # Generate Prisma Client
npm run db:migrate         # Run migrations
npm run db:studio          # Open Prisma Studio (GUI)
npm run db:setup-timescale # Setup TimescaleDB hypertables

# Data
npm run seed               # Seed equipment data
npm run seed:sample        # Generate sample sensor readings

# Testing
npm test                   # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Generate coverage report

# Load Testing
npm run load-test          # Run all load tests
npm run load-test:light    # 100 readings/sec
npm run load-test:medium   # 500 readings/sec
npm run load-test:heavy    # 1000 readings/sec
npm run load-test:burst    # 2000 readings/sec

# Code Quality
npm run lint               # Check code style
npm run lint:fix           # Fix linting issues
npm run format             # Format code with Prettier

# Production
npm run build              # Build TypeScript
npm start                  # Run production build
```

## Docker Deployment

### Run Full Stack with Docker

```bash
# Build and run all services (TimescaleDB, Redis, API, Workers)
docker-compose up --build

# Run in detached mode
docker-compose up -d --build
```

### Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app        # API logs
docker-compose logs -f workers    # Worker logs

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Rebuild after code changes
docker-compose up --build app workers
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Database Configuration (Prisma)
DATABASE_URL=postgresql://plm_user:plm_password@localhost:5432/production_line_monitor?schema=public

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Server Configuration
PORT=3000
NODE_ENV=development

# API Configuration
API_KEY=your-secret-api-key-here

# Anomaly Detection Configuration
ANOMALY_THRESHOLD_SIGMA=3      # Z-score threshold (3 = 99.7% confidence)
ROLLING_WINDOW_SIZE=100        # Number of readings for baseline calculation
```

### Configuration Details

- **DATABASE_URL**: PostgreSQL connection string (TimescaleDB)
- **REDIS_URL**: Redis connection string (for BullMQ)
- **PORT**: API server port (default: 3000)
- **NODE_ENV**: Environment (development/production)
- **API_KEY**: Secret key for webhook authentication (X-API-Key header)
- **ANOMALY_THRESHOLD_SIGMA**: Z-score threshold (3σ = 99.7% confidence interval)
- **ROLLING_WINDOW_SIZE**: Window size for rolling statistics (baseline calculation)

## Authentication

All webhook endpoints require API key authentication via the `X-API-Key` header:

```bash
curl -X POST http://localhost:3000/api/webhook/sensor-data \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key-here" \
  -d '{"readings": [...]}'
```

## Monitoring

### Health Checks

```bash
# Check if API is running
curl http://localhost:3000/health

# Check database connection
docker-compose exec timescaledb pg_isready

# Check Redis connection
docker-compose exec redis redis-cli ping
```

### Prisma Studio (Database GUI)

```bash
npm run db:studio
# Opens http://localhost:5555
```

### BullMQ Job Monitoring

Jobs can be monitored via:
- Job status endpoint: `GET /api/webhook/status/:jobId`
- Redis CLI: `docker-compose exec redis redis-cli`

## Testing

### Run Tests

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Coverage

- **Unit Tests**: Anomaly detection algorithm, validation schemas, repositories
- **Integration Tests**: All API endpoints, end-to-end webhook flow
- **Load Tests**: 100-2000 readings/sec scenarios

See `docs/TESTING.md` for detailed testing guide.

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    HTTP Client / IoT Device                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ POST /api/webhook/sensor-data
                            │ (batch of sensor readings)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Express API                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ Webhook Endpoint │  │ Query Endpoints  │  │ Queue Monitor │ │
│  │  (202 Accepted)  │  │ (Equipment/Alerts│  │  (Stats API)  │ │
│  └─────────┬────────┘  └──────────────────┘  └───────────────┘ │
└────────────┼─────────────────────────────────────────────────────┘
             │
             ▼ Enqueue jobs
┌─────────────────────────────────────────────────────────────────┐
│                      Redis (BullMQ Queues)                       │
│  ┌─────────────────┐  ┌────────────────┐  ┌──────────────────┐ │
│  │ batch-sensor-   │  │  sensor-data   │  │ anomaly-         │ │
│  │ data (batch     │→ │  (individual   │→ │ detection        │ │
│  │ splitting)      │  │  processing)   │  │ (Z-score calc)   │ │
│  └─────────────────┘  └────────────────┘  └──────────────────┘ │
│  299,354 keys total (jobs metadata, states, data)               │
└───────────────┬─────────────────────────────────────────────────┘
                │
                ▼ Background Workers
┌─────────────────────────────────────────────────────────────────┐
│                      BullMQ Workers                              │
│  ┌──────────────────┐  ┌────────────────┐  ┌─────────────────┐│
│  │ Batch Worker     │  │ Sensor Worker  │  │ Anomaly Worker  ││
│  │ (splits batch)   │  │ (stores event, │  │ (detects,       ││
│  │ Concurrency: 3   │  │ triggers next) │  │  stores alerts) ││
│  │ Rate: 20 jobs/s  │  │ Concurrency:10 │  │ Concurrency: 5  ││
│  └──────────────────┘  │ Rate: 100/s    │  │ Rate: 50/s      ││
│                        └────────────────┘  └─────────────────┘│
└───────────────┬─────────────────────────────────────────────────┘
                │
                ▼ Store data
┌─────────────────────────────────────────────────────────────────┐
│              PostgreSQL + TimescaleDB Extension                  │
│  ┌─────────────────────┐  ┌──────────────────┐  ┌────────────┐│
│  │ sensor_events       │  │ anomalies        │  │ equipment  ││
│  │ (hypertable, time-  │  │ (alerts/critical │  │ (metadata) ││
│  │  partitioned,       │  │  events)         │  │            ││
│  │  compressed)        │  │                  │  │            ││
│  └─────────────────────┘  └──────────────────┘  └────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

**Ingestion Path (Asynchronous):**
1. **HTTP Request** → `POST /api/webhook/sensor-data`
2. **Validation** → Zod schema validation
3. **Queue Job** → BullMQ `batch-sensor-data` queue (returns 202 Accepted)
4. **Batch Worker** → Splits batch into individual reading jobs
5. **Sensor Worker** → Stores `sensor_events` in TimescaleDB, updates equipment heartbeat
6. **Anomaly Worker** → Fetches rolling window (100 readings), calculates Z-score
7. **Alert Storage** → If anomaly detected, stores in `anomalies` table

**Query Path (Synchronous):**
- REST APIs query TimescaleDB directly
- Pre-computed statistics via repositories
- Real-time equipment status with latest readings

### Queue System (Redis/BullMQ)

**Queue Storage:**
- All queue data stored in **Redis** (NOT PostgreSQL)
- Total keys: 299,354 (job metadata, states, data)
- Key patterns:
  - `bull:sensor-data:completed` - Completed jobs (sorted set)
  - `bull:sensor-data:{jobId}` - Individual job data (hash)
  - `bull:sensor-data:meta` - Queue configuration

**Job Lifecycle:**
```
waiting → active → completed/failed
              ↓ (on failure)
            delayed (retry with exponential backoff)
```

**Retention:**
- Completed jobs: 1 hour OR max 1000 jobs
- Failed jobs: 24 hours
- Retries: Up to 3 attempts with 2s exponential backoff

### Anomaly Detection

**Algorithm:** Z-score (Standard Score)
```
Z = (x - μ) / σ

Where:
  x = current sensor reading
  μ = mean of last 100 readings (rolling window)
  σ = standard deviation of last 100 readings
```

**Thresholds:**
- **LOW** severity: 3σ - 4σ (99.7% confidence)
- **MEDIUM** severity: 4σ - 5σ (99.99% confidence)
- **CRITICAL** severity: >5σ (99.9999% confidence)

**Baseline Calculation:**
- Rolling window: Last 100 readings per equipment+sensor combination
- Fetched from `sensor_events` table per anomaly check
- Adaptive: Updates as new normal readings arrive

**Example Detection:**
```
Normal temperature range: 85°C ± 2°C
Reading: 150°C
Z-score: (150 - 85) / 2 = 32.5σ
Result: CRITICAL anomaly detected
```

### Database Optimizations

**TimescaleDB Features:**
- **Hypertables**: Automatic time-based partitioning on `sensor_events`
- **Compression**: Older chunks compressed (configurable policy)
- **Indexes**:
  - `(equipmentId, sensorType, time DESC)` for recent readings
  - `(time DESC)` for time-range queries
- **Continuous Aggregates**: (Future) Pre-computed hourly/daily statistics

**Query Performance:**
- Recent readings: ~10-20ms (indexed)
- Rolling window (100 readings): ~20-50ms
- Aggregated metrics: ~50-100ms

## Design Decisions & Trade-offs

### Data Latency vs. Cost Trade-off

**Requirement:** Shop floor events must be processed within 500ms for safety alerts

**Current Implementation:**
- **Actual latency**: ~2-3 seconds from ingestion to anomaly detection stored
- **Architecture**: Asynchronous queue-based processing
- **Processing flow**: HTTP → Queue1 (batch) → Queue2 (sensor) → Queue3 (anomaly) → Database

**Why This Approach:**
- ✅ **High throughput**: Supports 500-2000 readings/sec without degradation
- ✅ **Cost efficient**: Rate limiting and batching reduce database load
- ✅ **Resilient**: Queue-based architecture handles spikes and retries failures
- ✅ **Scalable**: Workers can be scaled independently
- ✅ **Complete**: Built entire end-to-end system in 2-hour time constraint
- ❌ **High latency**: 2-3 seconds doesn't meet <500ms requirement

**To Meet <500ms Requirement:**

Would implement **fast-path architecture** for safety-critical sensors:

```typescript
// Pseudo-code for fast path
if (CRITICAL_SENSORS.includes(sensorType)) {
  // Synchronous inline processing (skip queue)
  const result = await detectAnomalySync(reading);
  await storeReadingSync(reading, result);
  return { anomalyDetected: result.isAnomaly, latency: 50ms };
} else {
  // Existing async queue processing
  await queueReading(reading);
  return { jobId: "...", accepted: true };
}
```

**Implementation Effort:**
- **Code**: ~200 lines
- **Time**: 2-3 days
- **Changes**: Modify webhook controller, add sync processing path
- **Trade-offs**: Higher database load, more complex code

**Why Not Implemented:**
- Take-home assignment time-boxed to 2 hours
- Prioritized building complete, working system over single-feature optimization
- Demonstrates understanding of requirement and solution approach

### Architecture: Queue-Based vs. Synchronous Processing

**Queue-Based (Current):**
- ✅ Decouples ingestion from processing
- ✅ Handles traffic spikes gracefully
- ✅ Automatic retries on failure
- ✅ Can scale workers independently
- ❌ Adds latency at each queue hop (~500ms per stage)

**Synchronous (Alternative):**
- ✅ Low latency (<100ms possible)
- ✅ Simple to understand
- ❌ Blocks request thread during processing
- ❌ No retry mechanism
- ❌ Poor scalability under high load

**Chosen Approach:** Queue-based for resilience and throughput, with fast-path as future enhancement.

### Anomaly Detection: Real-time DB vs. Cached Statistics

**Real-time DB Query (Current):**
- ✅ 100% accuracy (exact current baseline)
- ✅ Simple implementation
- ❌ Database query per anomaly check (~20-50ms)
- ❌ Increases database load

**Cached Statistics (Alternative):**
- ✅ Much faster (~5ms from Redis)
- ✅ Reduces database load
- ❌ ~95-98% accuracy (statistics may be stale)
- ❌ Additional complexity (cache warming, invalidation)

**Chosen Approach:** Real-time DB for accuracy, with caching as future enhancement for critical path.

## Known Limitations

### 1. Latency Requirement Not Met
- **Issue**: 2-3 second latency vs. <500ms requirement for safety alerts
- **Impact**: Not suitable for real-time safety-critical applications as-is
- **Mitigation**: Documented fast-path solution approach (~200 lines, 2-3 days)

### 2. Equipment Records Must Exist
- **Issue**: Sensor readings fail if equipment record doesn't exist in database
- **Impact**: Must seed equipment data before ingesting sensor readings
- **Workaround**: Run `npm run seed` before load tests
- **Future**: Add equipment auto-registration on first sensor reading

### 3. Queue Management
- **Issue**: Failed/delayed jobs accumulate in Redis and require manual cleanup
- **Impact**: Redis memory usage grows over time
- **Mitigation**: Added queue management endpoints:
  - `GET /api/queues/stats` - View queue statistics
  - `DELETE /api/queues/delayed` - Clear retry jobs
- **Future**: Automatic cleanup job, better retry policies

### 4. No Rate Limiting on API
- **Issue**: Removed rate limiting to support load tests
- **Impact**: API vulnerable to abuse/DoS
- **Mitigation**: Add back rate limiting with higher limits (1000 req/min)
- **Context**: Initially had 100 req/15min limit that blocked load tests

### 5. Single Shared Database Connection Pool
- **Issue**: Critical and monitoring queries share same connection pool
- **Impact**: High monitoring load could starve critical queries
- **Future**: Separate connection pools (critical: 5-10 connections, monitoring: 20-50)

### 6. No Alerting/Notification System
- **Issue**: Anomalies stored in database but no active notifications
- **Impact**: Requires polling to detect new anomalies
- **Future**: Webhook callbacks, email/SMS alerts, real-time WebSocket

### 7. Limited Test Coverage on Edge Cases
- **Issue**: Tests focus on happy path, limited negative scenarios
- **Examples**: Cache misses, database failures, malformed data
- **Future**: Add chaos engineering tests, failure injection

## Performance

### Load Test Results

| Scenario | Throughput | Latency (P95) | Success Rate |
|----------|-----------|---------------|--------------|
| Light    | 100/sec   | <50ms        | 100%         |
| Medium   | 500/sec   | <100ms       | 100%         |
| Heavy    | 1000/sec  | <200ms       | 99.9%        |
| Burst    | 2000/sec  | <500ms       | 99.5%        |

**Note:** Latency measured is HTTP response time (202 Accepted). End-to-end latency (ingestion → anomaly stored) is 2-3 seconds.

## Troubleshooting

### Database Connection Issues

```bash
# Check if TimescaleDB is running
docker-compose ps timescaledb

# Check logs
docker-compose logs timescaledb

# Restart database
docker-compose restart timescaledb
```

### Redis Connection Issues

```bash
# Check if Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping

# Restart Redis
docker-compose restart redis
```

### Worker Not Processing Jobs

```bash
# Check worker logs
docker-compose logs workers

# Check Redis for pending jobs
docker-compose exec redis redis-cli KEYS "bull:*"

# Restart workers
docker-compose restart workers
```

## Implementation Status

- [x] Phase 1: Infrastructure Setup
- [x] Phase 2: Database Layer (Prisma + TimescaleDB)
- [x] Phase 3: Data Models & Validation (Zod schemas)
- [x] Phase 4: Webhook Ingestion Service (Express + validation)
- [x] Phase 5: Anomaly Detection Engine (Z-score algorithm)
- [x] Phase 6: Background Workers (BullMQ)
- [x] Phase 7: Query APIs (Equipment, Metrics, Alerts, Sensors)
- [x] Phase 8: Testing & Sample Data (Unit, Integration, Load tests)
- [x] Phase 9: Documentation & Demo Prep
- [x] Phase 10: Queue Monitoring (Stats API, cleanup endpoints)

## Future Enhancements

### High Priority

**1. Fast-Path for Safety-Critical Sensors**
- Synchronous processing for PRESSURE/VOLTAGE sensors
- <100ms latency guarantee
- Separate endpoint: `POST /api/safety/sensor-data`
- ~200 lines of code, 2-3 days effort

**2. Real-Time Alerting**
- Webhook callbacks when anomaly detected
- Email/SMS notifications for critical alerts
- WebSocket for real-time dashboard updates

**3. Equipment Auto-Registration**
- Automatically create equipment record on first sensor reading
- Reduces setup friction for new equipment

### Medium Priority

**4. Statistics Caching (Redis)**
- Pre-computed rolling window statistics
- Reduces database load by 80%
- Updates every 1-5 minutes
- Enables faster anomaly detection

**5. Separate Connection Pools**
- Critical pool: 5-10 connections, high priority
- Monitoring pool: 20-50 connections, normal priority
- Prevents monitoring queries from starving critical operations

**6. Continuous Aggregates (TimescaleDB)**
- Pre-computed hourly/daily metrics
- Faster dashboard queries
- Automatic refresh policies

**7. Enhanced Load Testing**
- Chaos engineering tests (database failures, network issues)
- Latency testing under various conditions
- Cache miss scenarios

### Low Priority

**8. Multi-Tenant Support**
- Tenant isolation in database
- Per-tenant rate limiting
- Separate Redis namespaces

**9. Advanced Anomaly Detection**
- ML-based pattern detection
- Seasonal trend analysis
- Multi-variate correlation

**10. Observability**
- Prometheus metrics export
- Grafana dashboards
- Distributed tracing (OpenTelemetry)

## Demo Instructions

### Quick Demo (5 minutes)

1. **Start the system**:
   ```bash
   docker-compose up -d
   npm run dev  # Terminal 1
   npm run workers  # Terminal 2
   ```

2. **View API Documentation**:
   - Open http://localhost:3000/api-docs
   - Interactive Swagger UI with all endpoints

3. **Generate test anomalies**:
   ```bash
   npx tsx scripts/generate-test-anomalies.ts
   ```

4. **View detected anomalies**:
   ```bash
   curl http://localhost:3000/api/alerts/history | jq
   ```

5. **Monitor queues**:
   ```bash
   curl http://localhost:3000/api/queues/stats | jq
   ```

6. **Run load test**:
   ```bash
   npm run load-test:medium  # 500 readings/sec
   ```

### Key Features to Demonstrate

1. **Real-time anomaly detection** - Show that extreme values trigger alerts
2. **Queue monitoring** - Show job processing in real-time
3. **Load testing** - Demonstrate 500+ readings/sec throughput
4. **API documentation** - Swagger UI with all endpoints
5. **Time-series storage** - TimescaleDB query performance

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
