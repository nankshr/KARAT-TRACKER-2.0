# Import Instructions

## ✅ Export Completed Successfully!

Your data has been exported from Supabase production:

- **Export Location:** `migration/exports/export_20251107_212721/`
- **Total Rows Exported:** 2,828 rows

### Tables Exported:
- ✅ users: 5 rows
- ✅ daily_rates: 256 rows
- ✅ sales_log: 674 rows
- ✅ expense_log: 893 rows
- ✅ activity_log: 1,000 rows

---

## Now: Import to PostgreSQL Production

Since `psql` is not available on your Windows machine, you need to import the data from your Coolify server where PostgreSQL is running.

### Method 1: Direct Import on Coolify Server (Recommended)

#### Step 1: Copy SQL files to Coolify Server

From your local Windows machine, use SCP or WinSCP to copy the files:

```bash
# If you have SSH access, use SCP
scp -r "migration/exports/export_20251107_212721" user@69.62.84.73:/tmp/
```

Or use **WinSCP** or **FileZilla** to copy the folder to the server.

#### Step 2: SSH into Coolify Server

```bash
ssh user@69.62.84.73
```

#### Step 3: Import the data

```bash
# Navigate to the uploaded directory
cd /tmp/export_20251107_212721

# Set PostgreSQL password
export PGPASSWORD='G8umzPMoCWIQDoTKGAy4hXdDE1GS0XafmAt4SJ57YjnwDnaXON9QDr17RrjoktL3'

# Clear existing data and import (in order)
echo "Importing users..."
psql -h 127.0.0.1 -U postgres -d karat_tracker_p -c "TRUNCATE TABLE users CASCADE;"
psql -h 127.0.0.1 -U postgres -d karat_tracker_p < users.sql

echo "Importing daily_rates..."
psql -h 127.0.0.1 -U postgres -d karat_tracker_p -c "TRUNCATE TABLE daily_rates CASCADE;"
psql -h 127.0.0.1 -U postgres -d karat_tracker_p < daily_rates.sql

echo "Importing sales_log..."
psql -h 127.0.0.1 -U postgres -d karat_tracker_p -c "TRUNCATE TABLE sales_log CASCADE;"
psql -h 127.0.0.1 -U postgres -d karat_tracker_p < sales_log.sql

echo "Importing expense_log..."
psql -h 127.0.0.1 -U postgres -d karat_tracker_p -c "TRUNCATE TABLE expense_log CASCADE;"
psql -h 127.0.0.1 -U postgres -d karat_tracker_p < expense_log.sql

echo "Importing activity_log..."
psql -h 127.0.0.1 -U postgres -d karat_tracker_p -c "TRUNCATE TABLE activity_log CASCADE;"
psql -h 127.0.0.1 -U postgres -d karat_tracker_p < activity_log.sql

echo "Done!"
```

#### Step 4: Verify Import

```bash
# Check row counts
psql -h 127.0.0.1 -U postgres -d karat_tracker_p -c "
SELECT
  'users' as table, COUNT(*) as rows FROM users
UNION ALL
SELECT 'daily_rates', COUNT(*) FROM daily_rates
UNION ALL
SELECT 'sales_log', COUNT(*) FROM sales_log
UNION ALL
SELECT 'expense_log', COUNT(*) FROM expense_log
UNION ALL
SELECT 'activity_log', COUNT(*) FROM activity_log;
"
```

**Expected output:**
```
    table     | rows
--------------+------
 users        |    5
 daily_rates  |  256
 sales_log    |  674
 expense_log  |  893
 activity_log | 1000
```

---

### Method 2: Use Combined SQL File

If you prefer to import all tables at once:

```bash
# On Coolify server after copying files
export PGPASSWORD='G8umzPMoCWIQDoTKGAy4hXdDE1GS0XafmAt4SJ57YjnwDnaXON9QDr17RrjoktL3'

# Clear all tables first
psql -h 127.0.0.1 -U postgres -d karat_tracker_p -c "
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE daily_rates CASCADE;
TRUNCATE TABLE sales_log CASCADE;
TRUNCATE TABLE expense_log CASCADE;
TRUNCATE TABLE activity_log CASCADE;
"

# Import all at once
psql -h 127.0.0.1 -U postgres -d karat_tracker_p < all_tables.sql

# Verify
psql -h 127.0.0.1 -U postgres -d karat_tracker_p -c "
SELECT
  'users' as table, COUNT(*) as rows FROM users
UNION ALL
SELECT 'daily_rates', COUNT(*) FROM daily_rates
UNION ALL
SELECT 'sales_log', COUNT(*) FROM sales_log
UNION ALL
SELECT 'expense_log', COUNT(*) FROM expense_log
UNION ALL
SELECT 'activity_log', COUNT(*) FROM activity_log;
"
```

---

### Method 3: Use Docker (if Docker is available on Coolify)

```bash
# On Coolify server after copying files
cd /tmp/export_20251107_212721

# Run PostgreSQL client via Docker
docker run --rm -i \
  -e PGPASSWORD='G8umzPMoCWIQDoTKGAy4hXdDE1GS0XafmAt4SJ57YjnwDnaXON9QDr17RrjoktL3' \
  -v "$(pwd):/data" \
  postgres:15 \
  psql -h host.docker.internal -U postgres -d karat_tracker_p < /data/all_tables.sql
```

---

## After Import

### 1. Verify Row Counts

Run the verification query shown above to ensure all data was imported correctly.

### 2. Test Application

- Login to your application
- Test critical features:
  - User authentication
  - View daily rates
  - Create a test sale
  - Add a test expense
  - Check activity log

### 3. Update Application Configuration

If not already done, update your docker-compose.production.yml or Coolify environment variables to point to the new database:

```yaml
PGRST_DB_URI: postgres://authenticator:PASSWORD@69.62.84.73:5432/karat_tracker_p
```

### 4. Keep Supabase as Backup

Don't delete your Supabase project immediately. Keep it as a read-only backup for 7-14 days to ensure everything works properly with the new database.

---

## Troubleshooting

### "psql: command not found"

Install PostgreSQL client on the server:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql-client

# CentOS/RHEL
sudo yum install postgresql
```

### "Connection refused"

Check if PostgreSQL is running:

```bash
sudo systemctl status postgresql
```

If it's in Docker:

```bash
docker ps | grep postgres
```

### "Permission denied"

Ensure the postgres user has correct permissions:

```bash
# Connect as postgres superuser
sudo -u postgres psql

# Grant permissions
GRANT ALL PRIVILEGES ON DATABASE karat_tracker_p TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
```

---

## Summary

1. ✅ **Data Exported:** migration/exports/export_20251107_212721/
2. ⏳ **Copy to Server:** Use SCP/WinSCP to copy files to Coolify server
3. ⏳ **SSH to Server:** Login to 69.62.84.73
4. ⏳ **Run Import:** Execute the psql commands above
5. ⏳ **Verify:** Check row counts match
6. ⏳ **Test:** Verify application works
7. ⏳ **Monitor:** Watch for 24-48 hours

---

Good luck! 🚀
