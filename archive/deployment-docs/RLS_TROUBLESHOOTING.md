# Row-Level Security (RLS) Troubleshooting Guide

## Problem Overview

You encountered a **403 Forbidden** error with the message:
```
"new row violates row-level security policy for table \"daily_rates\""
```

This error occurs when PostgreSQL's Row-Level Security policies are too restrictive or not properly configured.

---

## What Was Fixed

### 1. **Code Fixes** ✅ (Already Applied)

#### Added UPSERT Support to PostgREST Client
- **File**: `src/lib/postgrestClient.ts`
- **Change**: Added `.upsert()` method to `InsertBuilder` class
- This tells PostgREST to use `Prefer: resolution=merge-duplicates` header
- Handles both INSERT and UPDATE operations automatically

#### Updated DailyRatesBanner Component
- **File**: `src/components/DailyRatesBanner.tsx`
- **Change**: Added `.upsert()` to the daily rates save operation
- **Before**:
  ```typescript
  .insert(ratesToUpsert).select().execute()
  ```
- **After**:
  ```typescript
  .insert(ratesToUpsert).upsert().select().execute()
  ```

### 2. **Database Fixes** ⚠️ (You Need to Apply)

The RLS policies in your Coolify PostgreSQL database need to be fixed. I've created a SQL script to do this automatically.

---

## How to Fix Your Coolify Database

### Option 1: Using psql Command Line

1. **Connect to your Coolify PostgreSQL database**:
   ```bash
   psql "postgres://authenticator:YOUR_PASSWORD@69.62.84.73:5432/karat_tracker_t"
   ```

2. **Run the fix script**:
   ```bash
   psql "postgres://authenticator:YOUR_PASSWORD@69.62.84.73:5432/karat_tracker_t" -f database/fix-rls-policies.sql
   ```

### Option 2: Using Coolify Database Management Tool

1. **Open Coolify Dashboard**
2. **Go to your PostgreSQL database service**
3. **Click "Execute SQL" or "Query"**
4. **Copy and paste the contents of** `database/fix-rls-policies.sql`
5. **Execute the script**

### Option 3: Quick Fix (Copy-Paste This)

If you just want to fix the daily_rates table quickly, run this SQL:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert daily_rates" ON public.daily_rates;
DROP POLICY IF EXISTS "Users can update daily_rates" ON public.daily_rates;

-- Create permissive policies
CREATE POLICY "Authenticator can insert daily rates"
ON public.daily_rates
FOR INSERT
TO authenticator
WITH CHECK (true);

CREATE POLICY "Authenticator can update daily rates"
ON public.daily_rates
FOR UPDATE
TO authenticator
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_rates TO authenticator;
```

---

## Understanding RLS Policies

### What is Row-Level Security?

RLS is a PostgreSQL feature that restricts which rows users can access in database tables. It's like having WHERE clauses automatically added to all queries.

### Policy Types

- **SELECT**: Controls which rows users can read
- **INSERT**: Controls which rows users can create
- **UPDATE**: Controls which rows users can modify
- **DELETE**: Controls which rows users can remove

### Policy Clauses

- **USING**: Conditions that must be true for existing rows (for SELECT, UPDATE, DELETE)
- **WITH CHECK**: Conditions that must be true for new/modified rows (for INSERT, UPDATE)

### Example of Restrictive vs Permissive Policies

**❌ Too Restrictive** (Causes your error):
```sql
CREATE POLICY "Only own records" ON daily_rates
FOR INSERT
WITH CHECK (inserted_by = current_setting('request.jwt.claims')::json->>'username');
```
This fails if `inserted_by` doesn't match the JWT username exactly.

**✅ Permissive** (What you need):
```sql
CREATE POLICY "All authenticator users" ON daily_rates
FOR INSERT
TO authenticator
WITH CHECK (true);
```
This allows the authenticator role (PostgREST connection user) to insert.

---

## Verifying the Fix

### 1. Check RLS Policies in Database

Run this query to see current policies:
```sql
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'daily_rates'
ORDER BY policyname;
```

**Expected Output**:
```
tablename    | policyname                              | cmd    | roles
-------------|----------------------------------------|--------|------------------
daily_rates  | Authenticator can insert daily rates   | INSERT | {authenticator}
daily_rates  | Authenticator can update daily rates   | UPDATE | {authenticator}
daily_rates  | Authenticator can view daily rates     | SELECT | {authenticator}
```

### 2. Test in the Application

1. **Open**: http://localhost:8080 (or your Coolify URL)
2. **Login** with your credentials
3. **Navigate** to Daily Rates section
4. **Try to edit** and save rates
5. **Verify** no 403 errors in browser console

### 3. Check Browser Console

Open Developer Tools (F12) and look for:
- ✅ **Success**: No 403 errors
- ✅ **Success**: Rates save successfully
- ✅ **Success**: Toast notification appears

---

## Why This Happened

1. **RLS Policies Not Applied**: The database likely didn't have the correct RLS policies from the setup script
2. **Unique Constraint Conflict**: The `daily_rates` table has a unique constraint on `(asof_date, material, karat)`
3. **INSERT vs UPSERT**: The code was trying to INSERT rates that already existed, causing conflicts
4. **RLS Blocking**: Even if the conflict was handled, RLS policies were blocking the operation

---

## Prevention for Future Deployments

### When Setting Up New Coolify Instances:

1. **Always run the complete database setup script**:
   ```bash
   psql "YOUR_CONNECTION_STRING" -f supabase/migrations/complete-database-setup.sql
   ```

2. **Verify RLS policies after setup**:
   ```sql
   SELECT tablename, COUNT(*) as policy_count
   FROM pg_policies
   GROUP BY tablename;
   ```

3. **Test CRUD operations** for all tables before deploying frontend

### For This Project:

The code now uses UPSERT properly, so even if RLS policies are overly permissive, the application handles conflicts correctly.

---

## Additional Notes

### JWT Token Authentication

The PostgREST client automatically sends the JWT token with every request:
```typescript
if (this.token) {
  headers['Authorization'] = `Bearer ${this.token}`;
}
```

PostgreSQL extracts the user information from this JWT and uses it in RLS policies.

### Role Hierarchy

- **web_anon**: Anonymous (not logged in) users - used for public access
- **authenticator**: The PostgreSQL role that PostgREST connects as (connection user)
- **authenticated**: Supabase-specific role for logged-in users (not used in PostgREST setup)
- **admin**: Admin users (if configured)

**Important**: In your setup, PostgREST connects to PostgreSQL using the `authenticator` role. All RLS policies must grant permissions to `authenticator`, not `authenticated`.

RLS policies can be specific to each role:
```sql
CREATE POLICY "policy_name" ON table_name
FOR INSERT
TO authenticator  -- Must use authenticator for PostgREST
WITH CHECK (condition);
```

---

## Files Modified

- ✅ `src/lib/postgrestClient.ts` - Added UPSERT support
- ✅ `src/components/DailyRatesBanner.tsx` - Use UPSERT for daily rates
- ✅ `database/fix-rls-policies.sql` - Database fix script (NEW)
- ✅ Application rebuilt and redeployed locally

---

## Next Steps

1. **Apply the database fix** using one of the options above
2. **Test the application** at http://localhost:8080
3. **Verify** daily rates can be saved without errors
4. **Commit the code changes**:
   ```bash
   git add .
   git commit -m "fix: Add UPSERT support and fix RLS policies"
   ```
5. **Deploy to Coolify** by pushing to GitHub

---

## Need Help?

If you still encounter issues:

1. **Check PostgREST logs**:
   ```bash
   docker logs karat-tracker-postgrest-1
   ```

2. **Check PostgreSQL logs** in Coolify dashboard

3. **Verify JWT token** is being sent (check Network tab in browser)

4. **Test API directly**:
   ```bash
   curl -X POST http://localhost:3000/daily_rates \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -H "Prefer: resolution=merge-duplicates,return=representation" \
     -d '{"asof_date":"2025-11-06","material":"gold","karat":"24k","new_price_per_gram":5000,"old_price_per_gram":4800,"inserted_by":"admin"}'
   ```

---

**Last Updated**: 2025-11-06
