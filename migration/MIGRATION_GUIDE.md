# Karat Tracker 2.0 - Database Migration Tools

## Overview

This directory contains Python scripts to migrate data from Supabase to PostgreSQL production database. The migration process uses the Supabase REST API to export data and PostgreSQL commands to import it.

## Files

- **`migrate-api.py`** - Main migration script with pagination support
- **`verify-data.py`** - Standalone verification tool
- **`config.env`** - Configuration file (copy from config.env.example)
- **`config.env.example`** - Example configuration template
- **`exports/`** - Directory where export files are saved

## Features

✅ **Pagination Support** - Handles tables with >1000 rows automatically
✅ **Progress Tracking** - Shows real-time progress for large tables
✅ **Error Handling** - Continues on errors, reports all issues
✅ **Row Count Verification** - Compares source and target counts
✅ **Batch Processing** - Fetches data in 1000-row batches
✅ **Timestamped Backups** - Each export saved with timestamp

## Quick Start

```bash
# 1. Configure
cp migration/config.env.example migration/config.env
# Edit config.env with your credentials

# 2. Run full migration
python migration/migrate-api.py full
```

## Commands

```bash
python migration/migrate-api.py export   # Export from Supabase
python migration/migrate-api.py import   # Import to PostgreSQL
python migration/migrate-api.py verify   # Verify row counts
python migration/migrate-api.py full     # All three steps
```

## Pagination

The script automatically handles large tables:

```
activity_log (2329 rows):
  Batch 1: rows 0-999
  Batch 2: rows 1000-1999
  Batch 3: rows 2000-2328
```

For complete documentation, see database/README.md
