#!/bin/sh
set -eu

cd /app

echo "Waiting for PostgreSQL..."
until pg_isready -h db -p 5432 -U medical_user -d medical_portal >/dev/null 2>&1; do
  sleep 2
done

echo "Applying schema..."
corepack pnpm --filter @workspace/db run push

echo "Starting API server..."
exec corepack pnpm --filter @workspace/api-server run start
