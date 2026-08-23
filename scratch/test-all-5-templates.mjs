// Test all 5 templates
const templates = [
  { id: 'template_handbook', name: 'Sổ chủ nhiệm' },
  { id: 'template_class_list', name: 'Danh sách lớp' },
  { id: 'template_student_report', name: 'Phiếu báo rèn luyện' },
  { id: 'template_incident', name: 'Biên bản sự việc' },
  { id: 'template_parent_meeting', name: 'Biên bản họp PH' },
];

async function run() {
  console.log('--- TESTING ALL 5 DOCX EXPORT TEMPLATES ---');
  for (const t of templates) {
    const res = await fetch('http://localhost:8888/api/homeroom/export-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: t.id,
        className: '8A13',
        academicYear: '2025 - 2026',
        teacherName: 'Huỳnh Thị Tuyền',
        students: [
          { id: '1', code: '8A13_1', full_name: 'Nguyễn Văn An', gender: 'Nam', birthday: '15/03/2012', parent_phone: '0901234567' },
          { id: '2', code: '8A13_2', full_name: 'Trần Thị Bích', gender: 'Nữ', birthday: '22/07/2012', parent_phone: '0912345678' }
        ],
        settings: {
          class_structure: {
            monitor_name: 'Nguyễn Văn An',
            vice_academic_name: 'Trần Thị Bích',
            vice_discipline_name: 'Lê Hoàng Nam',
            vice_activity_name: 'Phạm Quỳnh Nga',
            groups: [{ name: 'Tổ 1', leader_name: 'Vũ Minh Đức', vice_name: 'Đặng Mai Lan' }]
          }
        },
        yearlyPlan: {
          content: {
            strengths: 'Lớp học sôi nổi, nhiều học sinh khá giỏi.',
            challenges: 'Một số em còn nói chuyện riêng trong giờ tự quản.',
            targets: { academic_good_percent: 90, conduct_good_percent: 98, competitions: 'Lớp Tiên Tiến Xuất Sắc' }
          }
        },
        student: { id: '1', code: '8A13_1', full_name: 'Nguyễn Văn An' },
        attendanceStats: { totalDays: 44, presentCount: 44, lateCount: 0, attendanceRate: 100 },
        event: { date: '2026-08-23', category: 'Kỷ luật', description: 'Đi học muộn 15 phút', action_taken: 'Nhắc nhở và cam kết' }
      })
    });

    const buf = await res.arrayBuffer();
    console.log(`[✓] Template: ${t.id} (${t.name}) -> HTTP ${res.status} | Size: ${buf.byteLength} bytes`);
  }
}

run().catch(console.error);
