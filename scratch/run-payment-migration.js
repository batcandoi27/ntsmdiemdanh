require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    const sql = fs.readFileSync('supabase/migrations/20260821_payment_and_portal_monitor.sql', 'utf8');
    console.log('🚀 Running Payment & Portal Monitor Migration...');
    
    // Try exec_sql RPC first
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
        console.warn('RPC exec_sql not available or failed:', error.message);
        console.log('Attempting alternative query approach...');
    } else {
        console.log('✅ Migration Applied via exec_sql Successfully!');
    }
}

runMigration();
