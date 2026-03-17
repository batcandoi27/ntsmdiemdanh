
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSchema() {
    console.log('🔧 Adding UNIQUE constraint to profiles(email)...');
    
    // We try to run this via a hack: creating a function that runs it if rpc is not available
    // Better yet: try to run it directly if possible, but Supabase JS doesn't support raw SQL easily.
    // Let's try to use the 'postgres' rpc if it exists, or suggest the user.
    
    console.log('Sending SQL... (This might require the exec_sql RPC)');
    const sql = `ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);`;
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
        console.error('❌ Error applying SQL:', error.message);
        console.log('\n--- VUI LÒNG CHẠY CÂU LỆNH NÀY TRONG SUPABASE SQL EDITOR ---\n');
        console.log(sql);
        console.log('\n-----------------------------------------------------------\n');
    } else {
        console.log('✅ Successfully added UNIQUE constraint!');
    }
}

fixSchema();
