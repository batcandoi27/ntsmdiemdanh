import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function exec(sql, desc) {
  console.log(`[SQL] ${desc}...`);
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (error) {
    console.error(`Error in ${desc}:`, error);
    throw error;
  }
  console.log(`  -> OK`);
}

async function run() {
  console.log('🚀 Running Composite Columns & Parent-Child Schema Migration...');

  await exec(`
    ALTER TABLE columns 
    ADD COLUMN IF NOT EXISTS parent_column_id TEXT REFERENCES columns(id) ON DELETE CASCADE;

    ALTER TABLE columns 
    ADD COLUMN IF NOT EXISTS activity_config JSONB DEFAULT NULL;

    ALTER TABLE columns 
    ADD COLUMN IF NOT EXISTS display_config JSONB DEFAULT NULL;

    ALTER TABLE columns 
    ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 1;

    CREATE INDEX IF NOT EXISTS idx_columns_parent_id ON columns(parent_column_id);
    CREATE INDEX IF NOT EXISTS idx_columns_class_parent ON columns(class_id, parent_column_id);
  `, 'Add parent_column_id, activity_config, display_config, schema_version to columns table');

  console.log('✅ Migration completed successfully!');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
