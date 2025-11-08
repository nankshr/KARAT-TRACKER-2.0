# Quick Reference Card

## 🎯 Three Commands You Need

### 1️⃣ Backup (Export Data)
```bash
python migration/migrate-api.py export
```
**Exports from:** Supabase Production
**Saves to:** `migration/exports/export_YYYYMMDD_HHMMSS/`
**Time:** < 1 minute

---

### 2️⃣ Restore (Import Data)
```bash
python migration/import-to-postgres.py --force
```
**Imports to:** PostgreSQL Production
**Uses:** Last export folder automatically
**Time:** 1-5 minutes

---

### 3️⃣ Verify (Check Data)
```bash
python migration/verify-data.py
```
**Checks:** Row counts in both databases
**Shows:** Side-by-side comparison
**Time:** < 30 seconds

---

## 📝 Common Tasks

| Task | Command |
|------|---------|
| Daily backup | `python migration/migrate-api.py export` |
| Restore latest backup | `python migration/import-to-postgres.py --force` |
| Check if data matches | `python migration/verify-data.py` |
| Change target database | Edit `migration/config.env` then import |

---

## ⚙️ Config File Location

```
migration/config.env
```

**Important settings:**
- `TARGET_HOST` - PostgreSQL server IP
- `TARGET_DB_NAME` - Database name
- `TARGET_PASSWORD` - Database password

---

## 📁 Backup Location

```
migration/exports/export_YYYYMMDD_HHMMSS/
```

**Files created:**
- `users.sql`
- `daily_rates.sql`
- `sales_log.sql`
- `expense_log.sql`
- `activity_log.sql`
- `all_tables.sql` (combined)

---

## 🔥 Emergency Restore

```bash
# Step 1: Find backup
ls migration/exports/

# Step 2: Restore
python migration/import-to-postgres.py --force

# Step 3: Verify
python migration/verify-data.py
```

---

## 💡 Remember

- ✅ Always verify after import
- ✅ Keep multiple backups
- ✅ Test restores occasionally
- ✅ Backups are automatic and safe
- ⚠️ Keep config.env secure (passwords!)

---

**Questions?** See [README_PYTHON_TOOLS.md](README_PYTHON_TOOLS.md) for full documentation.
