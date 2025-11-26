import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function setupTimescaleDB() {
  console.log('Setting up TimescaleDB hypertable and compression...');

  try {
    // Convert sensor_events table to hypertable
    await prisma.$executeRawUnsafe(`
      SELECT create_hypertable(
        'sensor_events',
        'time',
        if_not_exists => TRUE,
        chunk_time_interval => INTERVAL '1 day'
      );
    `);
    console.log('✓ Created hypertable for sensor_events');

    // Add compression policy (compress chunks older than 7 days)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE sensor_events SET (
        timescaledb.compress,
        timescaledb.compress_segmentby = '"equipmentId","sensorType"'
      );
    `);
    console.log('✓ Enabled compression on sensor_events');

    await prisma.$executeRawUnsafe(`
      SELECT add_compression_policy(
        'sensor_events',
        INTERVAL '7 days',
        if_not_exists => TRUE
      );
    `);
    console.log('✓ Added compression policy (7 days)');

    // Add data retention policy (drop chunks older than 90 days)
    await prisma.$executeRawUnsafe(`
      SELECT add_retention_policy(
        'sensor_events',
        INTERVAL '90 days',
        if_not_exists => TRUE
      );
    `);
    console.log('✓ Added retention policy (90 days)');

    console.log('\n✅ TimescaleDB setup complete!');
  } catch (error) {
    console.error('Error setting up TimescaleDB:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupTimescaleDB()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
