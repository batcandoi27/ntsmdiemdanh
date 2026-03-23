require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    const sql = fs.readFileSync('scripts/student_hardened_migration.sql', 'utf8');
    console.log('🚀 Running Hardened Migration...');
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
    
    console.log('✅ Hardened Migration Applied Successfully!');
}

runMigration();
