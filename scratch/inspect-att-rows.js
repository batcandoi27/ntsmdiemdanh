require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectAttendanceSchema() {
    const classId = 'ff4d1751-4975-4bcc-96aa-d6801118aa89'; // 8A13
    const { data: rows, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', classId);
    
    console.log('Total attendance rows for 8A13:', rows?.length, 'Error:', error);
    if (rows && rows.length > 0) {
        console.log('Sample rows:', rows.slice(0, 10));
    }
}

inspectAttendanceSchema();
