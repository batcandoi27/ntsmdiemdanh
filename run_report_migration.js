require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
    const sql = fs.readFileSync('scripts/report_rpc_migration.sql', 'utf8');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
        console.error(error);
        process.exit(1);
    }
    console.log('✅ Report RPC Migration Success');
}
run();
