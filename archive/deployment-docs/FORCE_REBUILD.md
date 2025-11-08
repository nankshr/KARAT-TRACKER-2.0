# Force Rebuild Frontend with New API URL

## Problem
Frontend JavaScript still has old API URL hardcoded: `http://69.62.84.73:3000`

## Solution: Force Rebuild

### Method 1: Coolify Dashboard
1. Go to Coolify → Your App → Frontend Service
2. Click "Force Rebuild" or "Rebuild"
3. Verify `VITE_API_URL=https://api.kt.eyediaworks.in` in build args
4. Wait for completion

### Method 2: SSH to Server & Clear Cache

```bash
# SSH to your Coolify server
ssh user@69.62.84.73

# Stop the frontend container
docker stop frontend-vs440w04woowwokgk8sg8kss-163535641843

# Remove the old image
docker rmi vs440w04woowwokgk8sg8kss-frontend

# Clear build cache
docker builder prune -af

# In Coolify dashboard, click "Redeploy"
```

### Method 3: Dummy Commit to Trigger Rebuild

```bash
# Make a small change to force rebuild
echo "# Trigger rebuild" >> README.md
git add README.md
git commit -m "Force rebuild with correct API URL"
git push
```

### Method 4: Update docker-compose to force no-cache

Add `no_cache: true` to frontend service temporarily:

```yaml
frontend:
  build:
    context: .
    dockerfile: Dockerfile
    no_cache: true  # ← Add this temporarily
    args:
      VITE_API_URL: https://api.kt.eyediaworks.in
```

Then:
```bash
git add docker-compose.production.yml
git commit -m "Force no-cache rebuild"
git push
```

After successful rebuild, remove `no_cache: true` and push again.

---

## Verify Rebuild Worked

After rebuild, check the build logs for:
```
VITE_API_URL=https://api.kt.eyediaworks.in
```

Then test:
1. Clear browser cache (Ctrl+F5)
2. Try login
3. Check browser console - should use HTTPS URL now
