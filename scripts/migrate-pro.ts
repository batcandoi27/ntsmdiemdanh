
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config({ path: '.env.local' });

// 1. Cấu hình Firebase Admin (Embedded Service Account)
const serviceAccount = {
  "type": "service_account",
  "project_id": "tranboico-c0787",
  "private_key_id": "97e6e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDSugXQtaSNpBAP\nmCxgfgDi+Tc6XnKJkf5FbkZtVXAziI2PBhLVv3SQdFWpDxzuyLhx0RoaHvXrpKK/\nfP+jUgHqzgscVX4JwxtCT0QdD/K2U0uUdOjqaPbImiIP77KTnhUFypG0GtZG37AD\naNTl5NJROuKCQwpwgI2LUGcD8XJZ76DkXFo9Kcbnz97XNEgu26sFKllyFTc0iob5\nldTcmNXryWRPbDq4sHFl2Bn47RdNztDanZ0xYiL7a7jMmAuFKSjgpXcyMJkIfPBz\nDEFCdRwRkULFWp5kEHX0RSXueWUVLzdEtMVSFb+lnTeQgsnY1CmH1btw2EcKgK4P\nA79oA+VtAgMBAAECggEAGKNvcqEKWxVHsMsWGozLsGjQhZ6YExsNeTNqQKEGEWsc\nl2XFEKuQsXh+Bi+iLmPW960p5CFNQlQUQ1drfGkQ7adRspURu4p4cXRbKRq9l4Z9\nsR9KQb4sEfW+Qya/i8r795q2a9yHbpn7i9Usr1nlzWGZLP8xr/MX7vtjpW5hnxTT\nF6b4XdPtGSC5qrSKspbKjWsOgOzyb5fqdeNH6K0CfD4rBydfhNHzbVtxssvD3WiS\nqwtdd4w6kudWZdE+yEQQzq1o9Zgc7eMoi1vAn4wAkgUH6/vgNlzNMxrLFCc4T9ia\noPKyeLm0VAnrhLFQ8Up779Rw1bpgqxv4jMvhNjIc8QKBgQD5sIys2a3k58UMVSio\nAZX46NntYqyRxnr+KawzvAuxRX/DulCNSvSEdsJ/TEhCiDEGoWT4sysP0yn7MJ2X\nbBal5QDnsN/sS4/we35/M06ibxP0TGTaUNCw45erBplTP8rjE/P00KPiXMKCRUIYA\nqkxNSfeVL7OaPm4UIsvPxFsGRwKBgQDYDWOcTRzQrnbLiJB03RYJ/ahyEwkHi2G9\niabL5Eu8D4aLbIlY1M5+FadMPrPXzmvxCPSmWw6aBh20cGF3TJrT9pRnItgNPqNJ\nKM+BzeUAp56ts2iLHVO0ZSvnJUbHDmMH/Q9XDHcxWi9P1aF1ZQdDMmg3dyh4aDnb\nVWtc7YmsqwKBgBGwe1bnmRVFgkVMZzP34MsgnAfgXL97I02MYEHOCboGZXXVZk2M\nSOR1kXP5UIk+ItMIbiHcd6mIWUoNeKy4oKYiIj1H36Va+RiddynF1VgLza4jtCUt\nyRBC4a3Ufd+5n3N9ROcEHBCCBm4lGUlEx2EWY27zUTMVRzEwAeZ3T8eTAoGBAJij\nVPWPMUVpjLodAFnf/HsQf1oggqeW3HXI81NnNe5mVZrZEmv05PIFIE3omqxjxLTk\nq9t/x2Af5AqfvuxG7bfEpHH9FwC8eSXttDSznw+IXL3BW6G1FXcEZzEFj+yACI0T\nRywrvWXbnkNb3ZcPykK6MRDGmYv/rqh7v79GfpbDAoGAH4z5qhxWXOg89NE5t8wu\nO5vLM5Zm1H0w/Kojt/cNTzyzP2jz3h0f0kICkX+0lTd8ZZTLWAEnh1jG+UK9LkAe\na8Ir7GVFhU9LLCHUCwLb7n83VKUT9TaAtLQ6AUA40ZjympTqBkXXLAH6ttmzmZYj\nRFZrEllZgjrflSGVGKhTQFs=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-p1qzn@tranboico-c0787.iam.gserviceaccount.com",
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
    });
}
const firestore = admin.firestore();
console.log('✅ Firebase Admin SDK initialized via Embedded Secret.');

// 2. Cấu hình Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Utility: Chunk array for batch processing
const chunk = (arr: any[], size: number) => 
    Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
    );

async function migrateEverything() {
    console.log('🚀 Starting Professional Data Migration (Admin SDK + Batching)...');
    const SCHOOL_YEAR = process.env.SCHOOL_YEAR || "2025-2026";
    const codeToIdMap = new Map(); // Khai báo ở phạm vi rộng hơn để dùng cho Attendance

    try {
        // == Task 1: Setup Metadata & School Year ==
        console.log(`📅 Setting up School Year: ${SCHOOL_YEAR}...`);
        let { data: yearData } = await supabase
            .from('academic_years')
            .select('id')
            .eq('name', SCHOOL_YEAR)
            .single();
        
        if (!yearData) {
            const { data: newData, error: insertError } = await supabase
                .from('academic_years')
                .insert({ name: SCHOOL_YEAR, is_active: true })
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
                .insert({ name: 'Điểm danh chính khoa', code: 'daily_attendance' })
                .select().single();
            if (insertError) throw insertError;
            typeData = newData;
        }
        const typeId = typeData?.id;

        const statuses = [
            { type_id: typeId, label: 'Vắng có phép', code: 'P', color: '#10b981', is_exception: true },
            { type_id: typeId, label: 'Vắng không phép', code: 'K', color: '#ef4444', is_exception: true },
            { type_id: typeId, label: 'Vắng chưa rõ', code: 'V', color: '#f59e0b', is_exception: true },
            { type_id: typeId, label: 'Đi muộn', code: 'T', color: '#6366f1', is_exception: true },
        ];
        await supabase.from('attendance_statuses').upsert(statuses, { onConflict: 'type_id, code' });

        // == Task 2: Migrate Profiles ==
        console.log('👤 Migrating Profiles...');
        const usersSnap = await firestore.collection('users').get();
        console.log(`Found ${usersSnap.size} users in Firestore.`);
        
        const profileEntries = usersSnap.docs.map(doc => {
            const d = doc.data();
            return {
                id: d.uid || doc.id,
                email: d.email,
                full_name: d.full_name || d.name || d.email,
                role: d.role || 'teacher',
                is_active: d.isActive ?? true
            };
        });
        
        profileEntries.push({
            id: crypto.randomUUID(),
            email: 'thcstbc@gmail.com',
            full_name: 'Administrator',
            role: 'admin',
            is_active: true
        });

        for (const batch of chunk(profileEntries, 100)) {
            await supabase.from('profiles').upsert(batch, { onConflict: 'email' });
        }
        
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
            for (const batch of chunk(classEntries, 100)) {
                await supabase.from('classes').upsert(batch);
            }
        }

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
            const allInsertedStudents: any[] = [];
            for (const batch of chunk(studentEntries, 500)) {
                const { data } = await supabase.from('students').upsert(batch, { onConflict: 'student_code' }).select();
                if (data) allInsertedStudents.push(...data);
            }
            
            allInsertedStudents.forEach(s => codeToIdMap.set(s.student_code, s.id));

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
                for (const batch of chunk(studentClassLinks, 500)) {
                    await supabase.from('student_classes').upsert(batch as any, { onConflict: 'student_id, class_id' });
                }
            }
        }

        // == Task 5: Attendance (Chống lỗi quá tải với kỹ thuật Chunking) ==
        console.log('📝 Migrating Attendance (via CollectionGroup)...');
        const recordsSnap = await firestore.collectionGroup('records').get();
        console.log(`Found ${recordsSnap.size} attendance documents.`);
        
        const { data: sData } = await supabase.from('attendance_statuses').select('id, code').eq('type_id', typeId);
        const statusMap = new Map();
        sData?.forEach(s => statusMap.set(s.code, s.id));

        const attendanceEntries: any[] = [];
        recordsSnap.docs.forEach(doc => {
            const d = doc.data();
            const date = d.date;
            const classId = d.classId || doc.ref.parent.parent?.id;

            if (date && classId && d.absences) {
                Object.entries(d.absences).forEach(([stCode, statusCode]) => {
                    const stId = codeToIdMap.get(stCode);
                    const sId = statusMap.get(statusCode as string);
                    if (stId && sId) {
                        attendanceEntries.push({
                            student_id: stId,
                            class_id: classId,
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

        console.log(`Prepared ${attendanceEntries.length} individual attendance records.`);
        if (attendanceEntries.length > 0) {
            for (const batch of chunk(attendanceEntries, 500)) {
                await supabase.from('attendance').upsert(batch, { onConflict: 'student_id, type_id, date, period' });
            }
        }

        console.log('✅ PRO MIGRATION COMPLETED!');

    } catch (err) {
        console.error('❌ PRO MIGRATION FAILED:', err);
    }
}

migrateEverything();
