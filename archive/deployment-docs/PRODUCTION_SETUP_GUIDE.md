# Production Database Setup Guide (karat_tracker_p)

## Overview
This guide walks you through setting up the production database `karat_tracker_p` with the exact schema from your test database `karat_tracker_t`.

---

## Phase 1: Setup Production Schema

### Step 1: Run the Complete Schema SQL

You have a production-ready SQL file that will create the entire database schema. Run this command on your production PostgreSQL server:

```bash
psql -h <YOUR_PROD_HOST> -p 5432 -U postgres -d karat_tracker_p -f "supabase/migrations/complete-database-setup.sql"
```

**Replace `<YOUR_PROD_HOST>` with your actual production database host/IP address.**

**Example if running on the same server (Coolify VPS at 69.62.84.73):**
```bash
psql -h 69.62.84.73 -p 5432 -U postgres -d karat_tracker_p -f "supabase/migrations/complete-database-setup.sql"
```

**If you get a password prompt:**
- Enter the PostgreSQL `postgres` user password for your production server
- Or use the `PGPASSWORD` environment variable:
  ```bash
  PGPASSWORD='your_postgres_password' psql -h 69.62.84.73 -p 5432 -U postgres -d karat_tracker_p -f "supabase/migrations/complete-database-setup.sql"
  ```

### What This SQL Creates:

The `complete-database-setup.sql` script will create:

1. **5 Core Tables:**
   - `users` - User authentication and management
   - `daily_rates` - Gold/silver pricing rates
   - `sales_log` - All sales transactions
   - `expense_log` - Expense tracking
   - `activity_log` - Audit trail for all changes

2. **Security Features:**
   - Row Level Security (RLS) policies on all tables
   - Proper user role permissions (admin, owner, employee)
   - Secure access controls

3. **Database Functions:**
   - `update_activity_log()` - Automatic audit trail trigger
   - Automatic timestamp management

4. **Indexes & Constraints:**
   - Primary keys, foreign keys, unique constraints
   - Performance indexes on frequently queried columns

5. **Safety Features:**
   - Uses `IF NOT EXISTS` - safe to re-run
   - Won't drop or overwrite existing data
   - Idempotent (can run multiple times safely)

---

## Step 2: Verify Schema Setup

After running the SQL, verify everything is set up correctly:

### 2.1 Check All Tables Exist

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Expected Output:**
```
 table_name
--------------
 activity_log
 daily_rates
 expense_log
 sales_log
 users
```

### 2.2 Check Row Level Security is Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected Output:**
```
 tablename    | rowsecurity
--------------+-------------
 activity_log | t
 daily_rates  | t
 expense_log  | t
 sales_log    | t
 users        | t
```
(All should show `t` for true)

### 2.3 Check Table Structures

```sql
-- Check users table
\d users

-- Check sales_log table
\d sales_log

-- Check expense_log table
\d expense_log

-- Check daily_rates table
\d daily_rates

-- Check activity_log table
\d activity_log
```

### 2.4 Test Basic Operations

```sql
-- Test INSERT (this will be logged in activity_log)
INSERT INTO users (id, username, password, role, first_name, last_name, contact_number, address, sessionid, is_active)
VALUES (
  gen_random_uuid(),
  'test_setup_user',
  'test_password',
  'admin',
  'Test',
  'User',
  '1234567890',
  'Test Address',
  gen_random_uuid()::text,
  true
);

-- Verify INSERT worked
SELECT username, role, first_name, last_name, is_active
FROM users
WHERE username = 'test_setup_user';

-- Check activity_log captured the insert
SELECT table_name, action, user_name, created_at
FROM activity_log
WHERE table_name = 'users'
  AND action = 'INSERT'
ORDER BY created_at DESC
LIMIT 1;

-- Clean up test data
DELETE FROM users WHERE username = 'test_setup_user';
```

---

## Phase 2: Connect Production Environment

### Step 3: Update Docker Compose Configuration

Your `docker-compose.production.yml` needs the production database connection string.

**Connection String Format:**
```
postgres://authenticator:<PASSWORD>@<HOST>:5432/karat_tracker_p
```

#### 3.1 Create the `authenticator` User (if not exists)

Connect to your production PostgreSQL and run:

```sql
-- Create the authenticator user (if it doesn't exist)
CREATE USER authenticator WITH PASSWORD 'YOUR_SECURE_PASSWORD_HERE';

-- Grant connection to the database
GRANT CONNECT ON DATABASE karat_tracker_p TO authenticator;

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO authenticator;

-- Grant permissions on all tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticator;

-- Grant permissions on all sequences (for auto-increment)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticator;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticator;

-- Also create the web_anon role for PostgREST
CREATE ROLE web_anon NOLOGIN;
GRANT web_anon TO authenticator;

-- Grant permissions to web_anon
GRANT USAGE ON SCHEMA public TO web_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO web_anon;
```

#### 3.2 Generate a Strong JWT Secret

```bash
# Generate a secure random JWT secret
openssl rand -base64 32
```

**Save this output - you'll need it for the docker-compose file.**

#### 3.3 Update docker-compose.production.yml

Update the environment variables in your `docker-compose.production.yml`:

```yaml
services:
  postgrest:
    environment:
      PGRST_DB_URI: postgres://authenticator:<YOUR_SECURE_PASSWORD>@<YOUR_PROD_HOST>:5432/karat_tracker_p
      PGRST_JWT_SECRET: <YOUR_GENERATED_JWT_SECRET>
      PGRST_DB_SCHEMAS: public
      PGRST_DB_ANON_ROLE: web_anon
      PGRST_OPENAPI_SERVER_PROXY_URI: <YOUR_API_URL>
```

**Example with real values:**
```yaml
services:
  postgrest:
    environment:
      PGRST_DB_URI: postgres://authenticator:MySecureP@ssw0rd123@69.62.84.73:5432/karat_tracker_p
      PGRST_JWT_SECRET: 7XMblEc5aEcKvaIWJ4mcDhBJRlQXAW9NU0KxLdxxx4w=
      PGRST_DB_SCHEMAS: public
      PGRST_DB_ANON_ROLE: web_anon
      PGRST_OPENAPI_SERVER_PROXY_URI: https://api.yourdomain.com
```

**Security Note:** For production, use environment variables or secrets management instead of hardcoding values in the file.

---

## Step 4: Deploy to Coolify

### 4.1 Update Environment Variables in Coolify

In your Coolify dashboard:

1. Go to your production application
2. Navigate to **Environment Variables**
3. Add/Update these variables:
   - `PGRST_DB_URI`: `postgres://authenticator:<PASSWORD>@<HOST>:5432/karat_tracker_p`
   - `PGRST_JWT_SECRET`: `<YOUR_JWT_SECRET>`
   - `PGRST_DB_SCHEMAS`: `public`
   - `PGRST_DB_ANON_ROLE`: `web_anon`
   - `PGRST_OPENAPI_SERVER_PROXY_URI`: Your API URL

4. For the frontend service, update:
   - `VITE_API_URL`: Your PostgREST API endpoint
   - `VITE_APP_NAME`: Karat Tracker
   - `VITE_APP_VERSION`: Your version number

### 4.2 Deploy the Application

```bash
# If using git-based deployment on Coolify, push your changes
git add docker-compose.production.yml
git commit -m "Configure production database connection for karat_tracker_p"
git push origin main

# Coolify will automatically detect and deploy the changes
```

### 4.3 Verify PostgREST Connection

Once deployed, test the API endpoint:

```bash
# Test health endpoint
curl https://your-api-url.com/

# Test database connectivity by querying users table (should return empty array initially)
curl https://your-api-url.com/users

# You should get: []
```

---

## Verification Checklist

Use this checklist to ensure everything is set up correctly:

- [ ] **Database Created**: `karat_tracker_p` database exists
- [ ] **Schema Installed**: All 5 tables created (users, daily_rates, sales_log, expense_log, activity_log)
- [ ] **RLS Enabled**: Row Level Security is active on all tables
- [ ] **Functions Created**: `update_activity_log()` function exists
- [ ] **Triggers Active**: Activity log triggers are functioning
- [ ] **Test Insert Works**: Can insert and query test data
- [ ] **Test Delete Works**: Can delete test data
- [ ] **Activity Log Working**: Inserts/Updates/Deletes are logged
- [ ] **Authenticator User**: `authenticator` user created with proper permissions
- [ ] **Web Anon Role**: `web_anon` role created and granted to authenticator
- [ ] **JWT Secret Generated**: Secure JWT secret created and saved
- [ ] **Docker Compose Updated**: Environment variables set in docker-compose.production.yml
- [ ] **Coolify Env Vars Set**: All environment variables configured in Coolify
- [ ] **Deployment Successful**: Application deployed without errors
- [ ] **PostgREST Healthy**: Health check endpoint responding
- [ ] **API Connectivity**: Can query database through PostgREST API
- [ ] **Frontend Connecting**: Frontend can connect to PostgREST API

---

## Phase 3: Data Migration (When Ready)

This phase will be executed later when you're ready to migrate data from your existing Supabase production database.

### Important Notes Before Data Migration:

1. **Timing**: Schedule during low-traffic period
2. **Backup**: Create backup of Supabase production before migration
3. **Testing**: Test the migration process with a subset of data first
4. **Downtime**: Plan for 30-60 minutes of downtime (or implement read-only mode)
5. **Validation**: Prepare validation queries to verify data integrity

### Data Migration Steps (Execute Later):

#### Step 1: Export from Supabase Production

```bash
# Set Supabase credentials
export SUPABASE_PROJECT_ID="your-supabase-project-id"
export SUPABASE_DB_PASSWORD="your-supabase-db-password"

# Run export script
cd migration
./export-from-supabase.sh

# This creates timestamped SQL files in migration/exports/
```

**Files Created:**
- `schema-only-YYYYMMDD-HHMMSS.sql` - Database structure
- `data-only-YYYYMMDD-HHMMSS.sql` - All data
- `complete-YYYYMMDD-HHMMSS.sql` - Schema + Data
- Individual table exports (users, sales_log, etc.)

#### Step 2: Import to Production PostgreSQL

```bash
# Set production database credentials
export DB_HOST="69.62.84.73"  # Your production host
export DB_PORT="5432"
export DB_NAME="karat_tracker_p"
export DB_USER="postgres"
export DB_PASSWORD="your-postgres-password"

# Run import script
./import-to-postgres.sh

# Follow the prompts to select which export file to import
```

#### Step 3: Verify Data Migration

```sql
-- Compare row counts
SELECT
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM sales_log) as sales_count,
  (SELECT COUNT(*) FROM expense_log) as expenses_count,
  (SELECT COUNT(*) FROM daily_rates) as rates_count,
  (SELECT COUNT(*) FROM activity_log) as activities_count;

-- Verify latest records
SELECT * FROM users ORDER BY created_at DESC LIMIT 5;
SELECT * FROM sales_log ORDER BY created_at DESC LIMIT 5;
SELECT * FROM expense_log ORDER BY created_at DESC LIMIT 5;
SELECT * FROM daily_rates ORDER BY created_at DESC LIMIT 5;

-- Check for any NULL values that shouldn't exist
SELECT COUNT(*) FROM users WHERE username IS NULL OR password IS NULL;
SELECT COUNT(*) FROM sales_log WHERE selling_cost IS NULL;
```

#### Step 4: Update Application to Use Production Database

Once data is verified:

1. Update frontend environment variables to point to production API
2. Test all critical user flows
3. Monitor error logs
4. Keep Supabase as read-only backup for 7-14 days

---

## Troubleshooting

### Issue: "psql: connection refused"
**Solution:** Check if PostgreSQL is running and accessible from your machine:
```bash
telnet 69.62.84.73 5432
# or
nc -zv 69.62.84.73 5432
```

### Issue: "database does not exist"
**Solution:** Create the database first:
```sql
CREATE DATABASE karat_tracker_p;
```

### Issue: "permission denied"
**Solution:** Ensure the user has proper permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE karat_tracker_p TO postgres;
```

### Issue: PostgREST can't connect to database
**Solution:**
1. Check connection string format (URL-encode special characters in password)
2. Verify `authenticator` user has correct permissions
3. Check PostgreSQL `pg_hba.conf` allows connections from PostgREST host
4. Verify firewall rules allow connection on port 5432

### Issue: RLS blocking all queries
**Solution:** Temporarily disable RLS for testing (re-enable after!):
```sql
-- Disable RLS on a table (for testing only)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

---

## Rollback Plan

If something goes wrong, you can rollback:

### Option 1: Drop and Recreate Database
```sql
-- Connect to postgres database (not karat_tracker_p)
\c postgres

-- Drop the database
DROP DATABASE IF EXISTS karat_tracker_p;

-- Recreate empty database
CREATE DATABASE karat_tracker_p;

-- Re-run the schema setup SQL
\c karat_tracker_p
\i supabase/migrations/complete-database-setup.sql
```

### Option 2: Keep Using Test Database
If production setup has issues, continue using `karat_tracker_t` until resolved.

---

## Security Best Practices

1. **Password Strength**: Use strong passwords (20+ characters, mixed case, numbers, symbols)
2. **JWT Secret**: Never commit JWT secrets to git
3. **Environment Variables**: Use Coolify's secret management for sensitive values
4. **SSL/TLS**: Ensure PostgreSQL connections use SSL in production
5. **Firewall**: Restrict PostgreSQL port 5432 to only trusted IPs
6. **Regular Backups**: Set up automated daily backups of production database
7. **Monitor Logs**: Watch for suspicious activity in `activity_log` table

---

## Support and Resources

- **Schema SQL**: [supabase/migrations/complete-database-setup.sql](supabase/migrations/complete-database-setup.sql)
- **Export Script**: [migration/export-from-supabase.sh](migration/export-from-supabase.sh)
- **Import Script**: [migration/import-to-postgres.sh](migration/import-to-postgres.sh)
- **Master Plan**: [migration/MIGRATION_MASTER_PLAN.md](migration/MIGRATION_MASTER_PLAN.md)
- **Deployment Guide**: [migration/COOLIFY_DEPLOYMENT_GUIDE.md](migration/COOLIFY_DEPLOYMENT_GUIDE.md)

---

## Quick Command Reference

```bash
# 1. Setup schema
psql -h <HOST> -U postgres -d karat_tracker_p -f "supabase/migrations/complete-database-setup.sql"

# 2. Verify tables
psql -h <HOST> -U postgres -d karat_tracker_p -c "\dt"

# 3. Test connection from PostgREST
curl https://your-api-url.com/users

# 4. Export from Supabase (Phase 3)
export SUPABASE_PROJECT_ID="xxx" SUPABASE_DB_PASSWORD="xxx"
./migration/export-from-supabase.sh

# 5. Import to Production (Phase 3)
export DB_HOST="xxx" DB_NAME="karat_tracker_p" DB_PASSWORD="xxx"
./migration/import-to-postgres.sh
```

---

**Ready to begin? Start with Phase 1, Step 1!**
