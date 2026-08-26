import { NextRequest } from 'next/server';
import pptxgen from 'pptxgenjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      className = '6A4',
      academicYear = '2025 - 2026',
      teacherName = 'Giáo viên chủ nhiệm',
      draft = {}
    } = body;

    const pres = new pptxgen();
    pres.author = teacherName;
    pres.title = `Sinh Hoat Lop ${className}`;
    pres.layout = 'LAYOUT_16x9';

    // Slide 1: Bìa (Cover)
    const slide1 = pres.addSlide();
    slide1.background = { color: '1B365D' };
    slide1.addText(`TIẾT SINH HOẠT LỚP ${String(className).toUpperCase().replace(/^LỚP\s*/i, '')}`, {
      x: 0.8, y: 1.6, w: 8.4, h: 1.5,
      fontSize: 32, bold: true, color: 'FFD700', align: 'center', valign: 'middle'
    });
    slide1.addText(`NĂM HỌC ${academicYear} — TRƯỜNG THCS TRẦN BỘI CƠ`, {
      x: 0.8, y: 3.2, w: 8.4, h: 0.6,
      fontSize: 16, bold: true, color: 'FFFFFF', align: 'center'
    });
    slide1.addText(`Giáo viên chủ nhiệm: ${teacherName} • Sĩ số: ${draft?.summary?.total_students || 43} HS`, {
      x: 0.8, y: 4.0, w: 8.4, h: 0.6,
      fontSize: 14, italic: true, color: 'CBD5E1', align: 'center'
    });

    // Slide 2: Đánh Giá Tuần Qua
    const slide2 = pres.addSlide();
    slide2.background = { color: 'F8FAFC' };
    slide2.addText('I. ĐÁNH GIÁ TÌNH HÌNH TUẦN QUA', {
      x: 0.8, y: 0.5, w: 8.4, h: 0.8,
      fontSize: 22, bold: true, color: '1B365D'
    });
    slide2.addText([
      { text: `• Tỷ lệ chuyên cần chung: `, options: { bold: true } },
      { text: `${draft?.summary?.attendance_rate || 100}%\n` },
      { text: `• Đi muộn: `, options: { bold: true } },
      { text: `${draft?.summary?.late_count || 0} lượt\n` },
      { text: `• Vắng không phép: `, options: { bold: true } },
      { text: `${draft?.summary?.unexcused_count || 0} lượt\n` },
      { text: `• Tình hình học tập: `, options: { bold: true } },
      { text: `Duy trì nề nếp kiểm tra bài đầu giờ và giữ gìn trật tự trong giờ học.` }
    ], {
      x: 0.8, y: 1.5, w: 8.4, h: 3.5,
      fontSize: 16, color: '1E293B', lineSpacing: 28
    });

    // Slide 3: Tuyên Dương
    const slide3 = pres.addSlide();
    slide3.background = { color: 'F8FAFC' };
    slide3.addText('II. TUYÊN DƯƠNG & KHEN THƯỞNG ⭐', {
      x: 0.8, y: 0.5, w: 8.4, h: 0.8,
      fontSize: 22, bold: true, color: '047857'
    });
    const praises = (draft?.praises && draft.praises.length > 0)
      ? draft.praises.map((p: any) => `⭐ ${p.student_name}: ${p.reason}`).join('\n\n')
      : '• Toàn thể lớp duy trì tốt nề nếp kỷ luật và thi đua học tập xuất sắc.';
    slide3.addText(praises, {
      x: 0.8, y: 1.5, w: 8.4, h: 3.5,
      fontSize: 16, color: '065F46', lineSpacing: 24
    });

    // Slide 4: Nhắc Nhở
    const slide4 = pres.addSlide();
    slide4.background = { color: 'F8FAFC' };
    slide4.addText('III. NHẮC NHỞ & CẦN CẢI THIỆN ⚠️', {
      x: 0.8, y: 0.5, w: 8.4, h: 0.8,
      fontSize: 22, bold: true, color: 'B91C1C'
    });
    const warnings = (draft?.warnings && draft.warnings.length > 0)
      ? draft.warnings.map((w: any) => `⚠️ ${w.student_name}: ${w.reason}`).join('\n\n')
      : '• Không có học sinh vi phạm nghiêm trọng trong tuần. Tiếp tục phát huy tinh thần tự giác.';
    slide4.addText(warnings, {
      x: 0.8, y: 1.5, w: 8.4, h: 3.5,
      fontSize: 16, color: '991B1B', lineSpacing: 24
    });

    // Slide 5: Phương Hướng Tuần Tới
    const slide5 = pres.addSlide();
    slide5.background = { color: 'F8FAFC' };
    slide5.addText('IV. PHƯƠNG HƯỚNG & KẾ HOẠCH TUẦN TỚI 🚀', {
      x: 0.8, y: 0.5, w: 8.4, h: 0.8,
      fontSize: 22, bold: true, color: '4338CA'
    });
    slide5.addText([
      { text: '1. Ổn định sĩ số, 100% học sinh đi học đúng giờ trước 6h45 / 12h45.\n\n' },
      { text: '2. Ban cán sự lớp tăng cường kiểm tra vệ sinh và truy bài 15 phút đầu giờ.\n\n' },
      { text: '3. Phân công đôi bạn cùng tiến, tích cực chuẩn bị bài trước khi đến lớp.\n\n' },
      { text: '4. Tích cực tham gia các phong trào thi đua của Đội và nhà trường.' }
    ], {
      x: 0.8, y: 1.5, w: 8.4, h: 3.5,
      fontSize: 16, color: '1E293B', lineSpacing: 22
    });

    const buffer = await pres.write({ outputType: 'nodebuffer' }) as Buffer;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename=slide-sinh-hoat-lop-${className}.pptx`
      }
    });
  } catch (err: any) {
    console.error('Error generating PPTX:', err);
    return new Response(JSON.stringify({ error: err.message || 'Lỗi tạo file PowerPoint' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
