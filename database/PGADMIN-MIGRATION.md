# Quick Migration Guide for pgAdmin Users

## 📋 Which Script to Use?

| Script | Use When | Includes |
|--------|----------|----------|
| `migrate-all-features.sql` ⭐ | **Production/Test DB** (RECOMMENDED) | Auth + Supplier Management |
| `migration-auth-functions.sql` | Auth updates only | Authentication functions only |
| `setup-complete.sql` | Brand new database | Complete fresh setup |

**For existing databases, use `migrate-all-features.sql`** - it's safe to run multiple times and won't impact your data.

---

## 🎯 3-Step Migration (Using pgAdmin)

### Step 1: Backup Your Database

1. Right-click on `karat_tracker_p` database in pgAdmin
2. Select **Backup...**
3. Set filename: `backup-YYYYMMDD-HHMMSS.sql` (use current date/time)
4. Click **Backup**
5. Wait for completion message

---

### Step 2: Run Migration Script

1. Right-click on `karat_tracker_p` database
2. Select **Query Tool**
3. Click **Open File** icon (folder icon)
4. Navigate to: `database/migrate-all-features.sql` ⭐ (RECOMMENDED)
   - Or use `database/migration-auth-functions.sql` for auth-only updates
5. Click **Execute/Run** (▶ button or F5)

**Expected Output (migrate-all-features.sql):**
```
BEGIN
CREATE EXTENSION
CREATE TABLE (if not exists)
CREATE INDEX (if not exists)
DROP FUNCTION (appears 9 times)
CREATE FUNCTION (appears 9 times)
GRANT (appears 10 times)
COMMIT

NOTICE: ============================================================
NOTICE: Comprehensive Migration Complete!
NOTICE: Features Applied:
NOTICE:   ✓ Supplier Management (tables & indexes)
NOTICE:   ✓ Enhanced Authentication (9 functions)
NOTICE:   ✓ Session Validation & Token Refresh
...

Query returned successfully in X msec.
```

---

### Step 3: Verify Migration

1. In the same Query Tool, click **Open File** again
2. Navigate to: `database/verify-functions-pgadmin.sql`
3. Click **Execute/Run** (▶ button or F5)

**Expected Output (Multiple Tabs):**

**Tab 1: Overall Status**
```
Overall Status: ✓ All 6 required functions exist
```

**Tab 2: Function Details**
```
Function Name      | Parameters                                              | Return Type
-------------------|---------------------------------------------------------|------------------
admin_update_user  | user_id_input uuid, new_password text, new_role text   | TABLE(...)
change_password    | current_password text, new_password text                | boolean
create_user        | username_input text, password_input text, role_input... | uuid
logout             |                                                         | boolean
refresh_token      |                                                         | TABLE(token...)
validate_session   |                                                         | boolean
```

**Tab 3: Summary**
Shows expected function signatures for reference.

---

## ✅ Success!

If you see "✓ All 6 required functions exist", your migration is complete!

### Next Steps:

1. **Restart PostgREST** (if using Docker):
   ```bash
   docker restart postgrest_container
   ```

2. **Deploy Frontend**:
   - Frontend code is already updated
   - Rebuild and deploy your application

3. **Test Login**:
   - Login with existing credentials
   - Close browser and reopen → should stay logged in as correct user
   - Logout → should clear session properly

---

## ❌ Troubleshooting

### Error: "permission denied"
- **Solution:** Make sure you're logged in as `postgres` user or database owner in pgAdmin

### Migration script shows errors
- **Solution:** Check the error message. If it says "function does not exist", that's OK - the script uses `IF EXISTS`
- **Action:** Continue to verification step

### Verification shows "Expected 6, found 5" (or less)
- **Solution:** One or more functions failed to create
- **Action:**
  1. Re-run migration script
  2. Check pgAdmin Messages tab for specific errors
  3. Ensure you have proper permissions

### Verification script shows syntax errors
- **Solution:** Make sure you're using `verify-functions-pgadmin.sql` (not `verify-functions.sql`)
- **File:** The pgAdmin version has no `\echo` commands

---

## 📁 File Locations

All files are in the `database/` folder:

| File | Purpose | Tool |
|------|---------|------|
| `migrate-all-features.sql` ⭐ | Complete migration (auth + supplier) | All tools |
| `migration-auth-functions.sql` | Auth functions only | All tools |
| `verify-functions-pgadmin.sql` | Verify migration succeeded | **pgAdmin** ✨ |
| `verify-functions.sql` | Verify migration succeeded | psql only |
| `setup-complete.sql` | Full database setup (fresh install) | All tools |

---

## 🔍 Manual Verification (Alternative)

If you prefer to check manually in pgAdmin:

1. Expand `karat_tracker_p` → **Schemas** → **public** → **Functions**
2. Look for these 6 functions:
   - `change_password(text, text)`
   - `create_user(text, text, text)`
   - `admin_update_user(uuid, text, text)`
   - `logout()`
   - `validate_session()` ← NEW
   - `refresh_token()` ← NEW

3. Right-click any function → **Properties** to see full signature

---

## 🆘 Need More Help?

See the complete guide: [MIGRATION-GUIDE.md](MIGRATION-GUIDE.md)

Or check function details in pgAdmin:
1. Right-click `karat_tracker_p` → Query Tool
2. Run this query:
```sql
SELECT
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as parameters,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'create_user', 'change_password', 'admin_update_user',
    'logout', 'validate_session', 'refresh_token'
  )
ORDER BY p.proname;
```
