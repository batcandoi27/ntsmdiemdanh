const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JSON_FILE_PATH = 'docs/Data_AppDiemDanh_2025-2026_2026-03-13.json';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase config in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigrationV13_1() {
    console.log('🚀 Starting JSON Migration v13.1 (Sỹ số Focus)...');
    
    const rawData = fs.readFileSync(JSON_FILE_PATH, 'utf8');
    const data = JSON.parse(rawData);
    console.log(`Loaded JSON: ${data.classes?.length} classes, ${data.students?.length} students.`);

    // 1. Đảm bảo Năm học tồn tại
    const yearName = data.meta?.year || '2025-2026';
    const { data: years } = await supabase.from('academic_years').select('id').eq('name', yearName).limit(1);
    
    let yearId;
    if (years && years.length > 0) {
        yearId = years[0].id;
    } else {
        const { data: newYear } = await supabase.from('academic_years').insert({
            name: yearName,
            is_active: true
        }).select().single();
        yearId = newYear.id;
    }
    console.log(`Year ID: ${yearId} (${yearName})`);

    // 2. Migrate Lớp học (Classes)
    console.log('Migrating Classes...');
    const classRecords = data.classes.map(c => ({
        id: c.id,
        year_id: yearId,
        name: c.name,
        grade: c.grade,
        class_type: c.classType === 'Normal' ? 'school' : 'tutor'
    }));
    await supabase.from('classes').upsert(classRecords, { onConflict: 'id' });

    // 3. Migrate Học sinh (Students)
    console.log('Migrating Students...');
    const studentRecords = data.students.map(s => ({
        student_code: s.code,
        full_name: s.fullName,
        gender: s.gender,
        birthday: s.birthday,
        status: 'active'
    }));
    for (let i = 0; i < studentRecords.length; i += 500) {
        const batch = studentRecords.slice(i, i + 500);
        await supabase.from('students').upsert(batch, { onConflict: 'student_code' });
    }

    // 4. Lấy Mapping student_code -> id
    const { data: dbStudents } = await supabase.from('students').select('id, student_code');
    const studentCodeToId = new Map();
    dbStudents.forEach(s => studentCodeToId.set(s.student_code, s.id));

    // 5. Migrate Liên kết Lớp (Student_Classes) - FIX SỸ SỐ
    console.log('Migrating Student-Class links (Fixing Sỹ số)...');
    const scRecords = data.students.map(s => {
        const studentId = studentCodeToId.get(s.code);
        if (studentId && s.classId) {
            return {
                student_id: studentId,
                class_id: s.classId,
                is_active: true
            };
        }
        return null;
    }).filter(r => r !== null);

    for (let i = 0; i < scRecords.length; i += 500) {
        const batch = scRecords.slice(i, i + 500);
        await supabase.from('student_classes').upsert(batch, { onConflict: 'student_id, class_id' });
    }

    console.log('✅ Migration v13.1 (Sỹ số) SUCCESSFUL!');
}

runMigrationV13_1().catch(console.error);
