/**
 * Database Setup Script
 * Tests connection and sets up PostgreSQL database with schema, roles, and auth functions
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Client } = pg;

// Database configuration from .env
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'karat_tracker',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
};

console.log('🔧 Database Setup Script');
console.log('========================\n');
console.log('Configuration:');
console.log(`  Host: ${dbConfig.host}`);
console.log(`  Port: ${dbConfig.port}`);
console.log(`  Database: ${dbConfig.database}`);
console.log(`  User: ${dbConfig.user}\n`);

async function testConnection() {
  console.log('📡 Testing database connection...');
  const client = new Client(dbConfig);

  try {
    await client.connect();
    const result = await client.query('SELECT version()');
    console.log('✅ Connection successful!');
    console.log(`   PostgreSQL version: ${result.rows[0].version.split(',')[0]}\n`);
    await client.end();
    return true;
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error(`   Error: ${error.message}\n`);
    return false;
  }
}

async function runSQLFile(client, filePath, description) {
  console.log(`📄 Running: ${description}...`);

  try {
    let sql = fs.readFileSync(filePath, 'utf8');

    // Remove Supabase-specific roles if this is the schema file
    if (filePath.includes('complete-database-setup.sql')) {
      console.log('   ℹ️  Removing Supabase-specific role references...');
      // Remove GRANT statements to authenticated/anon/service_role
      sql = sql.replace(/GRANT .* TO (authenticated|anon|service_role);/gi, '-- Removed Supabase role grant');
    }

    // Drop existing RLS policies before creating new ones
    if (filePath.includes('03-rls-policies.sql')) {
      console.log('   ℹ️  Dropping existing RLS policies...');
      const tables = ['users', 'daily_rates', 'sales_log', 'expense_log', 'activity_log', 'jwt_config'];

      for (const table of tables) {
        // Get all policies for this table
        const policiesResult = await client.query(
          `SELECT policyname FROM pg_policies WHERE tablename = $1`,
          [table]
        );

        // Drop each policy
        for (const row of policiesResult.rows) {
          await client.query(`DROP POLICY IF EXISTS "${row.policyname}" ON ${table}`);
        }

        if (policiesResult.rows.length > 0) {
          console.log(`   ℹ️  Dropped ${policiesResult.rows.length} existing policies from ${table}`);
        }
      }
    }

    await client.query(sql);
    console.log(`✅ ${description} completed\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed!`);
    console.error(`   Error: ${error.message}\n`);
    return false;
  }
}

async function setupDatabase() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('🔧 Setting up database...\n');

    // List of SQL files to run in order
    const sqlFiles = [
      {
        path: path.join(__dirname, '..', 'supabase', 'migrations', 'complete-database-setup.sql'),
        description: 'Database schema (tables, indexes, etc.)'
      },
      {
        path: path.join(__dirname, '..', 'database', '01-init-roles.sql'),
        description: 'PostgreSQL roles for PostgREST'
      },
      {
        path: path.join(__dirname, '..', 'database', '02-auth-functions.sql'),
        description: 'Authentication functions (JWT, login, etc.)'
      },
      {
        path: path.join(__dirname, '..', 'database', '03-rls-policies.sql'),
        description: 'Row-Level Security policies'
      }
    ];

    // Run each SQL file
    for (const file of sqlFiles) {
      if (!fs.existsSync(file.path)) {
        console.warn(`⚠️  File not found: ${file.path}`);
        console.warn(`   Skipping: ${file.description}\n`);
        continue;
      }

      const success = await runSQLFile(client, file.path, file.description);
      if (!success) {
        console.error('❌ Setup failed. Please fix the errors and try again.');
        process.exit(1);
      }
    }

    // Update JWT secret in database to match .env
    console.log('🔐 Updating JWT secret in database...');
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret !== 'your-super-secret-jwt-key-change-this-in-production') {
      await client.query(
        `INSERT INTO jwt_config (key, value) VALUES ('jwt_secret', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [jwtSecret]
      );
      console.log('✅ JWT secret updated\n');
    } else {
      console.warn('⚠️  JWT_SECRET not set in .env - using default\n');
    }

    // Update authenticator password
    console.log('🔐 Updating authenticator password...');
    const authPassword = process.env.AUTHENTICATOR_PASSWORD;
    if (authPassword && authPassword !== 'your_authenticator_password_here') {
      // Note: ALTER ROLE doesn't support parameterized queries in PostgreSQL
      // We need to escape the password properly
      const escapedPassword = authPassword.replace(/'/g, "''");
      await client.query(
        `ALTER ROLE authenticator WITH PASSWORD '${escapedPassword}'`
      );
      console.log('✅ Authenticator password updated\n');
    } else {
      console.warn('⚠️  AUTHENTICATOR_PASSWORD not set in .env\n');
    }

    // Verify setup
    console.log('🔍 Verifying setup...');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    if (tables.rows.length > 0) {
      console.log('✅ Tables created:');
      tables.rows.forEach(row => console.log(`   - ${row.table_name}`));
      console.log('');
    } else {
      console.warn('⚠️  No tables found!\n');
    }

    console.log('🎉 Database setup complete!\n');
    console.log('Next steps:');
    console.log('  1. Run: npm run migrate-data (to import data from Supabase)');
    console.log('  2. Test: npm run dev (to start the application)\n');

  } catch (error) {
    console.error('❌ Setup failed!');
    console.error(`   Error: ${error.message}\n`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Main execution
(async () => {
  try {
    const connected = await testConnection();

    if (!connected) {
      console.error('Cannot proceed without database connection.');
      console.error('Please check:');
      console.error('  1. PostgreSQL is running on your Coolify server');
      console.error('  2. Firewall allows connections on port 5432');
      console.error('  3. Database credentials in .env are correct');
      console.error('  4. Database "karat_tracker" exists\n');
      process.exit(1);
    }

    await setupDatabase();
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
})();
