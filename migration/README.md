# Database Migration & Backup Tools

## 🎯 Quick Start

This folder contains Python-based tools for backing up and restoring your Karat Tracker database.

### Three Simple Commands:

```bash
# 1. Backup (Export)
python migration/migrate-api.py export

# 2. Restore (Import)
python migration/import-to-postgres.py --force

# 3. Verify
python migration/verify-data.py
```

---

## 📚 Documentation

- **[Quick Reference](QUICK_REFERENCE.md)** - One-page command reference
- **[Python Tools Guide](README_PYTHON_TOOLS.md)** - Complete documentation
- **[Config File](config.env.example)** - Configuration template

---

## 🚀 First Time Setup

### 1. Install Required Package
```bash
pip install psycopg2-binary
```

### 2. Configure Database Credentials
```bash
# Your config.env is already set up with:
# - Supabase production credentials
# - PostgreSQL production credentials
# - List of tables to migrate

# Location: migration/config.env
```

### 3. Test It
```bash
# Export from Supabase
python migration/migrate-api.py export

# Verify export created
ls migration/exports/

# Import to PostgreSQL
python migration/import-to-postgres.py --force

# Verify data matches
python migration/verify-data.py
```

---

## 📁 What's in This Folder

| File | Purpose |
|------|---------|
| `migrate-api.py` | Export data from Supabase |
| `import-to-postgres.py` | Import data to PostgreSQL |
| `verify-data.py` | Verify data integrity |
| `config.env` | Your credentials (git-ignored) |
| `config.env.example` | Template for reference |
| `README_PYTHON_TOOLS.md` | Full documentation |
| `QUICK_REFERENCE.md` | Quick command reference |
| `exports/` | Backup storage (git-ignored) |

---

## 🔐 Security

- ✅ `config.env` is git-ignored (won't be committed)
- ✅ `exports/` folder is git-ignored (won't be committed)
- ⚠️ Keep `config.env` secure - contains passwords
- ⚠️ Don't share export files - contain production data

---

## 💡 Common Use Cases

### Daily Backup
```bash
python migration/migrate-api.py export
```

### Restore from Backup
```bash
python migration/import-to-postgres.py --force
```

### Migrate to New Database
1. Edit `config.env`
2. Update target database settings
3. Run: `python migration/import-to-postgres.py --force`

### Clone Production to Test
1. Edit `config.env`
2. Change `TARGET_DB_NAME` to test database
3. Run: `python migration/import-to-postgres.py --force`

---

## ✅ What Makes These Tools Great

- ✅ **No psql required** - Works on Windows without PostgreSQL client tools
- ✅ **Direct connections** - Uses Python libraries to connect directly
- ✅ **API-based export** - Uses Supabase REST API (fast and reliable)
- ✅ **Automatic timestamps** - Each export is timestamped and kept separate
- ✅ **Safe imports** - Prompts before clearing data (or use --force)
- ✅ **Verification built-in** - Easy to verify data integrity
- ✅ **Reusable** - Just edit config.env to use with different databases

---

## 🛠️ Troubleshooting

### Can't connect to PostgreSQL?
- Check `TARGET_HOST`, `TARGET_PORT`, `TARGET_PASSWORD` in `config.env`
- Verify PostgreSQL is running
- Check firewall allows connection

### Can't export from Supabase?
- Check `SOURCE_PROJECT_ID` in `config.env`
- Verify Supabase project is active (not paused)
- Check internet connection

### Import fails?
- Run export first: `python migration/migrate-api.py export`
- Try force mode: `python migration/import-to-postgres.py --force`
- Check error messages for specific issues

### Data doesn't match?
- Re-run import: `python migration/import-to-postgres.py --force`
- Verify again: `python migration/verify-data.py`
- Check if import completed fully (wait for all tables)

---

## 📖 Full Documentation

For complete details, troubleshooting, and advanced usage, see:
- [README_PYTHON_TOOLS.md](README_PYTHON_TOOLS.md)

For quick command reference, see:
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

---

## 📊 Current Setup

**Source (Supabase):**
- Project: `tzuvlpubvimhugobtrsi`
- URL: `https://tzuvlpubvimhugobtrsi.supabase.co`
- Database: `postgres`

**Target (PostgreSQL):**
- Host: `69.62.84.73`
- Database: `karat_tracker_p`
- Port: `5432`

**Tables:**
- users (5 rows)
- daily_rates (256 rows)
- sales_log (674 rows)
- expense_log (893 rows)
- activity_log (1000 rows)

**Total:** 2,828 rows

---

## 🎯 Quick Reference Card

```bash
# BACKUP
python migration/migrate-api.py export

# RESTORE
python migration/import-to-postgres.py --force

# VERIFY
python migration/verify-data.py

# CHECK BACKUPS
ls migration/exports/

# EDIT CONFIG
notepad migration/config.env
```

---

**Ready to start?** Run your first backup:
```bash
python migration/migrate-api.py export
```

Good luck! 🚀
