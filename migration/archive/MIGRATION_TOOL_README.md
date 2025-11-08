# Database Migration Tool

A packaged, reusable tool to migrate data between PostgreSQL databases (including Supabase).

## Features

- ✅ Configuration-based (no code changes needed)
- ✅ Interactive menu or command-line usage
- ✅ Automatic connection testing
- ✅ Data export from source database
- ✅ Data import to target database
- ✅ Automatic verification with row count comparison
- ✅ Backup before import (optional)
- ✅ Colored output for better readability
- ✅ Error handling and validation

---

## Quick Start

### 1. Setup Configuration

```bash
# Copy the example config file
cp migration/config.env.example migration/config.env

# Edit the config file with your database credentials
nano migration/config.env
# or
vim migration/config.env
```

### 2. Fill in Your Database Credentials

Edit `migration/config.env` with your actual credentials:

```bash
# SOURCE DATABASE (where to export from)
SOURCE_PROJECT_ID="tzuvlpubvimhugobtrsi"
SOURCE_HOST="db.tzuvlpubvimhugobtrsi.supabase.co"
SOURCE_PASSWORD="YOUR_SUPABASE_PASSWORD"

# TARGET DATABASE (where to import to)
TARGET_HOST="69.62.84.73"
TARGET_DB_NAME="karat_tracker_p"
TARGET_PASSWORD="YOUR_POSTGRESQL_PASSWORD"
```

### 3. Make the Script Executable

```bash
chmod +x migration/migrate.sh
```

### 4. Run the Migration

**Option A: Interactive Menu**
```bash
./migration/migrate.sh
```

**Option B: Command Line (Automated)**
```bash
# Full migration (export + import + verify)
./migration/migrate.sh full

# Or run steps individually
./migration/migrate.sh test     # Test connections
./migration/migrate.sh export   # Export data
./migration/migrate.sh import   # Import data
./migration/migrate.sh verify   # Verify data
./migration/migrate.sh summary  # Show summary
```

---

## Configuration File

The `config.env` file contains all the settings:

```bash
# SOURCE DATABASE (Supabase Production)
SOURCE_PROJECT_ID="tzuvlpubvimhugobtrsi"
SOURCE_HOST="db.tzuvlpubvimhugobtrsi.supabase.co"
SOURCE_PORT="5432"
SOURCE_DB_NAME="postgres"
SOURCE_USER="postgres"
SOURCE_PASSWORD="YOUR_PASSWORD"

# TARGET DATABASE (PostgreSQL Production)
TARGET_HOST="69.62.84.73"
TARGET_PORT="5432"
TARGET_DB_NAME="karat_tracker_p"
TARGET_USER="postgres"
TARGET_PASSWORD="YOUR_PASSWORD"

# MIGRATION SETTINGS
TABLES="users,daily_rates,sales_log,expense_log,activity_log"
BACKUP_BEFORE_IMPORT="yes"
EXPORT_DIR="migration/exports"
```

---

## Usage Examples

### Example 1: Full Automated Migration

```bash
# Setup config
cp migration/config.env.example migration/config.env
nano migration/config.env  # Fill in credentials

# Run full migration
chmod +x migration/migrate.sh
./migration/migrate.sh full
```

**Output:**
```
==========================================
Full Migration Process
==========================================

ℹ Loading configuration from migration/config.env
✓ Configuration loaded

ℹ Testing connection to SOURCE database...
✓ SOURCE database connection successful

ℹ Testing connection to TARGET database...
✓ TARGET database connection successful

==========================================
STEP 1: Exporting Data from Source Database
==========================================

ℹ Export directory: migration/exports/export_20250107_143022

ℹ Exporting table: users
  Rows: 5
✓ Exported: users.sql

ℹ Exporting table: daily_rates
  Rows: 150
✓ Exported: daily_rates.sql

...

==========================================
STEP 2: Importing Data to Target Database
==========================================

ℹ Using export from: migration/exports/export_20250107_143022

ℹ Creating backup of target database...
✓ Backup created: target_backup_before_import.sql

ℹ Importing table: users
  Current rows in target: 0
✓ Imported successfully
  New row count: 5

...

==========================================
STEP 3: Verifying Data Migration
==========================================

TABLE                |   SOURCE ROWS   |   TARGET ROWS   |   STATUS
--------------------------------------------------------------------------------
users                |               5 |               5 | ✓ MATCH
daily_rates          |             150 |             150 | ✓ MATCH
sales_log            |             823 |             823 | ✓ MATCH
expense_log          |             142 |             142 | ✓ MATCH
activity_log         |            2103 |            2103 | ✓ MATCH

✓ All table row counts match!

==========================================
Migration Summary
==========================================

Source Database:
  Host: db.tzuvlpubvimhugobtrsi.supabase.co
  Database: postgres

Target Database:
  Host: 69.62.84.73
  Database: karat_tracker_p

Export Location: migration/exports/export_20250107_143022

Total Rows:
  Source: 3223
  Target: 3223
```

### Example 2: Interactive Menu

```bash
./migration/migrate.sh
```

**Output:**
```
==========================================
Database Migration Tool
==========================================

1. Test Connections
2. Export Data from Source
3. Import Data to Target
4. Verify Data
5. Full Migration (Export + Import + Verify)
6. Show Summary
7. Exit

Select option: _
```

### Example 3: Step-by-Step Manual Migration

```bash
# Step 1: Test connections first
./migration/migrate.sh test

# Step 2: Export data
./migration/migrate.sh export

# Step 3: Review exported files
ls -lh migration/exports/export_*/

# Step 4: Import data
./migration/migrate.sh import

# Step 5: Verify
./migration/migrate.sh verify

# Step 6: Show summary
./migration/migrate.sh summary
```

---

## Command Reference

| Command | Description |
|---------|-------------|
| `./migration/migrate.sh` | Interactive menu mode |
| `./migration/migrate.sh test` | Test source and target connections |
| `./migration/migrate.sh export` | Export data from source database |
| `./migration/migrate.sh import` | Import data to target database |
| `./migration/migrate.sh verify` | Verify row counts match |
| `./migration/migrate.sh full` | Full migration (all steps) |
| `./migration/migrate.sh summary` | Show migration summary |

---

## File Structure

```
migration/
├── migrate.sh                    # Main migration script
├── config.env.example            # Configuration template
├── config.env                    # Your actual config (git-ignored)
├── MIGRATION_TOOL_README.md      # This file
├── .last_export                  # Tracks last export location
└── exports/                      # Export directory
    └── export_YYYYMMDD_HHMMSS/   # Timestamped exports
        ├── users.sql
        ├── daily_rates.sql
        ├── sales_log.sql
        ├── expense_log.sql
        ├── activity_log.sql
        ├── all_tables.sql        # Combined export
        └── target_backup_before_import.sql  # Backup
```

---

## Safety Features

### 1. Connection Testing
- Tests both source and target connections before any operations
- Fails fast if connection issues detected

### 2. Automatic Backup
- Creates backup of target database before import
- Stored in the same export directory
- Can be restored if needed

### 3. Data Verification
- Compares row counts between source and target
- Highlights mismatches for investigation
- Shows detailed table-by-table comparison

### 4. Export History
- All exports are timestamped
- Multiple exports can coexist
- Easy to rollback to previous export

### 5. Dry-Run Capability
- Export first, review, then import later
- No automatic destructive operations

---

## Restoring from Backup

If you need to restore the target database to its state before import:

```bash
# Find the backup file
ls -lh migration/exports/export_*/target_backup_before_import.sql

# Restore it
PGPASSWORD="YOUR_PASSWORD" psql \
  -h 69.62.84.73 \
  -U postgres \
  -d karat_tracker_p \
  -f migration/exports/export_YYYYMMDD_HHMMSS/target_backup_before_import.sql
```

---

## Troubleshooting

### Issue: "Configuration file not found"

**Solution:**
```bash
cp migration/config.env.example migration/config.env
nano migration/config.env
```

### Issue: "SOURCE database connection failed"

**Solutions:**
1. Check `SOURCE_HOST` is correct
2. Verify `SOURCE_PASSWORD` is correct
3. Check firewall allows connection to source
4. For Supabase, verify database is not paused

### Issue: "TARGET database connection failed"

**Solutions:**
1. Check `TARGET_HOST` is correct (IP or hostname)
2. Verify `TARGET_PASSWORD` is correct
3. Check PostgreSQL is running: `systemctl status postgresql`
4. Verify firewall allows connection: `telnet 69.62.84.73 5432`

### Issue: "Row counts don't match"

**Investigation steps:**
```bash
# Check source row counts
PGPASSWORD="pwd" psql -h source_host -U postgres -d postgres \
  -c "SELECT COUNT(*) FROM users;"

# Check target row counts
PGPASSWORD="pwd" psql -h target_host -U postgres -d karat_tracker_p \
  -c "SELECT COUNT(*) FROM users;"

# Check for import errors in export directory
cat migration/exports/export_*/import_errors.log
```

### Issue: "Permission denied" when running script

**Solution:**
```bash
chmod +x migration/migrate.sh
```

### Issue: Special characters in password

**Solution:**
Passwords with special characters should be entered as-is in config.env. The script handles escaping automatically.

---

## Advanced Configuration

### Migrate Only Specific Tables

Edit `config.env`:
```bash
# Migrate only users and sales_log
TABLES="users,sales_log"
```

### Skip Backup Before Import

Edit `config.env`:
```bash
BACKUP_BEFORE_IMPORT="no"
```

### Custom Export Directory

Edit `config.env`:
```bash
EXPORT_DIR="/path/to/custom/exports"
```

---

## Reusing for Future Migrations

This tool is designed to be reusable:

### Scenario 1: Migrate from Different Supabase Project

1. Edit `config.env`
2. Change `SOURCE_PROJECT_ID` and `SOURCE_PASSWORD`
3. Run: `./migration/migrate.sh full`

### Scenario 2: Migrate to Different Target Database

1. Edit `config.env`
2. Change `TARGET_HOST`, `TARGET_DB_NAME`, `TARGET_PASSWORD`
3. Run: `./migration/migrate.sh full`

### Scenario 3: Migrate Between Two PostgreSQL Databases

1. Edit `config.env`
2. Change `SOURCE_TYPE="postgresql"`
3. Update `SOURCE_HOST` to your PostgreSQL host
4. Run: `./migration/migrate.sh full`

---

## Security Best Practices

1. **Never commit config.env to git** (it's already in .gitignore)
2. **Use strong passwords** for both source and target
3. **Review exports** before importing to production
4. **Keep backups** of export directories
5. **Secure the config file**:
   ```bash
   chmod 600 migration/config.env
   ```

---

## Production Checklist

Before running in production:

- [ ] Configuration file created and filled
- [ ] Source connection tested successfully
- [ ] Target connection tested successfully
- [ ] Target database schema already exists
- [ ] Backup of target database created (automated by tool)
- [ ] Schedule migration during low-traffic period
- [ ] Plan for 15-30 minute downtime
- [ ] Have rollback plan ready
- [ ] Test with staging environment first (if available)
- [ ] Monitor application after migration
- [ ] Keep old database as read-only backup for 7-14 days

---

## Support

For issues or questions:
1. Check this README
2. Review [PRODUCTION_SETUP_GUIDE.md](../PRODUCTION_SETUP_GUIDE.md)
3. Check [MIGRATION_MASTER_PLAN.md](MIGRATION_MASTER_PLAN.md)
4. Review export logs in `migration/exports/`

---

## Example: Complete Migration Workflow

```bash
# Day 1: Preparation
cp migration/config.env.example migration/config.env
nano migration/config.env  # Fill in credentials
chmod +x migration/migrate.sh
./migration/migrate.sh test  # Verify connections

# Day 2: Test Run
./migration/migrate.sh export  # Export data
./migration/migrate.sh verify  # Check row counts
# Review exported files

# Day 3: Production Migration (Low-traffic period)
./migration/migrate.sh full  # Full migration

# Verify application works with new database
# Test critical user flows
# Monitor for 24-48 hours

# Day 4: Cleanup (Optional)
# Keep old Supabase as read-only backup for 7-14 days
# Remove after confirming everything works
```

---

**Ready to migrate? Start with:**
```bash
cp migration/config.env.example migration/config.env
nano migration/config.env
chmod +x migration/migrate.sh
./migration/migrate.sh full
```
