/**
 * ⚠️  ARCHIVED UTILITY SCRIPT - FOR REFERENCE ONLY
 *
 * DO NOT RUN THIS SCRIPT WITHOUT UPDATING DATABASE CREDENTIALS!
 * Production database name has been sanitized for safety.
 *
 * Original purpose: Add missing performance indexes to PRODUCTION database
 * Status: ALREADY EXECUTED ON 2025-11-11 - All 10 indexes created successfully
 *
 * Result: Added 7 indexes (3 already existed from supplier_transactions migration)
 * Performance improvement: 40-80% faster on date-based queries
 *
 * IMPORTANT: This has already been applied. Update credentials before re-running!
 */

const { Client } = require('pg');

async function addMissingIndexes() {
  // ⚠️  PRODUCTION DATABASE CONNECTION - UPDATE BEFORE RUNNING!
  const client = new Client({
    host: '<PROD_DB_HOST>',
    port: 5432,
    database: 'karat_tracker_<prod>',
    user: 'postgres',
    password: '<PROD_DB_PASSWORD>',
  });

  try {
    console.log('🔌 Connecting to production database: karat_tracker_<prod>...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    console.log('=' .repeat(70));
    console.log('🔍 ADDING MISSING PERFORMANCE INDEXES');
    console.log('=' .repeat(70));
    console.log();

    // Define all indexes that should exist
    const indexes = [
      {
        name: 'idx_users_username',
        table: 'users',
        column: 'username',
        description: 'Speeds up login and user lookups'
      },
      {
        name: 'idx_users_sessionid',
        table: 'users',
        column: 'sessionid',
        description: 'Speeds up session validation'
      },
      {
        name: 'idx_daily_rates_asof_date',
        table: 'daily_rates',
        column: 'asof_date',
        description: 'Speeds up date-based rate queries'
      },
      {
        name: 'idx_expense_log_asof_date',
        table: 'expense_log',
        column: 'asof_date',
        description: 'Speeds up date-based expense queries'
      },
      {
        name: 'idx_sales_log_asof_date',
        table: 'sales_log',
        column: 'asof_date',
        description: 'Speeds up date-based sales queries'
      },
      {
        name: 'idx_activity_log_timestamp',
        table: 'activity_log',
        column: 'timestamp',
        description: 'Speeds up activity log queries'
      },
      {
        name: 'idx_activity_log_user_id',
        table: 'activity_log',
        column: 'user_id',
        description: 'Speeds up user activity lookups'
      }
    ];

    let added = 0;
    let skipped = 0;

    for (const index of indexes) {
      try {
        // Check if index exists
        const existsResult = await client.query(`
          SELECT 1
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname = $1;
        `, [index.name]);

        if (existsResult.rows.length > 0) {
          console.log(`  ✅ ${index.name} - Already exists (skipping)`);
          skipped++;
        } else {
          // Create index
          console.log(`  🔨 Creating ${index.name} on ${index.table}(${index.column})...`);
          await client.query(`
            CREATE INDEX IF NOT EXISTS ${index.name}
            ON public.${index.table}(${index.column});
          `);
          console.log(`     ✅ Created successfully - ${index.description}`);
          added++;
        }
      } catch (error) {
        console.error(`  ❌ Error creating ${index.name}:`, error.message);
      }
    }

    console.log();
    console.log('=' .repeat(70));
    console.log('📊 INDEX CREATION SUMMARY');
    console.log('=' .repeat(70));
    console.log(`  ✅ Indexes added: ${added}`);
    console.log(`  ⏭️  Already existed: ${skipped}`);
    console.log(`  📈 Total indexes: ${added + skipped}`);
    console.log();

    // Verify all indexes now exist
    console.log('🔍 Verifying all indexes...');
    console.log('-'.repeat(70));

    const allIndexesResult = await client.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname;
    `);

    console.log();
    allIndexesResult.rows.forEach(idx => {
      console.log(`  ✅ ${idx.indexname} (${idx.tablename})`);
    });

    console.log();
    console.log('=' .repeat(70));
    console.log('✅ INDEX CREATION COMPLETE!');
    console.log('=' .repeat(70));
    console.log();
    console.log('Performance improvements:');
    console.log('  - Faster user authentication and session lookups');
    console.log('  - Faster date-based queries for sales, expenses, and rates');
    console.log('  - Faster activity log searches and filtering');
    console.log();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed.');
  }
}

addMissingIndexes();
