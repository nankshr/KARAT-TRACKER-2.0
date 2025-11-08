# Fix Security & HTTPS Issues - Single Solution

## 🎯 The Problem

1. **Security Issue:** PostgREST exposed on `http://69.62.84.73:3000` - anyone can access user data
2. **HTTPS Issue:** Frontend (`https://kt.eyediaworks.in`) can't call HTTP API (mixed content blocked)

## ✅ The Solution

**Make PostgREST internal-only** and use a reverse proxy with HTTPS.

---

## Option 1: Using Coolify's Built-in Traefik (Easiest)

### Step 1: Update docker-compose.production.yml

Change PostgREST to bind only to localhost (internal):

```yaml
services:
  postgrest:
    image: postgrest/postgrest:v12.0.3
    container_name: karat-tracker20-postgrest
    ports:
      - "127.0.0.1:3000:3000"  # ← Changed: Only bind to localhost
    environment:
      PGRST_DB_URI: ${PGRST_DB_URI}
      PGRST_DB_SCHEMAS: ${PGRST_DB_SCHEMAS:-public}
      PGRST_DB_ANON_ROLE: ${PGRST_DB_ANON_ROLE:-web_anon}
      PGRST_JWT_SECRET: ${PGRST_JWT_SECRET}
    restart: unless-stopped
    networks:
      - karat-network
```

### Step 2: Add Traefik Labels

In Coolify dashboard:
1. Go to your PostgREST service
2. Add these labels:

```
traefik.enable=true
traefik.http.routers.postgrest.rule=Host(`api.kt.eyediaworks.in`)
traefik.http.routers.postgrest.entrypoints=websecure
traefik.http.routers.postgrest.tls.certresolver=letsencrypt
traefik.http.services.postgrest.loadbalancer.server.port=3000
```

### Step 3: Update Frontend Environment Variable

In Coolify, update:
```
VITE_API_URL=https://api.kt.eyediaworks.in
```

Rebuild frontend.

---

## Option 2: Using Caddy (Simple & Automatic HTTPS)

### Step 1: Update docker-compose.production.yml

```yaml
version: '3.8'

services:
  # PostgREST - Internal only
  postgrest:
    image: postgrest/postgrest:v12.0.3
    container_name: karat-tracker20-postgrest
    expose:
      - "3000"  # ← Exposed only within Docker network, not externally
    environment:
      PGRST_DB_URI: ${PGRST_DB_URI}
      PGRST_DB_SCHEMAS: ${PGRST_DB_SCHEMAS:-public}
      PGRST_DB_ANON_ROLE: ${PGRST_DB_ANON_ROLE:-web_anon}
      PGRST_JWT_SECRET: ${PGRST_JWT_SECRET}
    restart: unless-stopped
    networks:
      - karat-network

  # Caddy - Reverse proxy with automatic HTTPS
  caddy:
    image: caddy:2-alpine
    container_name: karat-tracker20-caddy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    restart: unless-stopped
    networks:
      - karat-network

  # Frontend
  frontend:
    container_name: karat-tracker20-frontend
    build:
      context: .
      dockerfile: Dockerfile
      args:
        VITE_API_URL: https://api.kt.eyediaworks.in
        VITE_APP_NAME: ${VITE_APP_NAME:-Karat Tracker}
        VITE_APP_VERSION: ${VITE_APP_VERSION:-2.0.0}
    expose:
      - "80"  # ← Exposed only within Docker network
    depends_on:
      - postgrest
    restart: unless-stopped
    networks:
      - karat-network

networks:
  karat-network:
    driver: bridge

volumes:
  caddy_data:
  caddy_config:
```

### Step 2: Create Caddyfile

Create `Caddyfile` in project root:

```
# Frontend
kt.eyediaworks.in {
    reverse_proxy frontend:80
}

# API
api.kt.eyediaworks.in {
    reverse_proxy postgrest:3000
}
```

**That's it!** Caddy automatically handles:
- ✅ HTTPS certificates (Let's Encrypt)
- ✅ Certificate renewal
- ✅ HTTP to HTTPS redirect

---

## Option 3: Quick Fix with Firewall (Temporary)

If you want a quick temporary fix while setting up proper reverse proxy:

```bash
# SSH to your Coolify server
ssh user@69.62.84.73

# Block external access to port 3000 (PostgREST)
sudo ufw deny 3000/tcp

# Allow only from localhost
sudo ufw allow from 127.0.0.1 to any port 3000

# Reload firewall
sudo ufw reload

# Check status
sudo ufw status
```

**Note:** This only secures it, doesn't fix the HTTPS issue.

---

## 🎯 Recommended Approach

### For Production: **Option 2 (Caddy)**

**Why?**
- ✅ Automatic HTTPS (no manual cert management)
- ✅ Simple configuration (4 lines of Caddyfile)
- ✅ PostgREST completely internal
- ✅ All traffic encrypted
- ✅ Auto-renewing certificates
- ✅ Works perfectly with Coolify

**Steps:**
1. Update `docker-compose.production.yml` (see Option 2 above)
2. Create `Caddyfile` in project root
3. Update `VITE_API_URL` to `https://api.kt.eyediaworks.in`
4. Deploy to Coolify
5. Done! ✅

---

## 📋 Quick Implementation Guide

### 1. Update docker-compose.production.yml

```bash
# On your local machine
notepad docker-compose.production.yml
```

Make the changes from Option 2 above.

### 2. Create Caddyfile

```bash
# Create new file
notepad Caddyfile
```

Add:
```
kt.eyediaworks.in {
    reverse_proxy frontend:80
}

api.kt.eyediaworks.in {
    reverse_proxy postgrest:3000
}
```

### 3. Update DNS

In your DNS provider (where you manage eyediaworks.in):

Add A record:
```
api.kt.eyediaworks.in → 69.62.84.73
```

### 4. Deploy

```bash
# Commit changes
git add docker-compose.production.yml Caddyfile
git commit -m "Add Caddy reverse proxy for HTTPS and security"
git push

# Coolify will auto-deploy
```

### 5. Verify

```bash
# Test API endpoint (should work and show HTTPS)
curl https://api.kt.eyediaworks.in/

# Test direct access (should fail - not accessible externally)
curl http://69.62.84.73:3000/users
# Should get: Connection refused or timeout

# Test frontend
# Visit: https://kt.eyediaworks.in
# Login should now work!
```

---

## 🔐 Security After This Fix

**Before:**
- ❌ PostgREST exposed on HTTP
- ❌ Anyone can access `http://69.62.84.73:3000/users`
- ❌ Passwords visible
- ❌ Mixed content error

**After:**
- ✅ PostgREST only accessible internally
- ✅ External access through HTTPS only
- ✅ Automatic HTTPS certificates
- ✅ No mixed content errors
- ✅ Login works properly

---

## 🎯 What This Achieves

1. **Security:** PostgREST not publicly accessible
2. **HTTPS:** All traffic encrypted via Caddy
3. **Login Fixed:** Frontend can call API over HTTPS
4. **Auto-Certs:** Caddy manages Let's Encrypt certificates
5. **Clean URLs:** `https://kt.eyediaworks.in` and `https://api.kt.eyediaworks.in`

---

## ⚡ Quick Start (Copy-Paste Ready)

1. **Update docker-compose.production.yml:**
   - Change `ports: - "3000:3000"` to `expose: - "3000"`
   - Add Caddy service (see Option 2)

2. **Create Caddyfile:**
   ```
   kt.eyediaworks.in {
       reverse_proxy frontend:80
   }

   api.kt.eyediaworks.in {
       reverse_proxy postgrest:3000
   }
   ```

3. **Add DNS:**
   - `api.kt.eyediaworks.in` → `69.62.84.73`

4. **Update Environment Variable:**
   - `VITE_API_URL=https://api.kt.eyediaworks.in`

5. **Deploy!**

---

**Ready to implement? Let me know if you want me to update the files for you!**
