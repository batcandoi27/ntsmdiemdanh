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
  ShadingType,
  Footer,
  Packer
} from 'docx';
import { StudentCurriculumVitaeProfileData } from '@/types/student-cv';

const THEME = {
  font: 'Times New Roman',
  fontSizePt13: 26,       // 13pt
  fontSizeTitle: 34,      // 17pt
  primary: '1B365D',      // Xanh Navy Hoàng Gia Đậm
  primaryLight: '2563EB', // Xanh Dương Sáng
  accentBg: 'F0F4F8',     // Nền Xanh Nhạt Cho Bảng
  borderColor: '2563EB',  // Viền Xanh Dương
  borderMuted: '93C5FD',  // Viền Xanh Nhạt
  textDark: '1E293B',     // Màu chữ dữ liệu đen than
  textMuted: '64748B',    // Màu chữ phụ
  white: 'FFFFFF',
};

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
};

const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 6, color: THEME.borderColor },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: THEME.borderColor },
  left: { style: BorderStyle.SINGLE, size: 6, color: THEME.borderColor },
  right: { style: BorderStyle.SINGLE, size: 6, color: THEME.borderColor },
};

const CELL_BORDER_THIN = {
  top: { style: BorderStyle.SINGLE, size: 4, color: THEME.borderMuted },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: THEME.borderMuted },
  left: { style: BorderStyle.SINGLE, size: 4, color: THEME.borderMuted },
  right: { style: BorderStyle.SINGLE, size: 4, color: THEME.borderMuted },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      schoolName = 'TRƯỜNG THCS TRẦN BỘI CƠ',
      className = '8A13',
      schoolYear = '2026- 2027',
      teacherName = 'Giáo viên chủ nhiệm',
      stt = '01',
      profile = {}
    } = body;

    const data: Partial<StudentCurriculumVitaeProfileData> = profile;

    const p = (text: string, options: any = {}) =>
      new Paragraph({
        spacing: { before: options.before || 30, after: options.after || 30, line: 240 },
        alignment: options.align || AlignmentType.LEFT,
        children: options.children || [
          new TextRun({
            text,
            font: THEME.font,
            size: options.size || THEME.fontSizePt13,
            bold: options.bold,
            italics: options.italics,
            color: options.color || THEME.textDark
          })
        ]
      });

    const rowDots = (label: string, value?: string, extraLabel = '', extraValue?: string, extraLabel2 = '', extraValue2?: string) => {
      let dot1 = '...................................................';
      let dot2 = '................................';
      let dot3 = '....................';

      if (extraLabel && extraLabel2) {
        // Dòng 3 cột: chia ngắn đều để không rớt dòng
        dot1 = '..............';
        dot2 = '..............';
        dot3 = '..............';
      } else if (extraLabel) {
        // Dòng 2 cột: căn chỉnh vừa vặn font 13pt
        dot1 = '..............................';
        dot2 = '..............................';
      } else {
        // Dòng 1 cột dài toàn trang
        dot1 = '....................................................................................';
      }

      const runs = [
        new TextRun({ text: label, font: THEME.font, size: THEME.fontSizePt13, bold: true, color: THEME.primary }),
        new TextRun({ text: ` ${value || dot1}`, font: THEME.font, size: THEME.fontSizePt13, color: value ? THEME.textDark : THEME.textMuted, italics: !value }),
      ];
      if (extraLabel) {
        runs.push(new TextRun({ text: `   ${extraLabel}`, font: THEME.font, size: THEME.fontSizePt13, bold: true, color: THEME.primary }));
        runs.push(new TextRun({ text: ` ${extraValue || dot2}`, font: THEME.font, size: THEME.fontSizePt13, color: extraValue ? THEME.textDark : THEME.textMuted, italics: !extraValue }));
      }
      if (extraLabel2) {
        runs.push(new TextRun({ text: `   ${extraLabel2}`, font: THEME.font, size: THEME.fontSizePt13, bold: true, color: THEME.primary }));
        runs.push(new TextRun({ text: ` ${extraValue2 || dot3}`, font: THEME.font, size: THEME.fontSizePt13, color: extraValue2 ? THEME.textDark : THEME.textMuted, italics: !extraValue2 }));
      }
      return new Paragraph({ spacing: { before: 18, after: 18, line: 240 }, children: runs });
    };

    // Header Table
    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              borders: NO_BORDERS,
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: [
                    new TextRun({ text: schoolName, bold: true, size: 24, font: THEME.font, color: THEME.primary }),
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 60, after: 30 },
                  children: [
                    new TextRun({ text: 'SƠ YẾU LÝ LỊCH HỌC SINH', bold: true, size: THEME.fontSizeTitle, font: THEME.font, color: THEME.primary }),
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: 'Lớp: ', bold: true, size: THEME.fontSizePt13, font: THEME.font, color: THEME.primary }),
                    new TextRun({ text: `${className}          `, bold: true, size: THEME.fontSizePt13, font: THEME.font, color: THEME.primaryLight }),
                    new TextRun({ text: 'NH: ', bold: true, size: THEME.fontSizePt13, font: THEME.font, color: THEME.primary }),
                    new TextRun({ text: schoolYear, bold: true, size: THEME.fontSizePt13, font: THEME.font, color: THEME.textDark }),
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  spacing: { before: 30 },
                  children: [
                    new TextRun({ text: 'GVCN: ', bold: true, size: THEME.fontSizePt13, font: THEME.font, color: THEME.primary }),
                    new TextRun({ text: teacherName, size: THEME.fontSizePt13, font: THEME.font, color: THEME.textDark }),
                  ]
                }),
              ]
            }),
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              borders: NO_BORDERS,
              children: [
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  borders: NO_BORDERS,
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          width: { size: 45, type: WidthType.PERCENTAGE },
                          borders: CELL_BORDER_THIN,
                          shading: { fill: THEME.accentBg, type: ShadingType.CLEAR },
                          children: [
                            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'STT', bold: true, size: 18, font: THEME.font, color: THEME.primary })] }),
                            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(stt), bold: true, size: 26, font: THEME.font, color: 'DC2626' })] }),
                          ]
                        }),
                        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, borders: NO_BORDERS, children: [new Paragraph({ text: '' })] }),
                        new TableCell({
                          width: { size: 45, type: WidthType.PERCENTAGE },
                          borders: CELL_BORDER_THIN,
                          children: [
                            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: 'Ảnh\n3x4', size: 18, font: THEME.font, color: THEME.textMuted })] }),
                          ]
                        }),
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

    // Sibling Table
    const siblings = data.siblings || [];
    const siblingRows = [0, 1, 2, 3, 4].map(idx => {
      const s = siblings[idx];
      return new TableRow({
        children: [
          new TableCell({ borders: CELL_BORDER_THIN, shading: { fill: idx % 2 === 1 ? THEME.accentBg : THEME.white, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${idx + 1}/`, font: THEME.font, size: THEME.fontSizePt13, bold: true, color: THEME.primary })] })] }),
          new TableCell({ borders: CELL_BORDER_THIN, shading: { fill: idx % 2 === 1 ? THEME.accentBg : THEME.white, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: s?.full_name || '...........................................................', font: THEME.font, size: THEME.fontSizePt13, color: s?.full_name ? THEME.textDark : THEME.textMuted })] })] }),
          new TableCell({ borders: CELL_BORDER_THIN, shading: { fill: idx % 2 === 1 ? THEME.accentBg : THEME.white, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s?.birth_year || '...........', font: THEME.font, size: THEME.fontSizePt13, color: s?.birth_year ? THEME.textDark : THEME.textMuted })] })] }),
          new TableCell({ borders: CELL_BORDER_THIN, shading: { fill: idx % 2 === 1 ? THEME.accentBg : THEME.white, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: s?.job_or_school || '..........................................', font: THEME.font, size: THEME.fontSizePt13, color: s?.job_or_school ? THEME.textDark : THEME.textMuted })] })] }),
        ]
      });
    });

    const siblingTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          children: [
            new TableCell({ borders: CELL_BORDER_THIN, shading: { fill: THEME.primary, type: ShadingType.CLEAR }, width: { size: 8, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'STT', bold: true, font: THEME.font, size: THEME.fontSizePt13, color: THEME.white })] })] }),
            new TableCell({ borders: CELL_BORDER_THIN, shading: { fill: THEME.primary, type: ShadingType.CLEAR }, width: { size: 42, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Họ và tên anh, chị, em ruột', bold: true, font: THEME.font, size: THEME.fontSizePt13, color: THEME.white })] })] }),
            new TableCell({ borders: CELL_BORDER_THIN, shading: { fill: THEME.primary, type: ShadingType.CLEAR }, width: { size: 18, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Năm sinh', bold: true, font: THEME.font, size: THEME.fontSizePt13, color: THEME.white })] })] }),
            new TableCell({ borders: CELL_BORDER_THIN, shading: { fill: THEME.primary, type: ShadingType.CLEAR }, width: { size: 32, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Nghề nghiệp / Trường lớp', bold: true, font: THEME.font, size: THEME.fontSizePt13, color: THEME.white })] })] }),
          ]
        }),
        ...siblingRows
      ]
    });

    // Signature Table
    const signatureTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          children: [
            new TableCell({ borders: CELL_BORDER_THIN, width: { size: 33.3, type: WidthType.PERCENTAGE }, children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CHA', bold: true, font: THEME.font, size: THEME.fontSizePt13, color: THEME.primary })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký và ghi rõ họ tên)', italics: true, font: THEME.font, size: 20, color: THEME.textMuted })] }),
              new Paragraph({ spacing: { before: 500 } }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: data.father?.full_name || '', bold: true, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark })] }),
            ] }),
            new TableCell({ borders: CELL_BORDER_THIN, width: { size: 33.3, type: WidthType.PERCENTAGE }, children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MẸ', bold: true, font: THEME.font, size: THEME.fontSizePt13, color: THEME.primary })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký và ghi rõ họ tên)', italics: true, font: THEME.font, size: 20, color: THEME.textMuted })] }),
              new Paragraph({ spacing: { before: 500 } }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: data.mother?.full_name || '', bold: true, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark })] }),
            ] }),
            new TableCell({ borders: CELL_BORDER_THIN, width: { size: 33.4, type: WidthType.PERCENTAGE }, children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Người giám hộ', bold: true, font: THEME.font, size: THEME.fontSizePt13, color: THEME.primary })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Ký và ghi rõ họ tên)', italics: true, font: THEME.font, size: 20, color: THEME.textMuted })] }),
              new Paragraph({ spacing: { before: 500 } }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: data.guardian?.full_name || '(Nếu có)', font: THEME.font, size: 20, italics: true, color: THEME.textMuted })] }),
            ] }),
          ]
        })
      ]
    });

    const doc = new Document({
      sections: [
        // TRANG 1
        {
          properties: { page: { margin: { top: 600, bottom: 600, left: 1440, right: 600 } } },
          footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Sơ yếu lý lịch học sinh — Trang 1 / 2', font: THEME.font, size: 18, italics: true, color: THEME.textMuted })] })] }) },
          children: [
            headerTable,
            new Paragraph({
              spacing: { before: 60, after: 30 },
              children: [
                new TextRun({ text: 'I.  BẢN THÂN:', bold: true, font: THEME.font, size: 26, color: THEME.primary }),
                new TextRun({ text: ' (Khai khớp với giấy khai sinh và CCCD) (Địa chỉ ghi theo đơn vị hành chính mới)', italics: true, font: THEME.font, size: 20, color: THEME.textMuted })
              ]
            }),
            rowDots('1. Họ tên HS (ghi chữ IN HOA):', data.full_name_upper, 'Nam/Nữ:', data.gender),
            rowDots('2. Ngày sinh:', `${data.birth_day || '...'} tháng ${data.birth_month || '...'} năm ${data.birth_year || '.....'}`, 'Là con thứ:', data.birth_order),
            rowDots('3. Dân tộc:', data.ethnicity, 'Quốc tịch:', data.nationality, 'Tôn giáo:', data.religion),
            rowDots('4. Số CCCD:', data.citizen_id, 'Ngày cấp:', data.citizen_id_issue_date, 'Nơi cấp:', data.citizen_id_issue_place),
            rowDots('    Mã số định danh cá nhân (nếu chưa có CCCD):', data.personal_id_code),
            rowDots('5. Nơi sinh: Phải chi tiết (Ghi rõ tên bệnh viện, trạm y tế):', data.birth_place_hospital),
            rowDots('    Xã/Phường:', data.birth_place_ward, 'Tỉnh/TP:', data.birth_place_province),
            rowDots('6. Nơi đăng kí khai sinh:', '', 'Xã/Phường:', data.birth_register_ward, 'Tỉnh/TP:', data.birth_register_province),
            rowDots('7. Quê quán: Phải chi tiết (Tổ/Thôn/Xóm/Khu phố):', data.hometown?.street_address),
            rowDots('    Xã/Phường:', data.hometown?.ward_name, 'Tỉnh/TP:', data.hometown?.province_name),
            rowDots('8. Nơi thường trú: (Số nhà + đường):', data.permanent_residence?.street_address),
            rowDots('9. Chỗ ở hiện nay: (Số nhà + đường):', data.current_residence?.street_address),
            
            p('10. Học sinh thuộc diện (nếu có đánh dấu X):', { bold: true, size: THEME.fontSizePt13, color: THEME.primary, before: 25, after: 15 }),
            new Paragraph({
              spacing: { before: 15, after: 15 },
              children: [
                new TextRun({ text: `    ${data.policy_category?.is_wounded_soldier ? '☑' : '☐'} Con thương binh          `, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark }),
                new TextRun({ text: `${data.policy_category?.is_martyr_child ? '☑' : '☐'} Con liệt sĩ`, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark }),
              ]
            }),
            new Paragraph({
              spacing: { before: 15, after: 15 },
              children: [
                new TextRun({ text: `    ${data.policy_category?.is_poor_household ? '☑' : '☐'} Hộ nghèo, cận nghèo (mã số: ${data.policy_category?.poor_household_code || '.....'})       `, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark }),
                new TextRun({ text: `${data.policy_category?.is_orphan ? '☑' : '☐'} Con mồ côi cả cha lẫn mẹ`, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark }),
              ]
            }),
            rowDots(`    ${data.policy_category?.other_policy ? '☑' : '☐'} Khác:`, data.policy_category?.other_policy),

            rowDots('11. Hiện đang ở với ai:', data.living_with),
            rowDots('12. Người trực tiếp quản lý HS:', data.direct_guardian?.full_name, 'Mối quan hệ:', data.direct_guardian?.relationship, 'Số ĐT:', data.direct_guardian?.phone),
            rowDots('13. Sở thích, năng khiếu:', data.hobbies_and_talents),
            rowDots('14. Vấn đề sức khỏe cần lưu ý (nếu có cần ghi rõ):', data.health_notes),
            rowDots('15. Có giữ chức vụ gì trong lớp hoặc trong chi đội:', data.class_position),
            rowDots('16. Mã số Bảo hiểm Y tế:', data.health_insurance_code, 'Nơi đăng ký KCB:', data.health_insurance_hospital),

            new Paragraph({
              spacing: { before: 50, after: 20 },
              children: [new TextRun({ text: 'II.  GIA ĐÌNH:', bold: true, font: THEME.font, size: 26, color: THEME.primary })]
            }),
            rowDots('1. Họ tên cha: (theo giấy khai sinh)', data.father?.full_name, 'Năm sinh:', data.father?.birth_year),
            rowDots('    Số CCCD:', data.father?.citizen_id, 'Các số ĐT:', data.father?.phone_numbers),
            rowDots('    Nghề nghiệp:', data.father?.job, 'Chức vụ:', data.father?.position),
            rowDots('    Nơi làm việc:', data.father?.workplace),

            rowDots('2. Họ tên mẹ: (theo giấy khai sinh)', data.mother?.full_name, 'Năm sinh:', data.mother?.birth_year),
            rowDots('    Số CCCD:', data.mother?.citizen_id, 'Các số ĐT:', data.mother?.phone_numbers),
            rowDots('    Nghề nghiệp:', data.mother?.job, 'Chức vụ:', data.mother?.position),
            rowDots('    Nơi làm việc:', data.mother?.workplace),
          ]
        },

        // TRANG 2
        {
          properties: { page: { margin: { top: 600, bottom: 600, left: 1440, right: 600 } } },
          footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Sơ yếu lý lịch học sinh — Trang 2 / 2', font: THEME.font, size: 18, italics: true, color: THEME.textMuted })] })] }) },
          children: [
            rowDots('3. Họ tên người giám hộ (nếu có):', data.guardian?.full_name || 'Không có', 'Năm sinh:', data.guardian?.birth_year),
            rowDots('    Số CCCD:', data.guardian?.citizen_id, 'Các số ĐT:', data.guardian?.phone_numbers),
            rowDots('    Nghề nghiệp:', data.guardian?.job, 'Chức vụ:', data.guardian?.position),
            rowDots('    Nơi làm việc:', data.guardian?.workplace),

            p('4. Họ và tên anh, chị, em ruột:', { bold: true, size: THEME.fontSizePt13, color: THEME.primary, before: 50, after: 20 }),
            siblingTable,

            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 100, after: 40 },
              children: [new TextRun({ text: 'PHẦN THAM KHẢO Ý KIẾN PHỤ HUYNH HỌC SINH', bold: true, font: THEME.font, size: 26, color: THEME.primary })]
            }),

            p('1. Đánh dấu [X] vào những ô phù hợp với tính cách của HS:', { bold: true, size: THEME.fontSizePt13, color: THEME.primary, before: 15, after: 15 }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: NO_BORDERS,
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ borders: NO_BORDERS, width: { size: 25, type: WidthType.PERCENTAGE }, children: [
                      new Paragraph({ children: [new TextRun({ text: `${data.personalities?.kien_nhan ? '☑' : '☐'} Kiên nhẫn, chịu khó`, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark })] }),
                      new Paragraph({ children: [new TextRun({ text: `${data.personalities?.le_phep ? '☑' : '☐'} Lễ phép, chừng mực`, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark })] }),
                      new Paragraph({ children: [new TextRun({ text: `${data.personalities?.huong_noi ? '☑' : '☐'} Hướng nội`, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark })] }),
                      new Paragraph({ children: [new TextRun({ text: `${data.personalities?.canh_tranh ? '☑' : '☐'} Cạnh tranh, cầu toàn`, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark })] }),
                    ] }),
                    new TableCell({ borders: NO_BORDERS, width: { size: 25, type: WidthType.PERCENTAGE }, children: [
                      new Paragraph({ children: [new TextRun({ text: `${data.personalities?.hoa_dong ? '☑' : '☐'} Hòa đồng, cởi mở`, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark })] }),
                      new Paragraph({ children: [new TextRun({ text: `${data.personalities?.quan_tam ? '☑' : '☐'} Quan tâm đến người khác`, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark })] }),
                      new Paragraph({ children: [new TextRun({ text: `${data.personalities?.sang_tao ? '☑' : '☐'} Sáng tạo, mơ mộng`, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark })] }),
                      new Paragraph({ children: [new TextRun({ text: `${data.personalities?.noi_loan ? '☑' : '☐'} Nổi loạn, chống đối`, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark })] }),
                    ] }),
                    new TableCell({ borders: NO_BORDERS, width: { size: 25, type: WidthType.PERCENTAGE }, children: [
                      new Paragraph({ children: [new TextRun({ text: `${data.personalities?.nong_tinh ? '☑' : '☐'} Nóng tính`, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark })] }),
                      new Paragraph({ children: [new TextRun({ text: `${data.personalities?.trung_thuc ? '☑' : '☐'} Trung thực`, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark })] }),
                      new Paragraph({ children: [new TextRun({ text: `${data.personalities?.thu_dong ? '☑' : '☐'} Thụ động, thờ ơ`, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark })] }),
                      new Paragraph({ children: [new TextRun({ text: `${data.personalities?.lanh_dao ? '☑' : '☐'} Lãnh đạo, có ảnh hưởng`, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark })] }),
                    ] }),
                    new TableCell({ borders: NO_BORDERS, width: { size: 25, type: WidthType.PERCENTAGE }, children: [
                      new Paragraph({ children: [new TextRun({ text: `${data.personalities?.nhay_cam ? '☑' : '☐'} Nhạy cảm, Rụt rè`, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark })] }),
                      new Paragraph({ children: [new TextRun({ text: `${data.personalities?.huong_ngoai ? '☑' : '☐'} Hướng ngoại`, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark })] }),
                      new Paragraph({ children: [new TextRun({ text: `${data.personalities?.vo_tu ? '☑' : '☐'} Vô tư, hài hước`, font: THEME.font, size: THEME.fontSizePt13, color: THEME.textDark })] }),
                      new Paragraph({ children: [new TextRun({ text: data.personalities?.other_traits ? `☑ Khác: ${data.personalities.other_traits}` : '☐ Khác: ...................', font: THEME.font, size: THEME.fontSizePt13, color: data.personalities?.other_traits ? THEME.textDark : THEME.textMuted })] }),
                    ] }),
                  ]
                })
              ]
            }),

            rowDots('2. Xin cho biết về hoàn cảnh đặc biệt của gia đình có thể ảnh hưởng đến việc học tập của HS:', ''),
            p(`   ${data.special_family_circumstances || 'Gia đình nề nếp, cha mẹ luôn phối hợp cùng nhà trường.'}`, { font: THEME.font, size: THEME.fontSizePt13, italics: true, color: THEME.textDark, before: 10, after: 30 }),

            rowDots('3. Chữ ký mẫu và khi cần sẽ liên lạc với:', data.primary_contact_person === 'father' ? 'Cha' : data.primary_contact_person === 'mother' ? 'Mẹ' : 'Giám hộ'),
            new Paragraph({ spacing: { before: 30, after: 30 } }),
            signatureTable
          ]
        }
      ]
    });

    const buffer = await Packer.toBuffer(doc);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename=so-yeu-ly-lich-${className}-${data.full_name_upper || 'hoc-sinh'}.docx`
      }
    });
  } catch (err: any) {
    console.error('Error exporting student CV docx:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
