#!/usr/bin/env python3
"""
Database Migration Tool (API Version)
Exports data from Supabase using REST API and imports to PostgreSQL
"""

import os
import json
import subprocess
import sys
from datetime import datetime
import urllib.request
import urllib.error

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

try:
    with open(config_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                # Remove quotes if present
                value = value.strip().strip('"').strip("'")
                config[key] = value
except FileNotFoundError:
    print_error(f"Configuration file not found: {config_file}")
    sys.exit(1)

# Supabase configuration
SUPABASE_URL = f"https://{config['SOURCE_PROJECT_ID']}.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dXZscHVidmltaHVnb2J0cnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5OTUzMjEsImV4cCI6MjA3MjU3MTMyMX0.e6g0I9wTeHqAokRWPqkw0GhkXwjO2BNMzZeDUVi9XEw"

# Target PostgreSQL configuration
TARGET_HOST = config['TARGET_HOST']
TARGET_PORT = config['TARGET_PORT']
TARGET_DB = config['TARGET_DB_NAME']
TARGET_USER = config['TARGET_USER']
TARGET_PASSWORD = config['TARGET_PASSWORD']

# Tables to migrate
TABLES = config['TABLES'].split(',')

def fetch_supabase_data(table_name):
    """Fetch all data from a Supabase table using REST API with pagination"""
    print_info(f"Fetching data from {table_name}...")

    # First, get the total count
    count_url = f"{SUPABASE_URL}/rest/v1/{table_name}?select=count"
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Prefer': 'count=exact'
    }

    try:
        req = urllib.request.Request(count_url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as response:
            count_data = json.loads(response.read().decode('utf-8'))
            total_count = count_data[0]['count'] if count_data else 0
            print_info(f"  Total rows in {table_name}: {total_count}")
    except Exception as e:
        print_warning(f"  Could not get row count, will fetch with pagination: {str(e)}")
        total_count = None

    # Fetch data in batches of 1000 (Supabase default limit)
    all_data = []
    batch_size = 1000
    offset = 0

    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}'
    }

    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table_name}?select=*&limit={batch_size}&offset={offset}"

        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode('utf-8'))

                if not data:
                    break

                all_data.extend(data)
                print_info(f"  Fetched {len(data)} rows (offset: {offset})")

                if len(data) < batch_size:
                    break

                offset += batch_size

        except urllib.error.HTTPError as e:
            print_error(f"  HTTP Error {e.code}: {e.reason}")
            break
        except Exception as e:
            print_error(f"  Failed to fetch data: {str(e)}")
            break

    print_success(f"  Total fetched: {len(all_data)} rows from {table_name}")
    return all_data

def generate_insert_sql(table_name, data):
    """Generate INSERT SQL statements from JSON data"""
    if not data:
        return ""

    # Get column names from first row
    columns = list(data[0].keys())

    sql_statements = []

    for row in data:
        values = []
        for col in columns:
            value = row[col]
            if value is None:
                values.append('NULL')
            elif isinstance(value, bool):
                values.append('TRUE' if value else 'FALSE')
            elif isinstance(value, (int, float)):
                values.append(str(value))
            elif isinstance(value, dict):
                # Handle JSONB columns
                values.append(f"'{json.dumps(value)}'::jsonb")
            else:
                # Escape single quotes in strings
                escaped_value = str(value).replace("'", "''")
                values.append(f"'{escaped_value}'")

        columns_str = ', '.join(f'"{col}"' for col in columns)
        values_str = ', '.join(values)

        sql_statements.append(f"INSERT INTO {table_name} ({columns_str}) VALUES ({values_str});")

    return '\n'.join(sql_statements)

def export_data():
    """Export data from Supabase"""
    print_header("STEP 1: Exporting Data from Supabase")

    # Create export directory
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    export_dir = f"migration/exports/export_{timestamp}"
    os.makedirs(export_dir, exist_ok=True)

    print_info(f"Export directory: {export_dir}")
    print()

    # Export each table
    all_sql = []

    for table in TABLES:
        print_info(f"Processing table: {table}")

        # Fetch data from Supabase
        data = fetch_supabase_data(table)

        if data:
            # Generate SQL
            sql = generate_insert_sql(table, data)

            # Save to individual file
            table_file = f"{export_dir}/{table}.sql"
            with open(table_file, 'w', encoding='utf-8') as f:
                f.write(sql)

            print_success(f"  Exported to {table}.sql")
            all_sql.append(sql)
        else:
            print_warning(f"  No data to export for {table}")

        print()

    # Create combined file
    combined_file = f"{export_dir}/all_tables.sql"
    with open(combined_file, 'w', encoding='utf-8') as f:
        f.write('\n\n'.join(all_sql))

    print_success(f"Combined file created: all_tables.sql")

    # Save export path
    with open('migration/.last_export', 'w') as f:
        f.write(export_dir)

    return export_dir

def import_data(export_dir):
    """Import data to PostgreSQL"""
    print_header("STEP 2: Importing Data to Target Database")

    print_info(f"Using export from: {export_dir}")
    print()

    # Set PostgreSQL password environment variable
    env = os.environ.copy()
    env['PGPASSWORD'] = TARGET_PASSWORD

    for table in TABLES:
        table_file = f"{export_dir}/{table}.sql"

        if not os.path.exists(table_file):
            print_warning(f"Export file not found for {table}, skipping")
            continue

        print_info(f"Importing table: {table}")

        # Get current row count
        try:
            result = subprocess.run(
                ['psql', '-h', TARGET_HOST, '-p', TARGET_PORT, '-U', TARGET_USER, '-d', TARGET_DB,
                 '-t', '-c', f'SELECT COUNT(*) FROM {table};'],
                env=env,
                capture_output=True,
                text=True
            )
            current_count = result.stdout.strip() if result.returncode == 0 else "Unknown"
            print(f"  Current rows in target: {current_count}")
        except Exception as e:
            print_warning(f"  Could not get current row count: {e}")

        # Clear existing data
        print_info("  Clearing existing data...")
        try:
            subprocess.run(
                ['psql', '-h', TARGET_HOST, '-p', TARGET_PORT, '-U', TARGET_USER, '-d', TARGET_DB,
                 '-c', f'TRUNCATE TABLE {table} CASCADE;'],
                env=env,
                check=True,
                capture_output=True
            )
        except Exception as e:
            print_error(f"  Failed to truncate table: {e}")
            continue

        # Import data
        print_info("  Importing data...")
        try:
            with open(table_file, 'r', encoding='utf-8') as f:
                subprocess.run(
                    ['psql', '-h', TARGET_HOST, '-p', TARGET_PORT, '-U', TARGET_USER, '-d', TARGET_DB],
                    env=env,
                    stdin=f,
                    check=True,
                    capture_output=True
                )

            # Get new row count
            result = subprocess.run(
                ['psql', '-h', TARGET_HOST, '-p', TARGET_PORT, '-U', TARGET_USER, '-d', TARGET_DB,
                 '-t', '-c', f'SELECT COUNT(*) FROM {table};'],
                env=env,
                capture_output=True,
                text=True
            )
            new_count = result.stdout.strip() if result.returncode == 0 else "Unknown"

            print_success("  Imported successfully")
            print(f"  New row count: {new_count}")
        except Exception as e:
            print_error(f"  Failed to import: {e}")

        print()

def verify_data():
    """Verify data migration by comparing row counts"""
    print_header("STEP 3: Verifying Data Migration")

    print()
    print(f"{'TABLE':<20} | {'SOURCE ROWS':>15} | {'TARGET ROWS':>15} | {'STATUS':>10}")
    print("-" * 80)

    all_match = True

    env = os.environ.copy()
    env['PGPASSWORD'] = TARGET_PASSWORD

    for table in TABLES:
        # Get source count from Supabase
        try:
            data = fetch_supabase_data(table)
            source_count = len(data) if data else 0
        except:
            source_count = "N/A"

        # Get target count from PostgreSQL
        try:
            result = subprocess.run(
                ['psql', '-h', TARGET_HOST, '-p', TARGET_PORT, '-U', TARGET_USER, '-d', TARGET_DB,
                 '-t', '-c', f'SELECT COUNT(*) FROM {table};'],
                env=env,
                capture_output=True,
                text=True
            )
            target_count = result.stdout.strip() if result.returncode == 0 else "0"
        except:
            target_count = "0"

        # Compare
        if str(source_count) == str(target_count):
            status = f"{Colors.GREEN}MATCH{Colors.NC}"
        else:
            status = f"{Colors.RED}MISMATCH{Colors.NC}"
            all_match = False

        print(f"{table:<20} | {str(source_count):>15} | {str(target_count):>15} | ", end='')
        print(status)

    print()

    if all_match:
        print_success("All table row counts match!")
    else:
        print_warning("Some table row counts don't match. Please investigate.")

def main():
    if len(sys.argv) < 2:
        print("Usage: python migrate-api.py {export|import|verify|full}")
        sys.exit(1)

    command = sys.argv[1]

    if command == "export":
        export_data()

    elif command == "import":
        if os.path.exists('migration/.last_export'):
            with open('migration/.last_export', 'r') as f:
                export_dir = f.read().strip()
            import_data(export_dir)
        else:
            print_error("No export found. Please run export first.")

    elif command == "verify":
        verify_data()

    elif command == "full":
        print_header("Full Migration Process")
        export_dir = export_data()
        import_data(export_dir)
        verify_data()

    else:
        print_error(f"Unknown command: {command}")
        print("Usage: python migrate-api.py {export|import|verify|full}")
        sys.exit(1)

if __name__ == "__main__":
    main()
