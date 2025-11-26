#!/bin/sh
set -e

# Only run migrations/setup for the app container, not workers
if [ "$1" = "npm" ] && [ "$2" = "run" ] && [ "$3" = "dev" ]; then
  echo "Running database migrations..."
  npx prisma migrate deploy

  echo "Setting up TimescaleDB..."
  npx tsx src/db/setup-timescale.ts

  echo "Seeding database..."
  npx tsx src/db/seed.ts
fi

echo "Starting application..."
exec "$@"
