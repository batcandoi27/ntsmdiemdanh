
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// 1. Cấu hình Firebase Admin
if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    });
}
const firestore = admin.firestore();

// 2. Cấu hình Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateEverything() {
    console.log('🚀 Starting Admin-side Migration (Firestore -> Supabase)...');

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

        // == Task 2: Migrate Profiles ==
        console.log('👤 Migrating Profiles...');
        const usersSnap = await firestore.collection('users').get();
        console.log(`Found ${usersSnap.size} users in Firestore.`);
        
        const profileEntries = usersSnap.docs.map(doc => {
            const d = doc.data();
            return {
                email: d.email,
                full_name: d.full_name || d.name || d.email,
                role: d.role || 'teacher',
                is_active: d.isActive ?? true
            };
        });
        
        profileEntries.push({
            email: 'thcstbc@gmail.com',
            full_name: 'Administrator',
            role: 'admin',
            is_active: true
        });

        await supabase.from('profiles').upsert(profileEntries, { onConflict: 'email' });
        
        const { data: allProfiles } = await supabase.from('profiles').select('id, email');
        const emailToIdMap = new Map();
        allProfiles?.forEach(p => emailToIdMap.set(p.email, p.id));

        // == Task 3: Migrate Classes ==
        console.log('🏫 Migrating Classes...');
        const classesSnap = await firestore.collection('classes').get();
        console.log(`Found ${classesSnap.size} classes in Firestore.`);
        
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
            await supabase.from('classes').upsert(classEntries);
            console.log(`Successfully upserted ${classEntries.length} classes.`);
        }

        // == Task 3.1: Assignments ==
        const teacherClassEntries: any[] = [];
        classesSnap.docs.forEach(doc => {
            const d = doc.data();
            const teacherEmail = d.teacherEmail || d.teacherId;
            if (teacherEmail && emailToIdMap.has(teacherEmail)) {
                teacherClassEntries.push({
                    teacher_id: emailToIdMap.get(teacherEmail),
                    class_id: doc.id,
                    is_homeroom: true
                });
            }
        });
        if (teacherClassEntries.length > 0) {
            await supabase.from('teacher_classes').upsert(teacherClassEntries, { onConflict: 'teacher_id, class_id' });
        }

        // == Task 4: Students ==
        console.log('👨‍🎓 Migrating Students...');
        const studentsSnap = await firestore.collectionGroup('students').get();
        console.log(`Found ${studentsSnap.size} students (CollectionGroup).`);
        
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
        
        if (studentEntries.length > 0) {
            const { data: insertedStudents } = await supabase.from('students').upsert(studentEntries, { onConflict: 'student_code' }).select();
            
            const codeToIdMap = new Map();
            insertedStudents?.forEach(s => codeToIdMap.set(s.student_code, s.id));

            const studentClassLinks = studentsSnap.docs.map(doc => {
                const d = doc.data();
                const classId = d.classId || doc.ref.parent.parent?.id;
                if (classId && codeToIdMap.has(d.code)) {
                    return {
                        student_id: codeToIdMap.get(d.code),
                        class_id: classId,
                        is_active: true
                    };
                }
                return null;
            }).filter(l => l !== null);
            
            if (studentClassLinks.length > 0) {
                await supabase.from('student_classes').upsert(studentClassLinks as any, { onConflict: 'student_id, class_id' });
            }
        }

        console.log('✅ ADMIN MIGRATION COMPLETED!');

    } catch (err) {
        console.error('❌ ADMIN MIGRATION FAILED:', err);
    }
}

migrateEverything();
