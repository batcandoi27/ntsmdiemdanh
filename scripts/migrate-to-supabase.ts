import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// 1. Cấu hình Firebase Admin
// @ts-ignore
const apps = admin.apps || [];
if (!apps.length) {
    admin.initializeApp({
        projectId: 'tranboico-c0787'
    });
}
const firestore = admin.firestore();

// 2. Cấu hình Supabase (Cần dùng Service Role Key để bypass RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateData() {
    console.log('🚀 Starting Migration Firestore -> Supabase...');

    try {
        // == Task 1: Migrate Academic Years & Semesters ==
        console.log('📅 Migrating Academic Years...');
        // Giả sử chỉ có 1 năm học mặc định cho app single trường
        const { data: yearData, error: yearError } = await supabase
            .from('academic_years')
            .upsert({ name: '2025-2026', is_active: true }, { onConflict: 'name' })
            .select()
            .single();
        if (yearError) throw yearError;
        const yearId = yearData.id;

        // == Task 2: Migrate Attendance Types & Statuses ==
        console.log('⚙️ Setting up Attendance Types...');
        const { data: typeData } = await supabase
            .from('attendance_types')
            .upsert({ name: 'Điểm danh chính khóa', code: 'daily_attendance' }, { onConflict: 'code' })
            .select()
            .single();
        const typeId = typeData.id;

        const statuses = [
            { type_id: typeId, label: 'Vắng có phép', code: 'P', color: '#10b981', is_exception: true },
            { type_id: typeId, label: 'Vắng không phép', code: 'K', color: '#ef4444', is_exception: true },
            { type_id: typeId, label: 'Vắng chưa rõ', code: 'V', color: '#f59e0b', is_exception: true },
            { type_id: typeId, label: 'Đi muộn', code: 'T', color: '#6366f1', is_exception: true },
        ];
        await supabase.from('attendance_statuses').upsert(statuses, { onConflict: 'type_id, code' });

        // == Task 3: Migrate Classes ==
        console.log('🏫 Migrating Classes...');
        // Firestore path: schools/{schoolId}/years/{year}/classes
        const classesSnap = await firestore.collectionGroup('classes').get();
        const classEntries = classesSnap.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                year_id: yearId,
                name: d.name,
                grade: d.grade,
                class_type: d.classType || 'school'
            };
        });
        await supabase.from('classes').upsert(classEntries);

        // == Task 4: Migrate Students ==
        console.log('👨‍🎓 Migrating Students...');
        const studentsSnap = await firestore.collectionGroup('students').get();
        const studentEntries = [];
        const studentClassLinks: any[] = [];

        for (const doc of studentsSnap.docs) {
            const d = doc.data();
            studentEntries.push({
                student_code: d.code,
                full_name: d.fullName,
                gender: d.gender,
                birthday: d.birthday,
                status: d.statusV3 || (d.status === 'Nghỉ học' ? 'dropped_out' : 'active')
            });
            if (d.classId) {
                // Chúng ta sẽ cần student_id (UUID) của Supabase sau khi insert
                // Nên ta insert student trước.
            }
        }
        
        // Insert students từng mẻ để lấy ID
        const { data: insertedStudents } = await supabase.from('students').upsert(studentEntries, { onConflict: 'student_code' }).select();
        
        const codeToIdMap = new Map();
        insertedStudents?.forEach(s => codeToIdMap.set(s.student_code, s.id));

        studentsSnap.docs.forEach(doc => {
            const d = doc.data();
            if (d.classId && codeToIdMap.has(d.code)) {
                studentClassLinks.push({
                    student_id: codeToIdMap.get(d.code),
                    class_id: d.classId,
                    is_active: true
                });
            }
        });
        await supabase.from('student_classes').upsert(studentClassLinks, { onConflict: 'student_id, class_id' });

        // == Task 5: Migrate Attendance Records (CHÚ Ý: Dữ liệu lớn) ==
        console.log('📝 Migrating Attendance Records...');
        // Lấy mapping status code -> id
        const { data: sData } = await supabase.from('attendance_statuses').select('id, code').eq('type_id', typeId);
        const statusMap = new Map();
        sData?.forEach(s => statusMap.set(s.code, s.id));

        // Firestore paths: attendance/{date}/records/{classId}
        // Thường thì collectionGroup('records') sẽ lấy được hết.
        const attendanceSnap = await firestore.collectionGroup('records').get();
        const attendanceEntries: any[] = [];

        attendanceSnap.docs.forEach(doc => {
            const d = doc.data();
            const date = doc.ref.parent.parent?.id; // Lấy date từ path: attendance/{date}/records/...
            
            if (date && d.absences) {
                Object.entries(d.absences).forEach(([stCode, statusCode]) => {
                    const stId = codeToIdMap.get(stCode);
                    const sId = statusMap.get(statusCode);
                    if (stId && sId) {
                        attendanceEntries.push({
                            student_id: stId,
                            class_id: d.classId,
                            type_id: typeId,
                            status_id: sId,
                            date: date,
                            period: d.period || null,
                            note: d.notes?.[stCode] || d.note || ''
                        });
                    }
                });
            }
        });

        // Insert attendance theo mẻ 500 bản ghi
        const CHUNK = 500;
        for (let i = 0; i < attendanceEntries.length; i += CHUNK) {
            const chunk = attendanceEntries.slice(i, i + CHUNK);
            await supabase.from('attendance').upsert(chunk, { onConflict: 'student_id, type_id, date, period' });
            console.log(`Pushed ${i + chunk.length} / ${attendanceEntries.length} attendance records`);
        }

        console.log('✅ Migration Finished Successfully!');

    } catch (err) {
        console.error('❌ Migration Failed:', err);
    }
}

migrateData();
