#!/usr/bin/env python3
"""
Direct PostgreSQL Import Tool
Imports exported SQL data directly to PostgreSQL without requiring psql command
"""

import os
import sys
import psycopg2
from datetime import datetime

# ANSI color codes
class Colors:
    BLUE = '\033[0;34m'
    GREEN = '\033[0;32m'
    RED = '\033[0;31m'
    YELLOW = '\033[1;33m'
    NC = '\033[0m'  # No Color

def print_header(text):
    print(f"\n{Colors.BLUE}{'='*50}")
    print(text)
    print(f"{'='*50}{Colors.NC}\n")

def print_success(text):
    print(f"{Colors.GREEN}[OK] {text}{Colors.NC}")

def print_error(text):
    print(f"{Colors.RED}[ERROR] {text}{Colors.NC}")

def print_info(text):
    print(f"{Colors.BLUE}[INFO] {text}{Colors.NC}")

def print_warning(text):
    print(f"{Colors.YELLOW}[WARNING] {text}{Colors.NC}")

# Load configuration
config = {}
config_file = "migration/config.env"

print_info(f"Loading configuration from {config_file}")

try:
    with open(config_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                # Remove quotes if present
                value = value.strip().strip('"').strip("'")
                config[key] = value
    print_success("Configuration loaded")
except FileNotFoundError:
    print_error(f"Configuration file not found: {config_file}")
    sys.exit(1)

# PostgreSQL connection parameters
TARGET_HOST = config.get('TARGET_HOST')
TARGET_PORT = config.get('TARGET_PORT', '5432')
TARGET_DB = config.get('TARGET_DB_NAME')
TARGET_USER = config.get('TARGET_USER')
TARGET_PASSWORD = config.get('TARGET_PASSWORD')

# Tables to import
TABLES = config.get('TABLES', '').split(',')

# Get export directory
if os.path.exists('migration/.last_export'):
    with open('migration/.last_export', 'r') as f:
        EXPORT_DIR = f.read().strip()
else:
    print_error("No export found. Please run export first.")
    print_info("Run: python migration/migrate-api.py export")
    sys.exit(1)

print_info(f"Using export from: {EXPORT_DIR}")
print()

def connect_db():
    """Connect to PostgreSQL database"""
    try:
        print_info(f"Connecting to {TARGET_HOST}:{TARGET_PORT}/{TARGET_DB}...")
        conn = psycopg2.connect(
            host=TARGET_HOST,
            port=TARGET_PORT,
            database=TARGET_DB,
            user=TARGET_USER,
            password=TARGET_PASSWORD,
            connect_timeout=10
        )
        print_success("Connected successfully")
        return conn
    except Exception as e:
        print_error(f"Failed to connect to database: {e}")
        print()
        print("Connection details:")
        print(f"  Host: {TARGET_HOST}")
        print(f"  Port: {TARGET_PORT}")
        print(f"  Database: {TARGET_DB}")
        print(f"  User: {TARGET_USER}")
        print()
        print("Please check:")
        print("  1. PostgreSQL is running")
        print("  2. Database exists")
        print("  3. Credentials are correct")
        print("  4. Firewall allows connection")
        sys.exit(1)

def get_row_count(conn, table):
    """Get row count for a table"""
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT COUNT(*) FROM {table};")
        count = cursor.fetchone()[0]
        cursor.close()
        return count
    except Exception as e:
        print_warning(f"Could not get row count for {table}: {e}")
        return 0

def truncate_table(conn, table):
    """Truncate a table"""
    try:
        cursor = conn.cursor()
        cursor.execute(f"TRUNCATE TABLE {table} CASCADE;")
        conn.commit()
        cursor.close()
        return True
    except Exception as e:
        print_error(f"Failed to truncate {table}: {e}")
        conn.rollback()
        return False

def import_sql_file(conn, table, sql_file):
    """Import SQL file into database"""
    try:
        # Read SQL file
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()

        # Split by semicolon to execute one statement at a time
        statements = [s.strip() for s in sql_content.split(';') if s.strip()]

        cursor = conn.cursor()
        success_count = 0
        error_count = 0

        for statement in statements:
            if statement:
                try:
                    cursor.execute(statement)
                    success_count += 1
                except Exception as e:
                    error_count += 1
                    if error_count <= 3:  # Only show first 3 errors
                        print_warning(f"    SQL error: {str(e)[:100]}")

        conn.commit()
        cursor.close()

        if error_count > 0:
            print_warning(f"    {error_count} statements had errors (might be expected for duplicates)")

        return success_count > 0

    except Exception as e:
        print_error(f"Failed to import {sql_file}: {e}")
        conn.rollback()
        return False

def main():
    print_header("PostgreSQL Direct Import Tool")

    # Check for --force flag
    force_clear = '--force' in sys.argv or '-f' in sys.argv

    if force_clear:
        print_warning("Force mode: Will automatically clear existing data")
        print()

    # Test connection
    print_info("Testing database connection...")
    conn = connect_db()
    print_success("Database connection successful")
    print()

    print_header("STEP 1: Importing Data to PostgreSQL")

    for table in TABLES:
        table = table.strip()
        sql_file = os.path.join(EXPORT_DIR, f"{table}.sql")

        if not os.path.exists(sql_file):
            print_warning(f"Export file not found for {table}, skipping")
            continue

        print_info(f"Processing table: {table}")

        # Get current row count
        current_count = get_row_count(conn, table)
        print(f"  Current rows in target: {current_count}")

        # Clear existing data
        if current_count > 0:
            print_warning(f"  Table {table} already has {current_count} rows")
            if force_clear:
                print_info("  Clearing existing data (force mode)...")
                if not truncate_table(conn, table):
                    print_error(f"  Skipping import for {table}")
                    continue
            else:
                try:
                    response = input(f"  Clear existing data before import? (y/n) [y]: ").strip().lower()
                    if response == '' or response == 'y':
                        print_info("  Clearing existing data...")
                        if not truncate_table(conn, table):
                            print_error(f"  Skipping import for {table}")
                            continue
                    else:
                        print_info("  Keeping existing data, appending new data...")
                except (EOFError, KeyboardInterrupt):
                    print()
                    print_info("  Non-interactive mode detected, clearing data by default...")
                    if not truncate_table(conn, table):
                        print_error(f"  Skipping import for {table}")
                        continue

        # Import data
        print_info(f"  Importing data from {table}.sql...")
        if import_sql_file(conn, table, sql_file):
            # Get new row count
            new_count = get_row_count(conn, table)
            print_success("  Import successful")
            print(f"  New row count: {new_count}")
        else:
            print_error("  Import failed")

        print()

    # Close connection
    conn.close()

    print_header("STEP 2: Verifying Data")

    # Reconnect for verification
    conn = connect_db()

    print()
    print(f"{'TABLE':<20} | {'TARGET ROWS':>15} | {'STATUS':>10}")
    print("-" * 55)

    for table in TABLES:
        table = table.strip()
        count = get_row_count(conn, table)
        status = f"{Colors.GREEN}OK{Colors.NC}" if count > 0 else f"{Colors.RED}EMPTY{Colors.NC}"
        print(f"{table:<20} | {count:>15} | ", end='')
        print(status)

    conn.close()

    print()
    print_header("Import Complete!")

    print("Next steps:")
    print("1. Verify row counts match expected values")
    print("2. Test your application")
    print("3. Check for any errors in the import")
    print()
    print("Expected row counts:")
    print("  users:         5")
    print("  daily_rates:   256")
    print("  sales_log:     674")
    print("  expense_log:   893")
    print("  activity_log:  1000")
    print()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        print_warning("Import interrupted by user")
        sys.exit(1)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
