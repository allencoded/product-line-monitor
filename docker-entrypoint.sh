#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Setting up TimescaleDB..."
npx tsx src/db/setup-timescale.ts

echo "Seeding database..."
npx tsx src/db/seed.ts

echo "Starting application..."
exec "$@"
