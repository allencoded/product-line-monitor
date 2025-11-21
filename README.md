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

### Data Flow

1. **Ingestion**: Webhook receives batch sensor readings → Returns 202 Accepted
2. **Queueing**: Readings queued in Redis via BullMQ (high priority)
3. **Processing**: Worker processes batch → Stores in TimescaleDB
4. **Detection**: Anomaly detection worker analyzes readings (Z-score algorithm)
5. **Alerting**: Critical anomalies trigger alerts → Stored in database
6. **Querying**: REST APIs provide real-time and historical data access

### Anomaly Detection

- **Algorithm**: Z-score (3 sigma threshold)
- **Baseline**: Rolling window of last 100 readings per sensor
- **Severity**: LOW (3-4σ), MEDIUM (4-5σ), CRITICAL (>5σ)
- **Adaptive**: Baseline updates as new normal readings arrive

### Database Optimizations

- **TimescaleDB Hypertables**: Automatic partitioning by time
- **Compression**: Older data compressed to save space
- **Indexes**: Optimized for time-based and equipment queries
- **Continuous Aggregates**: Pre-computed metrics (future enhancement)

## Performance

### Load Test Results

| Scenario | Throughput | Latency (P95) | Success Rate |
|----------|-----------|---------------|--------------|
| Light    | 100/sec   | <50ms        | 100%         |
| Medium   | 500/sec   | <100ms       | 100%         |
| Heavy    | 1000/sec  | <200ms       | 99.9%        |
| Burst    | 2000/sec  | <500ms       | 99.5%        |

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
- [ ] Phase 9: Documentation & Demo Prep (In Progress)
- [ ] Phase 10: Polish & Production Readiness

See `todo.md` for detailed implementation checklist.

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
