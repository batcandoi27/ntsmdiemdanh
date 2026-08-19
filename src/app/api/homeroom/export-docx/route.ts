import { NextRequest, NextResponse } from 'next/server';
import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Packer
} from 'docx';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { templateId, className, academicYear, teacherName, students, settings, yearlyPlan, student, event, attendanceStats } = body;

    let doc: Document;

    if (templateId === 'template_class_list') {
      const structure = settings?.class_structure || { groups: [] };

      const titleP = new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({ text: 'TRƯỜNG THCS TRẦN BỘI CƠ', bold: true, size: 24 }),
          new TextRun({ text: '\nDANH SÁCH HỌC SINH & BAN CÁN SỰ LỚP', bold: true, size: 28, color: '1e3a8a' }),
          new TextRun({ text: `\nLớp: ${className} — Năm học: ${academicYear}`, italics: true, size: 22 }),
          new TextRun({ text: `\nGiáo viên chủ nhiệm: ${teacherName}`, size: 22 })
        ]
      });

      const cadreP = new Paragraph({
        spacing: { before: 200, after: 200 },
        children: [
          new TextRun({ text: 'I. BAN CÁN SỰ LỚP & TỔ TRƯỞNG:\n', bold: true, size: 22 }),
          new TextRun({ text: `• Lớp trưởng: ${structure.monitor_name || '........................'}\n`, size: 20 }),
          new TextRun({ text: `• Lớp phó Học tập: ${structure.vice_academic_name || '........................'}\n`, size: 20 }),
          new TextRun({ text: `• Lớp phó Kỷ luật: ${structure.vice_discipline_name || '........................'}\n`, size: 20 }),
          new TextRun({ text: `• Lớp phó Phong trào: ${structure.vice_activity_name || '........................'}\n`, size: 20 }),
          ...(structure.groups || []).map((g: any) => 
            new TextRun({ text: `• ${g.name}: Tổ trưởng: ${g.leader_name || '...............'} | Tổ phó: ${g.vice_name || '...............'}\n`, size: 20 })
          )
        ]
      });

      const sectionP = new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: `II. DANH SÁCH HỌC SINH TOÀN LỚP (Sĩ số: ${students.length}):`, bold: true, size: 22 })]
      });

      const tableRows = [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'STT', bold: true })] })] }),
            new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Mã HS', bold: true })] })] }),
            new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Họ và tên', bold: true })] })] }),
            new TableCell({ width: { size: 12, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Giới tính', bold: true })] })] }),
            new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Ngày sinh', bold: true })] })] }),
            new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SĐT Phụ huynh', bold: true })] })] }),
          ]
        }),
        ...(students || []).map((st: any, index: number) => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${index + 1}` })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: st.code || '' })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: st.full_name || st.name || '' })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: st.gender === 'female' || st.gender === 'F' || st.gender === 'Nữ' ? 'Nữ' : 'Nam' })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: st.birthday || '' })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: st.parent_phone || st.phone || '' })] })] }),
          ]
        }))
      ];

      const studentTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows
      });

      doc = new Document({
        sections: [{ children: [titleP, cadreP, sectionP, studentTable] }]
      });

    } else if (templateId === 'template_handbook') {
      const content = yearlyPlan?.content || {};

      doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 400, after: 300 },
              children: [
                new TextRun({ text: 'ỦY BAN NHÂN DÂN QUẬN 5', size: 24 }),
                new TextRun({ text: '\nTRƯỜNG THCS TRẦN BỘI CƠ', bold: true, size: 26 }),
                new TextRun({ text: '\n\n\n\nSỔ KẾ HOẠCH & QUẢN LÝ CHỦ NHIỆM', bold: true, size: 36, color: '1e3a8a' }),
                new TextRun({ text: `\n\nLỚP: ${className}`, bold: true, size: 30 }),
                new TextRun({ text: `\nNĂM HỌC: ${academicYear}`, bold: true, size: 26 }),
                new TextRun({ text: `\n\n\n\nGiáo viên chủ nhiệm: ${teacherName}`, size: 24 }),
                new TextRun({ text: `\nSĩ số đầu năm: ${(students || []).length} học sinh`, size: 22 }),
              ]
            }),
            new Paragraph({
              spacing: { before: 500, after: 200 },
              children: [new TextRun({ text: 'PHẦN I: ĐẶC ĐIỂM TÌNH HÌNH LỚP', bold: true, size: 24, color: '1e3a8a' })]
            }),
            new Paragraph({
              spacing: { after: 150 },
              children: [
                new TextRun({ text: '1. Thuận lợi:\n', bold: true, size: 22 }),
                new TextRun({ text: content.strengths || 'Đa số học sinh chăm ngoan, có ý thức kỷ luật tốt.', size: 20 })
              ]
            }),
            new Paragraph({
              spacing: { after: 150 },
              children: [
                new TextRun({ text: '2. Khó khăn:\n', bold: true, size: 22 }),
                new TextRun({ text: content.challenges || 'Cần tăng cường theo dõi nề nếp và chuyên cần.', size: 20 })
              ]
            }),
            new Paragraph({
              spacing: { before: 300, after: 200 },
              children: [new TextRun({ text: 'PHẦN II: MỤC TIÊU & CHỈ TIÊU PHẤN ĐẤU', bold: true, size: 24, color: '1e3a8a' })]
            }),
            new Paragraph({
              spacing: { after: 150 },
              children: [
                new TextRun({ text: `• Chỉ tiêu Học lực Tốt/Khá: ${content.targets?.academic_good_percent || 85}%\n`, size: 20 }),
                new TextRun({ text: `• Chỉ tiêu Hạnh kiểm/Rèn luyện Tốt: ${content.targets?.conduct_good_percent || 95}%\n`, size: 20 }),
                new TextRun({ text: `• Danh hiệu thi đua lớp đăng ký: ${content.targets?.competitions || 'Tập thể Lớp Tiên Tiến Xuất Sắc'}\n`, size: 20 }),
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { before: 400 },
              children: [
                new TextRun({ text: 'TP. Hồ Chí Minh, ngày ...... tháng ...... năm 2026\n', italics: true, size: 20 }),
                new TextRun({ text: 'GIÁO VIÊN CHỦ NHIỆM\n\n\n\n', bold: true, size: 22 }),
                new TextRun({ text: teacherName, bold: true, size: 22 })
              ]
            })
          ]
        }]
      });

    } else if (templateId === 'template_student_report') {
      const studentName = student?.full_name || student?.name || 'Học sinh';

      doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              children: [
                new TextRun({ text: 'TRƯỜNG THCS TRẦN BỘI CƠ\n', bold: true, size: 22 }),
                new TextRun({ text: 'PHIẾU THÔNG BÁO TÌNH HÌNH RÈN LUYỆN HỌC SINH', bold: true, size: 26, color: '1e3a8a' }),
                new TextRun({ text: `\n(Gửi Cha Mẹ Học Sinh)`, italics: true, size: 20 }),
              ]
            }),
            new Paragraph({
              spacing: { after: 150 },
              children: [
                new TextRun({ text: `• Họ và tên học sinh: `, bold: true, size: 22 }),
                new TextRun({ text: `${studentName}   `, size: 22 }),
                new TextRun({ text: `• Lớp: `, bold: true, size: 22 }),
                new TextRun({ text: `${className}   `, size: 22 }),
              ]
            }),
            new Paragraph({
              spacing: { before: 200, after: 100 },
              children: [new TextRun({ text: 'I. TÌNH HÌNH CHUYÊN CẦN:', bold: true, size: 22 })]
            }),
            new Paragraph({
              spacing: { after: 150 },
              children: [
                new TextRun({ text: `- Tổng số ngày học: ${attendanceStats?.totalDays || 30} ngày\n`, size: 20 }),
                new TextRun({ text: `- Số ngày có mặt: ${attendanceStats?.presentCount || 30} ngày (Tỷ lệ: ${attendanceStats?.attendanceRate || 100}%)\n`, size: 20 }),
                new TextRun({ text: `- Số lần đi muộn: ${attendanceStats?.lateCount || 0} lần\n`, size: 20 }),
              ]
            }),
            new Paragraph({
              spacing: { before: 200, after: 100 },
              children: [new TextRun({ text: 'II. NHẬN XÉT CỦA GIÁO VIÊN CHỦ NHIỆM:', bold: true, size: 22 })]
            }),
            new Paragraph({
              spacing: { after: 200 },
              children: [
                new TextRun({ text: 'Học sinh có ý thức rèn luyện tốt, chăm ngoan, kính thầy yêu bạn. Kính mong Quý phụ huynh tiếp tục theo dõi, đôn đốc con.', italics: true, size: 20 })
              ]
            })
          ]
        }]
      });

    } else if (templateId === 'template_incident') {
      const studentName = student?.full_name || student?.name || 'Học sinh';

      doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              children: [
                new TextRun({ text: 'TRƯỜNG THCS TRẦN BỘI CƠ\n', bold: true, size: 22 }),
                new TextRun({ text: 'BIÊN BẢN GHI NHẬN SỰ VIỆC & CAM KẾT RÈN LUYỆN', bold: true, size: 26, color: 'b91c1c' }),
                new TextRun({ text: `\nNgày lập: ${event?.date || '2026-08-20'}`, italics: true, size: 20 })
              ]
            }),
            new Paragraph({
              spacing: { after: 150 },
              children: [
                new TextRun({ text: `1. Giáo viên chủ nhiệm: ${teacherName}\n`, bold: true, size: 20 }),
                new TextRun({ text: `2. Học sinh: ${studentName} (Lớp ${className})\n`, bold: true, size: 20 }),
                new TextRun({ text: `3. Nội dung sự việc: ${event?.category || 'Vi phạm nội quy'} — ${event?.description || ''}\n`, size: 20 }),
                new TextRun({ text: `4. Biện pháp xử lý: ${event?.action_taken || 'Nhắc nhở và lập cam kết không tái phạm'}\n`, size: 20 }),
              ]
            }),
            new Paragraph({
              spacing: { before: 150, after: 100 },
              children: [new TextRun({ text: 'CAM KẾT CỦA HỌC SINH:', bold: true, size: 22 })]
            }),
            new Paragraph({
              spacing: { after: 200 },
              children: [
                new TextRun({ text: 'Em xin nhận lỗi và cam kết khắc phục, chấp hành nghiêm túc nội quy nhà trường.', italics: true, size: 20 })
              ]
            })
          ]
        }]
      });

    } else {
      // template_parent_meeting
      doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              children: [
                new TextRun({ text: 'TRƯỜNG THCS TRẦN BỘI CƠ\n', bold: true, size: 22 }),
                new TextRun({ text: 'BIÊN BẢN HỌP CHA MẸ HỌC SINH', bold: true, size: 26, color: '1e3a8a' }),
                new TextRun({ text: `\nLớp: ${className} — Năm học: ${academicYear}`, italics: true, size: 20 }),
              ]
            }),
            new Paragraph({
              spacing: { after: 100 },
              children: [
                new TextRun({ text: `1. Địa điểm: Phòng học lớp ${className}\n`, size: 20 }),
                new TextRun({ text: `2. Chủ trì: ${teacherName} (Giáo viên chủ nhiệm)\n`, size: 20 }),
                new TextRun({ text: `3. Thành phần: Toàn thể Quý cha mẹ học sinh lớp ${className}\n`, size: 20 }),
              ]
            })
          ]
        }]
      });
    }

    const buffer = await Packer.toBuffer(doc);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename=bieu-mau-${className}.docx`
      }
    });
  } catch (err: any) {
    console.error('Error exporting DOCX in server route:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
