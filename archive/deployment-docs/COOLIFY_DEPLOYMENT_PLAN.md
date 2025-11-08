# Coolify Deployment Plan - Karat Tracker

## Current Setup Overview

**Local Test Environment (Working):**
- PostgreSQL Database: Coolify Cloud (already deployed)
- PostgREST API: Local Docker container
- Frontend: Local Docker container (React + Vite + Nginx)

**Goal:** Deploy PostgREST and Frontend to Coolify, connecting to existing PostgreSQL database

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Coolify                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │   Frontend   │─────▶│   PostgREST  │────┐                │
│  │  (React+Vite)│      │   (REST API) │    │                │
│  │   Port: 80   │      │   Port: 3000 │    │                │
│  └──────────────┘      └──────────────┘    │                │
│         │                      ▲            │                │
│         │                      │            │                │
│         │                      │            ▼                │
│         │                      │    ┌──────────────┐        │
│         │                      │    │  PostgreSQL  │        │
│         │                      └────│   Database   │        │
│         │                           │   Port: 5432 │        │
│         │                           └──────────────┘        │
│         │                                                    │
│         ▼                                                    │
│    User Browser                                              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites Checklist

- [x] Coolify instance running
- [x] PostgreSQL database deployed on Coolify
- [x] Database connection details noted:
  - Host: `69.62.84.73`
  - Port: `5432`
  - Database: `karat_tracker_t`
  - User: `authenticator`
  - Password: `2ewYVu8cBJWFi/24H8ZTEB0BNNPfDf6eAda4htzgXy0=`
- [x] JWT Secret: `7XMblEc5aEcKvaIWJ4mcDhBJRlQXAW9NU0KxLdxxx4w=`
- [ ] Domain names configured (optional but recommended)
- [ ] Git repository accessible to Coolify

---

## Deployment Steps

### Phase 1: Prepare Repository for Deployment

#### 1.1 Create Production Environment File

Create `.env.production` in the root directory:

```env
# Database Connection (URL-encoded password)
PGRST_DB_URI=postgres://authenticator:2ewYVu8cBJWFi%2F24H8ZTEB0BNNPfDf6eAda4htzgXy0%3D@69.62.84.73:5432/karat_tracker_t

# Database Configuration
PGRST_DB_SCHEMAS=public
PGRST_DB_ANON_ROLE=web_anon

# JWT Secret
PGRST_JWT_SECRET=7XMblEc5aEcKvaIWJ4mcDhBJRlQXAW9NU0KxLdxxx4w=

# Server Configuration
PGRST_SERVER_HOST=*
PGRST_SERVER_PORT=3000

# API URL (will be set in Coolify)
PGRST_OPENAPI_SERVER_PROXY_URI=https://api.yourdomain.com

# Frontend Build Args
VITE_API_URL=https://api.yourdomain.com
VITE_APP_NAME=Karat Tracker
VITE_APP_VERSION=2.0.0
```

**Note:** Do NOT commit this file to Git. Add to `.gitignore`.

#### 1.2 Create Production Docker Compose (Optional)

Create `docker-compose.production.yml`:

```yaml
version: '3.8'

services:
  # PostgREST API (connects to Coolify PostgreSQL)
  postgrest:
    image: postgrest/postgrest:v12.0.3
    ports:
      - "3000:3000"
    environment:
      PGRST_DB_URI: ${PGRST_DB_URI}
      PGRST_DB_SCHEMAS: ${PGRST_DB_SCHEMAS:-public}
      PGRST_DB_ANON_ROLE: ${PGRST_DB_ANON_ROLE:-web_anon}
      PGRST_JWT_SECRET: ${PGRST_JWT_SECRET}
      PGRST_SERVER_HOST: ${PGRST_SERVER_HOST:-*}
      PGRST_SERVER_PORT: ${PGRST_SERVER_PORT:-3000}
      PGRST_OPENAPI_SERVER_PROXY_URI: ${PGRST_OPENAPI_SERVER_PROXY_URI}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend Application
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL}
        VITE_APP_NAME: ${VITE_APP_NAME:-Karat Tracker}
        VITE_APP_VERSION: ${VITE_APP_VERSION:-2.0.0}
    ports:
      - "80:80"
    depends_on:
      - postgrest
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  default:
    name: karat-network
```

#### 1.3 Update .gitignore

```
# Add to .gitignore
.env.production
.env.local
```

#### 1.4 Commit Changes

```bash
git add .
git commit -m "feat: Add production deployment configuration"
git push origin main
```

---

### Phase 2: Deploy PostgREST on Coolify

#### 2.1 Create PostgREST Service

1. **Login to Coolify Dashboard**
2. **Navigate to your project** (or create new: "karat-tracker")
3. **Click "New Resource" → "Docker Compose"**

#### 2.2 Configure PostgREST Service

**Option A: Using Docker Image Directly (Recommended)**

1. Click "New Resource" → "Docker Image"
2. Configure:
   ```
   Name: karat-tracker-postgrest
   Image: postgrest/postgrest:v12.0.3
   Port: 3000
   ```

3. **Set Environment Variables:**
   ```env
   PGRST_DB_URI=postgres://authenticator:2ewYVu8cBJWFi%2F24H8ZTEB0BNNPfDf6eAda4htzgXy0%3D@69.62.84.73:5432/karat_tracker_t
   PGRST_DB_SCHEMAS=public
   PGRST_DB_ANON_ROLE=web_anon
   PGRST_JWT_SECRET=7XMblEc5aEcKvaIWJ4mcDhBJRlQXAW9NU0KxLdxxx4w=
   PGRST_SERVER_HOST=*
   PGRST_SERVER_PORT=3000
   PGRST_OPENAPI_SERVER_PROXY_URI=https://api.yourdomain.com
   ```

4. **Health Check Configuration:**
   - Health Check Path: `/`
   - Health Check Port: `3000`
   - Health Check Method: `GET`

5. **Click "Deploy"**

**Option B: Using Git Repository**

1. Click "New Resource" → "Git Repository"
2. Connect your repository
3. Set Build Method: "Docker Image"
4. Set Image: `postgrest/postgrest:v12.0.3`
5. Configure environment variables as above
6. Deploy

#### 2.3 Verify PostgREST Deployment

```bash
# Test health endpoint
curl https://api.yourdomain.com/

# Should return OpenAPI documentation or empty result
# Test a table endpoint
curl https://api.yourdomain.com/users
```

---

### Phase 3: Deploy Frontend on Coolify

#### 3.1 Create Frontend Service

1. **Navigate to your Coolify project**
2. **Click "New Resource" → "Git Repository"**
3. **Connect your Git repository**

#### 3.2 Configure Frontend Build

1. **Build Configuration:**
   ```
   Name: karat-tracker-frontend
   Build Pack: Dockerfile
   Dockerfile Location: ./Dockerfile
   Context: ./
   Port: 80
   ```

2. **Set Build Arguments:**
   ```
   VITE_API_URL=https://api.yourdomain.com
   VITE_APP_NAME=Karat Tracker
   VITE_APP_VERSION=2.0.0
   ```

3. **Build Command:** (Coolify will use Dockerfile automatically)

#### 3.3 Deploy Frontend

1. **Click "Deploy"**
2. **Monitor build logs** - should see:
   ```
   Building React app...
   Creating optimized production build...
   Build completed successfully
   Copying to Nginx...
   ```
3. **Wait for deployment to complete**

#### 3.4 Verify Frontend Deployment

1. Access frontend URL: `https://app.yourdomain.com` or `https://yourdomain.com`
2. Check browser console for errors
3. Test login functionality

---

### Phase 4: Configure Domains and SSL

#### 4.1 Configure PostgREST Domain

1. **In PostgREST service settings:**
   - Go to "Domains" tab
   - Add domain: `api.yourdomain.com`
   - Enable "Generate SSL Certificate" (Let's Encrypt)
   - Save

2. **Add DNS Record:**
   ```
   Type: A
   Name: api
   Value: [Your Coolify Server IP]
   TTL: 300
   ```

#### 4.2 Configure Frontend Domain

1. **In Frontend service settings:**
   - Go to "Domains" tab
   - Add domain: `yourdomain.com` or `app.yourdomain.com`
   - Enable "Generate SSL Certificate"
   - Save

2. **Add DNS Record:**
   ```
   Type: A
   Name: @ (or app)
   Value: [Your Coolify Server IP]
   TTL: 300
   ```

#### 4.3 Update Environment Variables

After domains are configured:

1. **Update PostgREST:**
   ```env
   PGRST_OPENAPI_SERVER_PROXY_URI=https://api.yourdomain.com
   ```

2. **Update Frontend Build Args:**
   ```env
   VITE_API_URL=https://api.yourdomain.com
   ```

3. **Redeploy both services**

---

### Phase 5: Testing and Verification

#### 5.1 Test PostgREST API

```bash
# 1. Health Check
curl https://api.yourdomain.com/

# 2. Test users endpoint
curl https://api.yourdomain.com/users

# 3. Test authentication
curl -X POST https://api.yourdomain.com/rpc/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"your-password"}'

# 4. Test protected endpoint with JWT
curl https://api.yourdomain.com/sales_log \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 5.2 Test Frontend Application

1. **Open browser:** `https://yourdomain.com`
2. **Test Login:**
   - Enter credentials
   - Verify successful login
   - Check JWT token storage
3. **Test Features:**
   - View Sales Log
   - View Expense Log
   - Add new sale/expense
   - Export data
   - View daily rates
4. **Check Browser Console:**
   - No CORS errors
   - No 404 errors
   - API calls working

#### 5.3 Test CORS Configuration

```bash
# Test CORS headers
curl -I -X OPTIONS https://api.yourdomain.com/users \
  -H "Origin: https://yourdomain.com" \
  -H "Access-Control-Request-Method: GET"

# Should return:
# Access-Control-Allow-Origin: https://yourdomain.com
# Access-Control-Allow-Methods: GET, POST, PATCH, DELETE
```

---

### Phase 6: Production Migration (Supabase to PostgreSQL)

**Important:** Only proceed after PostgREST and Frontend are working correctly.

#### 6.1 Backup Supabase Data

```bash
cd migration

# Set Supabase credentials
export SUPABASE_PROJECT_ID="your-project-id"
export SUPABASE_DB_PASSWORD="your-supabase-password"

# Run export
chmod +x export-from-supabase.sh
./export-from-supabase.sh
```

#### 6.2 Import to Coolify PostgreSQL

```bash
# Set PostgreSQL credentials
export DB_HOST="69.62.84.73"
export DB_PORT="5432"
export DB_NAME="karat_tracker_t"
export DB_USER="authenticator"
export DB_PASSWORD="2ewYVu8cBJWFi/24H8ZTEB0BNNPfDf6eAda4htzgXy0="

# Run import
chmod +x import-to-postgres.sh
./import-to-postgres.sh
```

#### 6.3 Verify Data Migration

```bash
# Connect to PostgreSQL
psql -h 69.62.84.73 -p 5432 -U authenticator -d karat_tracker_t

# Run verification queries
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM sales_log;
SELECT COUNT(*) FROM expense_log;
SELECT COUNT(*) FROM daily_rates;

# Check recent data
SELECT * FROM sales_log ORDER BY created_at DESC LIMIT 5;
```

#### 6.4 Update Application

- Restart PostgREST service (if needed)
- Test login and data access
- Verify all features work with migrated data

---

### Phase 7: Post-Deployment Configuration

#### 7.1 Setup Monitoring

1. **Enable Coolify Monitoring:**
   - Enable monitoring for PostgREST service
   - Enable monitoring for Frontend service
   - Set up uptime alerts

2. **Configure Health Checks:**
   - PostgREST: `https://api.yourdomain.com/`
   - Frontend: `https://yourdomain.com/`

#### 7.2 Configure Backups

**PostgreSQL Database Backups:**

1. **Automated Backups in Coolify:**
   - Navigate to PostgreSQL service
   - Enable "Automatic Backups"
   - Set frequency: Daily
   - Set retention: 7-30 days

2. **Manual Backup Script:**

Create `backup-database.sh`:

```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
PGPASSWORD="2ewYVu8cBJWFi/24H8ZTEB0BNNPfDf6eAda4htzgXy0=" pg_dump \
  -h 69.62.84.73 \
  -p 5432 \
  -U authenticator \
  -d karat_tracker_t \
  --no-owner \
  --no-privileges \
  -f $BACKUP_DIR/backup_$DATE.sql

# Compress
gzip $BACKUP_DIR/backup_$DATE.sql

echo "Backup completed: $BACKUP_DIR/backup_$DATE.sql.gz"
```

#### 7.3 Setup Logging

1. **Access Logs:**
   ```bash
   # PostgREST logs in Coolify
   # Navigate to service → Logs tab

   # Or via Docker
   docker logs karat-tracker-postgrest --tail=100 -f
   docker logs karat-tracker-frontend --tail=100 -f
   ```

2. **Monitor Error Rates:**
   - Check Coolify dashboard regularly
   - Set up alerts for high error rates

---

## Deployment Checklist

### Pre-Deployment

- [ ] PostgreSQL database is running and accessible
- [ ] Database credentials are correct and tested
- [ ] JWT secret is configured
- [ ] Domain names are registered
- [ ] DNS records are configured
- [ ] Git repository is accessible to Coolify

### PostgREST Deployment

- [ ] PostgREST service created in Coolify
- [ ] Environment variables configured
- [ ] Health checks configured
- [ ] Domain configured with SSL
- [ ] API endpoint accessible
- [ ] Test queries return data

### Frontend Deployment

- [ ] Frontend service created in Coolify
- [ ] Build args configured correctly
- [ ] Dockerfile builds successfully
- [ ] Domain configured with SSL
- [ ] Application loads in browser
- [ ] No CORS errors

### Testing

- [ ] Login functionality works
- [ ] Sales log loads correctly
- [ ] Expense log loads correctly
- [ ] Daily rates load correctly
- [ ] Add new sale/expense works
- [ ] Export functionality works
- [ ] All API calls successful

### Production Migration

- [ ] Supabase data exported
- [ ] Data imported to PostgreSQL
- [ ] Data counts verified
- [ ] Sample data checked
- [ ] Application works with new data

### Post-Deployment

- [ ] Monitoring configured
- [ ] Health checks working
- [ ] Backups configured
- [ ] Logging accessible
- [ ] Team trained on new system
- [ ] Documentation updated

---

## Monitoring and Maintenance

### Daily Checks

- [ ] Check service status in Coolify
- [ ] Monitor error logs
- [ ] Verify health checks passing

### Weekly Checks

- [ ] Review backup status
- [ ] Check disk space usage
- [ ] Review API usage patterns
- [ ] Check for security updates

### Monthly Checks

- [ ] Update Docker images (if needed)
- [ ] Review and test backups
- [ ] Check database performance
- [ ] Review access logs

---

## Troubleshooting Guide

### PostgREST Issues

**Service Won't Start:**
```bash
# Check logs
docker logs karat-tracker-postgrest

# Common issues:
# 1. Database connection failed
# 2. Invalid JWT secret
# 3. Wrong port configuration
```

**Database Connection Failed:**
```bash
# Test connection from PostgREST container
docker exec karat-tracker-postgrest psql \
  "postgres://authenticator:PASSWORD@69.62.84.73:5432/karat_tracker_t" \
  -c "SELECT 1"

# Check if database is accessible
nc -zv 69.62.84.73 5432
```

**401 Unauthorized Errors:**
- Check JWT secret matches in database and PostgREST
- Verify JWT token is valid and not expired
- Check user roles in database

### Frontend Issues

**Build Fails:**
```bash
# Check build logs in Coolify
# Common issues:
# 1. Missing environment variables
# 2. TypeScript errors
# 3. Node version mismatch
```

**CORS Errors:**
- Verify API URL is correct in frontend
- Check PostgREST is returning CORS headers
- Verify domains are using HTTPS

**White Screen/Blank Page:**
- Check browser console for errors
- Verify Nginx configuration
- Check if build was successful

### Database Issues

**Slow Queries:**
```sql
-- Check slow queries
SELECT pid, query, state, query_start
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;

-- Check database size
SELECT pg_size_pretty(pg_database_size('karat_tracker_t'));
```

**Connection Pool Exhausted:**
- Increase max connections in PostgreSQL
- Check for connection leaks
- Monitor active connections

---

## Rollback Plan

### If PostgREST Deployment Fails

1. **Use local-test environment:**
   ```bash
   docker-compose -f docker-compose-local-test.yml up -d
   ```

2. **Access locally:** `http://localhost:8080`

### If Production Migration Fails

1. **Keep Supabase active** for 30 days
2. **Revert frontend to Supabase:**
   - Update `VITE_API_URL` to Supabase URL
   - Redeploy frontend
3. **Restore from backup if needed**

---

## Performance Optimization

### PostgREST Optimization

1. **Database Indexes:**
   ```sql
   -- Add indexes for frequently queried columns
   CREATE INDEX idx_sales_log_created_at ON sales_log(created_at);
   CREATE INDEX idx_expense_log_created_at ON expense_log(created_at);
   ```

2. **Connection Pooling:**
   - PostgREST handles connection pooling automatically
   - Monitor connection usage in PostgreSQL

### Frontend Optimization

1. **Enable Nginx Caching:**
   Update [nginx.conf](nginx.conf) (already configured)

2. **Enable Gzip Compression:**
   Already enabled in nginx.conf

---

## Security Considerations

### API Security

1. **JWT Secret:**
   - Keep JWT secret secure
   - Rotate periodically (requires user re-authentication)

2. **Database Credentials:**
   - Never commit to Git
   - Store in Coolify environment variables
   - Use strong passwords

3. **Rate Limiting:**
   - Consider adding rate limiting to PostgREST
   - Use Coolify's built-in rate limiting

### Frontend Security

1. **HTTPS Only:**
   - Ensure SSL certificates are valid
   - Force HTTPS redirects

2. **Content Security Policy:**
   - Already configured in nginx.conf
   - Adjust as needed for your domain

---

## Cost Analysis

### Current Setup (Local Test)

- Development only: $0/month

### Coolify Production Deployment

- **VPS (4GB RAM):** $12-20/month
- **Coolify:** Free (self-hosted)
- **PostgreSQL:** Included
- **PostgREST:** Included
- **SSL Certificates:** Free (Let's Encrypt)

**Total: $12-20/month**

### Compared to Supabase

- **Supabase Free Tier:** Limited
- **Supabase Pro:** $25/month
- **Savings:** $5-13/month (20-50%)

---

## Support Resources

- **PostgREST Documentation:** https://postgrest.org/
- **Coolify Documentation:** https://coolify.io/docs
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/
- **Migration Guide:** [migration/README.md](migration/README.md)

---

## Next Steps After Deployment

1. [ ] Monitor for 7 days to ensure stability
2. [ ] Document any issues encountered
3. [ ] Train team on new deployment process
4. [ ] Set up automated backups
5. [ ] Configure monitoring alerts
6. [ ] Update team documentation
7. [ ] Schedule regular maintenance windows
8. [ ] After 30 days: Consider decommissioning Supabase

---

## Success Criteria

Deployment is successful when:

- [x] PostgREST API is accessible and responding
- [x] Frontend loads without errors
- [x] Users can login successfully
- [x] All data operations work (CRUD)
- [x] Export functionality works
- [x] No CORS errors
- [x] SSL certificates are valid
- [x] Health checks passing
- [x] Backups configured
- [x] Monitoring active

---

**Deployment Plan Version:** 1.0
**Last Updated:** 2025-11-06
**Status:** Ready for Implementation
