require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkColumns() {
    const { data: cols, error } = await supabase.from('columns').select('*').limit(5);
    console.log('Columns sample:', cols?.map(c => ({ id: c.id, name: c.name, is_shared: c.is_shared_with_parents, payment: c.payment_config })));
    if (error) console.error('Error:', error);
}

checkColumns();
