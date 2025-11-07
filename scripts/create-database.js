/**
 * Create Database Script
 * Creates the karat_tracker database if it doesn't exist
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Client } = pg;

// Connect to postgres database to create karat_tracker
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: 'postgres', // Connect to default postgres database
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
};

const targetDatabase = process.env.DB_NAME || 'karat_tracker';

console.log('🔧 Create Database Script');
console.log('========================\n');
console.log(`Target database: ${targetDatabase}`);
console.log(`PostgreSQL server: ${dbConfig.host}:${dbConfig.port}\n`);

async function createDatabase() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL server\n');

    // Check if database exists
    const checkResult = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDatabase]
    );

    if (checkResult.rows.length > 0) {
      console.log(`ℹ️  Database "${targetDatabase}" already exists\n`);
    } else {
      console.log(`📦 Creating database "${targetDatabase}"...`);
      await client.query(`CREATE DATABASE ${targetDatabase}`);
      console.log(`✅ Database "${targetDatabase}" created successfully!\n`);
    }

    console.log('🎉 Database ready!\n');
    console.log('Next step: Run `npm run setup` to create tables and schema\n');

  } catch (error) {
    console.error('❌ Failed to create database!');
    console.error(`   Error: ${error.message}\n`);
    console.error('Please check:');
    console.error('  1. PostgreSQL is running and accessible');
    console.error('  2. User has permission to create databases');
    console.error('  3. Firewall allows connections');
    console.error('  4. Credentials in .env are correct\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Main execution
(async () => {
  try {
    await createDatabase();
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
})();
