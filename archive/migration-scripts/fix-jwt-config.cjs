/**
 * ⚠️  ARCHIVED UTILITY SCRIPT - FOR REFERENCE ONLY
 *
 * DO NOT RUN THIS SCRIPT WITHOUT UPDATING DATABASE CREDENTIALS!
 * Production database name has been sanitized for safety.
 *
 * Original purpose: Fix JWT configuration in PRODUCTION database
 * Status: ALREADY EXECUTED ON 2025-11-11
 *
 * IMPORTANT: This fix has already been applied. Update credentials before re-running!
 */

const { Client } = require('pg');

async function fixJWTConfig() {
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

    // Step 1: Check if jwt_config table exists
    console.log('📋 Step 1: Checking jwt_config table...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'jwt_config'
      ) as exists;
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠️  jwt_config table NOT found. Creating...');

      // Create jwt_config table
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.jwt_config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
      `);

      console.log('✅ jwt_config table created!');

      // Grant permissions
      await client.query(`
        GRANT SELECT ON public.jwt_config TO web_anon;
        GRANT SELECT ON public.jwt_config TO authenticator;
      `);

      console.log('✅ Permissions granted!');
    } else {
      console.log('✅ jwt_config table exists.');
    }

    // Step 2: Check if JWT secret exists
    console.log('\n🔑 Step 2: Checking JWT secret in jwt_config...');
    const secretCheck = await client.query(`
      SELECT value FROM public.jwt_config WHERE key = 'secret';
    `);

    const JWT_SECRET = '<YOUR_JWT_SECRET_HERE>';  // ⚠️  UPDATE THIS!

    if (secretCheck.rows.length === 0) {
      console.log('⚠️  JWT secret NOT found. Inserting...');

      await client.query(`
        INSERT INTO public.jwt_config (key, value)
        VALUES ('secret', $1)
        ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now();
      `, [JWT_SECRET]);

      console.log('✅ JWT secret inserted!');
    } else {
      const currentSecret = secretCheck.rows[0].value;
      if (currentSecret !== JWT_SECRET) {
        console.log('⚠️  JWT secret exists but is different. Updating...');
        console.log(`   Current: ${currentSecret}`);
        console.log(`   New:     ${JWT_SECRET}`);

        await client.query(`
          UPDATE public.jwt_config
          SET value = $1, updated_at = now()
          WHERE key = 'secret';
        `, [JWT_SECRET]);

        console.log('✅ JWT secret updated!');
      } else {
        console.log('✅ JWT secret is correct.');
      }
    }

    // Step 3: Verify login function can generate tokens
    console.log('\n🧪 Step 3: Testing JWT generation...');

    try {
      // Test the sign_jwt function directly
      const testPayload = {
        user_id: 'test-id',
        username: 'test-user',
        user_role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const jwtTest = await client.query(`
        SELECT sign_jwt($1::json) as token;
      `, [JSON.stringify(testPayload)]);

      if (jwtTest.rows[0].token) {
        console.log('✅ JWT generation working!');
        console.log(`   Sample token (first 50 chars): ${jwtTest.rows[0].token.substring(0, 50)}...`);
      } else {
        console.log('❌ JWT generation returned null!');
      }
    } catch (error) {
      console.error('❌ Error testing JWT generation:', error.message);
    }

    // Step 4: Check login function
    console.log('\n🔍 Step 4: Checking login function...');
    const loginCheck = await client.query(`
      SELECT EXISTS(
        SELECT 1 FROM pg_proc
        WHERE proname = 'login'
      ) as exists;
    `);

    if (!loginCheck.rows[0].exists) {
      console.log('❌ login function NOT found!');
      console.log('   You need to run the complete database setup script.');
    } else {
      console.log('✅ login function exists.');

      // Get the function definition to check if it uses jwt_config correctly
      console.log('\n📝 Checking login function implementation...');
      const funcDef = await client.query(`
        SELECT pg_get_functiondef(oid) as definition
        FROM pg_proc
        WHERE proname = 'login';
      `);

      if (funcDef.rows[0].definition.includes('jwt_config')) {
        console.log('✅ login function references jwt_config table.');
      } else {
        console.log('⚠️  login function may not be using jwt_config table correctly.');
      }
    }

    // Step 5: Test actual login (COMMENTED OUT - requires valid user)
    console.log('\n🧪 Step 5: Testing actual login with admin user...');
    console.log('⚠️  SKIPPED - Update admin credentials to test');

    console.log('\n' + '='.repeat(60));
    console.log('✅ JWT CONFIGURATION CHECK COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nNext Steps:');
    console.log('1. ⚠️  RESTART PostgREST service to reload schema');
    console.log('2. Clear browser cache/cookies');
    console.log('3. Try logging in again');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed.');
  }
}

fixJWTConfig();
