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
  Header,
  Footer,
  PageNumber,
  ShadingType,
  Packer
} from 'docx';

// 1. Bảng Màu & Font Chuẩn Mực (Theme Tokens)
const THEME = {
  primary: '1B365D',     // Xanh Navy hoàng gia sang trọng
  secondary: '2B5B84',   // Xanh biển trầm
  accentBg: 'F0F4F8',    // Nền xám xanh nhạt cho khung Callout Box
  borderColor: 'CBD5E0', // Viền xám mảnh
  textDark: '1A202C',    // Màu chữ chính (Đen than cao cấp)
  textMuted: '4A5568',   // Màu chữ phụ
  font: 'Times New Roman',
};

// Viền ẩn cho các bảng bố cục 2 cột (Header, Signature)
const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
};

// Lề trang chuẩn in ấn giáo dục (Trái 30mm đóng gáy, Trên/Dưới/Phải 20mm)
const STANDARD_PAGE_PROPERTIES = {
  page: {
    margin: {
      top: 1134,    // 20mm
      bottom: 1134, // 20mm
      left: 1701,   // 30mm (Lề đóng gáy sổ)
      right: 1134,  // 20mm
    }
  }
};

// Footer tự động đánh số trang
function createStandardFooter(documentTitle: string) {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: `${documentTitle} — `, italics: true, size: 16, font: THEME.font, color: THEME.textMuted }),
          new TextRun({ text: 'Trang ', italics: true, size: 16, font: THEME.font, color: THEME.textMuted }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, font: THEME.font, bold: true }),
          new TextRun({ text: ' / ', size: 16, font: THEME.font }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: THEME.font }),
        ]
      })
    ]
  });
}

// Bảng Header Hành Chính 2 Cột Chuẩn Quốc Gia
function createAdministrativeHeader(rightTop = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', rightBottom = 'Độc lập - Tự do - Hạnh phúc') {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: THEME.secondary } },
                spacing: { after: 120 },
                children: [
                  new TextRun({ text: 'ỦY BAN NHÂN DÂN QUẬN 5', size: 20, font: THEME.font, color: THEME.textMuted }),
                  new TextRun({ text: 'TRƯỜNG THCS TRẦN BỘI CƠ', bold: true, size: 22, font: THEME.font, color: THEME.primary, break: 1 }),
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 52, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: THEME.secondary } },
                spacing: { after: 120 },
                children: [
                  new TextRun({ text: rightTop, bold: true, size: 20, font: THEME.font, color: THEME.textDark }),
                  new TextRun({ text: rightBottom, bold: true, size: 20, font: THEME.font, color: THEME.textDark, break: 1 }),
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

// Khối Chữ Ký 2 Cột Chuẩn
function createStandardSignature(teacherName: string, dateStr = 'TP. Hồ Chí Minh, ngày ...... tháng ...... năm 2026', leftTitle = 'DUYỆT CỦA BAN GIÁM HIỆU', rightTitle = 'GIÁO VIÊN CHỦ NHIỆM') {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: leftTitle, bold: true, size: 22, font: THEME.font, color: THEME.textDark }),
                  new TextRun({ text: '(Ký và đóng dấu)', italics: true, size: 18, font: THEME.font, color: THEME.textMuted, break: 1 }),
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: dateStr, italics: true, size: 20, font: THEME.font, color: THEME.textMuted }),
                  new TextRun({ text: rightTitle, bold: true, size: 22, font: THEME.font, color: THEME.primary, break: 1 }),
                  new TextRun({ text: '(Ký và ghi rõ họ tên)', italics: true, size: 18, font: THEME.font, color: THEME.textMuted, break: 1 }),
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 720 },
                children: [
                  new TextRun({
                    text: teacherName,
                    bold: true,
                    size: 24,
                    font: THEME.font,
                    color: THEME.textDark,
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

function createSectionHeading(title: string) {
  return new Paragraph({
    spacing: { before: 320, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: THEME.borderColor } },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 24,
        font: THEME.font,
        color: THEME.primary,
      }),
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      templateId = 'template_handbook',
      className = '6A4',
      academicYear = '2025 - 2026',
      teacherName = 'Huỳnh Thị Tuyền',
      students = Array(39).fill({}),
      settings = {},
      yearlyPlan = {},
      student = {},
      event = {},
      attendanceStats = {}
    } = body;

    let doc: Document;

    // ─────────────────────────────────────────────────────────────
    // TEMPLATE 1: SỔ KẾ HOẠCH & QUẢN LÝ CHỦ NHIỆM (HANDBOOK)
    // ─────────────────────────────────────────────────────────────
    if (templateId === 'template_handbook') {
      const content = yearlyPlan?.content || {};

      const mainTitleParagraph = new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 320, after: 120 },
        children: [
          new TextRun({
            text: 'SỔ KẾ HOẠCH & QUẢN LÝ CHỦ NHIỆM',
            bold: true,
            size: 32,
            font: THEME.font,
            color: THEME.primary,
          }),
          new TextRun({
            text: `LỚP: ${className.toUpperCase()}  —  NĂM HỌC: ${academicYear}`,
            bold: true,
            size: 24,
            font: THEME.font,
            color: THEME.secondary,
            break: 1,
          }),
        ],
      });

      const metaInfoBox = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: THEME.borderColor },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: THEME.borderColor },
          right: { style: BorderStyle.SINGLE, size: 4, color: THEME.borderColor },
          left: { style: BorderStyle.SINGLE, size: 24, color: THEME.primary },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                shading: { fill: THEME.accentBg, type: ShadingType.CLEAR },
                margins: { top: 120, bottom: 120, left: 180, right: 180 },
                children: [
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: NO_BORDERS,
                    rows: [
                      new TableRow({
                        children: [
                          new TableCell({
                            width: { size: 60, type: WidthType.PERCENTAGE },
                            borders: NO_BORDERS,
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({ text: '• Giáo viên chủ nhiệm: ', bold: true, size: 22, font: THEME.font, color: THEME.primary }),
                                  new TextRun({ text: teacherName, bold: true, size: 22, font: THEME.font, color: THEME.textDark }),
                                ]
                              })
                            ]
                          }),
                          new TableCell({
                            width: { size: 40, type: WidthType.PERCENTAGE },
                            borders: NO_BORDERS,
                            children: [
                              new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [
                                  new TextRun({ text: '• Sĩ số đầu năm: ', bold: true, size: 22, font: THEME.font, color: THEME.primary }),
                                  new TextRun({ text: `${students.length} học sinh`, bold: true, size: 22, font: THEME.font, color: THEME.textDark }),
                                ]
                              })
                            ]
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      });

      const section1Title = createSectionHeading('PHẦN I: ĐẶC ĐIỂM TÌNH HÌNH LỚP');

      const pStrengths = new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 100, after: 120, line: 320 },
        indent: { firstLine: 480 },
        children: [
          new TextRun({ text: '1. Thuận lợi: ', bold: true, size: 22, font: THEME.font, color: THEME.primary }),
          new TextRun({
            text: content.strengths || 'Tập thể lớp có nền tảng học lực khá đồng đều, nhiều học sinh có năng khiếu văn nghệ, thể dục thể thao và tư duy logic tốt. Đa số phụ huynh quan tâm và đồng hành chặt chẽ cùng nhà trường.',
            size: 22,
            font: THEME.font,
            color: THEME.textDark,
          }),
        ],
      });

      const pChallenges = new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 100, after: 200, line: 320 },
        indent: { firstLine: 480 },
        children: [
          new TextRun({ text: '2. Khó khăn: ', bold: true, size: 22, font: THEME.font, color: THEME.primary }),
          new TextRun({
            text: content.challenges || 'Kỹ năng tự quản của một số tổ trưởng còn hạn chế, một vài học sinh còn thụ động trong giờ học tự quản, cần giáo viên chủ nhiệm uốn nắn và bồi dưỡng kỹ năng thường xuyên.',
            size: 22,
            font: THEME.font,
            color: THEME.textDark,
          }),
        ],
      });

      const section2Title = createSectionHeading('PHẦN II: MỤC TIÊU & CHỈ TIÊU PHẤN ĐẤU');

      const targetsTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                width: { size: 60, type: WidthType.PERCENTAGE },
                shading: { fill: THEME.primary, type: ShadingType.CLEAR },
                margins: { top: 100, bottom: 100, left: 150, right: 150 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Chỉ Tiêu Đăng Ký Phấn Đấu', bold: true, color: 'FFFFFF', font: THEME.font })] })]
              }),
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                shading: { fill: THEME.primary, type: ShadingType.CLEAR },
                margins: { top: 100, bottom: 100, left: 150, right: 150 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Mức Đạt Chỉ Tiêu', bold: true, color: 'FFFFFF', font: THEME.font })] })]
              }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ margins: { top: 80, bottom: 80, left: 150, right: 150 }, children: [new Paragraph({ children: [new TextRun({ text: '• Học lực Khá / Giỏi (Tốt):', font: THEME.font })] })] }),
              new TableCell({ margins: { top: 80, bottom: 80, left: 150, right: 150 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${content.targets?.academic_good_percent || 85}%`, bold: true, color: THEME.primary, font: THEME.font })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ margins: { top: 80, bottom: 80, left: 150, right: 150 }, children: [new Paragraph({ children: [new TextRun({ text: '• Hạnh kiểm / Rèn luyện Tốt:', font: THEME.font })] })] }),
              new TableCell({ margins: { top: 80, bottom: 80, left: 150, right: 150 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${content.targets?.conduct_good_percent || 95}%`, bold: true, color: THEME.primary, font: THEME.font })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ margins: { top: 80, bottom: 80, left: 150, right: 150 }, children: [new Paragraph({ children: [new TextRun({ text: '• Danh hiệu thi đua tập thể:', font: THEME.font })] })] }),
              new TableCell({ margins: { top: 80, bottom: 80, left: 150, right: 150 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: content.targets?.competitions || 'Lớp Tiên Tiến Xuất Sắc', bold: true, color: '0D5C3A', font: THEME.font })] })] }),
            ]
          }),
        ]
      });

      doc = new Document({
        sections: [{
          properties: STANDARD_PAGE_PROPERTIES,
          footers: { default: createStandardFooter('Sổ Chủ Nhiệm') },
          children: [
            createAdministrativeHeader(),
            mainTitleParagraph,
            metaInfoBox,
            new Paragraph({ spacing: { before: 100 } }),
            section1Title,
            pStrengths,
            pChallenges,
            section2Title,
            targetsTable,
            new Paragraph({ spacing: { before: 360 } }),
            createStandardSignature(teacherName),
          ]
        }]
      });

    // ─────────────────────────────────────────────────────────────
    // TEMPLATE 2: DANH SÁCH HỌC SINH & BAN CÁN SỰ (CLASS LIST)
    // ─────────────────────────────────────────────────────────────
    } else if (templateId === 'template_class_list') {
      const structure = settings?.class_structure || { groups: [] };

      const mainTitleParagraph = new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 280, after: 120 },
        children: [
          new TextRun({ text: 'DANH SÁCH HỌC SINH & BAN CÁN SỰ LỚP', bold: true, size: 28, font: THEME.font, color: THEME.primary }),
          new TextRun({ text: `LỚP: ${className.toUpperCase()}  —  NĂM HỌC: ${academicYear}`, bold: true, size: 22, font: THEME.font, color: THEME.secondary, break: 1 }),
          new TextRun({ text: `Giáo viên chủ nhiệm: ${teacherName}  •  Sĩ số: ${students.length} học sinh`, italics: true, size: 20, font: THEME.font, color: THEME.textMuted, break: 1 }),
        ]
      });

      const cadreSectionTitle = createSectionHeading('I. BAN CÁN SỰ LỚP & TỔ TRƯỞNG');

      const cadreBox = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: THEME.borderColor },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: THEME.borderColor },
          right: { style: BorderStyle.SINGLE, size: 4, color: THEME.borderColor },
          left: { style: BorderStyle.SINGLE, size: 20, color: THEME.secondary },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                shading: { fill: THEME.accentBg, type: ShadingType.CLEAR },
                margins: { top: 100, bottom: 100, left: 160, right: 160 },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: '• Lớp trưởng: ', bold: true, font: THEME.font, color: THEME.primary }),
                      new TextRun({ text: structure.monitor_name || '...........................................', font: THEME.font }),
                      new TextRun({ text: '    • Lớp phó Học tập: ', bold: true, font: THEME.font, color: THEME.primary }),
                      new TextRun({ text: structure.vice_academic_name || '...........................................', font: THEME.font, break: 1 }),
                      new TextRun({ text: '• Lớp phó Kỷ luật: ', bold: true, font: THEME.font, color: THEME.primary }),
                      new TextRun({ text: structure.vice_discipline_name || '...........................................', font: THEME.font }),
                      new TextRun({ text: '    • Lớp phó Phong trào: ', bold: true, font: THEME.font, color: THEME.primary }),
                      new TextRun({ text: structure.vice_activity_name || '...........................................', font: THEME.font, break: 1 }),
                      ...(structure.groups || []).map((g: any) =>
                        new TextRun({ text: `• ${g.name}: Tổ trưởng: ${g.leader_name || '..........'} | Tổ phó: ${g.vice_name || '..........'}   `, font: THEME.font })
                      )
                    ]
                  })
                ]
              })
            ]
          })
        ]
      });

      const listSectionTitle = createSectionHeading(`II. DANH SÁCH HỌC SINH TOÀN LỚP (Sĩ số: ${students.length})`);

      const studentTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, shading: { fill: THEME.primary, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 60, right: 60 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'STT', bold: true, color: 'FFFFFF', font: THEME.font })] })] }),
              new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, shading: { fill: THEME.primary, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 60, right: 60 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Mã HS', bold: true, color: 'FFFFFF', font: THEME.font })] })] }),
              new TableCell({ width: { size: 32, type: WidthType.PERCENTAGE }, shading: { fill: THEME.primary, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: 'Họ và tên', bold: true, color: 'FFFFFF', font: THEME.font })] })] }),
              new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: THEME.primary, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 60, right: 60 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Giới tính', bold: true, color: 'FFFFFF', font: THEME.font })] })] }),
              new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, shading: { fill: THEME.primary, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 60, right: 60 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Ngày sinh', bold: true, color: 'FFFFFF', font: THEME.font })] })] }),
              new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, shading: { fill: THEME.primary, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SĐT Phụ huynh', bold: true, color: 'FFFFFF', font: THEME.font })] })] }),
            ]
          }),
          ...(students || []).map((st: any, index: number) => new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ margins: { top: 60, bottom: 60, left: 60, right: 60 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${index + 1}`, font: THEME.font })] })] }),
              new TableCell({ margins: { top: 60, bottom: 60, left: 60, right: 60 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: st.code || '', font: THEME.font })] })] }),
              new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: st.full_name || st.name || '', bold: true, font: THEME.font })] })] }),
              new TableCell({ margins: { top: 60, bottom: 60, left: 60, right: 60 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: st.gender === 'female' || st.gender === 'F' || st.gender === 'Nữ' ? 'Nữ' : 'Nam', font: THEME.font })] })] }),
              new TableCell({ margins: { top: 60, bottom: 60, left: 60, right: 60 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: st.birthday || '', font: THEME.font })] })] }),
              new TableCell({ margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: st.parent_phone || st.phone || '', font: THEME.font })] })] }),
            ]
          }))
        ]
      });

      doc = new Document({
        sections: [{
          properties: STANDARD_PAGE_PROPERTIES,
          footers: { default: createStandardFooter('Danh Sách Học Sinh') },
          children: [
            createAdministrativeHeader(),
            mainTitleParagraph,
            cadreSectionTitle,
            cadreBox,
            listSectionTitle,
            studentTable,
            new Paragraph({ spacing: { before: 360 } }),
            createStandardSignature(teacherName),
          ]
        }]
      });

    // ─────────────────────────────────────────────────────────────
    // TEMPLATE 3: PHIẾU THÔNG BÁO TÌNH HÌNH RÈN LUYỆN (STUDENT REPORT)
    // ─────────────────────────────────────────────────────────────
    } else if (templateId === 'template_student_report') {
      const studentName = student?.full_name || student?.name || 'Học sinh';

      const mainTitleParagraph = new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 280, after: 120 },
        children: [
          new TextRun({ text: 'PHIẾU THÔNG BÁO TÌNH HÌNH RÈN LUYỆN HỌC SINH', bold: true, size: 28, font: THEME.font, color: THEME.primary }),
          new TextRun({ text: '(Kính gửi Quý Cha Mẹ Học Sinh)', italics: true, size: 22, font: THEME.font, color: THEME.secondary, break: 1 }),
        ]
      });

      const studentInfoBox = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: THEME.borderColor },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: THEME.borderColor },
          right: { style: BorderStyle.SINGLE, size: 4, color: THEME.borderColor },
          left: { style: BorderStyle.SINGLE, size: 24, color: THEME.primary },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                shading: { fill: THEME.accentBg, type: ShadingType.CLEAR },
                margins: { top: 120, bottom: 120, left: 180, right: 180 },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: '• Họ và tên học sinh: ', bold: true, size: 22, font: THEME.font, color: THEME.primary }),
                      new TextRun({ text: `${studentName}          `, bold: true, size: 22, font: THEME.font, color: THEME.textDark }),
                      new TextRun({ text: '• Lớp: ', bold: true, size: 22, font: THEME.font, color: THEME.primary }),
                      new TextRun({ text: `${className}          `, bold: true, size: 22, font: THEME.font, color: THEME.textDark }),
                      new TextRun({ text: '• Mã số: ', bold: true, size: 22, font: THEME.font, color: THEME.primary }),
                      new TextRun({ text: `${student?.code || ''}`, bold: true, size: 22, font: THEME.font, color: THEME.textDark }),
                    ]
                  })
                ]
              })
            ]
          })
        ]
      });

      const section1 = createSectionHeading('I. TÌNH HÌNH CHUYÊN CẦN & NỀ NẾP');

      const attendanceTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ shading: { fill: THEME.primary, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tổng số ngày học', bold: true, color: 'FFFFFF', font: THEME.font })] })] }),
              new TableCell({ shading: { fill: THEME.primary, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Số ngày có mặt', bold: true, color: 'FFFFFF', font: THEME.font })] })] }),
              new TableCell({ shading: { fill: THEME.primary, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Đi muộn / Trễ', bold: true, color: 'FFFFFF', font: THEME.font })] })] }),
              new TableCell({ shading: { fill: THEME.primary, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tỷ lệ chuyên cần', bold: true, color: 'FFFFFF', font: THEME.font })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${attendanceStats?.totalDays || 44} ngày`, font: THEME.font })] })] }),
              new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${attendanceStats?.presentCount || 44} ngày`, font: THEME.font })] })] }),
              new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${attendanceStats?.lateCount || 0} lần`, font: THEME.font })] })] }),
              new TableCell({ margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${attendanceStats?.attendanceRate || 100}%`, bold: true, color: '0D5C3A', font: THEME.font })] })] }),
            ]
          }),
        ]
      });

      const section2 = createSectionHeading('II. NHẬN XÉT CỦA GIÁO VIÊN CHỦ NHIỆM');

      const teacherComment = new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 100, after: 150, line: 320 },
        indent: { firstLine: 480 },
        children: [
          new TextRun({
            text: 'Em có thái độ học tập và rèn luyện tích cực, chấp hành tốt các nội quy của nhà trường và lớp. Kính mong Quý Cha Mẹ học sinh tiếp tục phối hợp, đôn đốc và nhắc nhở em giữ vững nề nếp trong thời gian tới.',
            size: 22,
            font: THEME.font,
            color: THEME.textDark,
          })
        ]
      });

      doc = new Document({
        sections: [{
          properties: STANDARD_PAGE_PROPERTIES,
          footers: { default: createStandardFooter('Phiếu Báo Rèn Luyện') },
          children: [
            createAdministrativeHeader(),
            mainTitleParagraph,
            studentInfoBox,
            section1,
            attendanceTable,
            section2,
            teacherComment,
            new Paragraph({ spacing: { before: 360 } }),
            createStandardSignature(teacherName, 'TP. Hồ Chí Minh, ngày ...... tháng ...... năm 2026', 'Ý KIẾN CỦA PHỤ HUYNH', 'GIÁO VIÊN CHỦ NHIỆM'),
          ]
        }]
      });

    // ─────────────────────────────────────────────────────────────
    // TEMPLATE 4: BIÊN BẢN GHI NHẬN SỰ VIỆC & CAM KẾT (INCIDENT)
    // ─────────────────────────────────────────────────────────────
    } else if (templateId === 'template_incident') {
      const studentName = student?.full_name || student?.name || 'Học sinh';

      const mainTitleParagraph = new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 280, after: 120 },
        children: [
          new TextRun({ text: 'BIÊN BẢN GHI NHẬN SỰ VIỆC & CAM KẾT RÈN LUYỆN', bold: true, size: 28, font: THEME.font, color: 'B91C1C' }),
          new TextRun({ text: `LỚP: ${className.toUpperCase()}  —  NGÀY LẬP: ${event?.date || '2026-08-20'}`, bold: true, size: 22, font: THEME.font, color: THEME.secondary, break: 1 }),
        ]
      });

      const incidentBox = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: THEME.borderColor },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: THEME.borderColor },
          right: { style: BorderStyle.SINGLE, size: 4, color: THEME.borderColor },
          left: { style: BorderStyle.SINGLE, size: 24, color: 'B91C1C' },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                shading: { fill: 'FEF2F2', type: ShadingType.CLEAR },
                margins: { top: 120, bottom: 120, left: 180, right: 180 },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: '1. Giáo viên chủ nhiệm: ', bold: true, size: 22, font: THEME.font, color: THEME.primary }),
                      new TextRun({ text: `${teacherName}`, font: THEME.font, break: 1 }),
                      new TextRun({ text: '2. Học sinh liên quan: ', bold: true, size: 22, font: THEME.font, color: THEME.primary }),
                      new TextRun({ text: `${studentName} (Mã HS: ${student?.code || ''})`, bold: true, font: THEME.font, break: 1 }),
                      new TextRun({ text: '3. Nội dung sự việc: ', bold: true, size: 22, font: THEME.font, color: THEME.primary }),
                      new TextRun({ text: `${event?.category || 'Ghi nhận sự việc'} — ${event?.description || 'Vi phạm nội quy học đường'}`, font: THEME.font, break: 1 }),
                      new TextRun({ text: '4. Biện pháp xử lý & Định hướng: ', bold: true, size: 22, font: THEME.font, color: THEME.primary }),
                      new TextRun({ text: `${event?.action_taken || 'Giáo viên đã trao đổi, nhắc nhở và hướng dẫn học sinh khắc phục khuyết điểm.'}`, font: THEME.font }),
                    ]
                  })
                ]
              })
            ]
          })
        ]
      });

      const sectionCamKet = createSectionHeading('Ý KIẾN & CAM KẾT CỦA HỌC SINH');
      const pCamKet = new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 100, after: 150, line: 320 },
        indent: { firstLine: 480 },
        children: [
          new TextRun({
            text: 'Em xin nhận khuyết điểm và thành thật xin lỗi Thầy/Cô. Em xin cam kết chấp hành nghiêm túc nội quy nhà trường, tích cực sửa chữa và không tái phạm.',
            italics: true,
            size: 22,
            font: THEME.font,
            color: THEME.textDark,
          })
        ]
      });

      doc = new Document({
        sections: [{
          properties: STANDARD_PAGE_PROPERTIES,
          footers: { default: createStandardFooter('Biên Bản Ghi Nhận Sự Việc') },
          children: [
            createAdministrativeHeader(),
            mainTitleParagraph,
            incidentBox,
            sectionCamKet,
            pCamKet,
            new Paragraph({ spacing: { before: 360 } }),
            createStandardSignature(teacherName, 'TP. Hồ Chí Minh, ngày ...... tháng ...... năm 2026', 'CHỮ KÝ HỌC SINH', 'GIÁO VIÊN CHỦ NHIỆM'),
          ]
        }]
      });

    // ─────────────────────────────────────────────────────────────
    // TEMPLATE 5: BIÊN BẢN HỌP CHA MẸ HỌC SINH (PARENT MEETING)
    // ─────────────────────────────────────────────────────────────
    } else {
      const mainTitleParagraph = new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 280, after: 120 },
        children: [
          new TextRun({ text: 'BIÊN BẢN HỌP CHA MẸ HỌC SINH', bold: true, size: 28, font: THEME.font, color: THEME.primary }),
          new TextRun({ text: `LỚP: ${className.toUpperCase()}  —  NĂM HỌC: ${academicYear}`, bold: true, size: 22, font: THEME.font, color: THEME.secondary, break: 1 }),
        ]
      });

      const meetingInfoBox = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: THEME.borderColor },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: THEME.borderColor },
          right: { style: BorderStyle.SINGLE, size: 4, color: THEME.borderColor },
          left: { style: BorderStyle.SINGLE, size: 24, color: THEME.primary },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                shading: { fill: THEME.accentBg, type: ShadingType.CLEAR },
                margins: { top: 120, bottom: 120, left: 180, right: 180 },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: '1. Thời gian & Địa điểm: ', bold: true, size: 22, font: THEME.font, color: THEME.primary }),
                      new TextRun({ text: `Phòng học lớp ${className}, Trường THCS Trần Bội Cơ`, font: THEME.font, break: 1 }),
                      new TextRun({ text: '2. Chủ trì cuộc họp: ', bold: true, size: 22, font: THEME.font, color: THEME.primary }),
                      new TextRun({ text: `${teacherName} (Giáo viên chủ nhiệm)`, font: THEME.font, break: 1 }),
                      new TextRun({ text: '3. Thành phần tham dự: ', bold: true, size: 22, font: THEME.font, color: THEME.primary }),
                      new TextRun({ text: `Toàn thể Quý Cha Mẹ học sinh lớp ${className} (${students.length}/${students.length} phụ huynh tham dự)`, font: THEME.font }),
                    ]
                  })
                ]
              })
            ]
          })
        ]
      });

      const sectionAgenda = createSectionHeading('NỘI DUNG CUỘC HỌP');
      const pAgenda1 = new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 80, after: 80, line: 300 },
        indent: { firstLine: 480 },
        children: [
          new TextRun({ text: '1. Báo cáo tình hình học tập và nề nếp rèn luyện: ', bold: true, font: THEME.font, color: THEME.primary }),
          new TextRun({ text: 'GVCN thông qua tình hình học tập, chuyên cần, kỷ luật của học sinh trong thời gian qua và phương hướng trọng tâm thời gian tới.', font: THEME.font })
        ]
      });

      const pAgenda2 = new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 80, after: 80, line: 300 },
        indent: { firstLine: 480 },
        children: [
          new TextRun({ text: '2. Ý kiến đóng góp của Phụ huynh: ', bold: true, font: THEME.font, color: THEME.primary }),
          new TextRun({ text: 'Tập thể Quý Cha Mẹ học sinh nhất trí 100% với các kế hoạch giáo dục và biểu quyết thông qua các chỉ tiêu phấn đấu của lớp.', font: THEME.font })
        ]
      });

      doc = new Document({
        sections: [{
          properties: STANDARD_PAGE_PROPERTIES,
          footers: { default: createStandardFooter('Biên Bản Họp Phụ Huynh') },
          children: [
            createAdministrativeHeader(),
            mainTitleParagraph,
            meetingInfoBox,
            sectionAgenda,
            pAgenda1,
            pAgenda2,
            new Paragraph({ spacing: { before: 360 } }),
            createStandardSignature(teacherName, 'TP. Hồ Chí Minh, ngày ...... tháng ...... năm 2026', 'THƯ KÝ CUỘC HỌP', 'CHỦ TỌA (GVCN)'),
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
