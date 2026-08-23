require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testStudentAttendance() {
    const classId = 'ff4d1751-4975-4bcc-96aa-d6801118aa89';
    const { data: statuses } = await supabase.from('attendance_statuses').select('*');
    const statusMap = new Map((statuses || []).map(s => [s.id, s]));

    const { data: rows } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', classId);

    console.log(`Total attendance rows in 8A13: ${rows?.length}`);
    const studentCount = {};
    for (const r of rows) {
        studentCount[r.student_id] = (studentCount[r.student_id] || 0) + 1;
    }
    console.log('Students with attendance records:', Object.entries(studentCount));

    // Pick first student with attendance
    const sampleStudentId = Object.keys(studentCount)[0];
    const { data: student } = await supabase.from('students').select('*').eq('id', sampleStudentId).single();
    console.log('Sample student:', student?.student_code, student?.full_name);

    const studentRows = rows.filter(r => r.student_id === sampleStudentId);
    let P = 0, K = 0, T = 0, VP = 0, KH = 0, V = 0;
    for (const r of studentRows) {
        const st = statusMap.get(r.status_id);
        if (st) {
            if (st.code === 'P') P++;
            else if (st.code === 'K') K++;
            else if (st.code === 'T') T++;
            else if (st.code === 'VP') VP++;
            else if (st.code === 'KH') KH++;
            else if (st.code === 'V') V++;
        }
    }
    console.log(`Stats for ${student?.full_name}: P=${P}, K=${K}, T=${T}, VP=${VP}, KH=${KH}, V=${V}`);
}

testStudentAttendance();
