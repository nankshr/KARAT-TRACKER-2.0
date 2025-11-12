# Database Migration Guide - Authentication Functions

## 🚀 Quick Reference

**Choose your migration script:**

| Scenario | Use This Script | Description |
|----------|----------------|-------------|
| **New database OR Full update** | `migrate-all-features.sql` ⭐ | Complete migration (auth + supplier management) |
| **Auth functions only** | `migration-auth-functions.sql` | Updates only authentication functions |
| **Fresh install** | `setup-complete.sql` | Complete database setup from scratch |

**Verification scripts:**

| Tool | Verification Script |
|------|---------------------|
| **psql** (command-line) | `verify-functions.sql` |
| **pgAdmin/GUI** | `verify-functions-pgadmin.sql` ✨ |

**Note:** All migration scripts are safe to run multiple times (idempotent).

---

## Problem

When running `setup-complete.sql` on an existing production database, you may encounter:

```
ERROR:  cannot change return type of existing function
HINT:  Use DROP FUNCTION function_name(...) first.
```

This happens because PostgreSQL's `CREATE OR REPLACE FUNCTION` cannot change:
- Return types
- Parameter types
- OUT parameters

## Solution

Use the dedicated migration script that safely drops old functions and creates new ones.

---

## 🎯 Which Script Should I Use?

### Use `migrate-all-features.sql` ⭐ (RECOMMENDED)
**Best for:**
- Existing production/test databases
- Want all latest features (auth + supplier management)
- Safe to run multiple times
- Won't impact existing data

**Includes:**
- ✅ All authentication function updates
- ✅ Supplier management tables
- ✅ Session validation & token refresh
- ✅ Proper error handling

### Use `migration-auth-functions.sql`
**Best for:**
- Only need authentication function updates
- Don't need supplier management
- Smaller, focused migration

### Use `setup-complete.sql`
**Best for:**
- Brand new database (no existing data)
- Complete fresh installation

---

## 🚀 Quick Migration Steps (Using Recommended Script)

### 1. **Backup Your Database** (CRITICAL!)

```bash
# Create timestamped backup
pg_dump -h YOUR_HOST -p 5432 -U postgres -d karat_tracker_p \
  -f backup-$(date +%Y%m%d-%H%M%S).sql

# Verify backup file was created
ls -lh backup-*.sql
```

### 2. **Run Migration Script**

#### Option A: Comprehensive Migration (RECOMMENDED)

```bash
# Apply complete migration (auth + supplier management)
psql -h YOUR_HOST -p 5432 -U postgres -d karat_tracker_p \
  -f database/migrate-all-features.sql
```

**Expected output:**
```
BEGIN
CREATE EXTENSION
CREATE TABLE (if not exists)
CREATE INDEX (if not exists)
DROP FUNCTION (9 times)
CREATE FUNCTION (9 times)
GRANT (10 times)
COMMIT

NOTICE: ============================================================
NOTICE: Comprehensive Migration Complete!
NOTICE: Features Applied:
NOTICE:   ✓ Supplier Management (tables & indexes)
NOTICE:   ✓ Enhanced Authentication (9 functions)
NOTICE:   ✓ Session Validation & Token Refresh
...
```

#### Option B: Auth Functions Only

```bash
# Update only authentication functions
psql -h YOUR_HOST -p 5432 -U postgres -d karat_tracker_p \
  -f database/migration-auth-functions.sql
```

### 3. **Verify Migration**

#### Option A: Using psql (Command Line)

```bash
# Check that all functions exist with correct signatures
psql -h YOUR_HOST -p 5432 -U postgres -d karat_tracker_p \
  -f database/verify-functions.sql
```

**Expected output:**
```
✓ All 6 required functions exist

Function Details:
-----------------
create_user        | username_input text, password_input text, role_input text | uuid
change_password    | current_password text, new_password text | boolean
admin_update_user  | user_id_input uuid, new_password text, new_role text | TABLE(...)
logout             | | boolean
validate_session   | | boolean
refresh_token      | | TABLE(token text, session_id text)
```

#### Option B: Using pgAdmin (Query Tool)

1. Open pgAdmin and connect to your database
2. Right-click on `karat_tracker_p` database → Query Tool
3. Open file: `database/verify-functions-pgadmin.sql`
4. Click Execute/Run (F5)

**Expected output:** Multiple result tabs showing:
- Tab 1: Status message "✓ All 6 required functions exist"
- Tab 2: Function details table with names, parameters, and return types
- Tab 3: Summary and expected signatures

---

## 📋 What Gets Updated

### Functions Modified:
- ✅ `create_user` - User creation with role validation
- ✅ `change_password` - Password change with verification
- ✅ `admin_update_user` - Admin user management
- ✅ `logout` - Session invalidation

### Functions Added (NEW):
- ✅ `validate_session` - Server-side session validation
- ✅ `refresh_token` - Token refresh for extended sessions

### Permissions:
- ✅ All functions granted `EXECUTE` to `web_anon` role

---

## 🛡️ Safety Features

The migration script uses:
- ✅ **Transactions** - All changes are atomic (all succeed or all fail)
- ✅ **IF EXISTS** - Won't error if functions don't exist yet
- ✅ **CASCADE** - Handles dependent objects gracefully
- ✅ **No data loss** - Only affects function definitions, not table data

---

## 🔍 Troubleshooting

### Error: "permission denied for function"

**Solution:** Run as superuser or database owner:
```bash
psql -h YOUR_HOST -p 5432 -U postgres -d karat_tracker_p \
  -f database/migration-auth-functions.sql
```

### Error: "database karat_tracker_p does not exist"

**Solution:** Create the database first:
```bash
psql -h YOUR_HOST -p 5432 -U postgres \
  -c "CREATE DATABASE karat_tracker_p;"
```

### Error: "role authenticator does not exist"

**Solution:** Run the complete setup script first:
```bash
psql -h YOUR_HOST -p 5432 -U postgres -d karat_tracker_p \
  -f database/setup-complete.sql
```

### Migration succeeds but app still has errors

**Solution:**
1. Restart PostgREST service (it caches function signatures)
2. Clear browser cache and localStorage
3. Check PostgREST logs for connection issues

---

## 📝 Migration Script Details

### File: `database/migration-auth-functions.sql`

**What it does:**
1. **Drops** old function signatures (with IF EXISTS for safety)
2. **Creates** new function definitions with updated return types
3. **Grants** permissions to web_anon role
4. **Commits** all changes in a single transaction

**Why it's safe:**
- Uses transactions (atomic changes)
- Won't fail if functions don't exist
- Doesn't modify any table data
- Doesn't affect other database objects

### Files: Verification Scripts

**`database/verify-functions.sql`** (for psql command-line)
- Uses psql meta-commands (\echo)
- Run via: `psql -f database/verify-functions.sql`

**`database/verify-functions-pgadmin.sql`** (for pgAdmin)
- Pure SQL, no meta-commands
- Run in pgAdmin Query Tool

**Both scripts do the same thing:**
- Count total functions (should be 6)
- List each function with parameters and return type
- Confirm migration succeeded

---

## ⚡ Alternative: Manual Migration

If you prefer to drop functions manually:

```sql
BEGIN;

-- Drop functions one by one
DROP FUNCTION IF EXISTS change_password(text, text) CASCADE;
DROP FUNCTION IF EXISTS create_user(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS admin_update_user(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS logout() CASCADE;
DROP FUNCTION IF EXISTS validate_session() CASCADE;
DROP FUNCTION IF EXISTS refresh_token() CASCADE;

COMMIT;

-- Then run complete setup
\i database/setup-complete.sql
```

---

## 🎯 Post-Migration Testing

After migration, test these workflows:

### 1. **Login**
- [ ] Can login with existing credentials
- [ ] Token is stored in localStorage
- [ ] Session ID is stored in localStorage

### 2. **Session Persistence**
- [ ] Close browser, reopen - still logged in as correct user
- [ ] Token expiration works (after 24 hours)
- [ ] Idle timeout works (after 30 minutes)

### 3. **Token Refresh**
- [ ] Check browser console for "Refreshing token..." message
- [ ] Token auto-refreshes 5 minutes before expiration

### 4. **Logout**
- [ ] Logout clears localStorage
- [ ] Logout invalidates session on server
- [ ] Cannot access protected routes after logout

---

## 📞 Need Help?

If you encounter issues:

1. **Check PostgREST logs:**
   ```bash
   docker logs postgrest_container
   ```

2. **Check PostgreSQL logs:**
   ```bash
   docker logs postgres_container
   ```

3. **Verify database connection:**
   ```bash
   psql -h YOUR_HOST -p 5432 -U authenticator -d karat_tracker_p
   ```

4. **Test function manually:**
   ```sql
   SELECT * FROM login('admin', 'your_password');
   ```

---

## ✅ Success Checklist

- [ ] Database backed up
- [ ] Migration script executed successfully
- [ ] Verification script confirms 6 functions exist
- [ ] PostgREST service restarted
- [ ] Frontend application rebuilt and deployed
- [ ] Login/logout tested successfully
- [ ] Session persistence tested (browser restart)
- [ ] Token refresh working (check console logs)

---

## 🚀 Next Steps

After successful migration:

1. **Deploy Frontend** - Rebuild and deploy your frontend with new auth code
2. **Monitor Logs** - Watch for any authentication errors
3. **Test Thoroughly** - Test all user workflows
4. **Document Changes** - Update your deployment documentation

---

**Migration Date:** 2025-01-12
**Version:** Karat Tracker 2.0 - Authentication Security Update
**Related Files:**
- `database/migration-auth-functions.sql` - Migration script
- `database/verify-functions.sql` - Verification script
- `src/contexts/AuthContext.tsx` - Frontend auth context
- `src/lib/postgrestClient.ts` - API client with auth helpers
