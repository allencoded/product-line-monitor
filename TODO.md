# Production Line Monitor - Implementation TODO

## Phase 1: Infrastructure Setup ✅

- [x] Create `docker-compose.yml` with PostgreSQL + TimescaleDB + Redis
  - [x] TimescaleDB (PostgreSQL 17.6) - latest-pg17
  - [x] Redis 8.4.0 - alpine image
- [x] Create `Dockerfile` for the application
- [x] Initialize Node.js/TypeScript project
  - [x] `package.json` with latest dependencies (all updated to latest versions)
  - [x] TypeScript configuration (`tsconfig.json`)
  - [x] ESLint and Prettier setup
  - [x] Prisma v7.0.0 for database migrations
- [x] Set up project directory structure
  ```
  src/
  ├── api/           # REST endpoints & routes
  ├── core/          # Business logic (anomaly detection)
  ├── db/            # Database models, migrations, repositories
  ├── schemas/       # Zod validation schemas
  ├── workers/       # Background job processors
  ├── types/         # TypeScript types & interfaces
  └── utils/         # Helper functions
  ```

## Phase 2: Database Layer (Using Prisma)

- [ ] Create Prisma schema (`prisma/schema.prisma`)
  - [ ] `Equipment` model - machine/equipment metadata
  - [ ] `SensorEvent` model - time-series sensor readings
  - [ ] `Anomaly` model - detected anomalies with severity
  - [ ] Enums: `EquipmentStatus`, `SensorType`, `AnomalySeverity`
  - [ ] Add indexes for performance (time-based, equipmentId, sensor_type)
- [ ] Generate Prisma Client (`npm run db:generate`)
- [ ] Run first Prisma migration (`npm run db:migrate`)
- [ ] Create post-migration script to convert `sensor_events` to TimescaleDB hypertable
- [ ] Set up TimescaleDB compression policies
- [ ] Create database repository/service functions using Prisma Client

## Phase 3: Data Models & Validation

- [ ] Define TypeScript interfaces/types
  - [ ] `SensorReading`
  - [ ] `Equipment`
  - [ ] `Anomaly`
  - [ ] `EquipmentStatus`
- [ ] Create Zod schemas for validation
  - [ ] Webhook payload schema
  - [ ] Query parameter schemas
- [ ] Create DTOs (Data Transfer Objects)

## Phase 4: Webhook Ingestion Service

- [ ] Set up Express.js server
- [ ] Create POST `/webhook/sensor-data` endpoint
- [ ] Implement request validation with Zod
- [ ] Add authentication/API key middleware
- [ ] Implement rate limiting
- [ ] Connect to Redis queue for background processing
- [ ] Return 202 Accepted response quickly
- [ ] Add error handling and logging

## Phase 5: Anomaly Detection Engine

- [ ] Implement Z-Score calculation algorithm
  - [ ] Rolling window data fetching (last N readings per sensor)
  - [ ] Mean and standard deviation calculation
  - [ ] Threshold detection (3 sigma)
- [ ] Create anomaly severity classifier (LOW/MEDIUM/CRITICAL)
- [ ] Support multiple sensor types (temperature, vibration, pressure, voltage)
- [ ] Write anomaly detection service/module
- [ ] Store detected anomalies in database

## Phase 6: Background Workers

- [ ] Set up BullMQ with Redis
- [ ] Create job queue for sensor data processing
- [ ] Implement worker for anomaly detection
- [ ] Implement worker for data aggregation
- [ ] Configure concurrency and retry logic
- [ ] Add job monitoring/logging

## Phase 7: Query APIs

- [ ] GET `/equipment/:id/status` - Current equipment status
  - [ ] Check last heartbeat (>30s = OFFLINE)
  - [ ] Return ONLINE/OFFLINE/ANOMALY status
  - [ ] Include latest sensor readings
- [ ] GET `/metrics/production` - Production metrics
  - [ ] Events processed per hour/day
  - [ ] Anomaly rates
  - [ ] Equipment uptime statistics
- [ ] GET `/alerts/history` - Alert history
  - [ ] Pagination support
  - [ ] Filter by severity, time range, equipment
  - [ ] Sort by timestamp
- [ ] GET `/equipment/:id/sensor-history` - Historical sensor data
  - [ ] Time range filtering
  - [ ] Sensor type filtering
  - [ ] Data aggregation options (raw/averaged)

## Phase 8: Testing & Sample Data ✅

- [x] Create sample sensor data generator
  - [x] Normal operating ranges
  - [x] Anomalous readings (spikes, drops)
  - [x] Multiple equipment simulation
  - [x] Degradation scenarios
  - [x] Load test data generation
- [x] Write unit tests
  - [x] Anomaly detection algorithm
  - [x] Validation schemas (webhook + query)
  - [x] Repository functions (equipment + sensor events)
- [x] Write integration tests
  - [x] API endpoints (all endpoints covered)
  - [x] End-to-end webhook flow
- [x] Load testing scripts
  - [x] Light load scenario (100 readings/sec)
  - [x] Medium load scenario (500 readings/sec)
  - [x] Heavy load scenario (1000 readings/sec)
  - [x] Burst load scenario (2000 readings/sec)
- [x] Documentation
  - [x] TESTING.md - Comprehensive testing guide
  - [x] PHASE_8_SUMMARY.md - Implementation summary

## Phase 9: Documentation & Demo Prep ✅

- [x] API documentation (OpenAPI/Swagger)
  - [x] `openapi.yaml` - Complete OpenAPI 3.0 specification
  - [x] All endpoints documented with schemas and examples
- [x] README with setup instructions
  - [x] Comprehensive setup guide
  - [x] All commands documented
  - [x] Architecture overview
  - [x] Troubleshooting section
- [x] Environment variables documentation
  - [x] Documented in README
  - [x] `.env.example` with descriptions
- [x] Sample curl/Postman requests
  - [x] `API_EXAMPLES.md` - 27 curl examples
  - [x] `postman-collection.json` - Postman collection
- [x] Demo script for live coding
  - [x] `DEMO_SCRIPT.md` - Complete demo flow
  - [x] Show webhook ingestion
  - [x] Trigger anomaly detection
  - [x] Query different APIs
  - [x] Demonstrate making live changes

## Phase 10: Polish & Production Readiness

- [ ] Add comprehensive logging (Winston/Pino)
- [ ] Health check endpoints
- [ ] Graceful shutdown handling
- [ ] Database connection pooling optimization
- [ ] Redis connection resilience
- [ ] Error handling improvements
- [ ] Performance monitoring hooks
- [ ] Docker production optimizations

---

## Quick Start Commands

```bash
# Start infrastructure (TimescaleDB + Redis)
docker-compose up -d timescaledb redis

# Install dependencies
npm install

# Generate Prisma Client
npm run db:generate

# Run Prisma migrations
npm run db:migrate

# Start development server
npm run dev

# Generate sample data
npm run seed

# Run tests
npm test

# Open Prisma Studio (database GUI)
npm run db:studio
```

---

## Key Technical Decisions

- **TypeScript**: Type safety, better IDE support for live demo
- **Prisma**: Type-safe database client, excellent migrations, auto-generated types
- **TimescaleDB**: Time-series optimizations, compression, partitioning
- **BullMQ**: Reliable job queue with Redis, good monitoring
- **Z-Score Algorithm**: Simple, adaptive, reduces false positives
- **Express.js**: Lightweight, familiar, easy to modify during demo
- **Docker**: Consistent environment, easy setup for reviewers
- **Latest Versions**: Redis 8.4.0, PostgreSQL 17.6, Prisma 7.0.0
