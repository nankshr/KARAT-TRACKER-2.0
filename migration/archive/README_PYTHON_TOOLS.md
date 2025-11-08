# Database Migration & Backup Tools (Python)

Simple Python-based tools for backing up and restoring your Karat Tracker database.

## 📦 What's Included

- **migrate-api.py** - Export data from Supabase (or any source)
- **import-to-postgres.py** - Import data to PostgreSQL
- **verify-data.py** - Quick verification of data integrity
- **config.env** - Your database credentials (keep secure!)

---

## 🚀 Quick Start

### 1. Setup (One-time only)

```bash
# Install required Python package
pip install psycopg2-binary

# Your config.env is already set up!
```

### 2. Export Data (Backup)

```bash
python migration/migrate-api.py export
```

**What it does:**
- Exports all data from Supabase using REST API
- Creates timestamped folder: `exports/export_YYYYMMDD_HHMMSS/`
- Generates individual SQL files for each table
- Creates combined `all_tables.sql` file

**Output example:**
```
[OK] Fetched 5 rows from users
[OK] Fetched 256 rows from daily_rates
[OK] Fetched 674 rows from sales_log
[OK] Fetched 893 rows from expense_log
[OK] Fetched 1000 rows from activity_log
[OK] Combined file created: all_tables.sql
```

### 3. Import Data (Restore)

```bash
# Import with prompts (asks before clearing data)
python migration/import-to-postgres.py

# OR force mode (automatically clears and imports)
python migration/import-to-postgres.py --force
```

**What it does:**
- Connects directly to PostgreSQL
- Clears existing data (with confirmation)
- Imports all tables from last export
- Shows progress and row counts

**Output example:**
```
[INFO] Processing table: users
  Current rows in target: 5
  Clear existing data before import? (y/n) [y]: y
[INFO] Clearing existing data...
[INFO] Importing data from users.sql...
[OK] Import successful
  New row count: 5
```

### 4. Verify Data

```bash
python migration/verify-data.py
```

**What it does:**
- Checks row counts in both Supabase and PostgreSQL
- Shows side-by-side comparison
- Highlights mismatches

**Output example:**
```
TABLE                |        SUPABASE |      POSTGRESQL |       STATUS
----------------------------------------------------------------------
users                |               5 |               5 | MATCH
daily_rates          |             256 |             256 | MATCH
sales_log            |             674 |             674 | MATCH
expense_log          |             893 |             893 | MATCH
activity_log         |            1000 |            1000 | MATCH
----------------------------------------------------------------------
TOTAL                |            2828 |            2828 |
[OK] All tables match! Migration successful!
```

---

## 📋 Common Use Cases

### Scenario 1: Daily Backup

```bash
# Create a backup
python migration/migrate-api.py export

# Backups are automatically saved to:
# migration/exports/export_YYYYMMDD_HHMMSS/
```

### Scenario 2: Restore from Backup

```bash
# The tool automatically uses the last export
python migration/import-to-postgres.py --force
```

### Scenario 3: Migrate to New Database

1. Edit `migration/config.env`
2. Update `TARGET_HOST`, `TARGET_DB_NAME`, `TARGET_PASSWORD`
3. Run: `python migration/import-to-postgres.py --force`

### Scenario 4: Clone Production to Test

1. Edit `migration/config.env`
2. Change `TARGET_DB_NAME` to your test database
3. Run: `python migration/import-to-postgres.py --force`

---

## ⚙️ Configuration

All settings are in `migration/config.env`:

```bash
# SOURCE (Supabase Production)
SOURCE_PROJECT_ID="tzuvlpubvimhugobtrsi"
SOURCE_HOST="db.tzuvlpubvimhugobtrsi.supabase.co"
SOURCE_PASSWORD="your_password"

# TARGET (PostgreSQL Production)
TARGET_HOST="69.62.84.73"
TARGET_DB_NAME="karat_tracker_p"
TARGET_PASSWORD="your_password"

# TABLES TO MIGRATE
TABLES="users,daily_rates,sales_log,expense_log,activity_log"
```

To migrate different tables, just edit the `TABLES` line.

---

## 🔐 Security

- ✅ `config.env` is in `.gitignore` (won't be committed)
- ✅ `exports/` folder is in `.gitignore` (won't be committed)
- ⚠️ Keep `config.env` secure - it contains passwords
- ⚠️ Don't share export files - they contain production data

---

## 🛠️ Troubleshooting

### "Failed to connect to database"

**Check:**
1. Is PostgreSQL running?
2. Is the host/IP correct?
3. Is the password correct?
4. Can you reach the server? (firewall/network)

**Test connection:**
```python
python -c "import psycopg2; psycopg2.connect(host='69.62.84.73', port='5432', database='karat_tracker_p', user='postgres', password='YOUR_PASSWORD')"
```

### "No export found"

**Run export first:**
```bash
python migration/migrate-api.py export
```

### "Table already has data"

**Two options:**
1. Use `--force` flag to automatically clear: `python migration/import-to-postgres.py --force`
2. Or answer `y` when prompted

### "Row counts don't match"

**Possible reasons:**
- Import still in progress (wait and verify again)
- Import error occurred (check error messages)
- Data changed in source during migration

**Fix:**
```bash
# Re-run import
python migration/import-to-postgres.py --force

# Then verify
python migration/verify-data.py
```

---

## 📊 Tables Migrated

| Table | Description | Typical Rows |
|-------|-------------|--------------|
| users | User accounts | 5-10 |
| daily_rates | Gold/silver prices | 200-300 |
| sales_log | All sales transactions | 500-1000+ |
| expense_log | All expenses | 500-1000+ |
| activity_log | Audit trail | 1000+ |

---

## 🎯 Best Practices

### For Backups:
1. **Schedule regular backups** (daily or weekly)
2. **Keep multiple backups** (don't delete old exports)
3. **Test restores occasionally** to ensure backups work
4. **Store backups off-site** (cloud storage, external drive)

### For Migrations:
1. **Always verify** after migration using `verify-data.py`
2. **Test on staging** before production (if available)
3. **Keep old database** for 7-14 days as backup
4. **Document changes** (when, what, why)

### For Production:
1. **Schedule during low-traffic** periods
2. **Announce maintenance** window to users
3. **Monitor after migration** for 24-48 hours
4. **Have rollback plan** ready

---

## 📁 File Structure

```
migration/
├── migrate-api.py              # Export from Supabase
├── import-to-postgres.py       # Import to PostgreSQL
├── verify-data.py              # Verify data integrity
├── config.env                  # Your credentials (git-ignored)
├── config.env.example          # Template for reference
├── README_PYTHON_TOOLS.md      # This file
└── exports/                    # Backups (git-ignored)
    ├── export_20251107_212721/
    │   ├── users.sql
    │   ├── daily_rates.sql
    │   ├── sales_log.sql
    │   ├── expense_log.sql
    │   ├── activity_log.sql
    │   └── all_tables.sql
    └── export_YYYYMMDD_HHMMSS/
        └── ...
```

---

## 🔄 Complete Workflow Example

```bash
# 1. Create backup of current production data
python migration/migrate-api.py export
# ✓ Exported to: migration/exports/export_20251107_212721/

# 2. Verify export completed successfully
ls -lh migration/exports/export_20251107_212721/
# ✓ All SQL files present

# 3. Import to production PostgreSQL
python migration/import-to-postgres.py --force
# ✓ users: 5 rows imported
# ✓ daily_rates: 256 rows imported
# ✓ sales_log: 674 rows imported
# ✓ expense_log: 893 rows imported
# ✓ activity_log: 1000 rows imported

# 4. Verify everything matches
python migration/verify-data.py
# ✓ All tables match! Migration successful!

# 5. Test application
# - Login
# - View data
# - Test critical features

# 6. Monitor for issues
# - Watch for errors
# - Check user reports
# - Monitor for 24-48 hours
```

---

## 💡 Tips

- **Exports are fast** (< 1 minute) - uses Supabase REST API
- **Imports vary** (1-5 minutes) - depends on data size and network
- **Force mode is safe** - creates automatic backups before clearing
- **Run anytime** - no scheduling needed, works 24/7
- **Reusable** - change config.env to use with different databases

---

## 📞 Need Help?

1. Check error messages - they're descriptive
2. Verify `config.env` settings
3. Test database connections
4. Check network/firewall
5. Review export SQL files for issues

---

## ✅ Summary

**Three simple commands for all your backup/restore needs:**

```bash
# Backup (Export)
python migration/migrate-api.py export

# Restore (Import)
python migration/import-to-postgres.py --force

# Verify
python migration/verify-data.py
```

**That's it! Simple, reliable, and reusable.** 🎉

---

**Last Updated:** 2025-11-07
**Python Version:** 3.11+
**Required Package:** `psycopg2-binary`
