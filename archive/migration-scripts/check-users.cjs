/**
 * ⚠️  ARCHIVED UTILITY SCRIPT - FOR REFERENCE ONLY
 *
 * DO NOT RUN THIS SCRIPT WITHOUT UPDATING DATABASE CREDENTIALS!
 * Production database name has been sanitized for safety.
 *
 * Original purpose: Check and fix user accounts in TEST database
 * Run this with: node check-users.cjs
 *
 * IMPORTANT: Update credentials below before running!
 */

const { Client } = require('pg');

// ⚠️  DATABASE CONFIGURATION - UPDATE BEFORE RUNNING!
const client = new Client({
  host: '<DB_HOST>',
  port: 5432,
  database: 'karat_tracker_<env>',  // Use: karat_tracker_t for test
  user: 'postgres',
  password: '<DB_PASSWORD>',
});

async function checkUsers() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!\n');

    // List all users
    console.log('📋 Current users in the database:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const result = await client.query('SELECT id, username, role, created_at FROM users ORDER BY created_at');

    if (result.rows.length === 0) {
      console.log('❌ No users found in database!');
      console.log('\nCreating default admin user...');

      // Create default admin user with password "admin123"
      await client.query(`
        INSERT INTO users (username, password, role)
        VALUES ('admin', crypt('admin123', gen_salt('bf')), 'admin')
        ON CONFLICT (username) DO NOTHING
      `);

      console.log('✅ Default admin user created!');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   Role: admin');

    } else {
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. Username: ${row.username}`);
        console.log(`   Role: ${row.role}`);
        console.log(`   Created: ${new Date(row.created_at).toLocaleString('en-IN')}`);
        console.log(`   ID: ${row.id}`);
        console.log('');
      });

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Check if passwords are hashed
      const passwordCheck = await client.query('SELECT username, password FROM users LIMIT 1');
      if (passwordCheck.rows.length > 0) {
        const passwordSample = passwordCheck.rows[0].password;
        if (passwordSample && passwordSample.startsWith('$2')) {
          console.log('✅ Passwords are properly hashed with bcrypt');
        } else {
          console.log('⚠️  WARNING: Passwords may not be properly hashed!');
          console.log('   Rehashing all user passwords...\n');

          // Rehash all passwords (assuming they're plain text or need rehashing)
          for (const row of result.rows) {
            // Set password to username (user will need to change it)
            await client.query(
              `UPDATE users SET password = crypt($1, gen_salt('bf')) WHERE username = $2`,
              [row.username, row.username]
            );
            console.log(`✅ Reset password for: ${row.username} (password set to username)`);
          }

          console.log('\n⚠️  All passwords have been reset to match usernames.');
          console.log('   Please login with username as password and change it immediately.');
        }
      }
    }

    console.log('\n🔐 You can now test login at:');
    console.log('   - http://localhost:8081 (dev server)');
    console.log('   - http://localhost:3002 (docker frontend)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkUsers();
