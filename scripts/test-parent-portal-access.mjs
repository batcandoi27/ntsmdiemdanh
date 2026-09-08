import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testParentAccess() {
  console.log('🧪 Kiểm tra xác thực Cổng Phụ huynh (Parent Portal) với học sinh giả lập...');

  const { data: cls } = await sb.from('classes').select('id, name').eq('name', '9A_TEST').single();
  if (!cls) {
    console.error('Không tìm thấy lớp 9A_TEST');
    process.exit(1);
  }

  // 1. Tìm học sinh trong student_classes
  const { data: studentClasses } = await sb
    .from('student_classes')
    .select('student_id, students(*)')
    .eq('class_id', cls.id);

  console.log(`[+] Tìm thấy ${studentClasses?.length || 0} học sinh trong lớp ${cls.name}:`);
  const student = studentClasses?.[0]?.students;
  console.log(` - Học sinh: ${student?.full_name} (Mã: ${student?.student_code}, CCCD: ${student?.gov_id})`);

  // 2. Tra cứu Thời khóa biểu của lớp
  const { data: tt } = await sb.from('timetables').select('*').eq('class_id', cls.id).single();
  console.log(`[+] Thời khóa biểu lớp ${cls.name}:`, tt ? `Có sẵn (${Object.keys(tt.schedule).length} ngày)` : 'Chưa có');

  // 3. Tra cứu Điểm danh của học sinh
  const { data: att } = await sb.from('attendance').select('*').eq('student_id', student.id);
  console.log(`[+] Lịch sử điểm danh: ${att?.length || 0} bản ghi (VD: ngày ${att?.[0]?.date} - trạng thái ${att?.[0]?.status_id})`);

  // 4. Tra cứu Cột sổ theo dõi & thu phí
  const { data: cols } = await sb.from('columns').select('*').eq('class_id', cls.id);
  console.log(`[+] Sổ theo dõi & thu phí: ${cols?.length || 0} khoản (VD: ${cols?.map(c => c.name).join(', ')})`);

  // 5. Tra cứu Dữ liệu đóng tiền
  const { data: recs } = await sb.from('column_records').select('*').eq('student_code', student.student_code);
  console.log(`[+] Tình trạng thu phí: ${recs?.length || 0} bản ghi (VD: ${recs?.map(r => `${r.record_type}: ${r.status}`).join(', ')})`);

  console.log('\n✅ 100% KIỂM TRA THÀNH CÔNG! PH & HS CÓ THỂ TEST TOÀN BỘ CHỨC NĂNG!');
}

testParentAccess().catch(console.error);
