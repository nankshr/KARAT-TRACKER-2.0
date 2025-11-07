#!/bin/bash

# Export data from Supabase to self-hosted PostgreSQL
# This script exports your database from Supabase

echo "======================================"
echo "Supabase Database Export Script"
echo "======================================"
echo ""

# Configuration
SUPABASE_PROJECT_ID="${SUPABASE_PROJECT_ID}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD}"
OUTPUT_DIR="./migration/exports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Database connection details
DB_HOST="db.${SUPABASE_PROJECT_ID}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

echo "Exporting from: $DB_HOST"
echo "Output directory: $OUTPUT_DIR"
echo ""

# Export schema only
echo "1. Exporting database schema..."
PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --schema-only \
  --no-owner \
  --no-privileges \
  -f "$OUTPUT_DIR/schema_${TIMESTAMP}.sql"

if [ $? -eq 0 ]; then
  echo "✓ Schema exported successfully"
else
  echo "✗ Schema export failed"
  exit 1
fi

# Export data only
echo ""
echo "2. Exporting database data..."
PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --data-only \
  --no-owner \
  --no-privileges \
  --disable-triggers \
  -f "$OUTPUT_DIR/data_${TIMESTAMP}.sql"

if [ $? -eq 0 ]; then
  echo "✓ Data exported successfully"
else
  echo "✗ Data export failed"
  exit 1
fi

# Export full database (schema + data)
echo ""
echo "3. Exporting complete database..."
PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-privileges \
  -f "$OUTPUT_DIR/complete_${TIMESTAMP}.sql"

if [ $? -eq 0 ]; then
  echo "✓ Complete database exported successfully"
else
  echo "✗ Complete export failed"
  exit 1
fi

# Export specific tables
echo ""
echo "4. Exporting individual tables..."
TABLES=("users" "daily_rates" "sales_log" "expense_log" "activity_log")

for table in "${TABLES[@]}"; do
  echo "   Exporting $table..."
  PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --table="$table" \
    --no-owner \
    --no-privileges \
    -f "$OUTPUT_DIR/${table}_${TIMESTAMP}.sql"

  if [ $? -eq 0 ]; then
    echo "   ✓ $table exported"
  else
    echo "   ✗ $table export failed"
  fi
done

echo ""
echo "======================================"
echo "Export completed!"
echo "======================================"
echo ""
echo "Files created in: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR"/*_${TIMESTAMP}.sql
echo ""
echo "Next steps:"
echo "1. Review the exported files"
echo "2. Run import-to-postgres.sh to import into your self-hosted database"
