# Karat Tracker 2.0 - Deployment Ready

**Repository:** https://github.com/nankshr/KARAT-TRACKER-2.0 (Private)

## What's New in Version 2.0

- ✅ **PostgREST Backend** - Direct PostgreSQL REST API
- ✅ **Coolify Deployment** - Self-hosted with auto-deploy
- ✅ **Docker Containers** - Production-ready containerization
- ✅ **Automatic Deployments** - Push to GitHub = Auto-deploy
- ✅ **Environment-based Configuration** - Easy to configure per environment

---

## Quick Start

### Local Testing

```bash
# Start local test environment
docker-compose -f docker-compose-local-test.yml up

# Access at http://localhost:8080
```

### Deploy to Coolify

Follow the guide: **[DEPLOY_TO_COOLIFY.md](DEPLOY_TO_COOLIFY.md)**

**Steps:**
1. Push code to GitHub
2. Deploy PostgREST API service
3. Deploy Frontend service (with auto-deploy)
4. Configure domains and SSL
5. Test and verify

---

## Repository Structure

```
karat-tracker/
├── src/                        # React frontend source
├── public/                     # Static assets
├── migration/                  # Supabase→PostgreSQL migration tools
├── scripts/                    # Database setup scripts
├── Dockerfile                  # Frontend production build
├── docker-compose-local-test.yml    # Local test with PostgREST
├── docker-compose.production.yml    # Production deployment
├── nginx.conf                  # Nginx web server configuration
├── .env.example                # Environment variables template
├── DEPLOY_TO_COOLIFY.md        # 🚀 Deployment guide (START HERE)
└── COOLIFY_DEPLOYMENT_PLAN.md  # Detailed deployment plan

---

## Environment Variables

See [.env.example](.env.example) for all required variables.

### PostgREST (API):
- `PGRST_DB_URI` - PostgreSQL connection string
- `PGRST_JWT_SECRET` - JWT authentication secret
- `PGRST_DB_SCHEMAS` - Database schemas (public)
- `PGRST_DB_ANON_ROLE` - Anonymous role (web_anon)

### Frontend (Build Args):
- `VITE_API_URL` - PostgREST API URL
- `VITE_APP_NAME` - Application name
- `VITE_APP_VERSION` - Version number

---

## Auto-Deploy Workflow

```
┌─────────────────────────────────────────────────────┐
│  Developer                                           │
│  └─> git push origin main                           │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  GitHub Repository                                   │
│  └─> Webhook triggered                              │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Coolify                                             │
│  ├─> Pull latest code                               │
│  ├─> Build Docker image                             │
│  ├─> Run tests (if configured)                      │
│  ├─> Deploy new container                           │
│  └─> Zero-downtime switch                           │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Production Live                                     │
│  └─> Changes visible immediately                    │
└─────────────────────────────────────────────────────┘
```

**Deployment Time:** ~2-5 minutes from push to live

---

## Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **UI:** shadcn/ui + Tailwind CSS
- **State Management:** React Context
- **HTTP Client:** Axios
- **Web Server:** Nginx (Alpine)

### Backend
- **API:** PostgREST v12.0.3
- **Database:** PostgreSQL 15+
- **Authentication:** JWT (via PostgREST)
- **RLS:** Row-Level Security enabled

### DevOps
- **Containers:** Docker + Docker Compose
- **CI/CD:** Coolify Auto-Deploy
- **Version Control:** Git + GitHub
- **SSL:** Let's Encrypt (via Coolify)

---

## Features

- ✅ User authentication with role-based access
- ✅ Sales log management
- ✅ Expense tracking
- ✅ Daily gold/silver rates
- ✅ Activity logging
- ✅ Data export (CSV, PDF)
- ✅ Mobile responsive design
- ✅ Dark mode support (coming soon)
- ✅ Real-time updates
- ✅ Offline capability (coming soon)

---

## Documentation

- **[DEPLOY_TO_COOLIFY.md](DEPLOY_TO_COOLIFY.md)** - Quick deployment guide ⭐ START HERE
- **[COOLIFY_DEPLOYMENT_PLAN.md](COOLIFY_DEPLOYMENT_PLAN.md)** - Comprehensive deployment plan
- **[.env.example](.env.example)** - Environment variables reference
- **[migration/README.md](migration/README.md)** - Database migration guide

---

## Security

- ✅ Environment variables (never committed)
- ✅ JWT authentication
- ✅ Row-level security (RLS)
- ✅ HTTPS/SSL encryption
- ✅ CORS protection
- ✅ Input validation
- ✅ SQL injection protection (PostgREST)

---

## Support

For deployment issues, check:
1. [DEPLOY_TO_COOLIFY.md](DEPLOY_TO_COOLIFY.md) - Troubleshooting section
2. Coolify logs - Monitor in dashboard
3. GitHub Issues - Report bugs

---

## Version History

**2.0.0** (Current)
- Migrated to PostgREST architecture
- Coolify deployment ready
- Auto-deploy via GitHub webhooks
- Docker containerization
- Production-ready configuration

**1.0.0**
- Initial Supabase version
- Vercel deployment

---

## License

Private - All rights reserved

---

**Maintained by:** nankshr
**Last Updated:** 2025-11-06
