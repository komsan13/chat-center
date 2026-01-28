#!/bin/sh
set -e

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until nc -z db 5432; do
  sleep 1
done
echo "PostgreSQL is ready!"

# Push schema to database (create tables)
echo "Pushing database schema..."
echo "DATABASE_URL: $DATABASE_URL"
npx drizzle-kit push --config=drizzle.config.ts --force 2>&1 || echo "Schema push failed, but continuing..."

# Start the application
echo "Starting application..."
exec node server.js
