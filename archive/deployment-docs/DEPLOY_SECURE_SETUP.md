# Deploy Secure Setup with HTTPS

## ✅ What This Fixes

1. **Security:** PostgREST no longer accessible at `http://69.62.84.73:3000`
2. **HTTPS:** All traffic encrypted automatically
3. **Login Works:** Mixed content error fixed
4. **Clean URLs:** Professional domain names

---

## 🚀 Quick Deployment Steps

### Step 1: Add DNS Record

Go to your DNS provider (where you manage `eyediaworks.in`):

**Add A Record:**
```
Host: api.kt.eyediaworks.in
Type: A
Value: 69.62.84.73
TTL: 300 (or default)
```

**Verify DNS (wait 2-5 minutes):**
```bash
ping api.kt.eyediaworks.in
# Should show: 69.62.84.73
```

---

### Step 2: Replace docker-compose File

```bash
# Backup current file
mv docker-compose.production.yml docker-compose.production.yml.backup

# Use new secure version
mv docker-compose.production-secure.yml docker-compose.production.yml
```

Or simply rename in Windows:
1. Rename `docker-compose.production.yml` to `docker-compose.production.yml.backup`
2. Rename `docker-compose.production-secure.yml` to `docker-compose.production.yml`

---

### Step 3: Verify Files Exist

Make sure these files are in your project root:
- ✅ `docker-compose.production.yml` (the new secure one)
- ✅ `Caddyfile` (already created)

---

### Step 4: Update Coolify Environment Variables

In Coolify dashboard, update:

**For Frontend:**
```
VITE_API_URL=https://api.kt.eyediaworks.in
```

**For PostgREST (keep existing):**
```
PGRST_DB_URI=postgres://authenticator:PASSWORD@69.62.84.73:5432/karat_tracker_p
PGRST_JWT_SECRET=your_jwt_secret
PGRST_DB_SCHEMAS=public
PGRST_DB_ANON_ROLE=web_anon
```

---

### Step 5: Commit and Push

```bash
git add docker-compose.production.yml Caddyfile
git commit -m "Add Caddy reverse proxy for HTTPS and security"
git push origin main
```

---

### Step 6: Deploy in Coolify

Coolify will automatically detect changes and redeploy.

Or manually trigger:
1. Go to Coolify dashboard
2. Find your Karat Tracker application
3. Click "Redeploy"

---

### Step 7: Wait for SSL Certificate

First deployment takes 30-60 seconds while Caddy:
1. Obtains SSL certificate from Let's Encrypt
2. Configures HTTPS
3. Sets up redirects

Watch logs:
```
Coolify Dashboard → Your App → Logs
```

Look for:
```
[INFO] Obtaining certificate from Let's Encrypt...
[INFO] Successfully obtained certificate
```

---

### Step 8: Verify Everything Works

#### Test 1: Frontend (HTTPS)
```
Visit: https://kt.eyediaworks.in
```
✅ Should load with green padlock (HTTPS)

#### Test 2: API (HTTPS)
```
Visit: https://api.kt.eyediaworks.in
```
✅ Should show PostgREST welcome page (HTTPS)

#### Test 3: Login
```
Visit: https://kt.eyediaworks.in/login
Try logging in with: admin / admin
```
✅ Should work without errors

#### Test 4: Security (PostgREST not exposed)
```bash
# Try accessing PostgREST directly (should fail)
curl http://69.62.84.73:3000/users
```
❌ Should fail with: Connection refused or timeout

✅ **If it fails, that's PERFECT! It means PostgREST is secured.**

---

## 🎯 What Changed

### Before:
```
Browser → https://kt.eyediaworks.in → nginx:3002 (frontend)
Browser → ❌ http://69.62.84.73:3000 (blocked by mixed content)

External users can access:
http://69.62.84.73:3000/users ← SECURITY ISSUE!
```

### After:
```
Browser → https://kt.eyediaworks.in → Caddy → frontend:80
Browser → https://api.kt.eyediaworks.in → Caddy → postgrest:3000

External users CANNOT access postgrest directly ✅
All traffic encrypted with HTTPS ✅
```

---

## 📊 Architecture

```
                    Internet
                       │
                       ▼
                 Caddy (Proxy)
            Port 80 → 443 (HTTPS)
                  │       │
        ┌─────────┴───────┴─────────┐
        │                           │
        ▼                           ▼
   Frontend                    PostgREST
   (port 80)                  (port 3000)
   Internal only              Internal only
        │                           │
        └───────────┬───────────────┘
                    ▼
              Docker Network
            (karat-network)
```

---

## 🔐 Security Features

1. **PostgREST Internal Only**
   - Not accessible from internet
   - Only accessible through Caddy proxy
   - No direct database exposure

2. **Automatic HTTPS**
   - Let's Encrypt certificates
   - Auto-renewal (every 90 days)
   - HTTP → HTTPS redirect

3. **Security Headers**
   - HSTS enabled
   - XSS protection
   - Clickjacking protection
   - MIME sniffing protection

4. **CORS Protection**
   - Only allows requests from your frontend domain
   - Blocks unauthorized cross-origin requests

---

## 🛠️ Troubleshooting

### Certificate Not Obtained

**Check:**
1. DNS is pointing correctly: `ping api.kt.eyediaworks.in`
2. Ports 80 and 443 are open
3. No other service using ports 80/443
4. Wait a few minutes and check logs

**Caddy logs:**
```
docker logs karat-tracker20-caddy
```

### Login Still Not Working

**Check:**
1. Frontend env var: `VITE_API_URL=https://api.kt.eyediaworks.in`
2. Frontend was rebuilt after changing env var
3. Browser console for errors
4. API is accessible: `curl https://api.kt.eyediaworks.in`

### PostgREST Still Accessible Externally

**Check:**
1. docker-compose.yml uses `expose:` not `ports:`
2. Firewall allows only 80 and 443
3. Container restarted after changes

---

## 🎉 Success Checklist

After deployment, verify:

- [ ] `https://kt.eyediaworks.in` loads with HTTPS (green padlock)
- [ ] `https://api.kt.eyediaworks.in` loads with HTTPS
- [ ] Login works without errors
- [ ] No mixed content errors in browser console
- [ ] `http://69.62.84.73:3000` is NOT accessible externally
- [ ] Browser shows secure connection (green padlock)
- [ ] Can create sales, expenses, etc.

---

## 📞 Need Help?

**Check Logs:**
```bash
# All services
docker-compose logs

# Just Caddy
docker logs karat-tracker20-caddy

# Just PostgREST
docker logs karat-tracker20-postgrest

# Just Frontend
docker logs karat-tracker20-frontend
```

**Restart Everything:**
```bash
docker-compose down
docker-compose up -d
```

---

## 🔄 Rollback (If Needed)

If something goes wrong:

```bash
# Restore old docker-compose
mv docker-compose.production.yml.backup docker-compose.production.yml

# Redeploy
git add docker-compose.production.yml
git commit -m "Rollback to previous configuration"
git push
```

---

**Ready to deploy?** Follow the steps above in order!

✅ Secure
✅ HTTPS
✅ Professional
✅ Production-ready
