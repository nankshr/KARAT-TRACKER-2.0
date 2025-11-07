# Karat Tracker 2.0 - Deployment Guide

## Overview

This guide covers deploying Karat Tracker 2.0 to Coolify using Docker Compose.

## Architecture

- **Frontend**: React + Vite application served by Nginx
- **PostgREST**: REST API layer for PostgreSQL
- **Database**: PostgreSQL (managed separately in Coolify)

## Prerequisites

1. Coolify instance running
2. PostgreSQL database set up in Coolify with the schema initialized
3. Git repository connected to Coolify

## Local Testing

### Setup

1. **Build and run locally:**
   ```bash
   docker-compose -f docker-compose-local-test.yml up -d --build
   ```

2. **Access the application:**
   - Frontend: http://localhost:3002
   - PostgREST API: http://localhost:3000

3. **Stop the containers:**
   ```bash
   docker-compose -f docker-compose-local-test.yml down
   ```

### Local Configuration

The `docker-compose-local-test.yml` file:
- Connects to your Coolify PostgreSQL database remotely
- Runs PostgREST on port 3000
- Runs frontend on port 3002
- Perfect for testing before deploying to Coolify

## Production Deployment to Coolify

### Step 1: Create New Application in Coolify

1. Log in to your Coolify dashboard
2. Click **+ New Resource** → **Application**
3. Choose your Git repository
4. Select **Docker Compose** as the build pack
5. Set the compose file to: `docker-compose.production.yml`

### Step 2: Configure Environment Variables

In Coolify's Environment Variables section, add:

```bash
# PostgreSQL Connection
PGRST_DB_URI=postgres://authenticator:YOUR_PASSWORD@YOUR_DB_HOST:5432/karat_tracker_t
PGRST_DB_SCHEMAS=public
PGRST_DB_ANON_ROLE=web_anon

# JWT Secret (generate a secure random string)
PGRST_JWT_SECRET=YOUR_JWT_SECRET_HERE

# PostgREST Server Configuration
PGRST_SERVER_HOST=*
PGRST_SERVER_PORT=3000
PGRST_OPENAPI_SERVER_PROXY_URI=https://your-api-domain.com

# Frontend Build Arguments
VITE_API_URL=https://your-api-domain.com
VITE_APP_NAME=Karat Tracker
VITE_APP_VERSION=2.0.0
```

### Step 3: Configure Domains

In Coolify, set up two domains:

1. **Frontend Domain**: `your-app-domain.com`
   - Points to port `3002`
   - This is your main application URL

2. **API Domain**: `your-api-domain.com`
   - Points to port `3000`
   - This is for PostgREST API

### Step 4: Deploy

1. Click **Deploy** in Coolify
2. Monitor the build logs
3. Wait for both services to be healthy

### Step 5: Verify Deployment

1. **Check frontend**: Visit `https://your-app-domain.com`
2. **Check API**: Visit `https://your-api-domain.com` (should show PostgREST info)
3. **Check containers**:
   ```bash
   docker ps
   ```
   You should see both `postgrest` and `frontend` containers running

## Port Configuration

### Why Port 3002?

- Port 8080 is used by Traefik (Coolify's reverse proxy)
- Port 3002 avoids conflicts with other Coolify services
- Same port used in local testing for consistency
- Traefik proxies your domain to port 3002 internally

### Port Mapping

| Service   | Internal Port | External Port | Access                    |
|-----------|---------------|---------------|---------------------------|
| Frontend  | 80            | 3002          | Via domain (Traefik)      |
| PostgREST | 3000          | 3000          | Via API domain (Traefik)  |

## Troubleshooting

### Build Fails: "MIME type error"

**Issue**: The build didn't complete, serving source files instead of built files.

**Solution**:
1. Check that Coolify is using **Docker Compose** build pack (not Static Site)
2. Verify environment variables are set correctly
3. Check build logs for npm/vite errors

### PostgREST Not Running

**Issue**: Only frontend container is running.

**Solution**:
1. Ensure you're using `docker-compose.production.yml`
2. Check PostgREST environment variables
3. Verify PostgreSQL connection string is correct
4. Check PostgREST health check logs

### Connection Refused to Database

**Issue**: PostgREST can't connect to PostgreSQL.

**Solution**:
1. Verify `PGRST_DB_URI` is correct
2. Check that PostgreSQL allows connections from Coolify
3. Ensure the `authenticator` role exists in PostgreSQL
4. Test connection from Coolify server:
   ```bash
   psql "postgres://authenticator:PASSWORD@HOST:5432/karat_tracker_t"
   ```

### Frontend Can't Reach API

**Issue**: Frontend shows API connection errors.

**Solution**:
1. Verify `VITE_API_URL` matches your PostgREST domain
2. Check CORS settings in PostgREST
3. Ensure both containers are on the same network
4. Check browser console for actual error

### Build is Slow

**Issue**: Docker build takes too long.

**Solution**:
- `.dockerignore` file is already configured to exclude `node_modules`, `dist`, etc.
- Coolify caches Docker layers between builds
- First build will always be slower

## File Structure

```
.
├── docker-compose-local-test.yml   # For local testing with Docker Desktop
├── docker-compose.production.yml    # For Coolify deployment
├── Dockerfile                       # Multi-stage build (Node + Nginx)
├── .dockerignore                    # Optimizes build by excluding files
├── nginx.conf                       # Nginx configuration for frontend
└── DEPLOYMENT.md                    # This file
```

## Migration from Single Service to Docker Compose

If you previously deployed the frontend alone:

1. **Delete the old deployment** in Coolify
2. Create a new **Docker Compose** application
3. Configure both domains (app + API)
4. Deploy using the steps above

## Monitoring

### Health Checks

Both services have health checks configured:

**Frontend:**
```bash
wget --spider -q http://localhost/
```

**PostgREST:**
```bash
wget --spider -q http://localhost:3000/
```

### View Logs

In Coolify dashboard:
1. Go to your application
2. Click **Logs** tab
3. Filter by service (frontend or postgrest)

Or via SSH:
```bash
docker logs -f CONTAINER_NAME
```

## Scaling Considerations

### Current Setup
- Single instance of frontend and PostgREST
- Suitable for small to medium loads

### Future Improvements
1. Add PostgreSQL connection pooling (pgBouncer)
2. Scale frontend instances horizontally
3. Add Redis for caching
4. Implement CDN for static assets

## Security Notes

1. **Always use HTTPS** in production (Coolify handles this via Traefik)
2. **Keep JWT_SECRET secure** and rotate periodically
3. **Use strong database passwords**
4. **Restrict PostgreSQL access** to Coolify network only
5. **Enable RLS** (Row Level Security) in PostgreSQL for data protection

## Support

For issues or questions:
1. Check Coolify logs
2. Review this deployment guide
3. Verify environment variables
4. Test locally first with `docker-compose-local-test.yml`
