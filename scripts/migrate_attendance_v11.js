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

// Clients
admin.initializeApp({ projectId: FIREBASE_PROJECT_ID });
const firestore = admin.firestore();
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrateAttendance() {
    console.log('🚀 Starting Attendance Migration v11...');

    // 1. Lấy dữ liệu ánh xạ Students (code -> id)
    console.log('Fetching students from Supabase...');
    const { data: students } = await supabase.from('students').select('id, student_code');
    const studentMap = new Map();
    students.forEach(s => studentMap.set(s.student_code, s.id));
    console.log(`Loaded ${studentMap.size} students mapping.`);

    // 2. Lấy dữ liệu ánh xạ Statuses (code -> id)
    console.log('Fetching attendance statuses...');
    const { data: statuses } = await supabase.from('attendance_statuses').select('id, code');
    const statusMap = new Map();
    statuses.forEach(s => statusMap.set(s.code, s.id));
    console.log(`Loaded ${statusMap.size} statuses.`);

    // 3. Lấy dữ liệu ánh xạ Types (Cần 1 default type id)
    const { data: types } = await supabase.from('attendance_types').select('id').limit(1);
    const defaultTypeId = types[0]?.id;
    if (!defaultTypeId) throw new Error('No attendance types found in Supabase');

    // 4. Lấy dữ liệu ánh xạ Profiles (email -> id) để làm marked_by
    const { data: profiles } = await supabase.from('profiles').select('id, email');
    const profileMap = new Map();
    profiles.forEach(p => profileMap.set(p.email, p.id));

    // 5. Quét Firebase Attendance
    // Dữ liệu v3 lưu theo collectionGroup 'attendance' hoặc ở path cụ thể
    // Ở đây chúng ta quét tất cả tài liệu trong collectionGroup 'attendance'
    console.log('Scanning Firebase attendance collections...');
    const snapshot = await firestore.collectionGroup('attendance').get();
    console.log(`Found ${snapshot.size} records in Firebase.`);

    const records = [];
    let skipped = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const studentId = studentMap.get(data.studentId);
        const statusId = statusMap.get(data.status);

        if (studentId && statusId) {
            records.push({
                student_id: studentId,
                class_id: data.classId,
                type_id: defaultTypeId,
                status_id: statusId,
                date: data.date || doc.ref.parent.parent.id, // Fallback nếu date không có trong doc
                note: data.note || '',
                marked_by: profileMap.get(data.markedByEmail) || null,
                created_at: data.timestamp || new Date().toISOString()
            });
        } else {
            skipped++;
        }

        // Batch insert mỗi 1000 bản ghi
        if (records.length >= 1000) {
            console.log(`Inserting batch of ${records.length} records...`);
            const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'student_id, class_id, date, type_id' });
            if (error) console.error('Supabase Error:', error);
            records.length = 0;
        }
    }

    // Insert nốt số còn lại
    if (records.length > 0) {
        console.log(`Inserting final batch of ${records.length} records...`);
        const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'student_id, class_id, date, type_id' });
        if (error) console.error('Supabase Error:', error);
    }

    console.log(`✅ Migration complete!`);
    console.log(`- Total processed: ${snapshot.size}`);
    console.log(`- Successfully imported: ${snapshot.size - skipped}`);
    console.log(`- Skipped (missing mapping): ${skipped}`);
}

migrateAttendance().catch(console.error);
