# Karat Tracker 2.0 - Database Setup Guide

## Overview

This guide provides complete instructions for setting up the PostgreSQL database for Karat Tracker 2.0, including schema creation, role configuration, and data migration from Supabase.

## Quick Start

For a fresh database setup, simply run:

```bash
psql -h YOUR_HOST -p 5432 -U postgres -d karat_tracker_p -f database/setup-complete.sql
```

## Files in this Directory

### Essential Files

1. **`setup-complete.sql`** - Complete database setup script
   - Creates all tables with proper schema
   - Creates `authenticator` and `web_anon` roles
   - Sets up all permissions and grants
   - Creates authentication functions
   - Safe to run on existing databases (uses IF NOT EXISTS)

### Archived/Legacy Files (can be deleted)

- `check-what-went-wrong.sql` - Diagnostic script (obsolete)
- `diagnose-and-fix.sql` - Old diagnostic tool (obsolete)
- `final-fix.sql` - Legacy fix script (obsolete)
- `fix-rls-nuclear.sql` - RLS fix (not needed for PostgREST)
- `fix-rls-policies.sql` - RLS policies (not needed for PostgREST)
- `fix-rls-simple.sql` - Simple RLS fix (obsolete)
- `fix-users-security.sql` - Old security fix (consolidated)
- `test-insert.sql` - Test script (optional)
- `verify-rls.sql` - RLS verification (not needed)

## Database Architecture

### Roles

The database uses a two-role system for security:

1. **`authenticator`** - Connection role
   - Used by PostgREST to connect to the database
   - Has NOINHERIT and LOGIN privileges
   - Can switch to `web_anon` role

2. **`web_anon`** - API access role
   - Used for all API operations
   - Has SELECT, INSERT, UPDATE, DELETE on all tables
   - NOLOGIN (can only be used by switching from authenticator)

### Tables

1. **`users`** - User accounts and authentication
   - Stores usernames, hashed passwords, roles
   - Roles: admin, owner, employee

2. **`daily_rates`** - Daily gold/silver rates
   - Historical price tracking
   - Material types: gold, silver

3. **`sales_log`** - Sales transactions
   - Customer information
   - Weight, purity, profit calculations
   - Types: wholesale, retail

4. **`expense_log`** - Expense tracking
   - Direct and indirect expenses
   - Credit tracking (is_credit field)

5. **`activity_log`** - Audit trail
   - Tracks all INSERT, UPDATE, DELETE operations
   - Stores old and new data as JSONB

6. **`jwt_config`** - JWT configuration
   - Stores JWT secret for token generation

### Database Functions

All authentication and utility functions are included:

- `login(username, password)` - User authentication
- `create_user(username, password, role)` - Create new user
- `change_password(current, new)` - Change password
- `logout()` - Clear session
- `current_user_id()` - Get current user ID from JWT
- `current_user_role()` - Get current user role from JWT
- `execute_safe_query(query)` - Execute dynamic queries
- `get_table_schema(table_name)` - Get table structure
- `sign_jwt(payload, secret)` - Generate JWT tokens

## Manual Setup Instructions

### Step 1: Create Database

```bash
# Connect to PostgreSQL as superuser
psql -h YOUR_HOST -p 5432 -U postgres

# Create database
CREATE DATABASE karat_tracker_p;

# Exit
\q
```

### Step 2: Run Setup Script

```bash
# Run the complete setup
psql -h YOUR_HOST -p 5432 -U postgres -d karat_tracker_p -f database/setup-complete.sql
```

### Step 3: Set Authenticator Password

```sql
-- Connect to the database
psql -h YOUR_HOST -p 5432 -U postgres -d karat_tracker_p

-- Set password for authenticator role
ALTER ROLE authenticator PASSWORD 'YOUR_SECURE_PASSWORD';
```

### Step 4: Verify Setup

```sql
-- Check roles
SELECT rolname, rolcanlogin, rolinherit
FROM pg_roles
WHERE rolname IN ('authenticator', 'web_anon');

-- Check tables
\dt public.*

-- Check permissions
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'web_anon' AND table_schema = 'public';

-- Test functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public';
```

## Migration from Supabase

If you're migrating from Supabase, use the migration tools in the `migration/` directory.

### Step 1: Export from Supabase

```bash
# Export all tables from Supabase
python migration/migrate-api.py export
```

This will create a timestamped export in `migration/exports/export_YYYYMMDD_HHMMSS/`

### Step 2: Import to PostgreSQL

```bash
# Import to production database
python migration/migrate-api.py import
```

### Step 3: Verify Migration

```bash
# Verify row counts match
python migration/migrate-api.py verify
```

### Full Migration (Export + Import + Verify)

```bash
# Run complete migration
python migration/migrate-api.py full
```

## Configuration

### PostgREST Configuration

Update your PostgREST configuration (`.env` or `docker-compose.yml`):

```env
PGRST_DB_URI=postgres://authenticator:PASSWORD@HOST:5432/karat_tracker_p
PGRST_DB_SCHEMAS=public
PGRST_DB_ANON_ROLE=web_anon
PGRST_JWT_SECRET=7XMblEc5aEcKvaIWJ4mcDhBJRlQXAW9NU0KxLdxxx4w=
PGRST_SERVER_HOST=*
PGRST_SERVER_PORT=3000
PGRST_SERVER_CORS_ALLOWED_ORIGINS=https://kt.eyediaworks.in
```

### Important Notes

1. **Change JWT Secret**: The default JWT secret in `jwt_config` table should be changed in production
2. **Set Strong Password**: Use a strong password for the `authenticator` role
3. **Backup Regularly**: Set up automated backups of your database
4. **Monitor Logs**: Check activity_log table regularly for audit trail

## Security Best Practices

1. **Never commit passwords** - Use environment variables
2. **Use SSL connections** - Enable SSL for database connections
3. **Rotate JWT secrets** - Change JWT secret periodically
4. **Monitor activity_log** - Check for suspicious activities
5. **Limit network access** - Use firewall rules to restrict database access
6. **Regular backups** - Automate database backups

## Troubleshooting

### Connection Issues

```sql
-- Check if authenticator can log in
psql -h HOST -p 5432 -U authenticator -d karat_tracker_p

-- Check role memberships
SELECT r.rolname, m.rolname as member_of
FROM pg_roles r
LEFT JOIN pg_auth_members am ON r.oid = am.member
LEFT JOIN pg_roles m ON am.roleid = m.oid
WHERE r.rolname IN ('authenticator', 'web_anon');
```

### Permission Issues

```sql
-- Grant missing permissions
GRANT USAGE ON SCHEMA public TO web_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO web_anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO web_anon;
```

### Function Errors

```sql
-- Check function definitions
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'login';

-- Recreate function if needed
DROP FUNCTION IF EXISTS login(TEXT, TEXT);
-- Then run setup-complete.sql again
```

## Migration Script Details

The migration script (`migration/migrate-api.py`) supports pagination and handles large tables:

### Features
- **Pagination support** - Fetches data in batches of 1000 rows
- **Progress tracking** - Shows progress for each batch
- **Error handling** - Continues on errors, reports issues
- **Verification** - Compares row counts after migration

### Commands

```bash
# Export only
python migration/migrate-api.py export

# Import only (uses last export)
python migration/migrate-api.py import

# Verify only
python migration/migrate-api.py verify

# Full migration (export + import + verify)
python migration/migrate-api.py full
```

### Configuration

Edit `migration/config.env` to configure:

```env
# Source (Supabase)
SOURCE_PROJECT_ID=your_supabase_project_id

# Target (PostgreSQL)
TARGET_HOST=your_host
TARGET_PORT=5432
TARGET_DB_NAME=karat_tracker_p
TARGET_USER=postgres
TARGET_PASSWORD=your_password

# Tables to migrate
TABLES=users,daily_rates,sales_log,expense_log,activity_log
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review PostgREST logs: `docker logs <postgrest-container>`
3. Check database logs: `psql` error messages
4. Verify configuration in `.env` files

## Summary

This consolidated setup provides:
- ✅ Complete database schema
- ✅ Proper role-based security
- ✅ All necessary permissions
- ✅ Authentication functions
- ✅ Migration tools
- ✅ Clear documentation

The database is now ready for production use with PostgREST!
