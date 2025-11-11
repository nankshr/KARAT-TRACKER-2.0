/**
 * ⚠️  ARCHIVED UTILITY SCRIPT - FOR REFERENCE ONLY
 *
 * DO NOT RUN THIS SCRIPT WITHOUT UPDATING DATABASE CREDENTIALS!
 * Production database name has been sanitized for safety.
 *
 * Original purpose: Fix password hashing in PRODUCTION database
 * Status: ALREADY EXECUTED ON 2025-11-11 - All passwords verified as properly hashed
 *
 * IMPORTANT: Update credentials before re-running!
 */

const { Client } = require('pg');

async function fixProductionPasswords() {
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

    // Step 1: Check if pgcrypto extension exists
    console.log('📦 Step 1: Checking pgcrypto extension...');
    const extCheck = await client.query(`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
      ) as exists;
    `);

    if (!extCheck.rows[0].exists) {
      console.log('⚠️  pgcrypto extension NOT found. Installing...');
      await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
      console.log('✅ pgcrypto extension installed successfully!');
    } else {
      console.log('✅ pgcrypto extension already exists.');
    }

    // Step 2: Check current users and their password formats
    console.log('\n👥 Step 2: Checking users table...');
    const usersResult = await client.query(`
      SELECT id, username, password, role, created_at
      FROM public.users
      ORDER BY created_at;
    `);

    console.log(`Found ${usersResult.rows.length} users:\n`);

    const usersNeedingFix = [];

    for (const user of usersResult.rows) {
      const isBcrypt = user.password && user.password.startsWith('$2');
      console.log(`  - ${user.username} (${user.role})`);
      console.log(`    Password format: ${isBcrypt ? '✅ Bcrypt hashed' : '❌ NOT properly hashed'}`);
      console.log(`    Password prefix: ${user.password ? user.password.substring(0, 10) + '...' : 'NULL'}`);

      if (!isBcrypt) {
        usersNeedingFix.push(user);
      }
    }

    // Step 3-4: Check functions
    console.log('\n🔍 Step 3: Checking admin_update_user function...');
    const funcCheck = await client.query(`
      SELECT EXISTS(
        SELECT 1 FROM pg_proc
        WHERE proname = 'admin_update_user'
      ) as exists;
    `);

    if (!funcCheck.rows[0].exists) {
      console.log('⚠️  admin_update_user function NOT found.');
      console.log('   You need to run the migration script: database/migrate-supplier-management.sql');
    } else {
      console.log('✅ admin_update_user function exists.');
    }

    console.log('\n🔍 Step 4: Checking create_user function...');
    const createUserCheck = await client.query(`
      SELECT EXISTS(
        SELECT 1 FROM pg_proc
        WHERE proname = 'create_user'
      ) as exists;
    `);

    if (!createUserCheck.rows[0].exists) {
      console.log('⚠️  create_user function NOT found.');
    } else {
      console.log('✅ create_user function exists.');
    }

    // Step 5: Fix passwords that are not properly hashed
    if (usersNeedingFix.length > 0) {
      console.log(`\n🔧 Step 5: Fixing ${usersNeedingFix.length} user(s) with unhashed passwords...\n`);

      for (const user of usersNeedingFix) {
        console.log(`  Fixing password for: ${user.username}`);

        try {
          // Hash the current password value using bcrypt
          const hashResult = await client.query(`
            SELECT crypt($1, gen_salt('bf')) as hashed_password;
          `, [user.password]);

          const hashedPassword = hashResult.rows[0].hashed_password;

          // Update the password
          await client.query(`
            UPDATE public.users
            SET password = $1, updated_at = now()
            WHERE id = $2;
          `, [hashedPassword, user.id]);

          console.log(`  ✅ Password hashed for ${user.username}`);
        } catch (error) {
          console.error(`  ❌ Error fixing password for ${user.username}:`, error.message);
        }
      }

      console.log('\n✅ Password fixing complete!');
    } else {
      console.log('\n✅ Step 5: All passwords are properly hashed. No fixes needed!');
    }

    // Step 6: Verify the fix
    console.log('\n🔍 Step 6: Verifying all passwords are now properly hashed...');
    const verifyResult = await client.query(`
      SELECT username,
             CASE
               WHEN password LIKE '$2%' THEN 'Bcrypt ✅'
               ELSE 'Invalid ❌'
             END as password_status
      FROM public.users
      ORDER BY username;
    `);

    console.log('\nPassword Status Summary:');
    verifyResult.rows.forEach(row => {
      console.log(`  ${row.username}: ${row.password_status}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ DIAGNOSIS AND FIX COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nNext Steps:');
    console.log('1. Restart PostgREST service to reload database schema');
    console.log('2. Test login with admin credentials');
    console.log('3. If still issues, check JWT_SECRET matches between DB and PostgREST');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed.');
  }
}

fixProductionPasswords();
