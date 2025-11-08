# Quick Start: Migrate Supabase Production to PostgreSQL Production

## Your Current Setup

**Source (Supabase Production):**
- Project ID: `tzuvlpubvimhugobtrsi`
- Host: `db.tzuvlpubvimhugobtrsi.supabase.co`
- Database: `postgres`
- User: `postgres`
- Password: `[You need to provide this]`

**Target (PostgreSQL Production - Coolify):**
- Host: `69.62.84.73`
- Database: `karat_tracker_p`
- User: `postgres`
- Password: `G8umzPMoCWIQDoTKGAy4hXdDE1GS0XafmAt4SJ57YjnwDnaXON9QDr17RrjoktL3`
- Port: `5432`

---

## 3-Step Migration Process

### Step 1: Setup Configuration (2 minutes)

```bash
# Navigate to project
cd "c:\Users\NANDHU\Documents\SocialEagle\Digital Clients\Ameer Jwellery\KARAT-TRACKER-2.0"

# Copy config template
cp migration/config.env.example migration/config.env

# Edit config file (use your preferred editor)
notepad migration/config.env
# or
nano migration/config.env
# or
vim migration/config.env
```

**In the config file, you only need to change ONE line:**

Find this line:
```bash
SOURCE_PASSWORD="YOUR_SUPABASE_PASSWORD_HERE"
```

Replace with your actual Supabase production database password:
```bash
SOURCE_PASSWORD="your_actual_supabase_password"
```

All other values are already pre-filled for you!

Save and close the file.

### Step 2: Make Script Executable (10 seconds)

```bash
chmod +x migration/migrate.sh
```

### Step 3: Run Migration (5-15 minutes depending on data size)

```bash
./migration/migrate.sh full
```

That's it! The tool will:
1. ✅ Test connections to both databases
2. ✅ Export all data from Supabase
3. ✅ Create backup of target database
4. ✅ Import data to PostgreSQL production
5. ✅ Verify row counts match
6. ✅ Show summary

---

## What You'll See

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

ℹ Exporting table: sales_log
  Rows: 823
✓ Exported: sales_log.sql

ℹ Exporting table: expense_log
  Rows: 142
✓ Exported: expense_log.sql

ℹ Exporting table: activity_log
  Rows: 2103
✓ Exported: activity_log.sql

ℹ Creating combined export file...
✓ Combined file: all_tables.sql

==========================================
STEP 2: Importing Data to Target Database
==========================================

ℹ Using export from: migration/exports/export_20250107_143022

ℹ Creating backup of target database...
✓ Backup created: target_backup_before_import.sql

ℹ Importing table: users
  Current rows in target: 0
ℹ Clearing existing data...
ℹ Importing data...
✓ Imported successfully
  New row count: 5

... (similar for all tables)

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

---

## Pre-Flight Checklist

Before running the migration:

- [ ] You have your Supabase production database password
- [ ] Target database `karat_tracker_p` already has schema installed
- [ ] Application is ready to use the new database
- [ ] You've scheduled this during low-traffic period (optional)
- [ ] You have a way to rollback if needed

---

## If Something Goes Wrong

### Connection Failed?

**Test source connection:**
```bash
./migration/migrate.sh test
```

Check:
- Is the password correct?
- Is Supabase database running (not paused)?
- Can you access Supabase from this machine?

**Test target connection:**
```bash
./migration/migrate.sh test
```

Check:
- Is PostgreSQL running on 69.62.84.73?
- Is the password correct?
- Can you ping the server?

### Want to Test First?

Run steps individually:

```bash
# 1. Just test connections
./migration/migrate.sh test

# 2. Export only (no changes to target)
./migration/migrate.sh export

# 3. Review the exported files
ls -lh migration/exports/export_*/

# 4. When ready, import
./migration/migrate.sh import

# 5. Verify
./migration/migrate.sh verify
```

### Need to Rollback?

Restore from the automatic backup:

```bash
# Find the backup
ls -lh migration/exports/export_*/target_backup_before_import.sql

# Restore it
PGPASSWORD="G8umzPMoCWIQDoTKGAy4hXdDE1GS0XafmAt4SJ57YjnwDnaXON9QDr17RrjoktL3" psql \
  -h 69.62.84.73 \
  -U postgres \
  -d karat_tracker_p \
  -f migration/exports/export_YYYYMMDD_HHMMSS/target_backup_before_import.sql
```

---

## After Migration

1. **Test your application** - Verify it works with the new database
2. **Check critical flows** - Login, create sale, add expense, etc.
3. **Monitor for 24-48 hours** - Watch for any issues
4. **Keep Supabase as backup** - Don't delete for 7-14 days
5. **Update environment variables** - Point production to new database

---

## Alternative: Interactive Menu

If you prefer a menu-driven approach:

```bash
./migration/migrate.sh
```

You'll see:
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

Just select option `5` for full migration!

---

## Need Help?

- Full documentation: [MIGRATION_TOOL_README.md](MIGRATION_TOOL_README.md)
- Production setup guide: [../PRODUCTION_SETUP_GUIDE.md](../PRODUCTION_SETUP_GUIDE.md)
- Check export logs: `migration/exports/export_*/`

---

## Ready? Let's Go!

```bash
# 1. Setup config
cp migration/config.env.example migration/config.env
nano migration/config.env  # Add your Supabase password

# 2. Make executable
chmod +x migration/migrate.sh

# 3. Run migration
./migration/migrate.sh full
```

**Estimated time: 5-15 minutes**

Good luck! 🚀
