/**
 * Data Migration Script
 * Exports data from Supabase and imports to PostgreSQL
 */

import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Client } = pg;

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// PostgreSQL configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'karat_tracker',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
};

console.log('🔄 Data Migration Script');
console.log('========================\n');
console.log(`From: Supabase (${supabaseUrl})`);
console.log(`To:   PostgreSQL (${dbConfig.host}:${dbConfig.port}/${dbConfig.database})\n`);

// Tables to migrate in order (respecting foreign key dependencies)
const tables = [
  'users',
  'daily_rates',
  'sales_log',
  'expense_log',
  'activity_log'
];

async function exportFromSupabase(tableName) {
  console.log(`📥 Exporting ${tableName} from Supabase...`);

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    console.log(`✅ Exported ${data.length} rows from ${tableName}\n`);
    return data;
  } catch (error) {
    console.error(`❌ Export failed for ${tableName}!`);
    console.error(`   Error: ${error.message}\n`);
    return null;
  }
}

async function importToPostgres(client, tableName, data) {
  if (!data || data.length === 0) {
    console.log(`⏭️  No data to import for ${tableName}\n`);
    return true;
  }

  console.log(`📤 Importing ${data.length} rows to ${tableName}...`);

  try {
    // Disable triggers to avoid RLS issues during import
    await client.query(`ALTER TABLE ${tableName} DISABLE TRIGGER ALL`);

    for (const row of data) {
      const columns = Object.keys(row).join(', ');
      const placeholders = Object.keys(row).map((_, i) => `$${i + 1}`).join(', ');
      const values = Object.values(row);

      await client.query(
        `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})
         ON CONFLICT DO NOTHING`,
        values
      );
    }

    // Re-enable triggers
    await client.query(`ALTER TABLE ${tableName} ENABLE TRIGGER ALL`);

    console.log(`✅ Imported ${data.length} rows to ${tableName}\n`);
    return true;
  } catch (error) {
    console.error(`❌ Import failed for ${tableName}!`);
    console.error(`   Error: ${error.message}\n`);

    // Try to re-enable triggers even if import failed
    try {
      await client.query(`ALTER TABLE ${tableName} ENABLE TRIGGER ALL`);
    } catch (e) {
      // Ignore
    }

    return false;
  }
}

async function verifyMigration(client) {
  console.log('🔍 Verifying migration...\n');

  for (const table of tables) {
    const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
    const count = parseInt(result.rows[0].count);
    console.log(`   ${table}: ${count} rows`);
  }

  console.log('');
}

async function migrateData() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Ask for confirmation
    console.log('⚠️  WARNING: This will import data from Supabase to PostgreSQL.');
    console.log('   Existing data in PostgreSQL will NOT be deleted, but duplicates will be skipped.\n');

    let totalExported = 0;
    let totalImported = 0;

    for (const table of tables) {
      // Export from Supabase
      const data = await exportFromSupabase(table);

      if (data === null) {
        console.error(`Failed to export ${table}. Stopping migration.`);
        process.exit(1);
      }

      totalExported += data.length;

      // Import to PostgreSQL
      const success = await importToPostgres(client, table, data);

      if (!success) {
        console.error(`Failed to import ${table}. Stopping migration.`);
        process.exit(1);
      }

      totalImported += data.length;
    }

    // Verify
    await verifyMigration(client);

    console.log('🎉 Migration complete!\n');
    console.log(`Summary:`);
    console.log(`  Exported: ${totalExported} rows`);
    console.log(`  Imported: ${totalImported} rows\n`);

    console.log('Next steps:');
    console.log('  1. Verify data in PostgreSQL');
    console.log('  2. Test login and application functionality');
    console.log('  3. If all looks good, you can keep Supabase as backup for 30 days\n');

  } catch (error) {
    console.error('❌ Migration failed!');
    console.error(`   Error: ${error.message}\n`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Main execution
(async () => {
  try {
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials not found in .env');
      console.error('   Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY\n');
      process.exit(1);
    }

    if (!dbConfig.password) {
      console.error('❌ PostgreSQL password not found in .env');
      console.error('   Please set DB_PASSWORD\n');
      process.exit(1);
    }

    await migrateData();
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
})();
