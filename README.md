# 💎 Karat Tracker - Premium Jewelry Management System

<div align="center">

![Karat Tracker Logo](https://img.shields.io/badge/Karat-Tracker-gold?style=for-the-badge&logo=crown&logoColor=white)

[![React](https://img.shields.io/badge/React-18.3-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-cyan?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

*A comprehensive jewelry management application for tracking daily rates, sales transactions, expenses, and business analytics with AI-powered insights.*

</div>

---

## 🌟 Key Features

### 💰 **Financial Management**
- **Daily Rates Tracking** - Real-time gold/silver pricing (24k, 22k, 18k)
- **Sales Transaction Management** - Comprehensive wholesale/retail tracking
- **Advanced Old Material Calculation** - Bidirectional purity/cost calculations with auto-recalculation
- **Expense Logging** - Direct/indirect expense categorization with Udhaar support
- **Profit Analytics** - Enhanced profit calculations including old material profit tracking

### 🤖 **AI-Powered Analytics**
- **Natural Language Queries** - Ask questions in plain English
- **Voice Input Support** - Speak your queries using advanced speech recognition
- **Intelligent Data Insights** - AI-generated summaries and recommendations
- **Smart SQL Generation** - Convert natural language to optimized SQL queries
- **🛡️ Privacy Protection** - Customer data automatically masked before AI processing

### 📊 **Advanced Reporting**
- **Interactive Dashboard** - Real-time business metrics and KPIs
- **Data Export** - CSV export with customizable columns and date filtering
- **Visual Analytics** - Charts and graphs for trend analysis
- **Activity Logging** - Complete audit trail of all transactions

### 🔐 **Security & Access Control**
- **Role-Based Access** - Admin, Owner, and Employee permission levels
- **Secure Authentication** - Session-based login system
- **Row-Level Security** - Database-level access protection
- **Activity Monitoring** - IP tracking and user agent logging

### 🎨 **Modern User Experience**
- **Responsive Design** - Mobile-first approach with beautiful gradients
- **Dark/Light Theme** - Customizable UI preferences
- **Real-time Updates** - Live data synchronization
- **Intuitive Interface** - Clean, professional jewelry industry design

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher) - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **npm** or **yarn** package manager
- **Supabase Account** - [Sign up for free](https://supabase.com/)
- **OpenAI API Key** - [Get your API key](https://platform.openai.com/api-keys) (for AI features)

### 🛠️ Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/karat-tracker.git
cd karat-tracker

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your actual configuration values

# 4. Start development server
npm run dev
```

The application will be available at `http://localhost:8080`

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_PROJECT_ID="your-project-id"

# OpenAI Configuration (for AI features)
VITE_OPENAI_API_KEY="sk-your-openai-api-key"

# Optional: Development Settings
NODE_ENV="development"
```

### 🔑 Getting Your Keys

1. **Supabase Setup:**
   - Create a new project at [supabase.com](https://supabase.com/)
   - Go to Settings > API
   - Copy your Project URL and Anon Key

2. **OpenAI Setup:**
   - Sign up at [platform.openai.com](https://platform.openai.com/)
   - Navigate to API Keys section
   - Create a new API key

---

## 🗄️ Database Setup

### 🚀 Quick Setup (Recommended)

Execute the consolidated setup script in your Supabase SQL Editor:

```bash
# 1. Go to your Supabase Project → SQL Editor
# 2. Copy and execute the complete setup script
# File: supabase/migrations/complete-database-setup.sql
```

**This single script handles:**
- ✅ New database setup from scratch
- ✅ Existing database updates (safe to re-run)
- ✅ All tables, indexes, and constraints
- ✅ Complete RLS policies (including UPDATE permissions)
- ✅ AI query functions
- ✅ Default admin user setup
- ✅ Verification queries

### 📋 Step-by-Step Instructions

#### For New Databases:
1. **Create a new Supabase project** at [supabase.com](https://supabase.com/)
2. **Open SQL Editor** in your Supabase dashboard
3. **Copy the entire content** from `supabase/migrations/complete-database-setup.sql`
4. **Paste and execute** the script
5. **Verify setup** using the queries shown at the end of the script

#### For Existing Databases:
1. **Backup your database** (recommended)
2. **Open SQL Editor** in your Supabase dashboard
3. **Copy the entire content** from `supabase/migrations/complete-database-setup.sql`
4. **Execute the script** - it's safe to run on existing databases
5. **Verify the updates** using the verification queries

### 🔧 What the Script Creates

The consolidated script includes everything from previous migration files:

#### Core Tables:
- `users` - Authentication and role management
- `daily_rates` - Gold/silver pricing with unique constraints
- `sales_log` - Sales transactions with profit calculations
- `expense_log` - Business expenses with Udhaar support
- `activity_log` - Complete audit trail

#### Security & Permissions:
- **Row Level Security (RLS)** enabled on all tables
- **Complete CRUD policies** (SELECT, INSERT, UPDATE, DELETE)
- **Role-based access control** for different user types

#### AI & Utility Functions:
- `get_table_schema()` - Table structure inspection
- `execute_safe_query()` - Secure AI query execution

#### Default Data:
- **Admin user** (username: `admin`, password: `admin`)
- **Change default credentials** after first login!

### 🔍 Troubleshooting Database Setup

#### Common Issues:

**❌ Error: "relation already exists"**
- ✅ **Solution**: This is normal - the script uses `IF NOT EXISTS` and safely handles existing tables

**❌ Error: "permission denied"**
- ✅ **Solution**: Ensure you're using the SQL Editor in your Supabase dashboard (not a database client)

**❌ Edit functionality not working**
- ✅ **Solution**: Execute the complete script - it fixes missing UPDATE policies

**❌ RLS policy conflicts**
- ✅ **Solution**: The script drops and recreates all policies for consistency

#### Verification Steps:

After running the script, verify everything is working:

```sql
-- 1. Check if all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Verify RLS policies (should see UPDATE policies)
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- 3. Test login (should return user data)
SELECT username, role FROM users WHERE username = 'admin';
```

#### 📁 Migration Files:

- **Active**: `supabase/migrations/complete-database-setup.sql` ← **Use this one**
- **Archived**: `supabase/migrations/archive/` ← Reference only (old individual files)

The complete setup script consolidates all previous migration files and adds important fixes like UPDATE policies for the edit functionality.

### 📋 Database Tables

| Table | Description | Key Features |
|-------|-------------|--------------|
| `users` | User authentication and roles | Role-based access (admin/owner/employee) |
| `daily_rates` | Gold/silver pricing | Material type, karat levels, price tracking |
| `sales_log` | Sales transactions | Customer info, profit calculations, gold exchange |
| `expense_log` | Business expenses | Direct/indirect categorization, Udhaar support |
| `activity_log` | Audit trail | Complete transaction history with IP tracking |

---

## 🏗️ Project Architecture

```
karat-tracker/
├── 📁 src/
│   ├── 📁 components/          # React components
│   │   ├── 📄 Dashboard.tsx     # Main dashboard
│   │   ├── 📄 AddSales.tsx     # Sales entry form
│   │   ├── 📄 AddExpense.tsx   # Expense logging
│   │   ├── 📄 TableDataExport.tsx # AI-powered data export
│   │   └── 📁 ui/              # Reusable UI components
│   ├── 📁 contexts/            # React contexts
│   ├── 📁 hooks/               # Custom React hooks
│   ├── 📁 lib/                 # Utility libraries
│   │   ├── 📄 openaiService.ts  # AI integration
│   │   └── 📄 activityLogger.ts # Audit logging
│   ├── 📁 pages/               # Page components
│   └── 📁 integrations/        # External service integrations
├── 📁 supabase/
│   ├── 📁 migrations/          # Database migration files
│   └── 📄 config.toml          # Supabase configuration
├── 📄 package.json            # Dependencies and scripts
├── 📄 vite.config.ts          # Vite configuration
└── 📄 tailwind.config.js      # Tailwind CSS configuration
```

---

## 🎯 Core Functionality

### 👤 User Management
- **Multi-role Authentication** (Admin, Owner, Employee)
- **Session Management** with automatic timeout
- **Security Logging** with IP and user agent tracking

### 💎 Daily Rates Management
```typescript
// Example: Setting daily rates
{
  material: 'gold',
  karat: '24k',
  new_price_per_gram: 7500.00,
  old_price_per_gram: 7400.00,
  asof_date: '2024-12-15'
}
```

### 📈 Sales Transaction Recording
```typescript
// Example: Complete sales transaction with new descriptive schema
{
  customer_name: 'John Doe',
  customer_phone: '+91-9876543210',
  material: 'gold',
  type: 'retail',
  item_name: 'Gold Chain',
  tag_no: 'GC001',
  purchase_weight_grams: 25.500,
  purchase_purity: 91.60,
  purchase_cost: 191250.00,
  selling_cost: 210000.00,
  profit: 18750.00
}
```

### 🔄 Advanced Old Material Cost Calculation

**Revolutionary bidirectional calculation system for old jewelry exchanges**

The system now features an advanced old material cost calculation that supports both purchase and sales scenarios with automatic recalculation:

#### **Key Features:**
- **Bidirectional Calculations** - Enter either purity or cost, system calculates the other
- **Auto-Recalculation** - Values update when material type or grams change
- **Separate Purchase & Sales** - Track old material purchase and sales with different purities
- **Profit on Old** - Automatic calculation: `Old Sales Cost - Old Purchase Cost`
- **Enhanced Profit Formula** - New formula: `(Selling Cost - Purchase Cost) + Profit on Old`

#### **Calculation Flow:**
```typescript
// Old Material Calculation Structure (Updated Schema)
{
  old_weight_grams: 15.500,                    // Old material grams (shared)
  old_purchase_purity: 85.00,                  // Old purchase purity %
  old_sales_purity: 90.00,                     // Old sales purity %

  // Auto-calculated display fields (not stored in DB)
  old_purchase_cost: 98750.00,                 // old_weight_grams × (old_purchase_purity/100) × old_price_per_gram
  old_sales_cost: 104625.00,                   // old_weight_grams × (old_sales_purity/100) × old_price_per_gram

  // Final stored values
  old_material_profit: 5875.00,                // Profit on old (sales - purchase)
  total_profit: 24625.00                       // (selling_cost - purchase_cost) + old_material_profit
}
```

#### **Smart Input Behaviors:**
- **Purity Entry** → Auto-calculates respective cost
- **Cost Entry** → Auto-calculates respective purity
- **Material Change** → Recalculates all old costs with new rates
- **Gram Change** → Updates both purchase and sales costs
- **Visual Feedback** → Shows calculated values with override capability

#### **Database Optimization:**
- `o2_gram` field deprecated (set to null)
- Renamed `o1_purity` → `old_purchase_purity` for clarity
- Renamed `o2_purity` → `old_sales_purity` for clarity
- Renamed `o_cost` → `old_material_profit` for semantic meaning

### 💰 Expense Tracking
```typescript
// Example: Business expense entry with updated schema
{
  expense_type: 'direct',
  item_name: 'Gold Purchase',
  cost: 50000.00,
  is_credit: false,
  asof_date: '2024-12-15'
}
```

### 🤖 AI Query Examples

Natural language queries you can use:

- *"What's the total profit this month?"*
- *"Show me top 10 customers by sales value"*
- *"Compare gold vs silver sales performance"*
- *"What are my highest expense categories?"*
- *"Calculate net profit after all expenses"*

#### 🛡️ Privacy Protection in AI Queries

The system automatically protects customer privacy when processing AI queries:

- **Automatic Data Masking**: Customer names and phone numbers are masked before sending to AI services
- **Format Preservation**: Data structure is maintained while protecting sensitive information
- **Visual Indicators**: Masked fields are clearly marked in the UI with 🔒 icons
- **Zero Data Leakage**: Original customer data never leaves your secure database to external AI services

**Example of Data Masking:**
```
Original: "John Doe", "+91-9876543210"
Masked:   "J***e", "+91-98****3210"
```

---

## 🚀 Deployment Guide

### Prerequisites for Production

- **VPS/Cloud Server** (Ubuntu 20.04+ recommended)
- **Node.js** (v18+)
- **PM2** (for process management)
- **Nginx** (web server)
- **SSL Certificate** (Let's Encrypt recommended)

### 🌐 Server Setup

#### 1. Initial Server Configuration
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js using NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

#### 2. Application Deployment
```bash
# Clone repository to server
git clone https://github.com/your-username/karat-tracker.git
cd karat-tracker

# Install dependencies
npm install

# Build for production
npm run build

# Set up environment variables
sudo nano .env
# Add your production environment variables

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 3. PM2 Configuration

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'karat-tracker',
    script: 'npm',
    args: 'run preview',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

#### 4. Nginx Configuration

Create `/etc/nginx/sites-available/karat-tracker`:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
}
```

#### 5. Enable Site and SSL
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/karat-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 🔄 Automated Deployment Script

Create `deploy.sh`:
```bash
#!/bin/bash
echo "🚀 Deploying Karat Tracker..."

# Pull latest changes
git pull origin main

# Install/update dependencies
npm install

# Build application
npm run build

# Restart PM2 process
pm2 reload karat-tracker

echo "✅ Deployment completed successfully!"
```

---

## 🔄 Latest Updates & Improvements

### ✨ **December 2024 - Major Database Optimization & Enhancement Release**

#### 🗄️ **Database Schema Improvements**
- **Descriptive Column Names**: Renamed all abbreviated columns to descriptive names for better LLM query generation
  - `p_grams` → `purchase_weight_grams`
  - `p_purity` → `purchase_purity`
  - `p_cost` → `purchase_cost`
  - `s_purity` → `selling_purity`
  - `s_cost` → `selling_cost`
  - `o1_gram` → `old_weight_grams`
  - `o1_purity` → `old_purchase_purity`
  - `o2_purity` → `old_sales_purity`
  - `o_cost` → `old_material_profit`
  - `n_price` → `new_price_per_gram`
  - `o_price` → `old_price_per_gram`
  - `udhaar` → `is_credit`

#### 🚀 **Enhanced Sales Form Functionality**
- **Smart Auto-Calculation**: Comprehensive recalculation system that triggers on:
  - Material type changes
  - Purchase weight changes
  - Date changes (updates rates automatically)
  - Wastage percentage changes
- **Material Switch Behavior**: Switching to gold retail now resets wastage and selling cost for fresh entry
- **Real-time Updates**: All calculations update instantly when any relevant field changes

#### 💸 **Expense Management Enhancement**
- **Settlement Functionality**: Unchecking "Udhaar (Credit)" in edit mode automatically sets expense amount to 0
- **Credit Tracking**: Better visualization and management of credit expenses

#### 📊 **Activity Log Display Fix**
- **Readable Object Display**: Fixed activity log showing `[object Object]` for old_data and new_data
- **Smart Formatting**: JSON objects now display as readable key-value pairs
  - Example: "Cost: ₹1,500, Item Name: Gold Chain, Is Credit: No"
- **Enhanced CSV Export**: Activity log data exports properly formatted for analysis

#### 🧠 **AI Query Enhancements**
- **Improved Schema Understanding**: LLM can now generate more accurate SQL queries with descriptive column names
- **Better Context Awareness**: Enhanced table detection and relationship understanding
- **Multi-table Query Support**: Intelligent joins across related tables

#### 🔧 **Technical Improvements**
- **Migration Safety**: All database changes use safe `IF EXISTS` checks for backward compatibility
- **Type Safety**: Updated TypeScript interfaces to match new column names
- **Performance Optimization**: Optimized queries and reduced redundant calculations

#### 📝 **Code Quality**
- **Consistent Naming**: All components now use the new descriptive column names
- **Error Handling**: Improved error handling for database operations
- **Documentation**: Enhanced code comments and inline documentation

### 🎯 **Migration Guide for Existing Installations**

If you're upgrading from a previous version:

1. **Run the Migration Script**:
   ```sql
   -- Execute in Supabase SQL Editor
   -- File: supabase/migrations/rename-columns-descriptive.sql
   ```

2. **Update Your Queries**: If you have custom queries, update them to use new column names

3. **Test All Functionality**: Verify that sales entry, expense tracking, and activity logs work correctly

### 📊 **API Documentation**

#### Database Structure Updates

The database now uses semantic, descriptive column names that improve:
- **LLM Query Generation**: AI can better understand the data structure
- **Developer Experience**: More intuitive column names for easier development
- **Documentation**: Self-documenting database schema

#### Updated Sales Transaction Example
```typescript
// New descriptive schema
{
  customer_name: 'John Doe',
  customer_phone: '+91-9876543210',
  material: 'gold',
  type: 'retail',
  item_name: 'Gold Chain',
  tag_no: 'GC001',

  // Purchase details (old: p_*)
  purchase_weight_grams: 25.500,
  purchase_purity: 91.60,
  purchase_cost: 191250.00,

  // Selling details (old: s_*)
  selling_purity: 91.60,
  selling_cost: 210000.00,

  // Old material details (enhanced)
  old_weight_grams: 15.500,
  old_purchase_purity: 85.00,
  old_sales_purity: 90.00,
  old_material_profit: 5875.00,

  profit: 18750.00
}
```

#### AI Query Execution
```http
POST /api/ai-query
Authorization: Bearer <session-token>
Content-Type: application/json

{
  "query": "What's the total profit this month?",
  "context": {
    "table": "sales_log",
    "dateRange": {
      "from": "2024-12-01",
      "to": "2024-12-31"
    }
  }
}
```

---

## 🛠️ Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run build:dev` | Build for development environment |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint for code quality |
| `npm run type-check` | TypeScript type checking |

---

## 🔧 Configuration Options

### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    historyApiFallback: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser'
  }
})
```

### Tailwind CSS Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        amber: { /* Custom amber palette */ },
        gold: { /* Gold color variations */ }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      }
    }
  }
}
```

---

## 🐛 Troubleshooting

### Common Issues

#### Environment Variables Not Loading
```bash
# Check if .env file exists and has correct permissions
ls -la .env
# Restart development server
npm run dev
```

#### Database Connection Issues
```bash
# Verify Supabase credentials
curl -H "apikey: YOUR_ANON_KEY" https://YOUR_PROJECT_ID.supabase.co/rest/v1/
```

#### Build Failures
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### PM2 Process Issues
```bash
# Check PM2 status
pm2 status
pm2 logs karat-tracker
pm2 restart karat-tracker
```

---

## 📈 Performance Optimization

### Frontend Optimizations
- **Code Splitting** - Lazy loading of components
- **Image Optimization** - WebP format with fallbacks
- **Bundle Analysis** - Regular bundle size monitoring
- **Caching Strategy** - Service worker implementation

### Database Optimizations
- **Indexing** - Optimized indexes on frequently queried columns
- **Query Optimization** - Efficient SQL query patterns
- **Connection Pooling** - Supabase connection optimization
- **Row Level Security** - Minimal performance impact security

### Server Optimizations
- **Gzip Compression** - Reduced payload sizes
- **CDN Integration** - Static asset delivery
- **Process Management** - PM2 cluster mode
- **Memory Management** - Automated process restarts

---

## 🔒 Security Best Practices

### Database Security
- ✅ Row Level Security (RLS) enabled
- ✅ SQL injection prevention with parameterized queries
- ✅ Role-based access control
- ✅ Audit logging for all transactions

### Application Security
- ✅ Input validation and sanitization
- ✅ CORS protection
- ✅ Session timeout management
- ✅ Environment variable protection
- ✅ Customer data masking for AI services
- ✅ Privacy-first AI query processing

### Infrastructure Security
- ✅ SSL/TLS encryption
- ✅ Firewall configuration
- ✅ Regular security updates
- ✅ Backup and recovery procedures

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Standards
- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for code formatting
- **Conventional Commits** for commit messages

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

---

## 🆘 Support

### Documentation
- 📚 **Full Documentation**: [Wiki](https://github.com/your-username/karat-tracker/wiki)
- 🎥 **Video Tutorials**: [YouTube Playlist](https://youtube.com/playlist)
- 📖 **API Reference**: [API Docs](https://api-docs.karat-tracker.com)

### Community
- 💬 **Discord Community**: [Join our Discord](https://discord.gg/karat-tracker)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-username/karat-tracker/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/your-username/karat-tracker/discussions)

### Professional Support
For enterprise support and custom development:
- 📧 **Email**: support@karat-tracker.com
- 🌐 **Website**: [www.karat-tracker.com](https://www.karat-tracker.com)

---

<div align="center">

**Made with ❤️ for the Jewelry Industry**

*Transforming traditional jewelry business management with modern technology*

[![Star on GitHub](https://img.shields.io/github/stars/your-username/karat-tracker?style=social)](https://github.com/your-username/karat-tracker)
[![Follow on Twitter](https://img.shields.io/twitter/follow/karat_tracker?style=social)](https://twitter.com/karat_tracker)

---

© 2024 Karat Tracker. All rights reserved.

</div>