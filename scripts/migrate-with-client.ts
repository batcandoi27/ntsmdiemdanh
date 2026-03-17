import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, collectionGroup, query } from "firebase/firestore";
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// 1. Cấu hình Firebase Client (Sử dụng keys bạn cung cấp)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// 2. Cấu hình Supabase (Service Role Key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateEverything() {
    console.log('🚀 Starting Client-side Migration (Firestore -> Supabase)...');

    try {
        // == Task 1: Setup Metadata & School Year ==
        console.log('📅 Setting up School Year...');
        let { data: yearData } = await supabase
            .from('academic_years')
            .select('id')
            .eq('name', '2025-2026')
            .single();
        
        if (!yearData) {
            const { data: newData, error: insertError } = await supabase
                .from('academic_years')
                .insert({ name: '2025-2026', is_active: true })
                .select().single();
            if (insertError) throw insertError;
            yearData = newData;
        }
        const yearId = yearData?.id;

        if (!yearId) throw new Error('Could not resolve Year ID');

        console.log('⚙️ Setting up Attendance Config...');
        let { data: typeData } = await supabase
            .from('attendance_types')
            .select('id')
            .eq('code', 'daily_attendance')
            .single();

        if (!typeData) {
            const { data: newData, error: insertError } = await supabase
                .from('attendance_types')
                .insert({ name: 'Điểm danh chính khóa', code: 'daily_attendance' })
                .select().single();
            if (insertError) throw insertError;
            typeData = newData;
        }
        const typeId = typeData?.id;

        if (!typeId) throw new Error('Could not resolve Type ID');

        const statuses = [
            { type_id: typeId, label: 'Vắng có phép', code: 'P', color: '#10b981', is_exception: true },
            { type_id: typeId, label: 'Vắng không phép', code: 'K', color: '#ef4444', is_exception: true },
            { type_id: typeId, label: 'Vắng chưa rõ', code: 'V', color: '#f59e0b', is_exception: true },
            { type_id: typeId, label: 'Đi muộn', code: 'T', color: '#6366f1', is_exception: true },
        ];
        await supabase.from('attendance_statuses').upsert(statuses, { onConflict: 'type_id, code' });

        // == Task 2: Migrate Profiles (From Firestore collection 'users') ==
        console.log('👤 Migrating Profiles...');
        const usersSnap = await getDocs(collection(firestore, 'users'));
        console.log(`Found ${usersSnap.docs.length} users in Firestore.`);
        const userMap = new Map(); // Store email -> uid mapping later if needed

        const profileEntries = usersSnap.docs.map(doc => {
            const d = doc.data();
            return {
                id: crypto.randomUUID(), // Tạo UUID ngẫu nhiên cho profiles mới migrate
                email: d.email,
                full_name: d.full_name || d.name || d.email,
                role: d.role || 'teacher',
                is_active: d.isActive ?? true
            };
        });
        
        // Add default admin
        profileEntries.push({
            id: crypto.randomUUID(),
            email: 'thcstbc@gmail.com',
            full_name: 'Administrator',
            role: 'admin',
            is_active: true
        });

        const { error: pUpsertError } = await supabase.from('profiles').upsert(profileEntries, { onConflict: 'email' });
        if (pUpsertError) console.error('Error upserting profiles:', pUpsertError);
        else console.log(`Successfully upserted ${profileEntries.length} profiles.`);
        
        // Load all profiles to get their UUIDs from Supabase
        const { data: allProfiles } = await supabase.from('profiles').select('id, email');
        const emailToIdMap = new Map();
        allProfiles?.forEach(p => emailToIdMap.set(p.email, p.id));

        // == Task 3: Migrate Classes ==
        console.log('🏫 Migrating Classes...');
        // Thử xem có lấy được bất kỳ tài liệu nào từ collection 'classes' không
        const classesSnap = await getDocs(collection(firestore, 'classes'));
        console.log(`Debug Firestore: Total docs in 'classes' collection = ${classesSnap.docs.length}`);
        
        if (classesSnap.docs.length === 0) {
            console.log('⚠️ Warning: No classes found. Trying to list other possible names...');
            const potentialNames = ['Classes', 'CLASS', 'class_list'];
            for (const name of potentialNames) {
                const s = await getDocs(collection(firestore, name));
                if (s.docs.length > 0) console.log(`✅ Found data in alternative collection: '${name}' (${s.docs.length} docs)`);
            }
        }
        
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
        
        if (classEntries.length > 0) {
            const { error: clsError } = await supabase.from('classes').upsert(classEntries);
            if (clsError) console.error('Error upserting classes:', clsError);
            else console.log(`Successfully upserted ${classEntries.length} classes.`);
        }

        // == Task 3.1: Migrate Teacher Assignments (teacher_classes) ==
        console.log('👨‍🏫 Migrating Teacher Assignments...');
        const teacherClassEntries: any[] = [];
        classesSnap.docs.forEach(doc => {
            const d = doc.data();
            const classId = doc.id;
            const teacherEmail = d.teacherEmail || d.teacherId;
            if (teacherEmail && emailToIdMap.has(teacherEmail)) {
                teacherClassEntries.push({
                    teacher_id: emailToIdMap.get(teacherEmail),
                    class_id: classId,
                    is_homeroom: true
                });
            }
        });
        console.log(`Prepared ${teacherClassEntries.length} teacher assignments.`);
        if (teacherClassEntries.length > 0) {
            const { error: tcError } = await supabase.from('teacher_classes').upsert(teacherClassEntries, { onConflict: 'teacher_id, class_id' });
            if (tcError) console.error('Error upserting teacher_classes:', tcError);
            else console.log(`Successfully upserted ${teacherClassEntries.length} assignments.`);
        }

        // == Task 4: Migrate Students ==
        console.log('👨‍🎓 Migrating Students...');
        const studentsSnap = await getDocs(collection(firestore, 'students'));
        console.log(`Found ${studentsSnap.docs.length} students in Firestore.`);
        const studentEntries = studentsSnap.docs.map(doc => {
            const d = doc.data();
            return {
                student_code: d.code,
                full_name: d.fullName,
                gender: d.gender,
                birthday: d.birthday,
                status: d.statusV3 || (d.status === 'Nghỉ học' ? 'dropped_out' : 'active')
            };
        });
        const { data: insertedStudents } = await supabase.from('students').upsert(studentEntries, { onConflict: 'student_code' }).select();
        
        const codeToIdMap = new Map();
        insertedStudents?.forEach(s => codeToIdMap.set(s.student_code, s.id));

        const studentClassLinks = studentsSnap.docs.map(doc => {
            const d = doc.data();
            if (d.classId && codeToIdMap.has(d.code)) {
                return {
                    student_id: codeToIdMap.get(d.code),
                    class_id: d.classId,
                    is_active: true
                };
            }
            return null;
        }).filter(l => l !== null);
        await supabase.from('student_classes').upsert(studentClassLinks as any, { onConflict: 'student_id, class_id' });

        // == Task 5: Migrate Attendance (Records collection) ==
        console.log('📝 Migrating Attendance...');
        const { data: sData } = await supabase.from('attendance_statuses').select('id, code').eq('type_id', typeId);
        const statusMap = new Map();
        sData?.forEach(s => statusMap.set(s.code, s.id));

        const attendanceSnap = await getDocs(collection(firestore, 'records'));
        console.log(`Found ${attendanceSnap.docs.length} attendance records in Firestore.`);
        const attendanceEntries: any[] = [];

        attendanceSnap.docs.forEach(doc => {
            const d = doc.data();
            // Trong client SDK, ta khó lấy parent ID trực tiếp. 
            // Ta sẽ sử dụng trường date có sẵn trong record (nếu có)
            const date = d.date;
            
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

        const CHUNK = 500;
        for (let i = 0; i < attendanceEntries.length; i += CHUNK) {
            const chunk = attendanceEntries.slice(i, i + CHUNK);
            await supabase.from('attendance').upsert(chunk, { onConflict: 'student_id, type_id, date, period' });
            console.log(`Pushed ${i + chunk.length} records...`);
        }

        console.log('✅ ALL DATA MIGRATED SUCCESSFULLY!');

    } catch (err) {
        console.error('❌ MIGRATION FAILED:', err);
    }
}

migrateEverything();
