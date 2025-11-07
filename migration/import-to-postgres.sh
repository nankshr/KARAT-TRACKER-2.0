#!/bin/bash

# Import data to self-hosted PostgreSQL
# This script imports your database backup into your self-hosted PostgreSQL

echo "======================================"
echo "PostgreSQL Database Import Script"
echo "======================================"
echo ""

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-karat_tracker}"
DB_USER="${DB_USER:-karat_user}"
DB_PASSWORD="${DB_PASSWORD}"
IMPORT_DIR="./migration/exports"

echo "Importing to: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Check if export files exist
if [ ! -d "$IMPORT_DIR" ]; then
  echo "✗ Export directory not found: $IMPORT_DIR"
  echo "Please run export-from-supabase.sh first"
  exit 1
fi

# Find the latest complete export file
LATEST_COMPLETE=$(ls -t "$IMPORT_DIR"/complete_*.sql 2>/dev/null | head -1)

if [ -z "$LATEST_COMPLETE" ]; then
  echo "✗ No complete export file found in $IMPORT_DIR"
  echo "Please run export-from-supabase.sh first"
  exit 1
fi

echo "Using export file: $(basename $LATEST_COMPLETE)"
echo ""

# Test database connection
echo "1. Testing database connection..."
PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✓ Database connection successful"
else
  echo "✗ Database connection failed"
  echo "Please check your database credentials"
  exit 1
fi

# Create database if it doesn't exist
echo ""
echo "2. Ensuring database exists..."
PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d postgres \
  -c "CREATE DATABASE $DB_NAME;" 2>/dev/null

echo "✓ Database ready"

# Import schema and data
echo ""
echo "3. Importing database..."
read -p "This will overwrite existing data. Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Import cancelled"
  exit 1
fi

PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -f "$LATEST_COMPLETE"

if [ $? -eq 0 ]; then
  echo "✓ Database imported successfully"
else
  echo "✗ Database import failed"
  exit 1
fi

# Verify import
echo ""
echo "4. Verifying import..."
TABLES=("users" "daily_rates" "sales_log" "expense_log" "activity_log")

for table in "${TABLES[@]}"; do
  COUNT=$(PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')

  if [ ! -z "$COUNT" ]; then
    echo "   $table: $COUNT rows"
  else
    echo "   $table: Table not found or error"
  fi
done

echo ""
echo "======================================"
echo "Import completed!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Verify data integrity"
echo "2. Test the application with the new database"
echo "3. Update environment variables to point to new database"
