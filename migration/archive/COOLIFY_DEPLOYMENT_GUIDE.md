# Coolify Deployment Guide

This guide walks you through deploying Karat Tracker on Coolify with Docker and self-hosted PostgreSQL.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Coolify Setup](#coolify-setup)
3. [Deploy PostgreSQL Database](#deploy-postgresql-database)
4. [Deploy Backend API](#deploy-backend-api)
5. [Deploy Frontend](#deploy-frontend)
6. [Configure Domains and SSL](#configure-domains-and-ssl)
7. [Post-Deployment](#post-deployment)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)

---

## Prerequisites

### On Your VPS:
- [x] Coolify installed and running
- [x] Docker and Docker Compose installed
- [x] Minimum 2GB RAM, 2 CPU cores (4GB RAM recommended)
- [x] Domain name pointed to your VPS (optional but recommended)

### On Your Local Machine:
- [x] Git installed
- [x] Access to your Supabase database
- [x] `pg_dump` and `psql` tools installed (for database migration)

---

## Coolify Setup

### 1. Access Coolify Dashboard

```bash
# Access Coolify at your VPS IP or domain
https://your-coolify-instance.com
```

### 2. Create New Project

1. Click **"New Project"**
2. Name: `karat-tracker`
3. Description: `Jewelry Sales and Expense Tracking System`
4. Click **"Create"**

### 3. Connect Git Repository

1. Go to your project
2. Click **"New Resource"** → **"Git Repository"**
3. Connect your Git provider (GitHub, GitLab, etc.)
4. Select the `karat-tracker` repository
5. Or use manual deployment (upload files directly)

---

## Deploy PostgreSQL Database

### Option 1: Using Coolify's Database Service (Recommended)

1. **Create Database:**
   - In Coolify, click **"New Resource"** → **"Database"**
   - Select **"PostgreSQL 15"**
   - Configure:
     ```
     Name: karat-tracker-db
     Database Name: karat_tracker
     Username: karat_user
     Password: [Generate a secure password]
     ```

2. **Deploy Database:**
   - Click **"Deploy"**
   - Wait for deployment to complete
   - Note down connection details:
     ```
     Host: [provided by Coolify]
     Port: 5432
     Database: karat_tracker
     Username: karat_user
     Password: [your password]
     ```

3. **Migrate Data from Supabase:**

   Follow the [Database Migration Guide](./README.md):

   ```bash
   # Export from Supabase
   cd migration
   ./export-from-supabase.sh

   # Import to your PostgreSQL
   export DB_HOST="your-coolify-db-host"
   export DB_PORT="5432"
   export DB_NAME="karat_tracker"
   export DB_USER="karat_user"
   export DB_PASSWORD="your-password"

   ./import-to-postgres.sh
   ```

4. **Verify Database:**

   ```bash
   # Connect to database
   psql -h your-coolify-db-host \
        -p 5432 \
        -U karat_user \
        -d karat_tracker

   # Check tables
   \dt

   # Check data
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM sales_log;
   SELECT COUNT(*) FROM expense_log;
   ```

### Option 2: Using Docker Compose

If you prefer to manage the database yourself:

1. Create a standalone database service in Coolify
2. Use the provided `docker-compose.yml`
3. Deploy as a Docker Compose service

---

## Deploy Backend API

### 1. Prepare Backend

Ensure these files exist in your repository:
- `backend/Dockerfile`
- `backend/src/server.js`
- `backend/package.json`

### 2. Create Backend Service in Coolify

1. **Add New Resource:**
   - Click **"New Resource"** → **"Application"**
   - Select **"Dockerfile"**

2. **Configure Application:**
   ```
   Name: karat-tracker-backend
   Build Pack: Dockerfile
   Dockerfile Location: backend/Dockerfile
   Context: backend/
   Port: 3000
   ```

3. **Set Environment Variables:**

   In Coolify's Environment tab, add:
   ```env
   NODE_ENV=production
   PORT=3000

   # Database Configuration
   DB_HOST=karat-tracker-db  # Or your database host
   DB_PORT=5432
   DB_NAME=karat_tracker
   DB_USER=karat_user
   DB_PASSWORD=your-secure-password

   # Security
   API_KEY=generate-a-secure-random-key
   SESSION_SECRET=generate-another-secure-key

   # CORS - Add your frontend domain
   CORS_ORIGIN=https://yourdomain.com

   # OpenAI (if using AI features)
   OPENAI_API_KEY=sk-your-openai-key
   ```

   **Generate secure keys:**
   ```bash
   # Generate API_KEY
   openssl rand -base64 32

   # Generate SESSION_SECRET
   openssl rand -base64 32
   ```

4. **Deploy Backend:**
   - Click **"Deploy"**
   - Monitor build logs
   - Wait for successful deployment

5. **Verify Backend:**
   ```bash
   # Test health endpoint
   curl https://your-backend-url/health

   # Should return:
   # {"status":"ok","timestamp":"...","service":"karat-tracker-api"}
   ```

---

## Deploy Frontend

### 1. Prepare Frontend

Ensure these files exist:
- `Dockerfile.frontend`
- `nginx.conf`
- `package.json`
- `vite.config.ts`

### 2. Create Frontend Service in Coolify

1. **Add New Resource:**
   - Click **"New Resource"** → **"Application"**
   - Select **"Dockerfile"**

2. **Configure Application:**
   ```
   Name: karat-tracker-frontend
   Build Pack: Dockerfile
   Dockerfile Location: Dockerfile.frontend
   Context: ./
   Port: 80
   ```

3. **Set Build Arguments (if needed):**
   ```
   VITE_API_URL=https://api.yourdomain.com/api
   VITE_APP_NAME=Karat Tracker
   VITE_APP_VERSION=2.0.0
   ```

4. **Set Environment Variables:**
   ```env
   VITE_API_URL=https://api.yourdomain.com/api
   VITE_APP_NAME=Karat Tracker
   VITE_APP_VERSION=2.0.0
   VITE_OPENAI_API_KEY=sk-your-openai-key  # If using AI features
   ```

5. **Deploy Frontend:**
   - Click **"Deploy"**
   - Monitor build logs
   - Wait for successful deployment

---

## Configure Domains and SSL

### 1. Backend Domain

1. In backend service settings, go to **"Domains"**
2. Add domain: `api.yourdomain.com`
3. Enable **"Generate SSL Certificate"** (Let's Encrypt)
4. Save and wait for SSL provisioning

### 2. Frontend Domain

1. In frontend service settings, go to **"Domains"**
2. Add domain: `yourdomain.com` or `app.yourdomain.com`
3. Enable **"Generate SSL Certificate"**
4. Save and wait for SSL provisioning

### 3. Update DNS Records

Add these DNS records at your domain registrar:

```
Type    Name    Value                   TTL
A       @       your-vps-ip-address     300
A       api     your-vps-ip-address     300
```

Or if using subdomains for frontend:
```
Type    Name    Value                   TTL
A       app     your-vps-ip-address     300
A       api     your-vps-ip-address     300
```

### 4. Update CORS Configuration

After domains are set:

1. Update backend environment variable:
   ```env
   CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
   ```

2. Redeploy backend service

---

## Post-Deployment

### 1. Test Application

1. **Visit Frontend:**
   ```
   https://yourdomain.com
   ```

2. **Test Login:**
   - Login with existing credentials
   - Verify authentication works

3. **Test Data Operations:**
   - View sales log
   - View expense log
   - View daily rates
   - Add new sale/expense
   - Export data

4. **Test API Directly:**
   ```bash
   # Health check
   curl https://api.yourdomain.com/health

   # Login (get session)
   curl -X POST https://api.yourdomain.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"your-username","password":"your-password"}'

   # Get sales (with session)
   curl https://api.yourdomain.com/api/sales \
     -H "x-session-id: your-session-id"
   ```

### 2. Configure Backups

1. **Database Backups:**

   In Coolify, enable automatic backups for PostgreSQL:
   - Go to database service
   - Enable **"Automatic Backups"**
   - Set frequency (daily recommended)
   - Set retention (7-30 days)

2. **Manual Backup Script:**

   Create backup script on VPS:
   ```bash
   #!/bin/bash
   # /root/backup-karat-tracker.sh

   BACKUP_DIR="/root/backups/karat-tracker"
   DATE=$(date +%Y%m%d_%H%M%S)

   mkdir -p $BACKUP_DIR

   # Backup database
   docker exec karat-tracker-db pg_dump \
     -U karat_user karat_tracker \
     > $BACKUP_DIR/db_backup_$DATE.sql

   # Compress
   gzip $BACKUP_DIR/db_backup_$DATE.sql

   # Keep only last 7 backups
   ls -t $BACKUP_DIR/*.sql.gz | tail -n +8 | xargs rm -f

   echo "Backup completed: $DATE"
   ```

   Make executable and add to cron:
   ```bash
   chmod +x /root/backup-karat-tracker.sh

   # Add to crontab (daily at 2 AM)
   crontab -e
   # Add: 0 2 * * * /root/backup-karat-tracker.sh
   ```

### 3. Monitoring Setup

1. **Enable Coolify Monitoring:**
   - In each service, enable monitoring
   - Set up alerts for downtime

2. **Monitor Logs:**
   ```bash
   # Backend logs
   docker logs -f karat-tracker-backend

   # Frontend logs
   docker logs -f karat-tracker-frontend

   # Database logs
   docker logs -f karat-tracker-db
   ```

3. **Set Up Health Checks:**

   Coolify automatically monitors health endpoints. Ensure they work:
   - Backend: `https://api.yourdomain.com/health`
   - Frontend: `https://yourdomain.com/`

---

## Monitoring and Maintenance

### Regular Maintenance Tasks

#### Daily:
- Check service status in Coolify
- Monitor error logs

#### Weekly:
- Review backup status
- Check disk space usage
- Review API usage

#### Monthly:
- Update dependencies (if needed)
- Review and rotate API keys
- Test disaster recovery

### Monitoring Commands

```bash
# Check disk usage
df -h

# Check Docker containers
docker ps

# Check Docker resource usage
docker stats

# View logs
docker logs karat-tracker-backend --tail=100
docker logs karat-tracker-frontend --tail=100

# Check database connections
docker exec karat-tracker-db psql -U karat_user -d karat_tracker \
  -c "SELECT count(*) FROM pg_stat_activity;"
```

### Scaling Considerations

If you need to scale:

1. **Vertical Scaling (Upgrade VPS):**
   - Upgrade to more RAM/CPU
   - Restart services

2. **Horizontal Scaling:**
   - Deploy multiple backend instances
   - Use Coolify's built-in load balancing
   - Consider database connection pooling

---

## Troubleshooting

### Backend Won't Start

1. Check environment variables
2. Check database connectivity
3. Review backend logs
4. Verify database is running

```bash
# Check backend logs
docker logs karat-tracker-backend

# Test database connection
docker exec karat-tracker-backend node -e "
  const { Client } = require('pg');
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });
  client.connect().then(() => console.log('OK')).catch(console.error);
"
```

### Frontend Build Fails

1. Check build logs in Coolify
2. Verify environment variables
3. Ensure `VITE_API_URL` is set correctly
4. Check for TypeScript errors

### CORS Errors

1. Verify `CORS_ORIGIN` in backend includes frontend domain
2. Check that domains use HTTPS
3. Ensure no trailing slashes in URLs

### Database Connection Issues

1. Check database is running
2. Verify connection credentials
3. Check network connectivity
4. Review PostgreSQL logs

---

## Rollback Plan

If you need to rollback to Supabase:

1. **Keep Supabase Active:**
   - Don't delete Supabase project for 30 days

2. **Rollback Steps:**
   ```bash
   # 1. Update frontend .env
   cp .env.example .env
   # Add Supabase credentials

   # 2. Revert code changes
   git checkout main  # or your pre-migration branch

   # 3. Redeploy on Vercel
   vercel --prod

   # 4. Update DNS back to Vercel
   ```

3. **Verify Rollback:**
   - Test login
   - Verify data access
   - Check all functionality

---

## Cost Comparison

### Before (Vercel + Supabase):
- Vercel: $0-$20/month
- Supabase Pro: $25/month
- **Total: $25-45/month**

### After (Coolify):
- VPS (4GB RAM): $12-20/month
- Coolify: Free (self-hosted)
- PostgreSQL: Included
- **Total: $12-20/month**

**Monthly Savings: $13-25 (40-55%)**

---

## Support and Resources

- **Coolify Documentation:** https://coolify.io/docs
- **Docker Documentation:** https://docs.docker.com/
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/
- **Migration Issues:** Check migration/README.md

---

## Next Steps

After successful deployment:

1. ✅ Test all functionality thoroughly
2. ✅ Set up monitoring and alerts
3. ✅ Configure automated backups
4. ✅ Update documentation with actual URLs
5. ✅ Train team on new deployment process
6. ✅ Monitor for 30 days before decommissioning Supabase
7. ✅ Celebrate your successful migration! 🎉
