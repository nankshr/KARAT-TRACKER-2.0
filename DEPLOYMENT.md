# 🚀 Karat Tracker 2.0 - Complete Deployment Guide

<div align="center">

**Production-Ready Deployment with Coolify, PostgreSQL + PostgREST, Docker, and HTTPS**

Version 2.0.0 | Last Updated: November 2024

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Database Setup](#database-setup)
- [Deployment to Coolify](#deployment-to-coolify)
- [HTTPS and Security](#https-and-security)
- [Environment Variables](#environment-variables)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

---

## Overview

This guide covers deploying Karat Tracker 2.0 to production using:
- **Coolify** - Self-hosted PaaS for deployment automation
- **PostgreSQL** - Production database
- **PostgREST** - REST API layer
- **Traefik** - Reverse proxy with automatic HTTPS
- **Docker** - Containerized deployment

### Deployment Timeline

- **Initial Setup**: 15-30 minutes
- **Auto-Deploy After Setup**: 2-5 minutes per push
- **HTTPS Certificate**: Automatic (Let's Encrypt)

---

## Architecture

```
                    Internet
                       │
                       ▼
                 Traefik (HTTPS)
            Let's Encrypt SSL/TLS
                  │       │
        ┌─────────┴───────┴─────────┐
        │                           │
        ▼                           ▼
   Frontend                    PostgREST
   (React + Nginx)             (REST API)
   Port: 80                    Port: 3000
   Internal only               Internal only
        │                           │
        └───────────┬───────────────┘
                    ▼
              PostgreSQL
              Port: 5432
            (Managed by Coolify)
```

### Component Responsibilities

| Component | Purpose | Access |
|-----------|---------|--------|
| **Traefik** | Reverse proxy, HTTPS, routing | External (ports 80, 443) |
| **Frontend** | React application (Vite + Nginx) | Via Traefik |
| **PostgREST** | REST API for PostgreSQL | Via Traefik |
| **PostgreSQL** | Database | Internal only |
| **Docker Network** | Internal communication | Internal only |

---

## Prerequisites

### Required

- ✅ **Coolify instance** running and accessible
- ✅ **PostgreSQL** 15+ (managed by Coolify)
- ✅ **Domain names** configured (recommended):
  - Frontend: `kt.eyediaworks.in` or `yourdomain.com`
  - API: `api.kt.eyediaworks.in` or `api.yourdomain.com`
- ✅ **Git repository** accessible to Coolify
- ✅ **DNS access** to configure A records

### Recommended

- SSH access to Coolify server
- OpenAI API key (for AI features, optional)
- Monitoring/alerting setup

### Version Requirements

- Node.js v18+ (for local development)
- Docker v20+
- PostgreSQL 15+
- PostgREST v12.0.3

---

## Quick Start

### 1. Push to GitHub

```bash
git add .
git commit -m "feat: Production deployment configuration"
git push origin main
```

### 2. Deploy to Coolify

1. **Login to Coolify Dashboard**
2. **Create New Resource** → **Git Repository**
3. **Connect GitHub** and select repository
4. **Configure** environment variables (see [Environment Variables](#environment-variables))
5. **Deploy** and monitor logs

### 3. Verify Deployment

```bash
# Test API
curl https://api.yourdomain.com/

# Test Frontend
curl https://yourdomain.com/
```

**For detailed step-by-step instructions, continue reading below.**

---

## Database Setup

### Step 1: Create Database

Connect to your PostgreSQL instance and create the database:

```bash
psql -h YOUR_HOST -p 5432 -U postgres -c "CREATE DATABASE karat_tracker_p;"
```

### Step 2: Run Setup Script

Execute the complete database setup:

```bash
psql -h YOUR_HOST -p 5432 -U postgres -d karat_tracker_p \
  -f database/setup-complete.sql
```

This script creates:
- ✅ Database roles (`authenticator`, `web_anon`)
- ✅ All tables (users, daily_rates, sales_log, expense_log, activity_log)
- ✅ Authentication functions (login, create_user, change_password)
- ✅ Helper functions (current_user_id, current_user_role, sign_jwt)
- ✅ Proper permissions and grants
- ✅ Performance indexes
- ✅ Row-Level Security (RLS) policies

### Step 3: Set Authenticator Password

```bash
psql -h YOUR_HOST -p 5432 -U postgres -d karat_tracker_p \
  -c "ALTER ROLE authenticator PASSWORD 'YOUR_SECURE_PASSWORD';"
```

**Generate a strong password:**
```bash
openssl rand -base64 32
```

### Step 4: Generate JWT Secret

```bash
openssl rand -base64 32
```

Save this secret - you'll need it for PostgREST configuration.

### Step 5: Verify Setup

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should show: activity_log, daily_rates, expense_log, sales_log, users

-- Check roles exist
SELECT rolname FROM pg_roles
WHERE rolname IN ('authenticator', 'web_anon');

-- Test authentication function
SELECT * FROM login('admin', 'admin');
```

### Database Architecture

**Roles:**
- `authenticator` - PostgREST connection role (LOGIN enabled)
- `web_anon` - API access role (NOLOGIN, granted to authenticator)

**Tables:**
- `users` - User accounts and authentication
- `daily_rates` - Gold/silver daily pricing
- `sales_log` - Sales transactions
- `expense_log` - Expense tracking
- `activity_log` - Complete audit trail

**For detailed database documentation, see [database/README.md](database/README.md)**

---

## Deployment to Coolify

### Option 1: Automatic Deployment (Recommended)

This method enables auto-deploy on every git push.

#### 1. Create Frontend Service

1. **In Coolify**: Click **New Resource** → **Git Repository**
2. **Connect GitHub**: Authorize Coolify to access your repository
3. **Select Repository**: `your-username/KARAT-TRACKER-2.0`
4. **Select Branch**: `main`

#### 2. Configure Frontend Build

**Build Settings:**
```
Name: karat-tracker-frontend
Build Pack: Dockerfile
Dockerfile: ./Dockerfile
Context: ./
Port: 80
```

**Build Arguments:**
```env
VITE_API_URL=https://api.yourdomain.com
VITE_APP_NAME=Karat Tracker
VITE_APP_VERSION=2.0.0
```

#### 3. Enable Auto-Deploy

1. Go to **Settings** or **General** tab
2. Enable **"Auto Deploy"** or **"Automatic Deployment"** ✅
3. Configure:
   - Watch branch: `main`
   - Auto deploy on push: **Enabled**
4. Save settings

**What this does:**
- Creates GitHub webhook automatically
- Every push to `main` triggers deployment
- Zero-downtime rolling updates

#### 4. Configure Frontend Domain

1. Go to **Domains** tab
2. Add domain: `kt.eyediaworks.in` or `yourdomain.com`
3. Enable **"Generate SSL Certificate"** (Let's Encrypt)
4. Save

#### 5. Deploy Frontend

Click **Deploy** and monitor build logs.

Expected output:
```
✓ Building React app with Vite...
✓ Creating production build...
✓ Copying to Nginx...
✓ Starting container...
✓ Health check passed
```

---

### Create PostgREST API Service

#### 1. Create PostgREST Service

1. **In Coolify**: Click **New Resource** → **Docker Image**
2. **Configure**:
   ```
   Name: karat-tracker-api
   Image: postgrest/postgrest:v12.0.3
   Port: 3000
   ```

#### 2. Set Environment Variables

```env
PGRST_DB_URI=postgres://authenticator:YOUR_URL_ENCODED_PASSWORD@YOUR_DB_HOST:5432/karat_tracker_p
PGRST_DB_SCHEMAS=public
PGRST_DB_ANON_ROLE=web_anon
PGRST_JWT_SECRET=YOUR_JWT_SECRET_HERE
PGRST_SERVER_HOST=*
PGRST_SERVER_PORT=3000
PGRST_OPENAPI_SERVER_PROXY_URI=https://api.yourdomain.com
PGRST_SERVER_CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

**Important:** URL-encode special characters in passwords:
- `/` = `%2F`
- `+` = `%2B`
- `=` = `%3D`

Use: https://www.urlencoder.org/

#### 3. Configure API Domain

1. Go to **Domains** tab
2. Add domain: `api.kt.eyediaworks.in` or `api.yourdomain.com`
3. Enable **"Generate SSL Certificate"**
4. Save

#### 4. Deploy PostgREST

Click **Deploy** and verify:

```bash
# Test API endpoint
curl https://api.yourdomain.com/

# Should return OpenAPI documentation
```

---

### Option 2: Docker Compose Deployment

If you prefer deploying both services together:

#### 1. Create Docker Compose Application

1. **In Coolify**: Click **New Resource** → **Git Repository**
2. Select repository and branch
3. **Build Pack**: Docker Compose
4. **Compose File**: `docker-compose.production.yml`

#### 2. Configure Environment Variables

Add all environment variables for both frontend and PostgREST (see above sections).

#### 3. Deploy

Click **Deploy** and monitor both services starting.

---

### Configure DNS Records

Add these DNS records at your domain registrar:

```
Type    Name    Value                       TTL
A       api     [Your Coolify Server IP]    300
A       @       [Your Coolify Server IP]    300
```

Or for subdomains:
```
Type    Name    Value                       TTL
A       api     [Your Coolify Server IP]    300
A       app     [Your Coolify Server IP]    300
```

**Verify DNS** (wait 2-5 minutes):
```bash
ping api.kt.eyediaworks.in
# Should show: Your Coolify Server IP
```

---

## HTTPS and Security

### Automatic HTTPS with Traefik

Coolify's Traefik automatically:
- ✅ Obtains Let's Encrypt SSL certificates
- ✅ Renews certificates automatically (every 90 days)
- ✅ Redirects HTTP to HTTPS
- ✅ Handles SSL/TLS termination

### Security Configuration

#### 1. PostgREST Internal Access

**docker-compose.production.yml:**
```yaml
services:
  postgrest:
    image: postgrest/postgrest:v12.0.3
    # Use Traefik labels for routing (no exposed ports)
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.postgrest.rule=Host(`api.kt.eyediaworks.in`)"
      - "traefik.http.routers.postgrest.entrypoints=https"
      - "traefik.http.routers.postgrest.tls.certresolver=letsencrypt"
      - "traefik.http.services.postgrest.loadbalancer.server.port=3000"
    environment:
      PGRST_DB_URI: ${PGRST_DB_URI}
      PGRST_DB_SCHEMAS: ${PGRST_DB_SCHEMAS:-public}
      PGRST_DB_ANON_ROLE: ${PGRST_DB_ANON_ROLE:-web_anon}
      PGRST_JWT_SECRET: ${PGRST_JWT_SECRET}
      PGRST_SERVER_CORS_ALLOWED_ORIGINS: ${PGRST_SERVER_CORS_ALLOWED_ORIGINS:-https://kt.eyediaworks.in}
    restart: unless-stopped
    healthcheck:
      disable: true  # Alpine image lacks wget/curl
```

**Key Points:**
- PostgREST not exposed directly to internet
- Only accessible through Traefik proxy
- CORS configured for your frontend domain
- Automatic HTTPS certificate

#### 2. Security Headers

Nginx configuration ([nginx.conf](nginx.conf)) includes:
```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

#### 3. CORS Protection

PostgREST CORS configuration:
```env
PGRST_SERVER_CORS_ALLOWED_ORIGINS=https://kt.eyediaworks.in
```

Only allows requests from your frontend domain.

### Security Checklist

- [ ] Use strong passwords (20+ characters)
- [ ] URL-encode passwords in connection strings
- [ ] Keep JWT secret secure (never commit to Git)
- [ ] Rotate JWT secrets periodically
- [ ] Use HTTPS for all services
- [ ] Configure CORS for specific domains only
- [ ] Enable firewall on Coolify server
- [ ] Monitor activity_log for suspicious activity
- [ ] Keep Docker images updated
- [ ] Enable SSL for database connections

---

## Environment Variables

### Frontend Service

```env
# API Configuration
VITE_API_URL=https://api.kt.eyediaworks.in

# Application Settings
VITE_APP_NAME=Karat Tracker
VITE_APP_VERSION=2.0.0

# AI Features (Optional)
VITE_OPENAI_API_KEY=sk-your-openai-api-key

# Development Settings (Optional)
VITE_DEV_MODE=false
```

### PostgREST Service

```env
# Database Connection (URL-encode password!)
PGRST_DB_URI=postgres://authenticator:PASSWORD@HOST:5432/karat_tracker_p

# Database Configuration
PGRST_DB_SCHEMAS=public
PGRST_DB_ANON_ROLE=web_anon

# JWT Secret (generate with: openssl rand -base64 32)
PGRST_JWT_SECRET=YOUR_JWT_SECRET_HERE

# Server Configuration
PGRST_SERVER_HOST=*
PGRST_SERVER_PORT=3000
PGRST_OPENAPI_SERVER_PROXY_URI=https://api.kt.eyediaworks.in

# CORS Configuration
PGRST_SERVER_CORS_ALLOWED_ORIGINS=https://kt.eyediaworks.in
```

### Security Notes

- **Never commit** `.env` files to Git
- Use Coolify's **environment variables** feature for secrets
- **URL-encode** special characters in `PGRST_DB_URI`
- **Rotate JWT secrets** periodically (requires user re-authentication)

---

## Verification

### 1. Test API Endpoints

```bash
# Health check
curl https://api.kt.eyediaworks.in/

# Test users endpoint
curl https://api.kt.eyediaworks.in/users

# Test authentication
curl -X POST https://api.kt.eyediaworks.in/rpc/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# Should return JWT token
```

### 2. Test Frontend Application

1. **Open browser**: `https://kt.eyediaworks.in`
2. **Check HTTPS**: Green padlock should show in browser
3. **Test Login**:
   - Enter credentials
   - Verify successful login
   - Check JWT token stored in localStorage
4. **Test Features**:
   - View Sales Log
   - View Expense Log
   - Add new sale/expense
   - Export data (CSV)
   - View daily rates
   - Update daily rates
5. **Check Browser Console**:
   - No CORS errors
   - No 404 errors
   - API calls working
   - No mixed content warnings

### 3. Test Auto-Deploy

Make a small change to verify auto-deploy:

```bash
# Make a visible change
echo "# Test auto-deploy" >> README.md

git add README.md
git commit -m "test: Verify auto-deploy is working"
git push origin main
```

**Monitor in Coolify:**
1. Go to Frontend service
2. Watch for new deployment triggered automatically
3. Check build logs
4. Verify changes are live (2-5 minutes)

### 4. Security Verification

```bash
# Verify PostgREST is NOT accessible directly
# This should fail (Connection refused or timeout)
curl http://YOUR_SERVER_IP:3000/users
# ✅ If it fails, security is working correctly

# Verify HTTPS redirect
curl -I http://kt.eyediaworks.in/
# Should show: Location: https://kt.eyediaworks.in/

# Verify SSL certificate
curl -vI https://api.kt.eyediaworks.in/ 2>&1 | grep -i ssl
# Should show: SSL certificate verify ok
```

### Deployment Checklist

**Pre-Deployment:**
- [ ] PostgreSQL database running and accessible
- [ ] Database schema installed (setup-complete.sql)
- [ ] Database credentials tested
- [ ] JWT secret generated
- [ ] Domain names registered
- [ ] DNS records configured
- [ ] Git repository accessible to Coolify

**PostgREST Deployment:**
- [ ] PostgREST service created in Coolify
- [ ] Environment variables configured
- [ ] Domain configured with SSL
- [ ] API endpoint accessible via HTTPS
- [ ] Test queries return data
- [ ] CORS configured correctly

**Frontend Deployment:**
- [ ] Frontend service created in Coolify
- [ ] Build args configured
- [ ] Dockerfile builds successfully
- [ ] Domain configured with SSL
- [ ] Application loads in browser
- [ ] No CORS errors
- [ ] Auto-deploy enabled

**Testing:**
- [ ] Login functionality works
- [ ] All data loads correctly (sales, expenses, rates)
- [ ] Can add/edit/delete entries
- [ ] Export functionality works
- [ ] All API calls successful
- [ ] No console errors

**Post-Deployment:**
- [ ] Monitoring configured
- [ ] Health checks working
- [ ] Backups configured
- [ ] Logging accessible
- [ ] Documentation updated
- [ ] Team trained

---

## Troubleshooting

### PostgREST Issues

#### Service Won't Start

**Check logs in Coolify:**
```bash
docker logs karat-tracker-api
```

**Common issues:**
```
❌ "connection failed" → Check database host/port
❌ "authentication failed" → Check username/password (URL-encoded?)
❌ "database not found" → Check database name
❌ "invalid JWT secret" → Must match database secret
```

**Solution:**
1. Verify `PGRST_DB_URI` is correct
2. Test database connection:
   ```bash
   psql "postgres://authenticator:PASSWORD@HOST:5432/karat_tracker_p"
   ```
3. Check if `authenticator` role exists:
   ```sql
   SELECT rolname FROM pg_roles WHERE rolname = 'authenticator';
   ```

#### 401 Unauthorized Errors

**Causes:**
- JWT secret mismatch between PostgREST and database
- JWT token expired
- User role issues

**Solution:**
```sql
-- Check JWT secret in database
SELECT current_setting('app.jwt_secret');

-- Should match PGRST_JWT_SECRET
```

#### Traefik 503 "No Available Server"

**Diagnosis:** Traefik can't reach PostgREST container

**Check:**
1. Container is running:
   ```bash
   docker ps | grep postgrest
   ```
2. Traefik labels are correct:
   ```yaml
   # Must use 'https' not 'websecure' for Coolify
   traefik.http.routers.postgrest.entrypoints=https
   ```
3. Traefik logs:
   ```bash
   docker logs traefik
   ```

**Fix:** Change `entrypoints=websecure` to `entrypoints=https` in docker-compose.production.yml

---

### Frontend Issues

#### Build Fails

**Check build logs in Coolify**

**Common issues:**
```
❌ "Cannot find module" → Missing dependency
❌ "TypeScript error" → Type checking failed
❌ "Build failed" → Check build args are set
```

**Solution:**
1. Verify all dependencies in package.json
2. Check TypeScript configuration
3. Ensure VITE_API_URL is set in build args
4. Try force rebuild:
   ```bash
   # Method 1: Clear cache in Coolify
   # Method 2: Dummy commit
   echo "# Force rebuild" >> README.md
   git add . && git commit -m "Force rebuild" && git push
   ```

#### CORS Errors in Browser

**Error:** `Access to fetch at 'https://api...' has been blocked by CORS policy`

**Solution:**
1. Add CORS configuration to PostgREST:
   ```env
   PGRST_SERVER_CORS_ALLOWED_ORIGINS=https://kt.eyediaworks.in
   ```
2. Restart PostgREST service
3. Clear browser cache (Ctrl+F5)
4. Test API directly:
   ```bash
   curl -I https://api.kt.eyediaworks.in/users \
     -H "Origin: https://kt.eyediaworks.in"
   # Should return: Access-Control-Allow-Origin header
   ```

#### White Screen / Blank Page

**Causes:**
- Build incomplete
- JavaScript errors
- API connection issues

**Solution:**
1. Check browser console for errors (F12)
2. Verify build completed successfully in Coolify logs
3. Check nginx configuration
4. Test API connectivity from browser console:
   ```javascript
   fetch('https://api.kt.eyediaworks.in/')
     .then(r => r.json())
     .then(console.log)
   ```

#### Mixed Content Errors

**Error:** `Mixed Content: The page at 'https://...' was loaded over HTTPS, but requested an insecure resource 'http://...'`

**Solution:**
1. Ensure `VITE_API_URL` uses `https://` not `http://`
2. Force rebuild frontend after fixing
3. Clear browser cache

---

### Database Issues

#### Connection Refused

**Check:**
1. PostgreSQL is running
2. Firewall allows connections
3. PostgreSQL listens on correct port
4. Network connectivity

**Test connection:**
```bash
# From Coolify server
psql -h HOST -p 5432 -U authenticator -d karat_tracker_p

# If connection fails:
# 1. Check pg_hba.conf allows connections
# 2. Verify firewall rules
# 3. Check PostgreSQL is running
```

#### Slow Queries

**Diagnosis:**
```sql
-- Check slow queries
SELECT pid, query, state, query_start
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start < NOW() - INTERVAL '5 seconds'
ORDER BY query_start;

-- Check database size
SELECT pg_size_pretty(pg_database_size('karat_tracker_p'));

-- Check table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Solution:**
1. Add indexes for frequently queried columns
2. Analyze query plans
3. Consider connection pooling (pgBouncer)

#### Row-Level Security Issues

**Error:** `"new row violates row-level security policy for table"`

**Solution:**
1. Check RLS policies:
   ```sql
   SELECT tablename, policyname, cmd, roles
   FROM pg_policies
   WHERE tablename = 'daily_rates'
   ORDER BY policyname;
   ```
2. Ensure policies allow `authenticator` role:
   ```sql
   -- Example permissive policy
   CREATE POLICY "Authenticator can insert" ON daily_rates
   FOR INSERT TO authenticator WITH CHECK (true);
   ```
3. Grant proper permissions:
   ```sql
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticator;
   ```

---

### Auto-Deploy Issues

#### Deployment Not Triggered

**Check:**
1. **In Coolify:** Auto-deploy is enabled
2. **In GitHub:** Webhook exists (Settings → Webhooks)
3. **Webhook deliveries:** Check for errors (green checkmark = working)

**Solution:**
1. Re-authorize GitHub in Coolify
2. Manually trigger webhook in GitHub
3. Check Coolify webhook URL is correct
4. Try manual redeploy to verify configuration

#### Build Fails After Push

**Check build logs** in Coolify for specific errors

**Common fixes:**
1. Verify environment variables still set
2. Check for syntax errors in code
3. Ensure dependencies are in package.json
4. Try force rebuild without cache

---

## Maintenance

### Daily Checks

- [ ] Check service status in Coolify
- [ ] Monitor error logs
- [ ] Verify health checks passing
- [ ] Check SSL certificate expiry (auto-renewed by Traefik)

### Weekly Checks

- [ ] Review backup status
- [ ] Check disk space usage
- [ ] Review API usage patterns
- [ ] Check for security updates
- [ ] Review activity_log for suspicious activity

### Monthly Checks

- [ ] Update Docker images if needed
- [ ] Review and test backups
- [ ] Check database performance
- [ ] Review access logs
- [ ] Rotate JWT secrets (if policy requires)

### Backup Strategy

#### Automatic Backups (Coolify)

1. Go to PostgreSQL service in Coolify
2. Enable "Automatic Backups"
3. Set frequency: Daily
4. Set retention: 7-30 days

#### Manual Backup

```bash
# Create backup
PGPASSWORD="your-password" pg_dump \
  -h YOUR_DB_HOST \
  -p 5432 \
  -U authenticator \
  -d karat_tracker_p \
  -f backup_$(date +%Y%m%d).sql

# Compress
gzip backup_$(date +%Y%m%d).sql

# Restore from backup
PGPASSWORD="your-password" psql \
  -h YOUR_DB_HOST \
  -p 5432 \
  -U postgres \
  -d karat_tracker_p \
  -f backup_20241108.sql
```

#### Application Data Export

Use the migration tools for application-level backups:

```bash
# Export all data from Supabase/PostgreSQL
python migration/migrate-api.py export

# Files saved to: migration/exports/
# - users.json
# - daily_rates.json
# - sales_log.json
# - expense_log.json
# - activity_log.json
```

### Monitoring

#### View Logs

**In Coolify Dashboard:**
1. Go to your service
2. Click **Logs** tab
3. Filter by time range

**Via SSH:**
```bash
# PostgREST logs
docker logs -f karat-tracker-api --tail=100

# Frontend logs
docker logs -f karat-tracker-frontend --tail=100

# All services
docker-compose logs -f
```

#### Health Check URLs

- **Frontend**: `https://kt.eyediaworks.in/`
- **PostgREST**: `https://api.kt.eyediaworks.in/`

#### Monitor Performance

```bash
# Check container resource usage
docker stats

# Check disk space
df -h

# Check network connections
netstat -an | grep :443
```

### Updating Services

#### Update PostgREST

1. Go to PostgREST service in Coolify
2. Update image tag: `postgrest/postgrest:v12.0.3` → `postgrest/postgrest:v12.1.0`
3. Click **Restart**
4. Monitor logs for errors

#### Update Frontend (Automatic)

**With auto-deploy enabled:**
```bash
# Make your changes
git add .
git commit -m "feat: Your changes"
git push origin main

# Auto-deploy triggers automatically
# Monitor in Coolify dashboard
```

**Manual redeploy:**
1. Go to Frontend service in Coolify
2. Click **Redeploy** button

### Rollback Plan

#### If Deployment Fails

1. **Check previous deployments** in Coolify
2. **Rollback to previous version**:
   ```bash
   git revert HEAD
   git push origin main
   # Auto-deploy triggers with previous version
   ```

#### If Database Migration Fails

1. **Restore from backup**:
   ```bash
   psql -h HOST -U postgres -d karat_tracker_p -f backup.sql
   ```
2. **Verify data**:
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM sales_log;
   ```

---

## Cost Estimate

### Coolify Deployment

- **VPS** (4GB RAM, 2 CPU): $12-20/month
- **Coolify**: Free (self-hosted)
- **PostgreSQL**: Included
- **SSL Certificates**: Free (Let's Encrypt)
- **Total**: **$12-20/month**

### Compared to Alternatives

- **Supabase Pro**: $25/month
- **Heroku**: $25-50/month
- **AWS (managed)**: $50-100/month
- **Savings**: 20-80% with Coolify

---

## Support Resources

- **Database Guide**: [database/README.md](database/README.md)
- **Migration Guide**: [migration/README.md](migration/README.md)
- **Docker Configuration**: [docker-compose.production.yml](docker-compose.production.yml)
- **Nginx Configuration**: [nginx.conf](nginx.conf)
- **PostgREST Documentation**: https://postgrest.org/
- **Coolify Documentation**: https://coolify.io/docs
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/

---

## Quick Reference Commands

```bash
# Test PostgREST API
curl https://api.kt.eyediaworks.in/

# Test specific endpoint
curl https://api.kt.eyediaworks.in/users

# Test authentication
curl -X POST https://api.kt.eyediaworks.in/rpc/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# Check DNS
dig api.kt.eyediaworks.in
dig kt.eyediaworks.in

# Test SSL certificate
curl -vI https://api.kt.eyediaworks.in/ 2>&1 | grep -i ssl

# Deploy update
git add . && git commit -m "update" && git push
# Watch deployment in Coolify dashboard

# View logs
docker logs -f karat-tracker-api
docker logs -f karat-tracker-frontend

# Backup database
pg_dump -h HOST -U authenticator -d karat_tracker_p -f backup.sql

# Restart services
docker-compose restart postgrest
docker-compose restart frontend
```

---

**Deployment Guide Version:** 2.0.0
**Last Updated:** November 2024
**Status:** Production Ready

For issues or questions, refer to the troubleshooting section above or check the specific component documentation.
