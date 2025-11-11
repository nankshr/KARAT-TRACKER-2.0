/**
 * ⚠️  ARCHIVED MIGRATION SCRIPT - FOR REFERENCE ONLY
 *
 * DO NOT RUN THIS SCRIPT WITHOUT UPDATING DATABASE CREDENTIALS!
 * Production database name has been sanitized for safety.
 *
 * Original purpose: Apply supplier management migration to PRODUCTION database
 * Status: ALREADY EXECUTED ON 2025-11-11
 *
 * IMPORTANT: This migration has already been applied. Update credentials before re-running!
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  // ⚠️  PRODUCTION DATABASE CONNECTION - UPDATE BEFORE RUNNING!
  const client = new Client({
    host: '<PROD_DB_HOST>',
    port: 5432,
    database: 'karat_tracker_<prod>', // Production database
    user: 'postgres',
    password: '<PROD_DB_PASSWORD>',
  });

  try {
    console.log('🔌 Connecting to production database: karat_tracker_<prod>...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', '..', 'database', 'migrate-supplier-management.sql');
    console.log('📄 Reading migration file:', migrationPath);

    if (!fs.existsSync(migrationPath)) {
      throw new Error('Migration file not found: ' + migrationPath);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded successfully!\n');

    console.log('🚀 Applying migration to production database...\n');
    console.log('='.repeat(60));

    // Execute the migration
    const result = await client.query(migrationSQL);

    console.log('='.repeat(60));
    console.log('\n✅ Migration applied successfully!');

    // Verify the changes
    console.log('\n🔍 Verifying migration...\n');

    // Check if supplier_transactions table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'supplier_transactions'
      ) as exists;
    `);
    console.log(`  ✅ supplier_transactions table: ${tableCheck.rows[0].exists ? 'EXISTS' : 'NOT FOUND'}`);

    // Check if admin_update_user function exists
    const funcCheck = await client.query(`
      SELECT EXISTS(
        SELECT 1 FROM pg_proc
        WHERE proname = 'admin_update_user'
      ) as exists;
    `);
    console.log(`  ✅ admin_update_user function: ${funcCheck.rows[0].exists ? 'EXISTS' : 'NOT FOUND'}`);

    // Check if pgcrypto extension exists
    const extCheck = await client.query(`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
      ) as exists;
    `);
    console.log(`  ✅ pgcrypto extension: ${extCheck.rows[0].exists ? 'EXISTS' : 'NOT FOUND'}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nNext Steps:');
    console.log('1. ⚠️  RESTART PostgREST service (docker restart or docker-compose restart postgrest)');
    console.log('2. Test login functionality');
    console.log('3. Test supplier management features');
    console.log('4. Test user management features (admin only)');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error applying migration:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed.');
  }
}

applyMigration();
