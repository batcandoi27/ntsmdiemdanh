require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runAlter() {
    const sql = `
        ALTER TABLE payment_transactions ALTER COLUMN column_id DROP NOT NULL;
        ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_column_id_fkey;
    `;
    console.log('🚀 Running Fix for payment_transactions column_id nullable...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('✅ Alter applied successfully!');
    }
}

runAlter();
