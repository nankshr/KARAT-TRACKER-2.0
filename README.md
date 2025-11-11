# 💎 Karat Tracker 2.0 - Premium Jewelry Management System

<div align="center">

![Karat Tracker Logo](https://img.shields.io/badge/Karat-Tracker-gold?style=for-the-badge&logo=crown&logoColor=white)

[![React](https://img.shields.io/badge/React-18.3-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![PostgREST](https://img.shields.io/badge/PostgREST-12.0.3-green?style=flat-square)](https://postgrest.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-cyan?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?style=flat-square&logo=docker)](https://www.docker.com/)
[![Production](https://img.shields.io/badge/Status-Production%20Ready-success?style=flat-square)](https://kt.eyediaworks.in)

*A comprehensive jewelry management application for tracking daily rates, sales transactions, expenses, and business analytics with AI-powered insights.*

**Version 2.0** - Now with PostgreSQL + PostgREST architecture, Docker containerization, and auto-deployment via Coolify

</div>

---

## 📋 Table of Contents

- [What's New in 2.0](#whats-new-in-20)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Development](#-development)
- [Deployment](#-deployment)
- [Database Setup](#-database-setup)
- [Security](#-security)
- [Documentation](#-documentation)

---

## What's New in 2.0

### Architecture Improvements
- ✅ **PostgreSQL + PostgREST** - Direct PostgreSQL REST API (migrated from Supabase)
- ✅ **Self-Hosted** - Full control over your data and infrastructure
- ✅ **Docker Containers** - Production-ready containerization with Docker Compose
- ✅ **Automatic Deployments** - Push to GitHub = Auto-deploy via Coolify
- ✅ **HTTPS by Default** - Let's Encrypt SSL certificates via Traefik

### Database Enhancements
- ✅ **Proper Role-Based Security** - `authenticator` and `web_anon` roles
- ✅ **Complete Migration Tools** - Export from Supabase with pagination support
- ✅ **Optimized Functions** - All auth and helper functions included
- ✅ **Performance Indexes** - Optimized for common queries

### Deployment
- ✅ **Coolify Ready** - One-click deployment with auto-deploy
- ✅ **Environment-Based Config** - Easy configuration per environment
- ✅ **Zero-Downtime Deploys** - Rolling updates with health checks
- ✅ **Production Grade** - HTTPS, CORS, security headers configured

---

## 🌟 Key Features

### 💰 Financial Management
- **Daily Rates Tracking** - Real-time gold/silver pricing (24k, 22k, 18k)
- **Sales Transaction Management** - Comprehensive wholesale/retail tracking
- **Advanced Old Material Calculation** - Bidirectional purity/cost calculations with auto-recalculation
- **Expense Logging** - Direct/indirect expense categorization with credit tracking
- **Profit Analytics** - Enhanced profit calculations including old material profit tracking

### 🤖 AI-Powered Analytics
- **Natural Language Queries** - Ask questions in plain English
- **Voice Input Support** - Speak your queries using advanced speech recognition
- **Intelligent Data Insights** - AI-generated summaries and recommendations
- **Smart SQL Generation** - Convert natural language to optimized SQL queries
- **🛡️ Privacy Protection** - Customer data automatically masked before AI processing

### 📊 Advanced Reporting
- **Interactive Dashboard** - Real-time business metrics and KPIs
- **Data Export** - CSV export with customizable columns and date filtering
- **Visual Analytics** - Charts and graphs for trend analysis
- **Activity Logging** - Complete audit trail of all transactions (2,329+ records tracked)

### 🔐 Security & Access Control
- **Role-Based Access** - Admin, Owner, and Employee permission levels
- **Secure Authentication** - JWT-based session system via PostgREST
- **Database-Level Security** - PostgreSQL roles and permissions
- **Activity Monitoring** - IP tracking and user agent logging
- **HTTPS/SSL** - All traffic encrypted with Let's Encrypt certificates

### 🎨 Modern User Experience
- **Responsive Design** - Mobile-first approach with beautiful gradients
- **Dark/Light Theme** - Customizable UI preferences
- **Real-time Updates** - Live data synchronization
- **Intuitive Interface** - Clean, professional jewelry industry design

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite 5.4
- **UI Components:** shadcn/ui + Radix UI
- **Styling:** Tailwind CSS 3.4
- **State Management:** React Context API
- **HTTP Client:** Axios
- **Forms:** React Hook Form + Zod
- **Web Server:** Nginx Alpine (Production)

### Backend
- **API:** PostgREST v12.0.3
- **Database:** PostgreSQL 15+
- **Authentication:** JWT via PostgREST
- **Security:** Row-Level Security (RLS) enabled
- **Roles:** `authenticator` (connection), `web_anon` (API access)

### DevOps & Deployment
- **Containers:** Docker + Docker Compose
- **Orchestration:** Coolify (self-hosted PaaS)
- **Reverse Proxy:** Traefik (HTTPS, routing)
- **CI/CD:** GitHub Webhooks → Coolify Auto-Deploy
- **SSL:** Let's Encrypt (automatic renewal)
- **Monitoring:** Docker health checks + Traefik dashboard

### AI & Analytics
- **AI Provider:** OpenAI GPT-4
- **Speech Recognition:** Web Speech API
- **Data Privacy:** Customer data masking before AI processing

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+ - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **npm** or **yarn** package manager
- **PostgreSQL** 15+ (for production) or Docker (for local development)
- **OpenAI API Key** - [Get your API key](https://platform.openai.com/api-keys) (optional, for AI features)

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/nankshr/KARAT-TRACKER-2.0.git
cd KARAT-TRACKER-2.0

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your configuration (see Environment Configuration section)

# 4. Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Local Testing with Docker

Test the complete production setup locally:

```bash
# Start PostgREST API + Frontend + PostgreSQL
docker-compose -f docker-compose-local-test.yml up

# Access at http://localhost:8080
```

---

## 💻 Development

### Available Scripts

```bash
npm run dev          # Start Vite development server
npm run build        # Build for production
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

### Project Structure

```
karat-tracker-2.0/
├── src/                        # React frontend source
│   ├── components/             # React components
│   ├── contexts/               # React contexts (auth, theme)
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utility functions
│   ├── pages/                  # Page components
│   └── types/                  # TypeScript types
├── public/                     # Static assets
├── database/                   # Database setup files
│   ├── setup-complete.sql      # Complete PostgreSQL setup
│   ├── README.md               # Database documentation
│   └── QUICK_START.md          # 5-minute setup guide
├── migration/                  # Migration tools
│   ├── migrate-api.py          # Supabase export script (with pagination)
│   ├── verify-data.py          # Data verification tool
│   └── MIGRATION_GUIDE.md      # Migration documentation
├── Dockerfile                  # Frontend production image
├── docker-compose.production.yml  # Production deployment
├── docker-compose-local-test.yml  # Local testing
├── nginx.conf                  # Nginx configuration
├── .env.example                # Environment variables template
└── DEPLOYMENT.md               # Complete deployment guide
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
# API Configuration (PostgREST)
VITE_API_URL=https://api.kt.eyediaworks.in

# Application Settings
VITE_APP_NAME=Karat Tracker
VITE_APP_VERSION=2.0.0

# AI Features (Optional)
VITE_OPENAI_API_KEY=sk-your-openai-api-key

# Development Settings
VITE_DEV_MODE=true
```

For production environment variables, see [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 🚀 Deployment

### Quick Deploy to Coolify

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Deploy Services** (See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed steps)
   - PostgREST API service
   - Frontend service (with auto-deploy enabled)

3. **Configure**
   - Set environment variables in Coolify
   - Configure custom domains
   - SSL certificates (automatic via Traefik)

4. **Verify**
   - Check health endpoints
   - Test authentication
   - Verify HTTPS and CORS

**Deployment Time:** ~2-5 minutes from push to live

### Deployment Workflow

```
Developer (git push)
    ↓
GitHub Repository (webhook triggered)
    ↓
Coolify (pull code, build Docker image, deploy)
    ↓
Production Live (zero-downtime switch)
```

**For complete deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)**

---

## 🗄️ Database Setup

### Quick Setup (New Database)

```bash
# 1. Create database
psql -h YOUR_HOST -p 5432 -U postgres -c "CREATE DATABASE karat_tracker_p;"

# 2. Run complete setup script
psql -h YOUR_HOST -p 5432 -U postgres -d karat_tracker_p \
  -f database/setup-complete.sql

# 3. Set authenticator password
psql -h YOUR_HOST -p 5432 -U postgres -d karat_tracker_p \
  -c "ALTER ROLE authenticator PASSWORD 'YOUR_SECURE_PASSWORD';"
```

### Database Architecture

**Roles:**
- `authenticator` - PostgREST connection role (LOGIN enabled)
- `web_anon` - API access role (used by PostgREST for all requests)

**Tables:**
- `users` - User accounts and authentication (5 users)
- `daily_rates` - Gold/silver daily pricing (256 records)
- `sales_log` - Sales transactions (674 records)
- `expense_log` - Expense tracking (893 records)
- `activity_log` - Audit trail (2,329+ records)

**Key Improvements from v1.0:**
- ✅ Proper role names (`authenticator` not `authenticated`)
- ✅ Complete permissions for `web_anon` role
- ✅ All authentication functions included
- ✅ Performance indexes on common queries
- ✅ Migration tools with pagination support (handles 2,329+ activity logs)

**For detailed database documentation, see [database/README.md](database/README.md)**

---

## 🔐 Security

### Security Features

- ✅ **Environment Variables** - Sensitive data never committed to git
- ✅ **JWT Authentication** - Token-based auth via PostgREST
- ✅ **Role-Based Access Control** - Database-level permissions
- ✅ **HTTPS/SSL** - Let's Encrypt certificates (auto-renewed)
- ✅ **CORS Protection** - Configured for your frontend domain
- ✅ **Input Validation** - Client and server-side validation
- ✅ **SQL Injection Protection** - PostgREST parameterized queries
- ✅ **Activity Logging** - Complete audit trail with IP tracking

### PostgREST Configuration

```env
PGRST_DB_URI=postgres://authenticator:PASSWORD@HOST:5432/karat_tracker_p
PGRST_DB_ANON_ROLE=web_anon
PGRST_DB_SCHEMAS=public
PGRST_JWT_SECRET=YOUR_JWT_SECRET
PGRST_SERVER_CORS_ALLOWED_ORIGINS=https://kt.eyediaworks.in
```

**Security Best Practices:**
- Use strong passwords for `authenticator` role
- Rotate JWT secrets periodically
- Enable SSL for database connections
- Monitor activity_log for suspicious activities
- Keep PostgREST and PostgreSQL updated

---

## 📚 Documentation

### Essential Guides

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide (Coolify, database, security) ⭐
- **[database/README.md](database/README.md)** - Database setup and architecture
- **[database/QUICK_START.md](database/QUICK_START.md)** - 5-minute database setup
- **[migration/MIGRATION_GUIDE.md](migration/MIGRATION_GUIDE.md)** - Data migration from Supabase

### Quick References

- **[.env.example](.env.example)** - Environment variables template
- **[docker-compose.production.yml](docker-compose.production.yml)** - Production configuration
- **[DATABASE_CONSOLIDATION_SUMMARY.md](DATABASE_CONSOLIDATION_SUMMARY.md)** - Database improvements summary

---

## 🐛 Troubleshooting

### Common Issues

**API Connection Errors:**
- Check `VITE_API_URL` in .env
- Verify PostgREST is running: `curl https://api.kt.eyediaworks.in`
- Check CORS configuration

**Authentication Failures:**
- Verify JWT secret matches between PostgREST and database
- Check `authenticator` role password
- Review PostgREST logs

**Build Failures:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Check Node.js version: `node --version` (should be v18+)

**For deployment-specific troubleshooting, see [DEPLOYMENT.md](DEPLOYMENT.md)**

---

## 📊 Version History

### 2.0.0 (Current - November 2024)
- Migrated to PostgreSQL + PostgREST architecture
- Coolify deployment with auto-deploy
- Docker containerization
- HTTPS by default with Let's Encrypt
- Database role fixes (`authenticator` and `web_anon`)
- Migration tools with pagination (2,329+ activity logs)
- Production-ready configuration
- Complete security hardening

### 1.0.0 (September 2024)
- Initial release with Supabase backend
- Vercel deployment
- Basic features implementation

---

## 📄 License

Private - All rights reserved

---

## 👥 Support

**For issues or questions:**
1. Check [DEPLOYMENT.md](DEPLOYMENT.md) troubleshooting section
2. Review database docs: [database/README.md](database/README.md)
3. Check Docker logs: `docker logs <container-name>`
4. Create GitHub issue (for bugs)

---

**Repository:** [github.com/nankshr/KARAT-TRACKER-2.0](https://github.com/nankshr/KARAT-TRACKER-2.0) (Private)

**Maintained by:** nankshr
**Last Updated:** November 2024
**Version:** 2.0.0


**Here are the commands to build and deploy locally:**
# Step 1: Clean up old containers and images (optional but recommended)
docker-compose -f docker-compose-local-test.yml down
docker rmi karat-tracker-frontend:latest

# Step 2: Build the Docker image locally with latest code
docker build -t karat-tracker-frontend:latest --build-arg VITE_API_URL=http://localhost:3000 --build-arg VITE_APP_NAME="Karat Tracker" --build-arg VITE_APP_VERSION="2.0.0" .

# Step 3: Start all services (PostgREST + Frontend)
docker-compose -f docker-compose-local-test.yml up -d

# Step 4: Check if containers are running
docker ps

# Step 5: View logs (optional, to debug)
docker-compose -f docker-compose-local-test.yml logs -f

# Step 6: Access the application
# Frontend: http://localhost:3002
# PostgREST API: http://localhost:3000
Or use this single command to do it all at once:
# Clean, rebuild, and start everything
docker-compose -f docker-compose-local-test.yml down && docker build -t karat-tracker-frontend:latest --build-arg VITE_API_URL=http://localhost:3000 --build-arg VITE_APP_NAME="Karat Tracker" --build-arg VITE_APP_VERSION="2.0.0" --no-cache . && docker-compose -f docker-compose-local-test.yml up -d && docker ps

# To stop the services:
docker-compose -f docker-compose-local-test.yml down
To view logs:
# View all logs
docker-compose -f docker-compose-local-test.yml logs -f

# View frontend logs only
docker logs -f karat-tracker-20-frontend-1

# View PostgREST logs only
docker logs -f karat-tracker-20-postgrest-1