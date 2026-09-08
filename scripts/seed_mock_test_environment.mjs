import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const sb = createClient(supabaseUrl, supabaseServiceKey);

async function seedTestEnvironment() {
  console.log('🚀 Đang khởi tạo môi trường LỚP HỌC GIẢ LẬP (TEST/MOCK)...');

  // 1. Tìm năm học hiện tại (2026-2027)
  const { data: activeYear } = await sb
    .from('academic_years')
    .select('id, name')
    .eq('is_active', true)
    .maybeSingle();

  const yearId = activeYear?.id || '1b86e9c9-e508-4b79-bd35-3aa1cf164aca';
  console.log(`[*] Sử dụng năm học: ${activeYear?.name || '2026-2027'} (${yearId})`);

  // 2. Tìm hoặc tạo Lớp 9A_TEST
  let { data: existingClass } = await sb
    .from('classes')
    .select('*')
    .eq('name', '9A_TEST')
    .eq('year_id', yearId)
    .maybeSingle();

  let classId = existingClass?.id;

  if (!classId) {
    const { data: newClass, error: classErr } = await sb
      .from('classes')
      .insert({
        name: '9A_TEST',
        grade: 9,
        year_id: yearId,
        class_type: 'test',
        manual_student_count: 1,
        actual_student_count: 1,
        adjustment_count: 0,
        sessions: ['morning', 'afternoon'],
        is_personal: false
      })
      .select()
      .single();

    if (classErr) {
      console.error('Lỗi tạo lớp:', classErr);
      process.exit(1);
    }
    classId = newClass.id;
    console.log(`[+] Đã tạo Lớp Test: 9A_TEST (${classId})`);
  } else {
    // Đảm bảo class_type = 'test'
    await sb.from('classes').update({ class_type: 'test' }).eq('id', classId);
    console.log(`[*] Đã cập nhật Lớp Test: 9A_TEST (${classId})`);
  }

  // 3. Gán Admin (thcstbc) làm GVCN của lớp 9A_TEST
  const adminId = 'b3e42125-d7d3-4ca3-8f2a-b595fb2cfc6b'; // thcstbc
  await sb.from('teacher_classes').delete().eq('class_id', classId);
  await sb.from('teacher_classes').insert({
    teacher_id: adminId,
    class_id: classId,
    is_homeroom: true
  });
  console.log(`[+] Đã phân công Admin (thcstbc) làm GVCN lớp 9A_TEST`);

  // 4. Tạo hoặc cập nhật Học sinh giả lập
  const studentCode = 'TEST9999';
  let { data: existingStudent } = await sb
    .from('students')
    .select('*')
    .eq('student_code', studentCode)
    .maybeSingle();

  let studentId = existingStudent?.id;

  if (!studentId) {
    const { data: newStudent, error: stErr } = await sb
      .from('students')
      .insert({
        student_code: studentCode,
        full_name: 'Trần Thử Nghiệm',
        gender: 'Nam',
        birthday: '2012-05-15',
        status: 'active',
        ethnicity: 'Kinh',
        gov_id: '079201299999',
        is_deleted: false
      })
      .select()
      .single();

    if (stErr) {
      console.error('Lỗi tạo học sinh:', stErr);
      process.exit(1);
    }
    studentId = newStudent.id;
    console.log(`[+] Đã tạo Học sinh giả lập: Trần Thử Nghiệm (${studentCode} - ${studentId})`);
  } else {
    console.log(`[*] Đã có Học sinh giả lập: Trần Thử Nghiệm (${studentCode} - ${studentId})`);
  }

  // 5. Gán học sinh vào lớp 9A_TEST
  await sb.from('student_classes').delete().eq('student_id', studentId);
  await sb.from('student_classes').insert({
    student_id: studentId,
    class_id: classId,
    is_active: true,
    order_index: 1,
    enrollment_date: '2026-08-15'
  });
  console.log(`[+] Đã gán học sinh ${studentCode} vào lớp 9A_TEST`);

  // 6. Tạo tài khoản Phụ huynh trong student_parents_zalo
  await sb.from('student_parents_zalo').delete().eq('student_id', studentId);
  await sb.from('student_parents_zalo').insert({
    student_id: studentId,
    student_code: studentCode,
    student_name: 'Trần Thử Nghiệm',
    class_name: '9A_TEST',
    parent_name: 'Trần Phụ Huynh',
    parent_phone: '0909999999',
    is_friend: true,
    status: 'active',
    connected_at: new Date().toISOString()
  });
  console.log(`[+] Đã tạo thông tin Phụ huynh (SĐT: 0909999999, Tên: Trần Phụ Huynh)`);

  // 7. Tạo tài khoản Học sinh (Supabase Auth & Profiles)
  const studentEmail = 'hstest@thcstbc.com';
  const studentPassword = 'Test@123456';
  
  // Kiểm tra user auth
  const { data: authUsers } = await sb.auth.admin.listUsers();
  const existingAuth = authUsers?.users?.find(u => u.email === studentEmail);
  let authUserId = existingAuth?.id;

  if (!authUserId) {
    const { data: newAuth, error: authErr } = await sb.auth.admin.createUser({
      email: studentEmail,
      password: studentPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Trần Thử Nghiệm', role: 'class_monitor' }
    });
    if (authErr) {
      console.warn('Lưu ý tạo Auth:', authErr.message);
    } else {
      authUserId = newAuth.user.id;
    }
  } else {
    // Reset password
    await sb.auth.admin.updateUserById(authUserId, { password: studentPassword });
  }

  if (authUserId) {
    await sb.from('profiles').upsert({
      id: authUserId,
      email: studentEmail,
      full_name: 'Trần Thử Nghiệm',
      role: 'class_monitor',
      student_code: studentCode,
      is_active: true
    });
    // Gán quyền xem lớp 9A_TEST cho học sinh/ban cán sự
    await sb.from('teacher_classes').upsert({
      teacher_id: authUserId,
      class_id: classId,
      is_homeroom: false
    });
    console.log(`[+] Đã tạo/cập nhật Auth Học Sinh: ${studentEmail} / Pass: ${studentPassword}`);
  }

  // 8. Tạo Thời khóa biểu cho lớp 9A_TEST
  const timetableSchedule = {
    monday: {
      morning: [
        { period: 1, subject: 'Chào cờ' },
        { period: 2, subject: 'Toán học' },
        { period: 3, subject: 'Ngữ văn' },
        { period: 4, subject: 'Tiếng Anh' },
        { period: 5, subject: 'Tin học' }
      ],
      afternoon: [
        { period: 1, subject: 'Giáo dục thể chất' },
        { period: 2, subject: 'Hoạt động trải nghiệm' },
        { period: 3, subject: 'Tự học có hướng dẫn' }
      ]
    },
    tuesday: {
      morning: [
        { period: 1, subject: 'Toán học' },
        { period: 2, subject: 'Khoa học tự nhiên' },
        { period: 3, subject: 'Lịch sử & Địa lý' },
        { period: 4, subject: 'Ngữ văn' },
        { period: 5, subject: 'Tiếng Anh' }
      ],
      afternoon: [
        { period: 1, subject: 'Kỹ năng sống' },
        { period: 2, subject: 'Toán học (Nâng cao)' }
      ]
    },
    wednesday: {
      morning: [
        { period: 1, subject: 'Ngữ văn' },
        { period: 2, subject: 'Tiếng Anh' },
        { period: 3, subject: 'Khoa học tự nhiên' },
        { period: 4, subject: 'Giáo dục công dân' },
        { period: 5, subject: 'Mỹ thuật' }
      ],
      afternoon: [
        { period: 1, subject: 'Tin học thực hành' },
        { period: 2, subject: 'Câu lạc bộ STEM' }
      ]
    },
    thursday: {
      morning: [
        { period: 1, subject: 'Toán học' },
        { period: 2, subject: 'Ngữ văn' },
        { period: 3, subject: 'Khoa học tự nhiên' },
        { period: 4, subject: 'Công nghệ' },
        { period: 5, subject: 'Tiếng Anh' }
      ],
      afternoon: [
        { period: 1, subject: 'Giáo dục thể chất' }
      ]
    },
    friday: {
      morning: [
        { period: 1, subject: 'Khoa học tự nhiên' },
        { period: 2, subject: 'Lịch sử & Địa lý' },
        { period: 3, subject: 'Tiếng Anh' },
        { period: 4, subject: 'Âm nhạc' },
        { period: 5, subject: 'Sinh hoạt lớp' }
      ],
      afternoon: []
    },
    saturday: {
      morning: [
        { period: 1, subject: 'Ôn tập Toán' },
        { period: 2, subject: 'Ôn tập Văn' },
        { period: 3, subject: 'Ôn tập Ngoại ngữ' }
      ],
      afternoon: []
    }
  };

  await sb.from('timetables').delete().eq('class_id', classId);
  await sb.from('timetables').insert({
    class_id: classId,
    class_name: '9A_TEST',
    effective_from: '2026-08-20',
    effective_to: '2027-06-15',
    schedule: timetableSchedule,
    created_by: adminId,
    created_by_name: 'Admin TBC',
    is_active: true
  });
  console.log(`[+] Đã tạo Thời khóa biểu ma trận tuần cho 9A_TEST`);

  // 9. Tạo Điểm danh mẫu cho học sinh
  await sb.from('attendance').delete().eq('student_id', studentId);
  const typeId = '7bfa443f-beaa-48b5-abf7-02352236403b';
  const statusP = '50be723f-9813-444b-96cf-21af0c743353'; // Vắng phép
  const statusT = '39824b65-a6b8-47cd-a39d-e02e81db424b'; // Trễ
  const statusK = '69376aa9-840f-4e32-904d-5e99605edd03'; // Vắng không phép

  const sampleAttendance = [
    {
      student_id: studentId,
      class_id: classId,
      type_id: typeId,
      status_id: statusT,
      date: '2026-09-08',
      period: 1,
      session: 'morning',
      note: 'Đi trễ 5 phút đầu giờ',
      marked_by: adminId
    },
    {
      student_id: studentId,
      class_id: classId,
      type_id: typeId,
      status_id: statusP,
      date: '2026-09-04',
      period: null,
      session: 'morning',
      note: 'Nghỉ phép do bị cảm sốt',
      marked_by: adminId
    }
  ];
  const { error: attInsertErr } = await sb.from('attendance').insert(sampleAttendance);
  if (attInsertErr) console.warn('Lưu ý lưu điểm danh:', attInsertErr);
  else console.log(`[+] Đã tạo 2 bản ghi điểm danh mẫu (Đi trễ, Nghỉ có phép)`);

  // 10. Tạo Cột Sổ Theo Dõi & Thu Phí
  await sb.from('columns').delete().eq('class_id', classId);
  const col1Id = crypto.randomUUID();
  const col2Id = crypto.randomUUID();
  const col3Id = crypto.randomUUID();

  const { data: cols, error: colInsertErr } = await sb.from('columns').insert([
    {
      id: col1Id,
      class_id: classId,
      user_id: adminId,
      name: 'Đăng ký SGK lớp 9',
      scope: 'class',
      frequency: 'one_time',
      allow_free_text: false,
      applicable_scope: 'all',
      archived: false,
      default_visibility: true,
      is_shared_with_parents: true,
      order: 1,
      payment_config: {
        enabled: true,
        recipientType: 'school',
        defaultAmount: 250000,
        unit: 'VNĐ'
      }
    },
    {
      id: col2Id,
      class_id: classId,
      user_id: adminId,
      name: 'Học phí buổi 2 tháng 9',
      scope: 'class',
      frequency: 'period',
      allow_free_text: false,
      applicable_scope: 'all',
      archived: false,
      default_visibility: true,
      is_shared_with_parents: true,
      order: 2,
      period_config: {
        type: 'monthly',
        startDate: '2026-09-01',
        endDate: '2026-09-30'
      },
      payment_config: {
        enabled: true,
        recipientType: 'teacher',
        defaultAmount: 300000,
        unit: 'VNĐ'
      }
    },
    {
      id: col3Id,
      class_id: classId,
      user_id: adminId,
      name: 'Quỹ phụ huynh học sinh',
      scope: 'class',
      frequency: 'one_time',
      allow_free_text: false,
      applicable_scope: 'all',
      archived: false,
      default_visibility: true,
      is_shared_with_parents: true,
      order: 3,
      payment_config: {
        enabled: true,
        recipientType: 'teacher',
        defaultAmount: 200000,
        unit: 'VNĐ'
      }
    }
  ]).select();

  if (colInsertErr) console.warn('Lưu ý lưu cột:', colInsertErr);
  else console.log(`[+] Đã tạo 3 cột sổ theo dõi và thu phí cho lớp 9A_TEST`);

  console.log(`[+] Đã tạo 3 cột sổ theo dõi và thu phí cho lớp 9A_TEST`);

  // 11. Ghi nhận dữ liệu đóng tiền cho học sinh TEST9999
  if (cols && cols.length >= 3) {
    await sb.from('column_records').delete().eq('student_code', studentCode);
    const now = new Date().toISOString();
    const { error: recErr } = await sb.from('column_records').insert([
      {
        id: crypto.randomUUID(),
        column_id: cols[0].id,
        class_id: classId,
        student_code: studentCode,
        record_type: 'one_time',
        status: 'done',
        value: '250000',
        updated_at: now
      },
      {
        id: crypto.randomUUID(),
        column_id: cols[1].id,
        class_id: classId,
        student_code: studentCode,
        record_type: 'period',
        period_key: '2026-09',
        status: 'pending',
        value: '300000',
        updated_at: now
      },
      {
        id: crypto.randomUUID(),
        column_id: cols[2].id,
        class_id: classId,
        student_code: studentCode,
        record_type: 'one_time',
        status: 'done',
        value: '200000',
        updated_at: now
      }
    ]);
    if (recErr) console.warn('Lưu ý ghi nhận thu phí:', recErr);
    else console.log(`[+] Đã ghi nhận bản ghi thu phí mẫu: SGK (Đã đóng), Học phí T9 (Chưa đóng 300k), Quỹ PH (Đã đóng)`);
  }

  console.log('\n======================================================================');
  console.log('🎉 KHỞI TẠO MÔI TRƯỜNG LỚP HỌC GIẢ LẬP THÀNH CÔNG 100%!');
  console.log('======================================================================');
  console.log(`- Tên Lớp: 9A_TEST (ID: ${classId})`);
  console.log(`- GVCN: Admin TBC (thcstbc)`);
  console.log(`- Học sinh: Trần Thử Nghiệm (Mã: ${studentCode}, CCCD/GovID: 079201299999)`);
  console.log(`- Tài khoản Học sinh:`);
  console.log(`    + Đăng nhập: ${studentEmail}`);
  console.log(`    + Mật khẩu: ${studentPassword}`);
  console.log(`    + Cổng học sinh (/student/login): Chọn lớp 9A_TEST, Mã HS ${studentCode}, PIN 1234`);
  console.log(`- Tài khoản Phụ huynh:`);
  console.log(`    + Cổng tra cứu (/portal): Chọn lớp 9A_TEST, Mã HS: ${studentCode} hoặc SĐT: 0909999999, PIN: 123456`);
}

seedTestEnvironment().catch(console.error);
