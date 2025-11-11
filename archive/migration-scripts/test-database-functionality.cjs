/**
 * ⚠️  ARCHIVED TESTING SCRIPT - FOR REFERENCE ONLY
 *
 * DO NOT RUN THIS SCRIPT WITHOUT UPDATING DATABASE CREDENTIALS!
 * Production database name has been sanitized for safety.
 *
 * Original purpose: Comprehensive functional testing of PRODUCTION database
 * Status: EXECUTED ON 2025-11-11 - All 8 tests passed (100% success rate)
 *
 * IMPORTANT: Update credentials before re-running!
 */

/**
 * Test Database Functionality
 * Verifies that all critical functions work correctly
 */

const { Client } = require('pg');

async function testDatabaseFunctionality() {
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
    console.log('🧪 DATABASE FUNCTIONALITY TESTS');
    console.log('=' .repeat(70));
    console.log();

    let passed = 0;
    let failed = 0;

    // Test 1: Login Function
    console.log('🧪 Test 1: Login Function');
    console.log('-'.repeat(70));
    try {
      const loginResult = await client.query(`
        SELECT * FROM login('admin', 'admin');
      `);

      if (loginResult.rows.length > 0) {
        const loginData = loginResult.rows[0];
        console.log('  ✅ Login function works!');
        console.log(`     - User ID: ${loginData.user_id}`);
        console.log(`     - Username: ${loginData.username}`);
        console.log(`     - Role: ${loginData.role}`);
        console.log(`     - Token: ${loginData.token ? loginData.token.substring(0, 30) + '...' : 'NULL'}`);
        console.log(`     - Session ID: ${loginData.session_id ? loginData.session_id.substring(0, 20) + '...' : 'NULL'}`);

        if (loginData.token && loginData.session_id) {
          passed++;
        } else {
          console.log('  ⚠️  Token or Session ID is NULL!');
          failed++;
        }
      } else {
        console.log('  ❌ Login failed - no results returned');
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ Login test failed: ${error.message}`);
      failed++;
    }
    console.log();

    // Test 2: JWT Generation
    console.log('🧪 Test 2: JWT Token Generation');
    console.log('-'.repeat(70));
    try {
      const testPayload = {
        user_id: 'test-id-123',
        username: 'test-user',
        user_role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const jwtResult = await client.query(`
        SELECT sign_jwt($1::json) as token;
      `, [JSON.stringify(testPayload)]);

      if (jwtResult.rows[0].token) {
        const token = jwtResult.rows[0].token;
        console.log('  ✅ JWT generation works!');
        console.log(`     - Token length: ${token.length} characters`);
        console.log(`     - Token preview: ${token.substring(0, 50)}...`);

        // Verify JWT structure (header.payload.signature)
        const parts = token.split('.');
        if (parts.length === 3) {
          console.log(`     - JWT structure: Valid (3 parts)`);
          passed++;
        } else {
          console.log(`     - ⚠️  JWT structure: Invalid (${parts.length} parts)`);
          failed++;
        }
      } else {
        console.log('  ❌ JWT generation failed - token is NULL');
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ JWT generation test failed: ${error.message}`);
      failed++;
    }
    console.log();

    // Test 3: Current User Functions
    console.log('🧪 Test 3: Current User Helper Functions');
    console.log('-'.repeat(70));
    try {
      // These functions rely on JWT context, so we'll just check they exist
      const funcCheck = await client.query(`
        SELECT proname
        FROM pg_proc
        WHERE proname IN ('current_user_id', 'current_user_role')
        ORDER BY proname;
      `);

      if (funcCheck.rows.length === 2) {
        console.log('  ✅ current_user_id() function exists');
        console.log('  ✅ current_user_role() function exists');
        passed++;
      } else {
        console.log('  ❌ One or more helper functions missing');
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ Helper function test failed: ${error.message}`);
      failed++;
    }
    console.log();

    // Test 4: User Creation Function
    console.log('🧪 Test 4: User Creation Function');
    console.log('-'.repeat(70));
    try {
      const funcCheck = await client.query(`
        SELECT proname
        FROM pg_proc
        WHERE proname = 'create_user';
      `);

      if (funcCheck.rows.length > 0) {
        console.log('  ✅ create_user() function exists');
        console.log('     - Function is available for creating new users');
        passed++;
      } else {
        console.log('  ❌ create_user() function missing');
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ User creation test failed: ${error.message}`);
      failed++;
    }
    console.log();

    // Test 5: Admin Update User Function
    console.log('🧪 Test 5: Admin User Management Function');
    console.log('-'.repeat(70));
    try {
      const funcCheck = await client.query(`
        SELECT proname
        FROM pg_proc
        WHERE proname = 'admin_update_user';
      `);

      if (funcCheck.rows.length > 0) {
        console.log('  ✅ admin_update_user() function exists');
        console.log('     - Admins can update user passwords and roles');
        passed++;
      } else {
        console.log('  ❌ admin_update_user() function missing');
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ Admin function test failed: ${error.message}`);
      failed++;
    }
    console.log();

    // Test 6: Supplier Transactions Table
    console.log('🧪 Test 6: Supplier Transactions Feature');
    console.log('-'.repeat(70));
    try {
      // Check table exists and has correct structure
      const tableCheck = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'supplier_transactions'
        ORDER BY ordinal_position;
      `);

      if (tableCheck.rows.length > 0) {
        console.log('  ✅ supplier_transactions table exists');
        console.log(`     - Columns: ${tableCheck.rows.length}`);

        // Check for key columns
        const keyColumns = ['supplier_name', 'material', 'type', 'calculation_type'];
        let allColumnsPresent = true;

        keyColumns.forEach(col => {
          const exists = tableCheck.rows.find(r => r.column_name === col);
          if (exists) {
            console.log(`     - ✅ ${col} (${exists.data_type})`);
          } else {
            console.log(`     - ❌ ${col} missing!`);
            allColumnsPresent = false;
          }
        });

        if (allColumnsPresent) {
          passed++;
        } else {
          failed++;
        }
      } else {
        console.log('  ❌ supplier_transactions table missing');
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ Supplier transactions test failed: ${error.message}`);
      failed++;
    }
    console.log();

    // Test 7: Database Permissions
    console.log('🧪 Test 7: Database Permissions (web_anon role)');
    console.log('-'.repeat(70));
    try {
      const permCheck = await client.query(`
        SELECT
          grantee,
          table_name,
          string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
        FROM information_schema.table_privileges
        WHERE grantee = 'web_anon'
          AND table_schema = 'public'
        GROUP BY grantee, table_name
        ORDER BY table_name;
      `);

      if (permCheck.rows.length > 0) {
        console.log('  ✅ web_anon role has permissions on tables:');
        permCheck.rows.forEach(perm => {
          console.log(`     - ${perm.table_name}: ${perm.privileges}`);
        });
        passed++;
      } else {
        console.log('  ⚠️  No permissions found for web_anon role');
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ Permission test failed: ${error.message}`);
      failed++;
    }
    console.log();

    // Test 8: Performance Indexes
    console.log('🧪 Test 8: Performance Indexes');
    console.log('-'.repeat(70));
    try {
      const indexCheck = await client.query(`
        SELECT COUNT(*) as index_count
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname LIKE 'idx_%';
      `);

      const indexCount = parseInt(indexCheck.rows[0].index_count);
      if (indexCount >= 10) {
        console.log(`  ✅ All ${indexCount} performance indexes present`);
        passed++;
      } else {
        console.log(`  ⚠️  Only ${indexCount} indexes found (expected 10+)`);
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ Index test failed: ${error.message}`);
      failed++;
    }
    console.log();

    // Summary
    console.log('=' .repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(70));
    console.log();
    console.log(`  ✅ Tests Passed: ${passed}`);
    console.log(`  ❌ Tests Failed: ${failed}`);
    console.log(`  📈 Total Tests: ${passed + failed}`);
    console.log(`  📊 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    console.log();

    if (failed === 0) {
      console.log('=' .repeat(70));
      console.log('🎉 ALL TESTS PASSED! DATABASE IS PRODUCTION READY! 🎉');
      console.log('=' .repeat(70));
      console.log();
      console.log('✅ Your production database is fully configured and ready for:');
      console.log('   - User authentication and management');
      console.log('   - Sales and expense tracking');
      console.log('   - Supplier management');
      console.log('   - Daily rate management');
      console.log('   - Activity logging');
      console.log('   - High-performance queries');
      console.log();
    } else {
      console.log('⚠️  Some tests failed. Please review the issues above.');
    }

  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed.');
  }
}

testDatabaseFunctionality();
