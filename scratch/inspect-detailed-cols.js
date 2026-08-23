require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectToanColumn() {
    const classId = 'ff4d1751-4975-4bcc-96aa-d6801118aa89';
    const { data: cols, error } = await supabase
        .from('columns')
        .select('*')
        .eq('class_id', classId);
    
    for (const c of cols) {
        console.log('----------------------------------------------------');
        console.log('ID:', c.id);
        console.log('Name:', JSON.stringify(c.name));
        console.log('Frequency:', c.frequency);
        console.log('Period Config:', c.period_config);
        console.log('Sub Periods:', c.sub_periods);
        console.log('is_shared_with_parents:', c.is_shared_with_parents);
        console.log('payment_config:', c.payment_config);
        console.log('archived:', c.archived);
    }
}

inspectToanColumn();
