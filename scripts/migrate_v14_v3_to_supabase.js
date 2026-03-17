const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function runMigration() {
    const jsonPath = process.argv[2];
    if (!jsonPath) {
        console.error('❌ Vui lòng cung cấp đường dẫn file JSON: node migrate_v14_v3_to_supabase.js <path>');
        process.exit(1);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🚀 Bắt đầu di chuyển dữ liệu v1.2 từ: ${jsonPath}`);
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // 1. Lấy Năm học (Academic Year)
    const academicYearName = data.meta?.year || '2025-2026';
    const { data: dbYear } = await supabase.from('academic_years').select('id').eq('name', academicYearName).single();
    if (!dbYear) {
        console.error(`❌ Không tìm thấy năm học ${academicYearName} trong Supabase.`);
        return;
    }
    const yearId = dbYear.id;
    console.log(`✅ Năm học: ${academicYearName} (ID: ${yearId})`);

    // 2. Di chuyển Lớp học (Classes)
    console.log('📦 Đang di chuyển Lớp học...');
    const legacyClassIdToUuid = new Map();
    for (const c of data.classes) {
        // Tìm lớp đã tồn tại trước để lấy ID (tránh lỗi ON CONFLICT)
        const { data: existingClass } = await supabase
            .from('classes')
            .select('id')
            .eq('name', c.name)
            .eq('year_id', yearId)
            .single();

        let classUuid;
        if (existingClass) {
            classUuid = existingClass.id;
            // Cập nhật thông tin nếu cần
            await supabase.from('classes').update({
                grade: parseInt(c.grade),
                class_type: c.classType === 'Normal' ? 'standard' : 'tutor',
                manual_student_count: c.totalStudents || 0
            }).eq('id', classUuid);
        } else {
            const { data: newClass, error: cErr } = await supabase.from('classes').insert({
                name: c.name,
                grade: parseInt(c.grade),
                year_id: yearId,
                class_type: c.classType === 'Normal' ? 'standard' : 'tutor',
                manual_student_count: c.totalStudents || 0
            }).select('id').single();

            if (cErr) {
                console.error(`   ❌ Lỗi tạo Class ${c.name}:`, cErr.message);
                continue;
            }
            classUuid = newClass.id;
        }
        legacyClassIdToUuid.set(c.id, classUuid);
    }

    // 3. Di chuyển Học sinh (Students)
    console.log('📦 Đang di chuyển Học sinh...');
    const studentCodeToId = new Map();
    const students = data.students.map(s => ({
        student_code: s.code,
        full_name: s.firstName || s.fullName,
        gender: s.gender === 'Nam' ? 'male' : 'female',
        birthday: s.birthday ? s.birthday.split('/').reverse().join('-') : null,
        status: 'active'
    }));

    for (let i = 0; i < students.length; i += 500) {
        const batch = students.slice(i, i + 500);
        const { data: sData, error: sErr } = await supabase.from('students').upsert(batch, { onConflict: 'student_code' }).select('id, student_code');
        if (sErr) console.error(`   ❌ Lỗi Student Batch ${i}:`, sErr.message);
        else sData.forEach(s => studentCodeToId.set(s.student_code, s.id));
    }

    // 4. Di chuyển Liên kết Lớp (Student_Classes)
    console.log('📦 Đang di chuyển Liên kết Lớp học sinh...');
    const scRecords = data.students.map(s => {
        const studentId = studentCodeToId.get(s.code);
        const classUuid = legacyClassIdToUuid.get(s.classId);
        if (studentId && classUuid) {
            return { student_id: studentId, class_id: classUuid, is_active: true };
        }
        return null;
    }).filter(r => r !== null);

    for (let i = 0; i < scRecords.length; i += 500) {
        const batch = scRecords.slice(i, i + 500);
        await supabase.from('student_classes').upsert(batch, { onConflict: 'student_id, class_id' });
    }

    // 5. Tự động tạo Profile & Di chuyển Liên kết Giáo viên
    console.log('📦 Đang xử lý Profile Giáo viên (GVCN)...');
    const { data: dbProfiles } = await supabase.from('profiles').select('id, full_name, email');
    const nameToProfileId = new Map(dbProfiles.map(p => [p.full_name?.toLowerCase().trim(), p.id]));
    const emailToProfileId = new Map(dbProfiles.map(p => [p.email?.toLowerCase().trim(), p.id]));

    const tcRecords = [];
    for (const c of data.classes) {
        const teacherName = (c.teacherName || '').trim();
        if (!teacherName) continue;

        let profileId = nameToProfileId.get(teacherName.toLowerCase());

        if (!profileId) {
            const slug = teacherName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, '');
            const professionalEmail = `${slug}@thcstbc.com`;
            
            // Kiểm tra email trước nếu chưa có profile theo tên
            profileId = emailToProfileId.get(professionalEmail);

            if (!profileId) {
                console.log(`   🔸 Tạo Profile mới: ${teacherName} (${professionalEmail})`);
                const { data: newP, error: pErr } = await supabase.from('profiles').upsert({
                    full_name: teacherName,
                    email: professionalEmail,
                    role: 'teacher',
                    is_active: true
                }, { onConflict: 'email' }).select('id').single();

                if (pErr) console.error(`      ❌ Lỗi tạo profile cho ${teacherName}:`, pErr.message);
                else profileId = newP.id;
            }
        }

        const classUuid = legacyClassIdToUuid.get(c.id);
        if (classUuid && profileId) {
            console.log(`   ✅ Ánh xạ: Lớp ${c.name} (${c.id} -> ${classUuid}) -> GV: ${teacherName} (${profileId})`);
            tcRecords.push({ teacher_id: profileId, class_id: classUuid, is_homeroom: true });
        } else {
            console.log(`   ⚠️ Thất bại ánh xạ Lớp ${c.name}: classUuid=${classUuid || 'NULL'}, profileId=${profileId || 'NULL'}`);
        }
    }

    if (tcRecords.length > 0) {
        console.log(`   🚀 Đang đồng bộ ${tcRecords.length} giáo viên chủ nhiệm...`);
        for (const record of tcRecords) {
            // Kiểm tra xem liên kết này đã có chưa
            const { data: existing } = await supabase
                .from('teacher_classes')
                .select('*')
                .eq('teacher_id', record.teacher_id)
                .eq('class_id', record.class_id)
                .single();

            if (!existing) {
                const { error: insErr } = await supabase.from('teacher_classes').insert(record);
                if (insErr) console.error(`      ❌ Lỗi chèn GV lớp ${record.class_id}:`, insErr.message);
            }
        }
        console.log(`   ✅ Hoàn thành đồng bộ giáo viên chủ nhiệm.`);
    } else {
        console.warn('   ⚠️ Không có bản ghi giáo viên nào để đồng bộ!');
    }

    // 6. Di chuyển Điểm danh (Attendance)
    console.log('📦 Đang di chuyển Dữ liệu điểm danh...');
    
    // Lấy loại hình điểm danh daily_attendance (Điểm danh chính khóa)
    let { data: dbType } = await supabase.from('attendance_types').select('id').eq('code', 'daily_attendance').single();
    if (!dbType) {
        const { data: allTypes } = await supabase.from('attendance_types').select('id').limit(1);
        dbType = allTypes[0];
    }
    const typeId = dbType?.id;
    if (!typeId) {
        console.error('❌ Không tìm thấy Attendance Type nào.');
        return;
    }

    const { data: dbStatuses } = await supabase.from('attendance_statuses').select('id, code').eq('type_id', typeId);
    const statusCodeToId = new Map(dbStatuses.map(s => [s.code, s.id]));

    // Hỗ trợ chạy độc lập: Nếu Map trống, tra cứu từ DB
    if (studentCodeToId.size === 0) {
        console.log('   🔍 Map học sinh trống, đang tải từ Supabase...');
        const { data: sNodes } = await supabase.from('students').select('id, student_code');
        sNodes.forEach(s => studentCodeToId.set(s.student_code, s.id));
    }
    if (legacyClassIdToUuid.size === 0) {
        console.log('   🔍 Map lớp trống, đang tải từ Supabase...');
        const { data: cNodes } = await supabase.from('classes').select('id, name').eq('year_id', yearId);
        cNodes.forEach(c => legacyClassIdToUuid.set(c.name, c.id)); // Dùng name làm key nếu ID gốc không có
    }

    const attendanceInsertsMap = new Map();
    for (const [date, records] of Object.entries(data.attendance || {})) {
        if (date === 'meta') continue; 
        for (const record of records) {
            const studentId = studentCodeToId.get(record.studentId);
            const classUuid = legacyClassIdToUuid.get(record.classId) || legacyClassIdToUuid.get(record.className);
            
            let statusKey = 'T';
            if (record.status === 'absent' || record.status === 'K') statusKey = 'K';
            else if (record.status === 'excused' || record.status === 'P') statusKey = 'P';
            else if (record.status === 'late' || record.status === 'T') statusKey = 'T';
            else if (record.status === 'absent_unknown' || record.status === 'V') statusKey = 'V';
            else if (record.status === 'violation' || record.status === 'VP') statusKey = 'VP';
            else if (record.status === 'reward' || record.status === 'KH') statusKey = 'KH';
            else if (record.status === 'present' || record.status === 'C') statusKey = 'C';
            
            const statusId = statusCodeToId.get(statusKey);
            
            if (studentId && classUuid && statusId) {
                const session = record.session || 'morning';
                const period = record.period || null;
                // Unique key bao gồm cả session và period để tránh ghi đè sai
                const uniqueKey = `${studentId}_${classUuid}_${date}_${session}_${period || 'all'}`;
                
                // Kiểm tra marked_by có phải UUID hợp lệ không (ID Firebase cũ không dùng được trực tiếp)
                const validateUUID = (uuid) => {
                    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                    return regex.test(uuid);
                };

                const markedBy = record.markedBy && validateUUID(record.markedBy) ? record.markedBy : null;

                attendanceInsertsMap.set(uniqueKey, {
                    student_id: studentId,
                    class_id: classUuid,
                    type_id: typeId,
                    status_id: statusId,
                    date: date,
                    session: session,
                    period: period,
                    marked_by: markedBy,
                    note: record.note || record.violationNote || record.rewardNote || null
                });
            }
        }
    }

    const attendanceInserts = Array.from(attendanceInsertsMap.values());
    console.log(`   - Tổng số bản ghi điểm danh duy nhất: ${attendanceInserts.length}`);
    for (let i = 0; i < attendanceInserts.length; i += 1000) {
        const batch = attendanceInserts.slice(i, i + 1000);
        const { error: aErr } = await supabase.from('attendance').upsert(batch, { 
            onConflict: 'student_id, class_id, date, session, period' 
        });
        if (aErr) {
            console.error(`   ⚠️ Lỗi Attendance Batch ${i}:`, aErr.message);
        }
    }

    console.log('✅ Hoàn thành di chuyển dữ liệu sang Supabase v1.2!');
}

runMigration().catch(console.error);
