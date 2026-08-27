#!/usr/bin/env bash
set -e

echo "Waiting for SQL Server to be healthy..."
docker compose up -d db

echo "Running database migrations..."
docker compose run --rm backend dotnet Terma.Api.dll --migrate

echo "Provisioning admin user..."
docker compose run --rm backend dotnet Terma.Api.dll --seed-admin

echo "Database migration & seeding completed successfully!"
