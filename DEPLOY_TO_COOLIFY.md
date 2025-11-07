# Deploy to Coolify - Quick Start Guide

This guide shows you how to deploy Karat Tracker to Coolify using GitHub with **automatic deployments** on every push.

**Repository:** https://github.com/nankshr/KARAT-TRACKER-2.0

---

## Prerequisites

- ✅ PostgreSQL database deployed on Coolify (already have connection details)
- ✅ GitHub repository: `nankshr/KARAT-TRACKER-2.0` (private)
- ✅ Coolify instance running and accessible
- ✅ Domain names (optional but recommended)

---

## Step 1: Push Code to GitHub

```bash
# Commit your changes
git add .
git commit -m "feat: Add production deployment configuration"
git push origin main
```

**Note:** After initial setup, Coolify will automatically deploy on every push to `main` branch.

---

## Step 2: Deploy PostgREST API to Coolify

### 2.1 Create PostgREST Service

1. **Login to Coolify Dashboard**
2. **Go to your project** (or create new: "karat-tracker")
3. **Click "New Resource" → "Docker Image"**

### 2.2 Configure Service

**Basic Settings:**
```
Name: karat-tracker-api
Image: postgrest/postgrest:v12.0.3
Port: 3000
```

### 2.3 Set Environment Variables

In Coolify's **Environment Variables** section, add:

```env
PGRST_DB_URI=postgres://authenticator:YOUR_URL_ENCODED_PASSWORD@YOUR_DB_HOST:5432/YOUR_DB_NAME
PGRST_DB_SCHEMAS=public
PGRST_DB_ANON_ROLE=web_anon
PGRST_JWT_SECRET=YOUR_JWT_SECRET_HERE
PGRST_SERVER_HOST=*
PGRST_SERVER_PORT=3000
PGRST_OPENAPI_SERVER_PROXY_URI=https://api.yourdomain.com
```

**Your Current Database Connection:**
```env
# Example - Update with your actual values
PGRST_DB_URI=postgres://authenticator:2ewYVu8cBJWFi%2F24H8ZTEB0BNNPfDf6eAda4htzgXy0%3D@69.62.84.73:5432/karat_tracker_t
PGRST_JWT_SECRET=7XMblEc5aEcKvaIWJ4mcDhBJRlQXAW9NU0KxLdxxx4w=
```

**Important:**
- URL-encode special characters in passwords (`/` = `%2F`, `+` = `%2B`, `=` = `%3D`)
- Use online encoder: https://www.urlencoder.org/

### 2.4 Configure Domain (Optional)

1. Go to **"Domains"** tab
2. Add domain: `api.yourdomain.com`
3. Enable **"Generate SSL Certificate"**
4. Save

### 2.5 Deploy

Click **"Deploy"** and wait for the service to start.

### 2.6 Test PostgREST

```bash
# Test API endpoint
curl https://api.yourdomain.com/

# Should return OpenAPI documentation
```

---

## Step 3: Deploy Frontend to Coolify (with Auto-Deploy)

### 3.1 Create Frontend Service

1. **Click "New Resource" → "Git Repository"**
2. **Connect GitHub** (authorize Coolify if needed)
   - Coolify will ask for GitHub authorization
   - Grant access to `nankshr/KARAT-TRACKER-2.0` repository
3. **Select your repository:** `nankshr/KARAT-TRACKER-2.0`
4. **Select branch:** `main`

### 3.2 Configure Build

**Build Settings:**
```
Name: karat-tracker-frontend
Build Pack: Dockerfile
Dockerfile: ./Dockerfile
Context: ./
Port: 80
```

### 3.3 Enable Auto-Deploy (Important!)

**In the "General" or "Settings" tab:**

1. **Enable "Auto Deploy"** or "Automatic Deployment" ✅
2. **Configure deployment trigger:**
   - Watch branch: `main`
   - Auto deploy on push: **Enabled**
3. **Save settings**

**What this does:**
- Coolify will automatically create a GitHub webhook
- Every time you push to `main` branch, Coolify will:
  1. Pull latest code from GitHub
  2. Build new Docker image
  3. Deploy updated container
  4. Zero-downtime deployment

### 3.4 Set Build Arguments

In Coolify's **Build Arguments** section, add:

```
VITE_API_URL=https://api.yourdomain.com
VITE_APP_NAME=Karat Tracker
VITE_APP_VERSION=2.0.0
```

**Important:** Use your actual API domain (from Step 2.4)

### 3.5 Configure Domain (Optional)

1. Go to **"Domains"** tab
2. Add domain: `yourdomain.com` or `app.yourdomain.com`
3. Enable **"Generate SSL Certificate"**
4. Save

### 3.6 Deploy

Click **"Deploy"** and wait for the build to complete.

**Build Process:**
```
1. Cloning repository...
2. Building Docker image...
3. Installing dependencies...
4. Building React app with Vite...
5. Creating production build...
6. Copying to Nginx...
7. Starting container...
```

### 3.6 Test Frontend

Open browser: `https://yourdomain.com`

---

## Step 4: Configure DNS Records

Add these DNS records at your domain registrar:

```
Type    Name    Value                       TTL
A       api     [Your Coolify Server IP]    300
A       @       [Your Coolify Server IP]    300
```

Or if using subdomain for frontend:
```
Type    Name    Value                       TTL
A       api     [Your Coolify Server IP]    300
A       app     [Your Coolify Server IP]    300
```

---

## Step 5: Verify Deployment

### 5.1 Test API

```bash
# 1. Health check
curl https://api.yourdomain.com/

# 2. Test users endpoint
curl https://api.yourdomain.com/users

# Should return JSON data
```

### 5.2 Test Frontend

1. Open `https://yourdomain.com` in browser
2. Login with your credentials
3. Check:
   - ✅ Sales Log loads
   - ✅ Expense Log loads
   - ✅ Daily Rates load
   - ✅ Can add new entries
   - ✅ Export works
   - ✅ No CORS errors in console

---

## Step 6: Test Auto-Deploy (Important!)

Let's verify that auto-deploy is working correctly:

### 6.1 Make a Small Change

Make a small visible change to test auto-deploy:

```bash
# Example: Update version number in .env.example
# Or change any text in the frontend

git add .
git commit -m "test: Verify auto-deploy is working"
git push origin main
```

### 6.2 Monitor Deployment in Coolify

1. **Go to Frontend service in Coolify**
2. **Watch for:**
   - New deployment triggered automatically
   - Build logs showing progress
   - Status changes: Building → Deploying → Running

3. **Timeline:**
   - Webhook received: ~instantly
   - Build start: ~5-10 seconds
   - Build duration: ~2-5 minutes (depending on changes)
   - Deploy: ~10-30 seconds

### 6.3 Verify Changes Live

1. **Refresh your browser:** `https://yourdomain.com`
2. **Verify your change** is visible
3. **Check build number/timestamp** in Coolify

### 6.4 Check Webhook Configuration

If auto-deploy didn't trigger:

1. **In Coolify:** Go to Frontend service → Settings → Webhooks
2. **Verify webhook is configured:**
   ```
   Webhook URL: https://your-coolify-instance.com/webhooks/...
   Events: Push events
   Active: ✅
   ```

3. **In GitHub:** Go to repository → Settings → Webhooks
4. **Check recent deliveries:**
   - Green checkmark = webhook working ✅
   - Red X = webhook failed ❌ (check Coolify URL)

### 6.5 Troubleshoot Auto-Deploy

**Auto-deploy not working?**

1. **Check webhook URL** in GitHub matches Coolify
2. **Verify GitHub has access** to your repository
3. **Check Coolify logs** for webhook errors
4. **Test manual redeploy** - if it works, issue is webhook
5. **Re-authorize GitHub** in Coolify if needed

---

## Environment Variables Reference

### PostgREST Service (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `PGRST_DB_URI` | PostgreSQL connection string (URL-encoded) | `postgres://user:pass@host:5432/db` |
| `PGRST_DB_SCHEMAS` | Database schemas to expose | `public` |
| `PGRST_DB_ANON_ROLE` | Anonymous role | `web_anon` |
| `PGRST_JWT_SECRET` | JWT secret (must match database) | `your-secret-key` |
| `PGRST_SERVER_HOST` | Server host | `*` |
| `PGRST_SERVER_PORT` | Server port | `3000` |
| `PGRST_OPENAPI_SERVER_PROXY_URI` | API URL | `https://api.yourdomain.com` |

### Frontend Service (Build Arguments)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | PostgREST API URL | `https://api.yourdomain.com` |
| `VITE_APP_NAME` | Application name | `Karat Tracker` |
| `VITE_APP_VERSION` | Application version | `2.0.0` |

---

## Updating Your Application

### Update PostgREST

1. Go to PostgREST service in Coolify
2. Update environment variables if needed
3. Click **"Restart"**

### Update Frontend (Automatic with Auto-Deploy!)

**With Auto-Deploy enabled, just push to GitHub:**

```bash
# Make your changes
git add .
git commit -m "feat: Your changes"
git push origin main
```

**That's it!** Coolify will automatically:
1. Detect the push via webhook
2. Pull latest code from GitHub
3. Build new Docker image with your changes
4. Deploy updated container
5. Switch traffic to new version (zero downtime)

**Monitor deployment:**
- Go to Frontend service in Coolify
- Click "Logs" or "Deployments" tab
- Watch the build progress in real-time

**Manual redeploy (if needed):**
- If webhook fails, click **"Redeploy"** button in Coolify

---

## Troubleshooting

### PostgREST Won't Start

**Check logs in Coolify:**
- Look for database connection errors
- Verify `PGRST_DB_URI` is correct and URL-encoded
- Test database connection manually

**Common Issues:**
```
❌ "connection failed" → Check database host/port
❌ "authentication failed" → Check username/password
❌ "database not found" → Check database name
❌ "invalid JWT secret" → Must match database secret
```

### Frontend Build Fails

**Check build logs in Coolify:**
- Look for TypeScript errors
- Verify all dependencies are in `package.json`
- Check if `VITE_API_URL` is set

**Common Issues:**
```
❌ "Cannot find module" → Missing dependency
❌ "TypeScript error" → Type checking failed
❌ "Build failed" → Check build args are set
```

### CORS Errors in Browser

1. **Check API URL** in frontend build args
2. **Verify domains** are using HTTPS (not HTTP)
3. **Check PostgREST logs** for requests
4. **Test API directly:**
   ```bash
   curl -I https://api.yourdomain.com/users \
     -H "Origin: https://yourdomain.com"
   ```

### Can't Connect to Database

```bash
# Test from your local machine
psql -h YOUR_DB_HOST -p 5432 -U authenticator -d YOUR_DB_NAME

# If connection fails:
# 1. Check firewall rules
# 2. Verify database is running
# 3. Check PostgreSQL allows remote connections
```

---

## Monitoring

### Check Service Status

In Coolify Dashboard:
- ✅ Services are "Running" (green)
- ✅ Health checks passing
- ✅ No error logs

### View Logs

1. Go to service in Coolify
2. Click **"Logs"** tab
3. Monitor for errors

### Health Check URLs

- PostgREST: `https://api.yourdomain.com/`
- Frontend: `https://yourdomain.com/`

---

## Backup Strategy

### Database Backups

**Option 1: Coolify Automatic Backups**
1. Go to PostgreSQL service
2. Enable "Automatic Backups"
3. Set frequency: Daily
4. Set retention: 7-30 days

**Option 2: Manual Backup**
```bash
# Create backup
PGPASSWORD="your-password" pg_dump \
  -h YOUR_DB_HOST \
  -p 5432 \
  -U authenticator \
  -d YOUR_DB_NAME \
  -f backup_$(date +%Y%m%d).sql

# Compress
gzip backup_$(date +%Y%m%d).sql
```

---

## Security Best Practices

- ✅ Use strong, unique passwords
- ✅ Never commit `.env` files to Git
- ✅ Rotate JWT secrets periodically
- ✅ Use HTTPS for all services
- ✅ Enable Coolify firewall
- ✅ Monitor access logs
- ✅ Keep Docker images updated

---

## Quick Reference Commands

```bash
# Test PostgREST API
curl https://api.yourdomain.com/

# Test specific endpoint
curl https://api.yourdomain.com/users

# Check DNS records
dig api.yourdomain.com
dig yourdomain.com

# Test SSL certificate
curl -vI https://api.yourdomain.com/ 2>&1 | grep -i ssl

# Update and auto-deploy
git add . && git commit -m "update" && git push
# Auto-deploy will trigger automatically!
# Watch in Coolify dashboard
```

---

## Cost Estimate

**Coolify Deployment:**
- VPS (4GB RAM, 2 CPU): $12-20/month
- Coolify: Free (self-hosted)
- PostgreSQL: Included
- SSL Certificates: Free (Let's Encrypt)
- **Total: $12-20/month**

---

## Need Help?

1. **Check logs** in Coolify Dashboard
2. **Review this guide** - most issues covered
3. **Test components** individually (DB → API → Frontend)
4. **Check** [.env.example](.env.example) for reference

---

## Next Steps After Deployment

- [ ] Test all features thoroughly
- [ ] Set up monitoring and alerts
- [ ] Configure automated backups
- [ ] Document your specific setup
- [ ] Train team on deployment process
- [ ] Set up staging environment (optional)
- [ ] Monitor for 1-2 weeks before migrating production data

---

**Happy Deploying! 🚀**

For detailed deployment plan, see [COOLIFY_DEPLOYMENT_PLAN.md](COOLIFY_DEPLOYMENT_PLAN.md)
