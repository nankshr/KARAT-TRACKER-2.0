# Karat Tracker: Complete Migration Plan
## Vercel + Supabase → Coolify + Self-Hosted PostgreSQL

**Version:** 2.0
**Date:** 2025-11-06
**Estimated Timeline:** 5-7 days (can be done in parallel: 3-4 days)
**Complexity:** Low-Medium

---

## Executive Summary

This migration plan will help you move from Vercel + Supabase (SaaS) to Coolify + Self-hosted PostgreSQL (VPS) to reduce costs by 40-55% while gaining more control over your infrastructure.

### Key Benefits:
- ✅ **Cost Savings:** $15-25/month (50-60% reduction)
- ✅ **Full Control:** Own your data and infrastructure
- ✅ **No Vendor Lock-in:** Standard PostgreSQL database
- ✅ **Better Privacy:** Data on your own servers
- ✅ **Scalability:** Easy to upgrade VPS resources

### Migration Complexity: LOW-MEDIUM
- ✅ Simple SPA architecture (React + Vite)
- ✅ Custom authentication (no Supabase Auth)
- ✅ No file storage dependencies
- ✅ No real-time features
- ✅ Standard PostgreSQL database
- ⚠️ Need to create backend API layer (for security)
- ⚠️ Need to update frontend components

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Phase-by-Phase Migration](#phase-by-phase-migration)
4. [Timeline](#timeline)
5. [Testing Checklist](#testing-checklist)
6. [Rollback Plan](#rollback-plan)
7. [Cost Analysis](#cost-analysis)
8. [Support Resources](#support-resources)

---

## Overview

### Current Architecture:
```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────┐        ┌─────────────┐
│   Vercel    │───────▶│  Supabase   │
│  (Frontend) │        │ (Database)  │
└─────────────┘        └─────────────┘
```

### Target Architecture:
```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│   Coolify   │───────▶│   Coolify   │───────▶│  PostgreSQL │
│  (Frontend) │        │  (Backend)  │        │  (Database) │
└─────────────┘        └─────────────┘        └─────────────┘
```

### Why Add Backend API?
Currently, your application connects directly to Supabase from the browser. This is convenient but:
- **Security Risk:** Database credentials exposed to client
- **No RLS:** Supabase's Row Level Security won't work on plain PostgreSQL
- **Best Practice:** API layer provides authentication, validation, and security

---

## Prerequisites

### Before You Start:

#### On Your VPS:
- [ ] Coolify installed and running
- [ ] Docker and Docker Compose installed
- [ ] Minimum 2GB RAM, 2 CPU cores (4GB recommended)
- [ ] Domain name (optional but recommended)

#### On Your Local Machine:
- [ ] Git repository access
- [ ] Node.js 18+ installed
- [ ] PostgreSQL tools (`pg_dump`, `psql`)
- [ ] Text editor / IDE

#### Access & Credentials:
- [ ] Supabase project access (for data export)
- [ ] Supabase database password
- [ ] OpenAI API key (if using AI features)
- [ ] Domain registrar access (for DNS)

#### Backups:
- [ ] Create Supabase backup (just in case)
- [ ] Export current database schema and data
- [ ] Document current environment variables

---

## Phase-by-Phase Migration

### 📋 PHASE 1: Database Migration (Day 1-2)

**Goal:** Move data from Supabase to self-hosted PostgreSQL

#### Step 1.1: Export from Supabase

```bash
# Set credentials
export SUPABASE_PROJECT_ID="your-project-id"
export SUPABASE_DB_PASSWORD="your-db-password"

# Run export script
cd migration
chmod +x export-from-supabase.sh
./export-from-supabase.sh
```

**Files created:**
- `migration/exports/schema_TIMESTAMP.sql`
- `migration/exports/data_TIMESTAMP.sql`
- `migration/exports/complete_TIMESTAMP.sql`

#### Step 1.2: Deploy PostgreSQL on Coolify

1. Login to Coolify dashboard
2. Create new project: `karat-tracker`
3. Add PostgreSQL 15 database service
4. Configure:
   - Name: `karat-tracker-db`
   - Database: `karat_tracker`
   - Username: `karat_user`
   - Password: (generate secure password)
5. Deploy and wait for completion

#### Step 1.3: Import to PostgreSQL

```bash
# Set credentials
export DB_HOST="your-coolify-db-host"
export DB_PORT="5432"
export DB_NAME="karat_tracker"
export DB_USER="karat_user"
export DB_PASSWORD="your-password"

# Run import script
chmod +x import-to-postgres.sh
./import-to-postgres.sh
```

#### Step 1.4: Verify Migration

```sql
-- Connect to database
psql -h $DB_HOST -U $DB_USER -d $DB_NAME

-- Check tables
\dt

-- Check row counts
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'daily_rates', COUNT(*) FROM daily_rates
UNION ALL
SELECT 'sales_log', COUNT(*) FROM sales_log
UNION ALL
SELECT 'expense_log', COUNT(*) FROM expense_log
UNION ALL
SELECT 'activity_log', COUNT(*) FROM activity_log;

-- Test custom functions
SELECT get_table_schema('users');
```

**✅ Phase 1 Complete:** Database migrated successfully

---

### 🔧 PHASE 2: Backend API Setup (Day 2-3)

**Goal:** Create Express.js backend API

#### Step 2.1: Install Backend Dependencies

```bash
cd backend
npm install
```

**Files already created:**
- ✅ `backend/package.json`
- ✅ `backend/src/server.js`
- ✅ `backend/src/config/database.js`
- ✅ `backend/src/middleware/auth.js`
- ✅ `backend/src/routes/*.js` (all routes)

#### Step 2.2: Configure Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=karat_tracker
DB_USER=karat_user
DB_PASSWORD=your-password

PORT=3000
NODE_ENV=development
API_KEY=generate-secure-key
SESSION_SECRET=generate-secure-secret
CORS_ORIGIN=http://localhost:8080

OPENAI_API_KEY=your-openai-key
```

#### Step 2.3: Test Backend Locally

```bash
# Install dependencies
cd backend
npm install

# Start backend
npm start

# In another terminal, test health endpoint
curl http://localhost:3000/health

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"your-password"}'
```

#### Step 2.4: Deploy Backend to Coolify

1. In Coolify, add new Application
2. Configure:
   - Name: `karat-tracker-backend`
   - Build Pack: Dockerfile
   - Dockerfile: `backend/Dockerfile`
   - Port: 3000
3. Add environment variables (from `.env`)
4. Deploy
5. Set up domain: `api.yourdomain.com`
6. Enable SSL

**✅ Phase 2 Complete:** Backend API deployed and tested

---

### 💻 PHASE 3: Frontend Migration (Day 3-4)

**Goal:** Update frontend to use new API

#### Step 3.1: Update Environment Variables

```bash
cp .env.migration.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:3000/api  # For local testing
# VITE_API_URL=https://api.yourdomain.com/api  # For production
VITE_APP_NAME=Karat Tracker
VITE_APP_VERSION=2.0.0
```

#### Step 3.2: Test API Client Locally

The API client is already created at `src/lib/apiClient.ts`.

Test it:
```bash
# Start backend (if not running)
cd backend && npm start

# In another terminal, start frontend
cd ..
npm install
npm run dev
```

Visit `http://localhost:8080` and test:
- [ ] Login works
- [ ] Dashboard loads
- [ ] Can view sales
- [ ] Can view expenses

#### Step 3.3: Migrate Components

**Already migrated:**
- ✅ `src/contexts/AuthContext.tsx`
- ✅ `src/lib/apiClient.ts`

**To migrate** (use Component Migration Guide):
- [ ] `src/components/Dashboard.tsx`
- [ ] `src/components/AddSales.tsx`
- [ ] `src/components/AddExpense.tsx`
- [ ] `src/components/SalesLog.tsx`
- [ ] `src/components/ExpenseLog.tsx`
- [ ] `src/components/DailyRates.tsx`
- [ ] `src/components/TableDataExport.tsx`
- [ ] `src/lib/activityLogger.ts`

**Reference:** See `migration/COMPONENT_MIGRATION_GUIDE.md` for detailed examples

#### Step 3.4: Build and Test

```bash
# Build frontend
npm run build

# Test build locally
npm run preview
```

#### Step 3.5: Deploy Frontend to Coolify

1. In Coolify, add new Application
2. Configure:
   - Name: `karat-tracker-frontend`
   - Build Pack: Dockerfile
   - Dockerfile: `Dockerfile.frontend`
   - Port: 80
3. Add build-time environment variables
4. Deploy
5. Set up domain: `yourdomain.com`
6. Enable SSL

**✅ Phase 3 Complete:** Frontend deployed with API integration

---

### 🔍 PHASE 4: Testing & Validation (Day 5)

**Goal:** Comprehensive testing before cutover

#### Step 4.1: Functional Testing

Test all features:

**Authentication:**
- [ ] Login with correct credentials
- [ ] Login fails with wrong credentials
- [ ] Session persists after page refresh
- [ ] Logout works correctly

**Sales Management:**
- [ ] View sales log
- [ ] Add new sale
- [ ] Edit existing sale
- [ ] Delete sale
- [ ] Export sales data

**Expense Management:**
- [ ] View expense log
- [ ] Add new expense
- [ ] Edit existing expense
- [ ] Delete expense
- [ ] Export expense data

**Daily Rates:**
- [ ] View current rates
- [ ] Add/update rates
- [ ] Rates reflect in calculations

**Dashboard:**
- [ ] Summary statistics correct
- [ ] Charts display correctly
- [ ] Filters work
- [ ] Date ranges work

**Permissions:**
- [ ] Admin can access all features
- [ ] Owner has appropriate access
- [ ] Employee has restricted access

#### Step 4.2: Performance Testing

```bash
# Test API response times
time curl https://api.yourdomain.com/api/sales

# Load test (optional)
ab -n 1000 -c 10 https://api.yourdomain.com/health
```

#### Step 4.3: Security Testing

- [ ] HTTPS enabled on all domains
- [ ] CORS configured correctly
- [ ] API authentication required
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Sensitive data not exposed

#### Step 4.4: Data Validation

Compare data between Supabase and new database:

```sql
-- Count records in each table
-- Run on both databases and compare

SELECT
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM sales_log) as sales,
  (SELECT COUNT(*) FROM expense_log) as expenses,
  (SELECT COUNT(*) FROM daily_rates) as rates,
  (SELECT COUNT(*) FROM activity_log) as activities;

-- Verify totals match
SELECT SUM(total_amount) FROM sales_log;
SELECT SUM(amount) FROM expense_log;
```

**✅ Phase 4 Complete:** All tests passed

---

### 🚀 PHASE 5: Cutover & Go-Live (Day 6-7)

**Goal:** Switch from Vercel/Supabase to Coolify

#### Step 5.1: Final Data Sync

```bash
# Export latest data from Supabase
./migration/export-from-supabase.sh

# Import to production database
export DB_HOST="production-db-host"
./migration/import-to-postgres.sh
```

#### Step 5.2: Update DNS

At your domain registrar, update DNS records:

```
Type    Name    Value                   TTL
A       @       your-vps-ip             300
A       api     your-vps-ip             300
```

Or if using subdomains:
```
Type    Name    Value                   TTL
A       app     your-vps-ip             300
A       api     your-vps-ip             300
```

**Note:** DNS propagation can take 5-60 minutes

#### Step 5.3: Monitor Cutover

```bash
# Monitor DNS propagation
watch -n 5 dig yourdomain.com +short

# Monitor application logs
docker logs -f karat-tracker-frontend
docker logs -f karat-tracker-backend
docker logs -f karat-tracker-db

# Monitor access logs
tail -f /var/log/coolify/access.log
```

#### Step 5.4: Verify Production

- [ ] Frontend accessible at production URL
- [ ] Login works
- [ ] All features functional
- [ ] Data accurate
- [ ] Performance acceptable
- [ ] No errors in logs

#### Step 5.5: Post-Launch Monitoring

**First Hour:**
- Monitor every 5-10 minutes
- Check error logs
- Verify user access

**First Day:**
- Monitor every hour
- Check performance
- Gather user feedback

**First Week:**
- Daily checks
- Review metrics
- Optimize as needed

**✅ Phase 5 Complete:** Migration successful! 🎉

---

### 🔧 PHASE 6: Cleanup & Optimization (Day 7+)

**Goal:** Finalize migration and optimize

#### Step 6.1: Set Up Backups

```bash
# Create backup script (already provided)
chmod +x /root/backup-karat-tracker.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /root/backup-karat-tracker.sh
```

#### Step 6.2: Configure Monitoring

- [ ] Set up Coolify alerts
- [ ] Configure uptime monitoring
- [ ] Set up log rotation
- [ ] Configure resource alerts

#### Step 6.3: Documentation

- [ ] Document new deployment process
- [ ] Update team documentation
- [ ] Document backup/restore procedures
- [ ] Document troubleshooting steps

#### Step 6.4: Decommission Old Services (After 30 Days)

**Only after 30 days of stable operation:**

- [ ] Pause Supabase project (don't delete yet)
- [ ] Remove Vercel deployment
- [ ] Archive old configurations
- [ ] Cancel subscriptions (if applicable)

**✅ Phase 6 Complete:** Migration fully optimized

---

## Timeline

### Aggressive Timeline (3-4 days, parallel work):

| Day | Phase | Tasks | Hours |
|-----|-------|-------|-------|
| 1 | Setup + DB | Export Supabase, Deploy PostgreSQL, Import data | 4-6 |
| 1-2 | Backend | Deploy backend API, Test endpoints | 4-6 |
| 2-3 | Frontend | Migrate components, Local testing | 6-8 |
| 3 | Deploy | Deploy to Coolify, DNS setup | 3-4 |
| 4 | Testing | Full testing, Go-live | 4-6 |

**Total: 3-4 days (if working full-time)**

### Conservative Timeline (5-7 days):

| Day | Phase | Tasks |
|-----|-------|-------|
| 1 | Database | Export, deploy PostgreSQL, import |
| 2 | Backend | Set up backend API |
| 3 | Backend | Test and deploy backend |
| 4 | Frontend | Migrate components |
| 5 | Frontend | Test and deploy frontend |
| 6 | Testing | Comprehensive testing |
| 7 | Cutover | Go-live and monitoring |

**Total: 5-7 days**

---

## Testing Checklist

### Pre-Migration Testing

#### Local Development:
- [ ] Backend runs locally
- [ ] Frontend runs locally
- [ ] Database connection works
- [ ] API endpoints respond
- [ ] Authentication works
- [ ] CRUD operations work

### Post-Migration Testing

#### Production:
- [ ] All URLs accessible (HTTPS)
- [ ] Login/logout works
- [ ] Dashboard displays correctly
- [ ] Sales CRUD operations work
- [ ] Expense CRUD operations work
- [ ] Daily rates management works
- [ ] Data export works
- [ ] AI query feature works (if used)
- [ ] Activity logs recording
- [ ] User permissions enforced
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Performance acceptable (<2s page load)

### Data Validation:
- [ ] Row counts match
- [ ] Totals match
- [ ] All users can login
- [ ] Historical data intact
- [ ] No data corruption

---

## Rollback Plan

If something goes wrong, you can rollback:

### Immediate Rollback (Within hours):

1. **Update DNS back to Vercel:**
   ```
   Point yourdomain.com → Vercel
   ```

2. **Revert code:**
   ```bash
   git checkout pre-migration-branch
   ```

3. **Redeploy on Vercel:**
   ```bash
   vercel --prod
   ```

4. **Verify:**
   - Test login
   - Check data access
   - Verify functionality

### Rollback Checklist:
- [ ] DNS updated
- [ ] Code reverted
- [ ] Deployed to Vercel
- [ ] Application functional
- [ ] Users notified (if needed)

**Keep Supabase active for 30 days to enable easy rollback!**

---

## Cost Analysis

### Current Costs (Monthly):

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby/Pro | $0-20 |
| Supabase | Pro | $25 |
| **Total** | | **$25-45** |

### New Costs (Monthly):

| Service | Plan | Cost |
|---------|------|------|
| VPS | 4GB RAM, 2 CPU | $12-20 |
| Coolify | Self-hosted | $0 |
| PostgreSQL | Included in VPS | $0 |
| **Total** | | **$12-20** |

### Savings:

- **Monthly:** $15-25 (50-60%)
- **Yearly:** $180-300
- **3 Years:** $540-900

### Break-Even Analysis:

**Initial Time Investment:** 3-7 days
**Monthly Savings:** $15-25
**Break-even:** 1-2 months

**After 3 months, you're saving money!**

---

## Support Resources

### Documentation:
- **Database Migration:** `migration/README.md`
- **Component Migration:** `migration/COMPONENT_MIGRATION_GUIDE.md`
- **Coolify Deployment:** `migration/COOLIFY_DEPLOYMENT_GUIDE.md`
- **API Reference:** `backend/src/routes/*.js`

### External Resources:
- **Coolify Docs:** https://coolify.io/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **Express.js Docs:** https://expressjs.com/
- **Docker Docs:** https://docs.docker.com/

### Troubleshooting:
- Check backend logs: `docker logs karat-tracker-backend`
- Check database: `psql -h $DB_HOST -U $DB_USER -d $DB_NAME`
- Test API: `curl https://api.yourdomain.com/health`
- Review migration guides for common issues

---

## Success Criteria

Migration is successful when:

- ✅ All users can login
- ✅ All features work correctly
- ✅ Data is accurate and complete
- ✅ Performance is acceptable
- ✅ No critical errors
- ✅ Backups are configured
- ✅ Monitoring is in place
- ✅ Team is trained on new system
- ✅ Documentation is complete
- ✅ Cost savings realized

---

## Final Checklist

Before considering migration complete:

### Technical:
- [ ] Database migrated successfully
- [ ] Backend API deployed and tested
- [ ] Frontend deployed and tested
- [ ] All features working
- [ ] HTTPS enabled
- [ ] Backups configured
- [ ] Monitoring set up

### Business:
- [ ] Team trained on new system
- [ ] Documentation updated
- [ ] Users notified of changes (if any)
- [ ] Support plan in place

### Operations:
- [ ] Rollback plan documented
- [ ] Backup/restore tested
- [ ] Maintenance schedule defined
- [ ] Monitoring alerts configured

---

## Congratulations!

You've successfully migrated from Vercel + Supabase to your own self-hosted infrastructure on Coolify!

**Benefits achieved:**
- 💰 50-60% cost reduction
- 🔒 Full control of your data
- 📈 Better scalability options
- 🚀 Improved understanding of your stack

**Next steps:**
1. Monitor for 30 days
2. Optimize performance
3. Consider additional features
4. Enjoy the cost savings!

---

**Document Version:** 2.0
**Last Updated:** 2025-11-06
**Migration Status:** Ready for Execution
