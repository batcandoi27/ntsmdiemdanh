const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JSON_FILE_PATH = 'docs/diemdanh tuan 4 thang 2.json';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function removeAccents(str) {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

async function runMigrationV13_3_1() {
    console.log('🚀 Starting Attendance Migration v13.3.1 (Fixing Join Error)...');
    
    const data = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf8'));
    
    // Status & Type codes
    const { data: statuses } = await supabase.from('attendance_statuses').select('id, code');
    const statusMap = {
        'absent': statuses.find(s => s.code === 'absent')?.id,
        'excused': statuses.find(s => s.code === 'excused')?.id,
        'late': statuses.find(s => s.code === 'late')?.id
    };
    const { data: types } = await supabase.from('attendance_types').select('id').limit(1);
    const defaultTypeId = types[0]?.id;

    // Lấy link học sinh - lớp trước
    console.log('Fetching student-class links...');
    const { data: scLinks } = await supabase.from('student_classes').select('student_id, class_id');
    const studentToClasses = new Map();
    scLinks.forEach(l => {
        if (!studentToClasses.has(l.student_id)) studentToClasses.set(l.student_id, []);
        studentToClasses.get(l.student_id).push(l.class_id);
    });

    // Lấy toàn bộ học sinh
    console.log('Fetching students...');
    const { data: students } = await supabase.from('students').select('id, full_name');
    
    // Tạo map: key = "className_nameNoAccent" -> id
    const studentLookup = new Map();
    students.forEach(s => {
        const nameNoAccent = removeAccents(s.full_name).toLowerCase();
        const classes = studentToClasses.get(s.id) || [];
        classes.forEach(classId => {
            const key = `${classId}_${nameNoAccent}`;
            studentLookup.set(key, s.id);
            
            // Key cho tên riêng
            const parts = nameNoAccent.split(' ');
            const lastName = parts[parts.length - 1];
            const keyShort = `${classId}_${lastName}`;
            if (!studentLookup.has(keyShort)) studentLookup.set(keyShort, s.id);
        });
    });

    const attRecords = [];
    let matched = 0, missed = 0;

    for (const day of data) {
        const date = day.date;
        for (const cls of day.classes) {
            const classId = cls.className;
            for (const st of cls.students) {
                const nameNoAccent = removeAccents(st.name).toLowerCase();
                const key = `${classId}_${nameNoAccent}`;
                
                let studentId = studentLookup.get(key);
                if (!studentId) {
                    const parts = nameNoAccent.split(' ');
                    studentId = studentLookup.get(`${classId}_${parts[parts.length-1]}`);
                }

                if (studentId && statusMap[st.status]) {
                    attRecords.push({
                        student_id: studentId,
                        class_id: classId,
                        type_id: defaultTypeId,
                        status_id: statusMap[st.status],
                        date: date,
                        note: st.note || '',
                        created_at: new Date().toISOString()
                    });
                    matched++;
                } else {
                    missed++;
                }
            }
        }
    }

    if (attRecords.length > 0) {
        console.log(`Upserting ${attRecords.length} records...`);
        const { error } = await supabase.from('attendance').upsert(attRecords, { onConflict: 'student_id, class_id, date, type_id' });
        if (error) console.error('Supabase Error:', error);
    }

    console.log(`✅ Final Results: Matched: ${matched}, Missed: ${missed}`);
}

runMigrationV13_3_1().catch(console.error);
