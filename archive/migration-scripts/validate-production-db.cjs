/**
 * ⚠️  ARCHIVED VALIDATION SCRIPT - FOR REFERENCE ONLY
 *
 * DO NOT RUN THIS SCRIPT WITHOUT UPDATING DATABASE CREDENTIALS!
 * Production database name has been sanitized for safety.
 *
 * Original purpose: Comprehensive validation of PRODUCTION database schema
 * Status: EXECUTED ON 2025-11-11 - All validation passed (100% success)
 *
 * IMPORTANT: Update credentials before re-running!
 */

/**
 * Validate Production Database Schema
 * Checks the current state of karat_tracker_<prod> database
 */

const { Client } = require('pg');

async function validateProductionDB() {
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
    console.log('📊 PRODUCTION DATABASE VALIDATION REPORT');
    console.log('=' .repeat(70));
    console.log();

    // 1. Check Database Roles
    console.log('🔐 Step 1: Checking Database Roles');
    console.log('-'.repeat(70));
    const rolesResult = await client.query(`
      SELECT rolname, rolcanlogin, rolinherit
      FROM pg_roles
      WHERE rolname IN ('authenticator', 'web_anon', 'postgres')
      ORDER BY rolname;
    `);

    rolesResult.rows.forEach(role => {
      const status = role.rolname === 'authenticator' || role.rolname === 'web_anon' ? '✅' : '📌';
      console.log(`  ${status} ${role.rolname}`);
      console.log(`     - Can Login: ${role.rolcanlogin}`);
      console.log(`     - Inherit: ${role.rolinherit}`);
    });
    console.log();

    // 2. Check All Tables
    console.log('📋 Step 2: Checking Tables');
    console.log('-'.repeat(70));
    const tablesResult = await client.query(`
      SELECT table_name,
             (SELECT COUNT(*) FROM information_schema.columns c
              WHERE c.table_name = t.table_name AND c.table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const expectedTables = [
      'users',
      'daily_rates',
      'expense_log',
      'sales_log',
      'supplier_transactions',
      'activity_log',
      'jwt_config'
    ];

    expectedTables.forEach(tableName => {
      const exists = tablesResult.rows.find(r => r.table_name === tableName);
      if (exists) {
        console.log(`  ✅ ${tableName} (${exists.column_count} columns)`);
      } else {
        console.log(`  ❌ ${tableName} - MISSING!`);
      }
    });

    // Show any extra tables
    const extraTables = tablesResult.rows.filter(
      r => !expectedTables.includes(r.table_name)
    );
    if (extraTables.length > 0) {
      console.log('\n  📦 Additional tables found:');
      extraTables.forEach(t => console.log(`     - ${t.table_name}`));
    }
    console.log();

    // 3. Check Extensions
    console.log('🔌 Step 3: Checking PostgreSQL Extensions');
    console.log('-'.repeat(70));
    const extensionsResult = await client.query(`
      SELECT extname, extversion
      FROM pg_extension
      WHERE extname IN ('pgcrypto', 'pgjwt')
      ORDER BY extname;
    `);

    ['pgcrypto', 'pgjwt'].forEach(extName => {
      const exists = extensionsResult.rows.find(r => r.extname === extName);
      if (exists) {
        console.log(`  ✅ ${extName} (version ${exists.extversion})`);
      } else {
        console.log(`  ⚠️  ${extName} - NOT INSTALLED ${extName === 'pgcrypto' ? '(REQUIRED!)' : '(optional)'}`);
      }
    });
    console.log();

    // 4. Check Database Functions
    console.log('⚙️  Step 4: Checking Database Functions');
    console.log('-'.repeat(70));
    const functionsResult = await client.query(`
      SELECT
        proname as function_name,
        pg_get_function_arguments(oid) as arguments
      FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace
        AND proname IN (
          'login',
          'create_user',
          'change_password',
          'admin_update_user',
          'logout',
          'current_user_id',
          'current_user_role',
          'sign_jwt',
          'execute_safe_query',
          'get_table_schema'
        )
      ORDER BY proname;
    `);

    const expectedFunctions = [
      'login',
      'create_user',
      'change_password',
      'admin_update_user',
      'logout',
      'current_user_id',
      'current_user_role',
      'sign_jwt'
    ];

    expectedFunctions.forEach(funcName => {
      const exists = functionsResult.rows.find(r => r.function_name === funcName);
      if (exists) {
        console.log(`  ✅ ${funcName}()`);
      } else {
        console.log(`  ❌ ${funcName}() - MISSING!`);
      }
    });
    console.log();

    // 5. Check JWT Configuration
    console.log('🔑 Step 5: Checking JWT Configuration');
    console.log('-'.repeat(70));
    const jwtConfigExists = tablesResult.rows.find(r => r.table_name === 'jwt_config');

    if (jwtConfigExists) {
      const jwtSecretResult = await client.query(`
        SELECT key,
               CASE
                 WHEN LENGTH(value) > 0 THEN '✅ Set (length: ' || LENGTH(value) || ')'
                 ELSE '❌ Empty'
               END as status
        FROM public.jwt_config
        WHERE key = 'secret';
      `);

      if (jwtSecretResult.rows.length > 0) {
        console.log(`  ✅ jwt_config table exists`);
        console.log(`  ${jwtSecretResult.rows[0].status}`);
      } else {
        console.log(`  ✅ jwt_config table exists`);
        console.log(`  ⚠️  JWT secret NOT configured`);
      }
    } else {
      console.log(`  ❌ jwt_config table MISSING!`);
    }
    console.log();

    // 6. Check Users and Password Hashing
    console.log('👥 Step 6: Checking Users and Password Security');
    console.log('-'.repeat(70));
    const usersTableExists = tablesResult.rows.find(r => r.table_name === 'users');

    if (usersTableExists) {
      const usersResult = await client.query(`
        SELECT
          COUNT(*) as total_users,
          COUNT(CASE WHEN password LIKE '$2%' THEN 1 END) as bcrypt_hashed,
          COUNT(CASE WHEN password NOT LIKE '$2%' THEN 1 END) as not_hashed
        FROM public.users;
      `);

      const stats = usersResult.rows[0];
      console.log(`  📊 Total Users: ${stats.total_users}`);
      console.log(`  ${stats.bcrypt_hashed === stats.total_users ? '✅' : '⚠️'} Bcrypt Hashed: ${stats.bcrypt_hashed}/${stats.total_users}`);

      if (parseInt(stats.not_hashed) > 0) {
        console.log(`  ⚠️  NOT Hashed: ${stats.not_hashed} (SECURITY ISSUE!)`);
      }

      // List users with roles
      const usersListResult = await client.query(`
        SELECT username, role, created_at
        FROM public.users
        ORDER BY created_at;
      `);

      console.log('\n  User List:');
      usersListResult.rows.forEach(user => {
        console.log(`     - ${user.username} (${user.role})`);
      });
    } else {
      console.log(`  ❌ users table MISSING!`);
    }
    console.log();

    // 7. Check Indexes
    console.log('🔍 Step 7: Checking Performance Indexes');
    console.log('-'.repeat(70));
    const indexesResult = await client.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('users', 'daily_rates', 'expense_log', 'sales_log', 'supplier_transactions', 'activity_log')
      ORDER BY tablename, indexname;
    `);

    const expectedIndexes = [
      'idx_users_username',
      'idx_users_sessionid',
      'idx_daily_rates_asof_date',
      'idx_expense_log_asof_date',
      'idx_sales_log_asof_date',
      'idx_supplier_transactions_asof_date',
      'idx_supplier_transactions_supplier',
      'idx_supplier_transactions_material',
      'idx_activity_log_timestamp',
      'idx_activity_log_user_id'
    ];

    expectedIndexes.forEach(indexName => {
      const exists = indexesResult.rows.find(r => r.indexname === indexName);
      if (exists) {
        console.log(`  ✅ ${indexName}`);
      } else {
        console.log(`  ⚠️  ${indexName} - MISSING (performance impact)`);
      }
    });
    console.log();

    // 8. Check Row Counts
    console.log('📈 Step 8: Record Counts');
    console.log('-'.repeat(70));

    for (const tableName of expectedTables) {
      const exists = tablesResult.rows.find(r => r.table_name === tableName);
      if (exists) {
        try {
          const countResult = await client.query(`SELECT COUNT(*) as count FROM public.${tableName};`);
          console.log(`  📊 ${tableName}: ${countResult.rows[0].count} records`);
        } catch (error) {
          console.log(`  ❌ ${tableName}: Error counting - ${error.message}`);
        }
      }
    }
    console.log();

    // Summary
    console.log('=' .repeat(70));
    console.log('📋 VALIDATION SUMMARY');
    console.log('=' .repeat(70));

    const supplierTableExists = tablesResult.rows.find(r => r.table_name === 'supplier_transactions');
    const adminFunctionExists = functionsResult.rows.find(r => r.function_name === 'admin_update_user');

    console.log('\n🎯 Migration Requirements:');
    console.log();

    if (!supplierTableExists) {
      console.log('  ⚠️  REQUIRED: Run apply-production-migration.cjs');
      console.log('     - Creates supplier_transactions table');
      console.log('     - Updates login, sign_jwt, current_user_role functions');
      console.log('     - Adds admin_update_user function');
    } else {
      console.log('  ✅ supplier_transactions table exists');
    }

    if (!jwtConfigExists) {
      console.log('  ⚠️  REQUIRED: Run fix-jwt-config.cjs');
      console.log('     - Creates jwt_config table');
      console.log('     - Sets JWT secret');
      console.log('     - Tests token generation');
    } else {
      console.log('  ✅ jwt_config table exists');
    }

    if (usersTableExists) {
      const passwordCheckResult = await client.query(`
        SELECT COUNT(*) as not_hashed
        FROM public.users
        WHERE password NOT LIKE '$2%';
      `);

      if (parseInt(passwordCheckResult.rows[0].not_hashed) > 0) {
        console.log('  ⚠️  REQUIRED: Run fix-production-passwords.cjs');
        console.log('     - Ensures all passwords are bcrypt hashed');
      } else {
        console.log('  ✅ All passwords properly hashed');
      }
    }

    console.log();
    console.log('=' .repeat(70));
    console.log('✅ VALIDATION COMPLETE!');
    console.log('=' .repeat(70));

  } catch (error) {
    console.error('\n❌ Error during validation:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed.');
  }
}

validateProductionDB();
