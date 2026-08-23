require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAttendanceTables() {
    const studentId = '13cad476-6d2c-41f4-b3b5-acf4334a313b'; // Nguyen Van An
    const classId = 'ff4d1751-4975-4bcc-96aa-d6801118aa89'; // 8A13

    console.log('1. Checking attendance_records_v3:');
    const { data: v3, error: e1 } = await supabase
        .from('attendance_records_v3')
        .select('*')
        .eq('student_id', studentId);
    console.log('attendance_records_v3 count:', v3?.length, 'error:', e1?.message);

    console.log('2. Checking attendance table:');
    const { data: att, error: e2 } = await supabase
        .from('attendance')
        .select('*, students(student_code, full_name), attendance_statuses(code, name)')
        .eq('class_id', classId);
    console.log('attendance rows in class:', att?.length, 'error:', e2?.message);
    if (att && att.length > 0) {
        console.log('Sample row from attendance:', JSON.stringify(att.slice(0, 5), null, 2));
    }

    console.log('3. Checking attendance_statuses:');
    const { data: statuses } = await supabase.from('attendance_statuses').select('*');
    console.log('Statuses:', statuses);
}

checkAttendanceTables();
