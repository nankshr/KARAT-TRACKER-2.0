# Database Migration Guide

This guide will help you migrate from Supabase to your self-hosted PostgreSQL database on Coolify.

## Prerequisites

- Access to your Supabase project
- PostgreSQL 15+ installed on your VPS or locally (for testing)
- `pg_dump` and `psql` command-line tools installed
- Your Supabase database password

## Migration Steps

### Step 1: Export from Supabase

#### Option A: Using the provided script (Linux/Mac)

```bash
# Set your Supabase credentials
export SUPABASE_PROJECT_ID="your-project-id"
export SUPABASE_DB_PASSWORD="your-database-password"

# Run the export script
chmod +x migration/export-from-supabase.sh
./migration/export-from-supabase.sh
```

#### Option B: Manual export using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Database > Backups
3. Click "Create backup" to create a new backup
4. Download the backup file

#### Option C: Manual export using pg_dump

```bash
pg_dump \
  -h db.YOUR_PROJECT_ID.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  --no-owner \
  --no-privileges \
  -f supabase_export.sql
```

### Step 2: Set up PostgreSQL on Coolify

1. **Login to Coolify Dashboard**
   - Navigate to your Coolify instance
   - Create a new project or use an existing one

2. **Deploy PostgreSQL**
   - Click "New Resource"
   - Select "Database"
   - Choose "PostgreSQL 15"
   - Configure:
     - Database name: `karat_tracker`
     - Username: `karat_user`
     - Password: (generate a secure password)
   - Deploy the database

3. **Note down the connection details:**
   - Host: (provided by Coolify)
   - Port: 5432
   - Database: karat_tracker
   - Username: karat_user
   - Password: (your generated password)

### Step 3: Import to Self-hosted PostgreSQL

#### Option A: Using the provided script (Linux/Mac)

```bash
# Set your PostgreSQL credentials
export DB_HOST="your-postgres-host"
export DB_PORT="5432"
export DB_NAME="karat_tracker"
export DB_USER="karat_user"
export DB_PASSWORD="your-password"

# Run the import script
chmod +x migration/import-to-postgres.sh
./migration/import-to-postgres.sh
```

#### Option B: Manual import using psql

```bash
# Import the database
psql \
  -h your-postgres-host \
  -p 5432 \
  -U karat_user \
  -d karat_tracker \
  -f migration/exports/complete_TIMESTAMP.sql
```

### Step 4: Verify Migration

1. **Check table counts:**

```sql
SELECT
  'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'daily_rates', COUNT(*) FROM daily_rates
UNION ALL
SELECT 'sales_log', COUNT(*) FROM sales_log
UNION ALL
SELECT 'expense_log', COUNT(*) FROM expense_log
UNION ALL
SELECT 'activity_log', COUNT(*) FROM activity_log;
```

2. **Verify data integrity:**

```sql
-- Check if all users have valid data
SELECT * FROM users LIMIT 10;

-- Check recent sales
SELECT * FROM sales_log ORDER BY created_at DESC LIMIT 10;

-- Check recent expenses
SELECT * FROM expense_log ORDER BY created_at DESC LIMIT 10;
```

3. **Test database functions:**

```sql
-- Test get_table_schema function
SELECT get_table_schema('users');

-- Test execute_safe_query function
SELECT execute_safe_query('SELECT COUNT(*) FROM users');
```

### Step 5: Update Application Configuration

1. **Update backend environment variables:**

Create `backend/.env` with:

```env
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=karat_tracker
DB_USER=karat_user
DB_PASSWORD=your-password

PORT=3000
NODE_ENV=production
API_KEY=generate-a-secure-key
SESSION_SECRET=generate-a-secure-secret
CORS_ORIGIN=https://yourdomain.com

OPENAI_API_KEY=your-openai-key
```

2. **Update frontend environment variables:**

Update `.env` with:

```env
VITE_API_URL=https://api.yourdomain.com/api
VITE_APP_NAME=Karat Tracker
VITE_APP_VERSION=1.0.0
```

## Troubleshooting

### Connection Issues

If you can't connect to the database:

```bash
# Test connection
psql -h your-host -U your-user -d your-database -c "SELECT version();"

# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check firewall rules
sudo ufw status
```

### Import Errors

If import fails due to permissions:

```bash
# Remove OWNER and PRIVILEGE statements from export
sed -i '/OWNER TO/d' migration/exports/complete_*.sql
sed -i '/GRANT/d' migration/exports/complete_*.sql
sed -i '/REVOKE/d' migration/exports/complete_*.sql

# Then retry import
```

### Character Encoding Issues

If you encounter encoding errors:

```bash
# Export with UTF8 encoding
pg_dump --encoding=UTF8 ...

# Or set client encoding before import
psql -c "SET client_encoding TO 'UTF8';" ...
```

## Rollback Plan

If something goes wrong and you need to rollback:

1. Keep your Supabase project active during migration
2. Keep the original export files
3. You can always re-import from the backup files
4. Update environment variables back to Supabase configuration

## Data Validation Checklist

- [ ] All users can login
- [ ] Sales data is correct
- [ ] Expense data is correct
- [ ] Daily rates are present
- [ ] Activity logs are recording
- [ ] Data export functionality works
- [ ] AI query feature works (if using)
- [ ] All totals and calculations match original

## Post-Migration Cleanup

After successful migration and verification (recommended to wait 30 days):

1. Export one final backup from Supabase
2. Pause or delete your Supabase project
3. Remove Supabase-related environment variables
4. Update documentation

## Support

If you encounter issues:

1. Check the error logs in `backend/logs` or console
2. Verify database connectivity
3. Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-15-main.log`
4. Review Coolify deployment logs
