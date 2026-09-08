const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const officialAssignments = [
  // Khối 6 (Tiết 1 Chiều Thứ 2)
  { className: '6A1', teacherName: 'Nguyễn Thị Thu Thủy' },
  { className: '6A2', teacherName: 'Bùi Tuyết Vân' },
  { className: '6A3', teacherName: 'Nguyễn Dương Thùy Linh' },
  { className: '6A4', teacherName: 'Nguyễn Thị Hiền' },
  { className: '6A5', teacherName: 'Huỳnh Thị Tuyền' },
  { className: '6A6', teacherName: 'Hàng Thị Minh Hiệp' },
  { className: '6A7', teacherName: 'Lê Thị Thanh Xuân' },
  { className: '6A8', teacherName: 'Âu Mỹ Nghi' },
  { className: '6A9', teacherName: 'Đinh Thị Bích Trâm' },
  { className: '6A10', teacherName: 'Lâm Vĩnh Toàn' },

  // Khối 7 (Tiết 1 Chiều Thứ 2 & Tiết 1 Sáng Thứ 2)
  { className: '7A1', teacherName: 'Nguyễn Tuyết Thanh' },
  { className: '7A2', teacherName: 'Lê Thị Hồng Vân' },
  { className: '7A3', teacherName: 'Nguyễn Đức Tuấn' },
  { className: '7A4', teacherName: 'Trương Thanh Tuấn' },
  { className: '7A5', teacherName: 'Nguyễn Thị Thanh Tuyền' },
  { className: '7A6', teacherName: 'Ngô Chiêu Lệ' },
  { className: '7A7', teacherName: 'Nguyễn Tâm Hồng' },
  { className: '7A8', teacherName: 'Nguyễn Hoàng Oanh' },
  { className: '7A9', teacherName: 'Lâm Ngọc Dung' },
  { className: '7A10', teacherName: 'Nguyễn Thanh Quí' },
  { className: '7A11', teacherName: 'Phan Quốc Trung' },

  // Khối 8 (Tiết 3 Chiều Thứ 2 & Tiết 1 Sáng Thứ 2)
  { className: '8A1', teacherName: 'Trương Thúy Nga' },
  { className: '8A2', teacherName: 'Đào Thị Thu Thủy' },
  { className: '8A3', teacherName: 'Nguyễn Thị Thu Hà' },
  { className: '8A4', teacherName: 'Huỳnh Thị Thanh Thúy' },
  { className: '8A5', teacherName: 'Nguyễn Thị Lệ Dung' },
  { className: '8A6', teacherName: 'Hồ Thị Hạnh' },
  { className: '8A7', teacherName: 'Trần Thị Phương Hồng' },
  { className: '8A8', teacherName: 'Phạm Thị Kim Ngân' },
  { className: '8A9', teacherName: 'Nguyễn Thị Phượng Thuần' },
  { className: '8A10', teacherName: 'Trần Quốc Hưng' },
  { className: '8A11', teacherName: 'Đàm Thị Thúy Nga' },
  { className: '8A12', teacherName: 'Lê Hạnh Nhân' },
  { className: '8A13', teacherName: 'Nguyễn Đức Thanh' },
  { className: '8A14', teacherName: 'Phạm Thị Vui' },

  // Khối 9 (Tiết 3 Chiều Thứ 2 & Tiết 1 Sáng Thứ 2)
  { className: '9A1', teacherName: 'Trần Hoài Phương' },
  { className: '9A2', teacherName: 'Lê Trần Minh Anh' },
  { className: '9A3', teacherName: 'Trần Thị Thu Thảo' },
  { className: '9A4', teacherName: 'Lê Hồng Phát' },
  { className: '9A5', teacherName: 'Dương Thị Mai Linh' },
  { className: '9A6', teacherName: 'Lưu Thị Ngọc Trâm' },
  { className: '9A7', teacherName: 'Phạm Thị Ánh Hồng' },
  { className: '9A8', teacherName: 'Nguyễn Đăng Cầu' },
  { className: '9A9', teacherName: 'Trần Nguyễn Tuấn Huy' },
  { className: '9A10', teacherName: 'Lâm Xuân Hiếu' },
  { className: '9A11', teacherName: 'Đỗ Thị Kiều Hạnh' },
  { className: '9A12', teacherName: 'Nguyễn Thị Xuân Hương' },
  { className: '9A13', teacherName: 'Nguyễn Thị Mỹ Phượng' },
  { className: '9A14', teacherName: 'Lê Thị Phương Bạch' },
  { className: '9A15', teacherName: 'Nguyễn Tú Thanh' }
];

async function run() {
    console.log('=== 1. Chuẩn hoá Profile giáo viên ===');
    const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
    
    // Fix known shortened names
    await supabase.from('profiles').update({ full_name: 'Nguyễn Dương Thùy Linh' }).eq('id', '4309bb9f-deff-4319-9333-39efac79fb41');
    await supabase.from('profiles').update({ full_name: 'Nguyễn Thị Phượng Thuần' }).eq('id', '4ac8a52b-64a2-447d-81ff-7c5bff8dcf51');
    await supabase.from('profiles').update({ full_name: 'Lê Hạnh Nhân' }).eq('id', '81b136e8-3161-469d-afb1-4193dc330c97');

    // Tạo mới các profile còn thiếu
    const needed = ['Âu Mỹ Nghi', 'Đinh Thị Bích Trâm', 'Phạm Thị Vui'];
    for (const name of needed) {
        const { data: found } = await supabase.from('profiles').select('id').ilike('full_name', '%' + name + '%');
        if (!found || found.length === 0) {
            const slug = norm(name).replace(/\s+/g, '');
            const email = slug + '@thcstbc.com';
            const { data: created, error } = await supabase.from('profiles').insert({
                full_name: name,
                email: email,
                role: 'teacher'
            }).select('id').single();
            if (error) console.error('Lỗi tạo profile cho ' + name, error);
            else console.log('Đã tạo profile cho ' + name + ' -> ID: ' + created.id);
        }
    }

    // Lấy lại danh sách profiles
    const { data: allProfs } = await supabase.from('profiles').select('id, full_name');
    const teacherToProfileId = new Map();
    allProfs.forEach(p => {
        teacherToProfileId.set(norm(p.full_name), p.id);
    });

    console.log('=== 2. Lấy danh sách lớp năm học active 2026-2027 ===');
    const { data: activeYear } = await supabase.from('academic_years').select('id, name').eq('is_active', true).single();
    console.log('Năm học active: ' + activeYear.name + ' (' + activeYear.id + ')');

    const { data: classes } = await supabase.from('classes').select('id, name').eq('year_id', activeYear.id);
    console.log('Tổng số lớp 2026-2027: ' + classes.length);
    const classMap = new Map();
    classes.forEach(c => classMap.set(c.name.trim(), c.id));

    console.log('=== 3. Làm sạch phân công cũ của năm 2026-2027 ===');
    const classIds = classes.map(c => c.id);
    await supabase.from('teacher_classes').delete().in('class_id', classIds);

    console.log('=== 4. Gán phân công mới CHUẨN XÁC THEO BẢNG CHỦ NHIỆM NĂM NAY ===');
    const newAssignments = [];
    for (const item of officialAssignments) {
        const classId = classMap.get(item.className);
        if (!classId) {
            console.error('❌ Không tìm thấy lớp trong CSDL: ' + item.className);
            continue;
        }

        let teacherId = teacherToProfileId.get(norm(item.teacherName));
        if (!teacherId) {
            // Fuzzy search in profile names
            for (const [k, v] of teacherToProfileId.entries()) {
                if (k.includes(norm(item.teacherName)) || norm(item.teacherName).includes(k)) {
                    teacherId = v;
                    break;
                }
            }
        }

        if (!teacherId) {
            console.error('❌ Không tìm thấy ID cho giáo viên: ' + item.teacherName);
            continue;
        }

        newAssignments.push({
            class_id: classId,
            teacher_id: teacherId,
            is_homeroom: true
        });
        console.log('✅ [' + item.className + '] -> GVCN: ' + item.teacherName + ' (ID: ' + teacherId + ')');
    }

    const { data: inserted, error: insErr } = await supabase.from('teacher_classes').insert(newAssignments);
    if (insErr) {
        console.error('❌ Lỗi insert teacher_classes:', insErr);
    } else {
        console.log('🎉 ĐÃ GÁN THÀNH CÔNG ' + newAssignments.length + '/50 GIÁO VIÊN CHỦ NHIỆM CHUẨN NĂM HỌC 2026-2027!');
    }
}

run().catch(console.error);
