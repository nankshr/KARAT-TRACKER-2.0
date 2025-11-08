# Karat Tracker 2.0 - Quick Start

## Setup New Database (5 Minutes)

```bash
# 1. Create database
psql -h YOUR_HOST -p 5432 -U postgres -c "CREATE DATABASE karat_tracker_p;"

# 2. Run setup script
psql -h YOUR_HOST -p 5432 -U postgres -d karat_tracker_p -f database/setup-complete.sql

# 3. Set password
psql -h YOUR_HOST -p 5432 -U postgres -d karat_tracker_p \
  -c "ALTER ROLE authenticator PASSWORD 'YOUR_SECURE_PASSWORD';"
```

## Migrate from Supabase

```bash
# Configure
cp migration/config.env.example migration/config.env
# Edit config.env with your credentials

# Run migration
python migration/migrate-api.py full
```

## Verify Setup

```bash
# Check roles
psql -h YOUR_HOST -U postgres -d karat_tracker_p -c "\du"

# Check tables
psql -h YOUR_HOST -U postgres -d karat_tracker_p -c "\dt"

# Test connection as authenticator
psql -h YOUR_HOST -U authenticator -d karat_tracker_p -c "SELECT current_user;"
```

## PostgREST Config

```env
PGRST_DB_URI=postgres://authenticator:PASSWORD@HOST:5432/karat_tracker_p
PGRST_DB_ANON_ROLE=web_anon
PGRST_DB_SCHEMAS=public
PGRST_JWT_SECRET=7XMblEc5aEcKvaIWJ4mcDhBJRlQXAW9NU0KxLdxxx4w=
```

## Done!

✅ Database ready
✅ Roles configured  
✅ Permissions set
✅ Functions created

Read `database/README.md` for detailed documentation.
