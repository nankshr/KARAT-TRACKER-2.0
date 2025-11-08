#!/usr/bin/env python3
"""
Quick Data Verification Tool
Checks row counts in both Supabase and PostgreSQL
"""

import os
import sys
import json
import urllib.request
import urllib.error
import psycopg2

# Colors
class Colors:
    BLUE = '\033[0;34m'
    GREEN = '\033[0;32m'
    RED = '\033[0;31m'
    YELLOW = '\033[1;33m'
    NC = '\033[0m'

def print_success(text):
    print(f"{Colors.GREEN}[OK] {text}{Colors.NC}")

def print_error(text):
    print(f"{Colors.RED}[ERROR] {text}{Colors.NC}")

def print_info(text):
    print(f"{Colors.BLUE}[INFO] {text}{Colors.NC}")

# Load config
config = {}
with open("migration/config.env", 'r') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            config[key] = value.strip().strip('"').strip("'")

# Supabase
SUPABASE_URL = f"https://{config['SOURCE_PROJECT_ID']}.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dXZscHVidmltaHVnb2J0cnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5OTUzMjEsImV4cCI6MjA3MjU3MTMyMX0.e6g0I9wTeHqAokRWPqkw0GhkXwjO2BNMzZeDUVi9XEw"

# PostgreSQL
TARGET_HOST = config['TARGET_HOST']
TARGET_PORT = config['TARGET_PORT']
TARGET_DB = config['TARGET_DB_NAME']
TARGET_USER = config['TARGET_USER']
TARGET_PASSWORD = config['TARGET_PASSWORD']

TABLES = config['TABLES'].split(',')

print("\n" + "="*70)
print("DATA VERIFICATION REPORT")
print("="*70 + "\n")

print(f"{'TABLE':<20} | {'SUPABASE':>15} | {'POSTGRESQL':>15} | {'STATUS':>12}")
print("-" * 70)

total_source = 0
total_target = 0
all_match = True

for table in TABLES:
    table = table.strip()

    # Get Supabase count
    try:
        url = f"{SUPABASE_URL}/rest/v1/{table}?select=*"
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}'
        }
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            source_count = len(data)
            total_source += source_count
    except:
        source_count = "ERROR"

    # Get PostgreSQL count
    try:
        conn = psycopg2.connect(
            host=TARGET_HOST,
            port=TARGET_PORT,
            database=TARGET_DB,
            user=TARGET_USER,
            password=TARGET_PASSWORD,
            connect_timeout=5
        )
        cursor = conn.cursor()
        cursor.execute(f"SELECT COUNT(*) FROM {table};")
        target_count = cursor.fetchone()[0]
        total_target += target_count
        cursor.close()
        conn.close()
    except Exception as e:
        target_count = "ERROR"

    # Status
    if source_count == target_count:
        status = f"{Colors.GREEN}MATCH{Colors.NC}"
    else:
        status = f"{Colors.RED}MISMATCH{Colors.NC}"
        all_match = False

    print(f"{table:<20} | {str(source_count):>15} | {str(target_count):>15} | ", end='')
    print(status)

print("-" * 70)
print(f"{'TOTAL':<20} | {total_source:>15} | {total_target:>15} |")
print("=" * 70)

if all_match:
    print_success("\nAll tables match! Migration successful!")
else:
    print_error("\nSome tables don't match. Check import logs.")

print()
