require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAttendanceStats() {
    const classId = 'ff4d1751-4975-4bcc-96aa-d6801118aa89'; // 8A13

    // 1. Get all attendance statuses
    const { data: statuses } = await supabase.from('attendance_statuses').select('*');
    const statusMap = new Map((statuses || []).map(s => [s.id, s.code]));

    // 2. Get students in 8A13
    const { data: students } = await supabase
        .from('students')
        .select('id, student_code, full_name')
        .eq('class_id', classId);

    console.log(`Found ${students.length} students in 8A13`);

    // 3. Get all attendance records for 8A13
    const { data: attendanceRows } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', classId);

    console.log(`Found ${attendanceRows.length} attendance rows in 8A13`);

    // Group by student
    const studentStats = {};
    for (const s of students) {
        studentStats[s.id] = {
            student_code: s.student_code,
            full_name: s.full_name,
            P: 0, // Phép
            K: 0, // Không phép
            T: 0, // Trễ
            VP: 0, // Vi phạm
            KH: 0, // Khen thưởng
            V: 0, // Vắng chưa rõ
            totalRecords: 0
        };
    }

    for (const row of attendanceRows) {
        const statusCode = statusMap.get(row.status_id) || 'UNKNOWN';
        if (studentStats[row.student_id]) {
            studentStats[row.student_id].totalRecords++;
            if (statusCode === 'P') studentStats[row.student_id].P++;
            else if (statusCode === 'K') studentStats[row.student_id].K++;
            else if (statusCode === 'T') studentStats[row.student_id].T++;
            else if (statusCode === 'VP') studentStats[row.student_id].VP++;
            else if (statusCode === 'KH') studentStats[row.student_id].KH++;
            else if (statusCode === 'V') studentStats[row.student_id].V++;
        }
    }

    console.log('Sample student stats with attendance:');
    const withRecords = Object.values(studentStats).filter(st => st.totalRecords > 0);
    console.log(withRecords.slice(0, 10));
}

testAttendanceStats();
