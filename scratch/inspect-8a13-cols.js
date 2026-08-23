require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectColumns() {
    const classId = 'ff4d1751-4975-4bcc-96aa-d6801118aa89';
    const { data: cols, error } = await supabase
        .from('columns')
        .select('id, name, scope, frequency, is_shared_with_parents, payment_config, class_id, user_id')
        .eq('class_id', classId);
    
    console.log('Columns for class 8A13:', cols);
}

inspectColumns();
