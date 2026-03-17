const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Config
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!FIREBASE_PROJECT_ID || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing environment variables in .env.local');
    process.exit(1);
}

// Clients - Dùng ADC (Application Default Credentials) hoặc Project ID
admin.initializeApp({ projectId: FIREBASE_PROJECT_ID });
const firestore = admin.firestore();
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigrationV12() {
    console.log('🚀 Starting Attendance & Student-Class Migration v12...');

    // 1. Lấy dữ liệu ánh xạ Students (code -> id)
    const { data: students } = await supabase.from('students').select('id, student_code');
    const studentMap = new Map();
    students.forEach(s => studentMap.set(s.student_code, s.id));
    
    // 2. Lấy dữ liệu ánh xạ Statuses (code -> id)
    const { data: statuses } = await supabase.from('attendance_statuses').select('id, code');
    const statusMap = new Map();
    statuses.forEach(s => statusMap.set(s.code, s.id));

    // 3. Lấy default attendance type
    const { data: types } = await supabase.from('attendance_types').select('id').limit(1);
    const defaultTypeId = types[0]?.id;

    // --- PHẦN 1: MIGRATION SỸ SỐ (STUDENT_CLASSES) ---
    console.log('Migrating student-class links...');
    const studentClassesSnap = await firestore.collectionGroup('students').get(); // Giả định students có subcollection hoặc link
    // Tùy vào cấu trúc thực tế của app cũ, ta có thể lấy từ collection 'students' có trường classId
    const legacyStudentsSnap = await firestore.collectionGroup('students').get();
    const scRecords = [];
    
    for (const doc of legacyStudentsSnap.docs) {
        const data = doc.data();
        const studentId = studentMap.get(data.code || data.studentCode);
        if (studentId && data.classId) {
            scRecords.push({
                student_id: studentId,
                class_id: data.classId,
                is_active: true
            });
        }
    }
    
    if (scRecords.length > 0) {
        console.log(`Upserting ${scRecords.length} student-class links...`);
        await supabase.from('student_classes').upsert(scRecords, { onConflict: 'student_id, class_id' });
    }

    // --- PHẦN 2: MIGRATION ĐIỂM DANH (ATTENDANCE) ---
    console.log('Migrating attendance records...');
    const attSnap = await firestore.collectionGroup('attendance').get();
    const attRecords = [];
    
    for (const doc of attSnap.docs) {
        const data = doc.data();
        const studentId = studentMap.get(data.studentId);
        const statusId = statusMap.get(data.status);

        if (studentId && statusId) {
            attRecords.push({
                student_id: studentId,
                class_id: data.classId,
                type_id: defaultTypeId,
                status_id: statusId,
                date: data.date || data.dateKey,
                note: data.note || '',
                created_at: data.timestamp || new Date().toISOString()
            });
        }

        if (attRecords.length >= 500) {
            await supabase.from('attendance').upsert(attRecords, { onConflict: 'student_id, class_id, date, type_id' });
            attRecords.length = 0;
        }
    }
    
    if (attRecords.length > 0) {
        await supabase.from('attendance').upsert(attRecords, { onConflict: 'student_id, class_id, date, type_id' });
    }

    console.log('✅ Migration v12 finished successfully!');
}

runMigrationV12().catch(e => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
});
