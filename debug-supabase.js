
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase variables in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
    console.log('Checking Supabase connection...');
    
    // 1. Check total attendance
    const { count, error: countError } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true });
    
    if (countError) {
        console.error('Error counting attendance:', countError);
    } else {
        console.log('Total attendance records:', count);
    }

    // 2. Sample data
    const { data: sample, error: sampleError } = await supabase
        .from('attendance')
        .select('*, students(student_code), attendance_statuses(code)')
        .order('created_at', { ascending: false })
        .limit(5);

    if (sampleError) {
        console.error('Error fetching samples:', sampleError);
    } else {
        console.log('Sample Data:', JSON.stringify(sample, null, 2));
    }

    // 3. Check for specific date range (requested in log: 2026-03-16 to 2026-03-22)
    const { count: rangeCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .gte('date', '2026-03-16')
        .lte('date', '2026-03-22');
    
    console.log('Records in range 2026-03-16 -> 2026-03-22:', rangeCount);
}

checkData();
