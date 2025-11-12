# Database Migration Scripts Overview

Quick reference for all migration scripts in this folder.

## 🎯 Quick Decision Guide

```
Do you have an existing database with data?
│
├─ YES → Use migrate-all-features.sql ⭐
│        (Safe to run multiple times, preserves all data)
│
└─ NO → Use setup-complete.sql
         (Fresh installation, creates everything from scratch)
```

---

## 📦 Migration Scripts

### 🌟 migrate-all-features.sql (RECOMMENDED FOR EXISTING DATABASES)

**Use When:**
- Updating existing production or test database
- Want all latest features
- Need to fix "cannot change return type" errors

**What It Does:**
- ✅ Creates supplier_transactions table (if not exists)
- ✅ Drops and recreates all functions (9 total)
- ✅ Updates authentication with session validation
- ✅ Adds token refresh functionality
- ✅ Safe to run multiple times (idempotent)
- ✅ **PRESERVES ALL TABLE DATA**

**Includes:**
- Supplier Management
- Enhanced Authentication
- Session Validation
- Token Refresh
- User Management (admin controls)

**Run:**
```bash
# psql
psql -h HOST -U postgres -d karat_tracker_p -f migrate-all-features.sql

# pgAdmin
Query Tool → Open File → migrate-all-features.sql → Execute
```

---

### 🔧 migration-auth-functions.sql

**Use When:**
- Only need authentication function updates
- Don't need supplier management features
- Want a smaller, focused migration

**What It Does:**
- ✅ Drops and recreates 6 auth functions only
- ✅ Adds session validation and token refresh
- ✅ Safe to run multiple times
- ✅ **PRESERVES ALL TABLE DATA**

**Includes:**
- create_user
- change_password
- admin_update_user
- logout
- validate_session (NEW)
- refresh_token (NEW)

**Run:**
```bash
psql -h HOST -U postgres -d karat_tracker_p -f migration-auth-functions.sql
```

---

### 🆕 setup-complete.sql

**Use When:**
- Brand new database (no existing data)
- Fresh installation from scratch
- Setting up development environment

**What It Does:**
- Creates all roles (authenticator, web_anon)
- Creates all tables
- Creates all functions
- Sets up permissions
- Configures JWT

**WARNING:** Not recommended for existing databases with data.

**Run:**
```bash
psql -h HOST -U postgres -d karat_tracker_p -f setup-complete.sql
```

---

### 🔄 migrate-supplier-management.sql (LEGACY)

**Status:** Merged into `migrate-all-features.sql`

**Use:** Only if you specifically need supplier management without auth updates (rare).

---

## ✅ Verification Scripts

### verify-functions-pgadmin.sql ⭐ (For pgAdmin)
- Pure SQL, works in any SQL client
- Shows all functions with signatures
- Use in pgAdmin Query Tool

### verify-functions.sql (For psql)
- Uses psql meta-commands (\echo)
- Only works in psql command-line
- Same functionality as pgAdmin version

**Run After Migration:**
```bash
# psql
psql -h HOST -U postgres -d karat_tracker_p -f verify-functions.sql

# pgAdmin
Query Tool → Open File → verify-functions-pgadmin.sql → Execute
```

**Expected Result:**
```
✓ All 6 required functions exist (auth-only migration)
✓ All 9 required functions exist (comprehensive migration)
```

---

## 📚 Documentation

| Guide | For | Description |
|-------|-----|-------------|
| **PGADMIN-MIGRATION.md** | pgAdmin users | Step-by-step with screenshots |
| **MIGRATION-GUIDE.md** | All users | Complete technical guide |
| **README-MIGRATIONS.md** | Quick reference | This file - decision guide |

---

## 🚨 Important Notes

### Before Running Any Migration:

1. **BACKUP YOUR DATABASE**
   ```bash
   pg_dump -h HOST -U postgres -d karat_tracker_p -f backup-$(date +%Y%m%d-%H%M%S).sql
   ```

2. **Check Current State**
   - Which functions exist?
   - Do you have supplier_transactions table?
   - Are there any active connections?

3. **Plan Downtime (Production)**
   - Migrations take 5-10 seconds
   - Restart PostgREST after migration
   - Test authentication flow

### Safe to Run Multiple Times:

✅ All migration scripts are **idempotent**:
- `migrate-all-features.sql`
- `migration-auth-functions.sql`

They use:
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `DROP FUNCTION IF EXISTS` before creating
- Transactions (all or nothing)

### NOT Safe to Run Multiple Times:

❌ `setup-complete.sql`
- Creates roles (will error if they exist)
- Designed for fresh installations only

---

## 🎬 Example Workflows

### Scenario 1: Update Production with All Features

```bash
# 1. Backup
pg_dump -h prod.example.com -U postgres -d karat_tracker_p -f backup-prod-$(date +%Y%m%d).sql

# 2. Migrate
psql -h prod.example.com -U postgres -d karat_tracker_p -f migrate-all-features.sql

# 3. Verify
psql -h prod.example.com -U postgres -d karat_tracker_p -f verify-functions.sql

# 4. Restart PostgREST
docker restart postgrest_container
```

### Scenario 2: pgAdmin on Production

1. Open pgAdmin → Connect to production database
2. Right-click `karat_tracker_p` → Backup → Save as `backup-prod-20250112.sql`
3. Right-click `karat_tracker_p` → Query Tool
4. Open File → `migrate-all-features.sql` → Execute (▶)
5. Check Messages tab: Should see "Migration Complete!"
6. Open File → `verify-functions-pgadmin.sql` → Execute (▶)
7. Verify: "✓ All 9 required functions exist"
8. Restart PostgREST

### Scenario 3: New Development Database

```bash
# 1. Create database
psql -h localhost -U postgres -c "CREATE DATABASE karat_tracker_p;"

# 2. Run complete setup
psql -h localhost -U postgres -d karat_tracker_p -f setup-complete.sql

# 3. Set password
psql -h localhost -U postgres -d karat_tracker_p \
  -c "ALTER ROLE authenticator PASSWORD 'dev_password_123';"
```

---

## 🆘 Troubleshooting

### Error: "cannot change return type of existing function"

**Solution:** You're using `setup-complete.sql` on an existing database.

**Fix:** Use `migrate-all-features.sql` instead.

### Error: "relation supplier_transactions already exists"

**Ignore:** Script uses `IF NOT EXISTS`, this is expected.

**Result:** Existing table is preserved with all data.

### Error: "permission denied for function"

**Solution:** Run as postgres user or database owner.

```bash
psql -h HOST -U postgres -d karat_tracker_p -f migrate-all-features.sql
```

### Verification shows "Expected 9, found 6"

**Cause:** Some functions failed to create.

**Fix:**
1. Check pgAdmin Messages tab for specific errors
2. Ensure you have SECURITY DEFINER permissions
3. Re-run the migration script

---

## 📊 Function Count Reference

After migration, you should have:

**Auth-only migration:** 6 functions
- create_user
- change_password
- admin_update_user
- logout
- validate_session
- refresh_token

**Comprehensive migration:** 9+ functions
- All 6 above, plus:
- login
- sign_jwt
- current_user_role
- (and other utility functions)

---

## 🔗 Quick Links

- [Complete Migration Guide](MIGRATION-GUIDE.md)
- [pgAdmin Quick Guide](PGADMIN-MIGRATION.md)
- [Main README](../README.md)
- [Deployment Guide](../DEPLOYMENT.md)

---

**Last Updated:** 2025-01-12
**Karat Tracker Version:** 2.0
