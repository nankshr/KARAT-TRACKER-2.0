/**
 * ⚠️  ARCHIVED MIGRATION SCRIPT - FOR REFERENCE ONLY
 *
 * DO NOT RUN THIS SCRIPT WITHOUT UPDATING DATABASE CREDENTIALS!
 * Production database name has been sanitized for safety.
 *
 * Original purpose: Apply database migration script to TEST database
 * Run this with: node apply-migration.cjs
 *
 * IMPORTANT: Update credentials below before running!
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// ⚠️  DATABASE CONFIGURATION - UPDATE BEFORE RUNNING!
const client = new Client({
  host: '<DB_HOST>',
  port: 5432,
  database: 'karat_tracker_<env>',  // Use: karat_tracker_t for test, karat_tracker_<prod> for production
  user: 'postgres',
  password: '<DB_PASSWORD>',
});

async function applyMigration() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    // Read migration file
    const migrationPath = path.join(__dirname, '..', '..', 'database', 'migrate-supplier-management.sql');
    console.log(`Reading migration file: ${migrationPath}`);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration...');
    await client.query(migrationSQL);

    console.log('\n✅ Migration applied successfully!');
    console.log('\nNext steps:');
    console.log('1. Restart PostgREST: docker restart karat-tracker-20-postgrest-1');
    console.log('2. Test login at http://localhost:8081');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
