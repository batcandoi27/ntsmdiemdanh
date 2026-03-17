
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOldData() {
    console.log('Checking records for date 2026-03-09...');
    
    const { data: records, error } = await supabase
        .from('attendance')
        .select('*, students(student_code), attendance_statuses(code)')
        .eq('date', '2026-03-09')
        .limit(10);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Records count for 2026-03-09:', records.length);
        console.log('Sample Records structure:', JSON.stringify(records, null, 2));
    }
}

checkOldData();
