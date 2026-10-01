/**
 * Composite Activity Consolidated Export Service
 * Xuất file Excel (.xlsx) chuẩn biểu mẫu Bộ GD&ĐT cho các Hoạt động nhiều cột
 */

import { Class, Student, Column } from '@/types/models';
import { formatStudentCode } from '@/lib/utils';

export interface ExportMatrixOptions {
    classInfo: Partial<Class> & { id: string; name: string };
    students: Student[];
    activities: Column[]; // Cột cha, mỗi cột có .children là danh sách cột con được chọn xuất
    records: Record<string, Record<string, { value: unknown; note?: string }>>; // [studentCode][childColId]
    markSymbol?: '✓' | 'X';
    schoolName?: string;
    academicYear?: string;
    customTitle?: string;
}

/**
 * Excel Formula Injection mitigation (C20): prepend single quote if text starts with =, +, -, @, tab, or CR
 */
export function sanitizeExcelCellValue(val: unknown): string {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (/^[=+\-@\t\r]/.test(str)) {
        return `'${str}`;
    }
    return str;
}

export async function exportCompositeMatrixToExcel(options: ExportMatrixOptions): Promise<void> {
    const {
        classInfo,
        students,
        activities,
        records,
        markSymbol = '✓',
        schoolName = 'TRƯỜNG THCS ...',
        academicYear = classInfo.academicYear || '2026-2027',
        customTitle = 'BẢNG TỔNG HỢP DANH SÁCH ĐĂNG KÝ CÁC HOẠT ĐỘNG',
    } = options;

    const ExcelJSModule = await import('exceljs');
    const ExcelJS = (ExcelJSModule as any).default || ExcelJSModule;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hệ thống Quản lý Điểm danh';
    workbook.created = new Date();

    const sheetName = `HoatDong_${classInfo.name}`.slice(0, 31);
    const worksheet = workbook.addWorksheet(sheetName, {
        pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });

    // 1. Lọc các cột con thực sự được xuất
    const validActivities = activities.filter(act => act.children && act.children.length > 0);
    const totalChildColumns = validActivities.reduce((sum, act) => sum + (act.children?.length || 0), 0);
    const baseColsCount = 5; // STT, Mã định danh, Họ và tên, Giới tính, Ngày sinh
    const totalColumns = baseColsCount + Math.max(1, totalChildColumns);

    // Font & Styling chuẩn
    const fontTitle: Partial<any> = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF1E293B' } };
    const fontHeader: Partial<any> = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    const fontData: Partial<any> = { name: 'Times New Roman', size: 11, color: { argb: 'FF1E293B' } };
    const fontSubHeader: Partial<any> = { name: 'Times New Roman', size: 10, italic: true, color: { argb: 'FF475569' } };

    const borderThin: Partial<any> = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };

    const fillParentHeader: Partial<any> = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0F2FE' } // Sky blue nhạt sang trọng
    };

    const fillChildHeader: Partial<any> = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' } // Slate gray nhạt
    };

    const fillBaseHeader: Partial<any> = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' } // Slate 200
    };

    // 2. Tiêu đề hành chính (Header Lines)
    worksheet.mergeCells('A1:C1');
    worksheet.getCell('A1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
    worksheet.getCell('A1').font = { name: 'Times New Roman', size: 11, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:C2');
    worksheet.getCell('A2').value = 'Độc lập - Tự do - Hạnh phúc';
    worksheet.getCell('A2').font = { name: 'Times New Roman', size: 11, italic: true };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    // Tên trường & Tên lớp
    worksheet.getCell('A4').value = `TRƯỜNG: ${schoolName.toUpperCase()}`;
    worksheet.getCell('A4').font = { name: 'Times New Roman', size: 11, bold: true };

    worksheet.getCell('A5').value = `LỚP: ${classInfo.name}   |   NĂM HỌC: ${academicYear}`;
    worksheet.getCell('A5').font = { name: 'Times New Roman', size: 11, bold: true };

    // Tiêu đề báo cáo
    const endColLetter = worksheet.getColumn(totalColumns).letter;
    worksheet.mergeCells(`A7:${endColLetter}7`);
    const titleCell = worksheet.getCell('A7');
    titleCell.value = customTitle.toUpperCase();
    titleCell.font = fontTitle;
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(7).height = 28;

    // 3. Xây dựng Bảng Header 2 Tầng (Row 9: Parent, Row 10: Children)
    const rowParentIdx = 9;
    const rowChildIdx = 10;
    worksheet.getRow(rowParentIdx).height = 26;
    worksheet.getRow(rowChildIdx).height = 24;

    // 3.1. Các cột thông tin học sinh (Merged 2 dòng A9:A10, B9:B10, ...)
    const baseHeaders = [
        { col: 1, label: 'STT', width: 6 },
        { col: 2, label: 'Mã định danh', width: 14 },
        { col: 3, label: 'Họ và tên học sinh', width: 26 },
        { col: 4, label: 'Giới tính', width: 10 },
        { col: 5, label: 'Ngày sinh', width: 13 },
    ];

    baseHeaders.forEach(bh => {
        worksheet.mergeCells(rowParentIdx, bh.col, rowChildIdx, bh.col);
        const cell = worksheet.getCell(rowParentIdx, bh.col);
        cell.value = bh.label;
        cell.font = fontHeader;
        cell.fill = fillBaseHeader;
        cell.border = borderThin;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        worksheet.getColumn(bh.col).width = bh.width;
    });

    // 3.2. Render các Cột Hoạt Động Cha & Con
    let currentColIdx = baseColsCount + 1;
    const childColMapping: { colIdx: number; childId: string; parentId: string; isNote: boolean; colName: string }[] = [];

    validActivities.forEach(act => {
        const children = act.children || [];
        const startCol = currentColIdx;
        const endCol = startCol + children.length - 1;

        // Merge ô Header Cha
        if (children.length > 1) {
            worksheet.mergeCells(rowParentIdx, startCol, rowParentIdx, endCol);
        }
        const parentCell = worksheet.getCell(rowParentIdx, startCol);
        parentCell.value = act.name.toUpperCase();
        parentCell.font = fontHeader;
        parentCell.fill = fillParentHeader;
        parentCell.border = borderThin;
        parentCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // Render từng cột con ở Row 10
        children.forEach((child, cIdx) => {
            const childColNum = startCol + cIdx;
            const childCell = worksheet.getCell(rowChildIdx, childColNum);
            childCell.value = child.name;
            childCell.font = fontHeader;
            childCell.fill = fillChildHeader;
            childCell.border = borderThin;
            childCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

            const isNote = child.displayConfig?.isNotesColumn || child.activityConfig?.inputMode === 'inline_text';
            worksheet.getColumn(childColNum).width = isNote ? 22 : 14;

            childColMapping.push({
                colIdx: childColNum,
                childId: child.id,
                parentId: act.id,
                isNote: !!isNote,
                colName: child.name || '',
            });
        });

        currentColIdx = endCol + 1;
    });

    // 4. Render Dòng Dữ Liệu Học Sinh (Rows 11+)
    let currentRowIdx = 11;
    const totalsPerCol: Record<number, number> = {};
    childColMapping.forEach(m => totalsPerCol[m.colIdx] = 0);

    students.forEach((stud, sIdx) => {
        const studentRow = worksheet.getRow(currentRowIdx);
        studentRow.height = 20;

        // Dữ liệu học sinh cơ bản
        studentRow.getCell(1).value = sIdx + 1;
        studentRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

        studentRow.getCell(2).value = formatStudentCode(stud.code);
        studentRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

        // Tên học sinh hiển thị hậu tố (nếu có)
        const displayName = stud.fullName || '';
        studentRow.getCell(3).value = displayName;
        studentRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };

        studentRow.getCell(4).value = stud.gender || '';
        studentRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

        studentRow.getCell(5).value = stud.birthday || '';
        studentRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

        for (let col = 1; col <= baseColsCount; col++) {
            studentRow.getCell(col).font = fontData;
            studentRow.getCell(col).border = borderThin;
        }

        // Điền dữ liệu hoạt động cho từng cột con
        childColMapping.forEach(mapping => {
            const cell = studentRow.getCell(mapping.colIdx);
            const studentCode = stud.code || stud.id;
            const rec = records[studentCode]?.[mapping.childId];

            if (mapping.isNote) {
                // Cột ghi chú - triệt tiêu triệt để Excel formula injection (C20)
                const rawNote = rec?.value !== undefined && rec?.value !== null ? rec.value : (rec?.note || '');
                cell.value = sanitizeExcelCellValue(rawNote);
                cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
            } else {
                const val = rec?.value;
                if (val === true || val === 'X' || val === 'x' || val === 'Có' || val === 1) {
                    cell.value = markSymbol;
                    cell.font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FF16A34A' } }; // Green
                    totalsPerCol[mapping.colIdx] = (totalsPerCol[mapping.colIdx] || 0) + 1;
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                } else if (val === false) {
                    cell.value = '';
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                } else if (val !== undefined && val !== null && String(val).trim() !== '') {
                    const strVal = String(val).trim();
                    const isAmount = mapping.colName.toLowerCase().includes('tiền') || mapping.colName.toLowerCase().includes('phí');
                    const cleanDigits = strVal.replace(/[^\d]/g, '');

                    // Nếu là số / số tiền: Lưu kiểu NUMBER thực tế để Excel tính tổng tự động
                    if (cleanDigits && (isAmount || /^\d{1,3}(\.\d{3})+$/.test(strVal) || /^\d+$/.test(strVal))) {
                        let num = parseInt(cleanDigits, 10);
                        if (num <= 500 && isAmount) num = num * 1000;
                        cell.value = num; // Number type
                        cell.numFmt = '#,##0'; // Excel number format
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                        totalsPerCol[mapping.colIdx] = (totalsPerCol[mapping.colIdx] || 0) + num;
                    } else {
                        cell.value = sanitizeExcelCellValue(strVal);
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                } else {
                    // Không điền thì để trống!
                    cell.value = '';
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }
            }

            if (!cell.font) cell.font = fontData;
            cell.border = borderThin;
        });

        currentRowIdx++;
    });

    // 5. Dòng Tổng Kết Sĩ Số Tham Gia (Totals Row)
    const totalsRow = worksheet.getRow(currentRowIdx);
    totalsRow.height = 22;
    worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, baseColsCount);
    const totalsTitleCell = totalsRow.getCell(1);
    totalsTitleCell.value = 'TỔNG SỐ HỌC SINH THAM GIA';
    totalsTitleCell.font = fontHeader;
    totalsTitleCell.fill = fillBaseHeader;
    totalsTitleCell.alignment = { horizontal: 'right', vertical: 'middle' };

    for (let c = 1; c <= baseColsCount; c++) {
        totalsRow.getCell(c).border = borderThin;
    }

    childColMapping.forEach(mapping => {
        const cell = totalsRow.getCell(mapping.colIdx);
        cell.border = borderThin;
        cell.fill = fillChildHeader;
        cell.font = fontHeader;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };

        if (!mapping.isNote) {
            const sumVal = totalsPerCol[mapping.colIdx] || 0;
            cell.value = sumVal;
            const isAmount = mapping.colName.toLowerCase().includes('tiền') || mapping.colName.toLowerCase().includes('phí');
            if (isAmount) {
                cell.numFmt = '#,##0';
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
            } else {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
        } else {
            cell.value = '-';
        }
    });

    currentRowIdx += 2;

    // 6. Khung Chữ Ký Chuẩn Hành Chính
    const sigRowIdx = currentRowIdx;
    const colLeftIdx = 2;
    const colMidIdx = Math.floor(totalColumns / 2);
    const colRightIdx = totalColumns - 1;

    worksheet.getCell(sigRowIdx, colLeftIdx).value = 'NGƯỜI LẬP BẢNG';
    worksheet.getCell(sigRowIdx, colLeftIdx).font = fontHeader;
    worksheet.getCell(sigRowIdx, colLeftIdx).alignment = { horizontal: 'center' };

    worksheet.getCell(sigRowIdx + 1, colLeftIdx).value = '(Ký và ghi rõ họ tên)';
    worksheet.getCell(sigRowIdx + 1, colLeftIdx).font = fontSubHeader;
    worksheet.getCell(sigRowIdx + 1, colLeftIdx).alignment = { horizontal: 'center' };

    worksheet.getCell(sigRowIdx, colMidIdx).value = 'GIÁO VIÊN CHỦ NHIỆM';
    worksheet.getCell(sigRowIdx, colMidIdx).font = fontHeader;
    worksheet.getCell(sigRowIdx, colMidIdx).alignment = { horizontal: 'center' };

    worksheet.getCell(sigRowIdx + 1, colMidIdx).value = '(Ký và ghi rõ họ tên)';
    worksheet.getCell(sigRowIdx + 1, colMidIdx).font = fontSubHeader;
    worksheet.getCell(sigRowIdx + 1, colMidIdx).alignment = { horizontal: 'center' };

    worksheet.getCell(sigRowIdx, colRightIdx).value = 'BAN GIÁM HIỆU DUYỆT';
    worksheet.getCell(sigRowIdx, colRightIdx).font = fontHeader;
    worksheet.getCell(sigRowIdx, colRightIdx).alignment = { horizontal: 'center' };

    worksheet.getCell(sigRowIdx + 1, colRightIdx).value = '(Ký tên và đóng dấu)';
    worksheet.getCell(sigRowIdx + 1, colRightIdx).font = fontSubHeader;
    worksheet.getCell(sigRowIdx + 1, colRightIdx).alignment = { horizontal: 'center' };

    // 7. Tạo Buffer và Download trực tiếp trên Browser
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanDate = new Date().toISOString().slice(0, 10);
    a.download = `DanhSach_HoatDong_${classInfo.name}_${cleanDate}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

export interface ExportBHTNStandardOptions {
    classInfo: Partial<Class> & { id: string; name: string };
    students: Student[];
    activity: Column;
    records: Record<string, Record<string, { value: unknown; note?: string }>>;
    schoolName?: string;
    academicYear?: string;
    unitPrice?: number;
    customTitle?: string;
}

/**
 * Xuất file Excel (.xlsx) MẪU CHUẨN BHTN TRƯỜNG THCS TRẦN BỘI CƠ
 * Giống 100% bản in giấy thực tế (STT, Lớp, Họ tên, Số tiền, Không đăng ký, Đăng ký tham gia, Ký xác nhận tham gia)
 */
export async function exportBHTNStandardExcel(options: ExportBHTNStandardOptions): Promise<void> {
    const {
        classInfo,
        students,
        activity,
        records,
        schoolName = 'TRƯỜNG THCS TRẦN BỘI CƠ',
        academicYear = classInfo.academicYear || '2026-2027',
        unitPrice = 30000,
        customTitle,
    } = options;

    const ExcelJSModule = await import('exceljs');
    const ExcelJS = (ExcelJSModule as any).default || ExcelJSModule;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hệ thống Quản lý Điểm danh';
    workbook.created = new Date();

    const sheetName = `BHTN_${classInfo.name}`.slice(0, 31);
    const worksheet = workbook.addWorksheet(sheetName, {
        pageSetup: { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });

    const fontHeader: Partial<any> = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF000000' } };
    const fontData: Partial<any> = { name: 'Times New Roman', size: 11, color: { argb: 'FF000000' } };
    const fontTitle: Partial<any> = { name: 'Times New Roman', size: 13, bold: true, color: { argb: 'FF000000' } };
    const borderThin: Partial<any> = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
    };

    // Row 1: Tên Trường canh bên trái chuẩn hành chính GDPT
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = schoolName.toUpperCase();
    worksheet.getCell('A1').font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    worksheet.getCell('A1').alignment = { horizontal: 'left', vertical: 'middle' };

    // Row 3: Tiêu đề danh sách
    const finalTitle = customTitle || `DANH SÁCH HỌC SINH ĐĂNG KÝ THAM GIA BHTN NĂM HỌC ${academicYear}`;
    worksheet.mergeCells('A3:H3');
    const titleCell = worksheet.getCell('A3');
    titleCell.value = finalTitle.toUpperCase();
    titleCell.font = { name: 'Times New Roman', size: 13, bold: true, color: { argb: 'FF0F172A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(3).height = 26;

    // Row 5: Header bảng (8 cột chuẩn có Mã HS)
    const headerCols = [
        { label: 'STT', width: 6 },
        { label: 'Mã HS', width: 11 },
        { label: 'Lớp', width: 9 },
        { label: 'Họ tên', width: 25 },
        { label: 'Số tiền', width: 15 },
        { label: 'Không đăng ký', width: 16 },
        { label: 'Đăng ký tham gia', width: 18 },
        { label: 'Ký xác nhận tham gia', width: 22 },
    ];

    const fillHeader = {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FFEBF2FE' }, // Soft clean ice-blue header
    };
    const borderSlate = {
        top: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
        left: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
        right: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
    };

    const rowHeaderIdx = 5;
    worksheet.getRow(rowHeaderIdx).height = 28;
    headerCols.forEach((hc, idx) => {
        const colNum = idx + 1;
        const cell = worksheet.getCell(rowHeaderIdx, colNum);
        cell.value = hc.label;
        cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
        cell.fill = fillHeader;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = borderSlate;
        worksheet.getColumn(colNum).width = hc.width;
    });

    // Detect child columns in activity
    const children = activity.children || [];
    const amountCol = children.find(c => c.name.toLowerCase().includes('tiền'));
    const notRegCol = children.find(c => c.name.toLowerCase().includes('không'));
    const regCol = children.find(c => c.name.toLowerCase().includes('đăng ký') && !c.name.toLowerCase().includes('không'));
    const sigCol = children.find(c => c.name.toLowerCase().includes('ký'));

    let currentRowIdx = 6;
    let totalRegisteredCount = 0;
    let totalCalculatedMoney = 0;

    students.forEach((stud, idx) => {
        const sRow = worksheet.getRow(currentRowIdx);
        sRow.height = 22;
        const studentCode = stud.code || stud.id;

        // 1. STT
        sRow.getCell(1).value = idx + 1;
        sRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

        // 2. Mã HS (chỉ hiển thị các chữ số đuôi chuẩn như toàn bộ hệ thống)
        sRow.getCell(2).value = formatStudentCode(stud.code);
        sRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

        // 3. Lớp
        sRow.getCell(3).value = classInfo.name;
        sRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

        // 4. Họ tên
        sRow.getCell(4).value = stud.fullName;
        sRow.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };

        // 5. Số tiền: Nếu KHÔNG ĐIỀN THÌ ĐỂ TRỐNG (tuyệt đối không tự ý điền 30000)!
        const rawAmount = amountCol ? records[studentCode]?.[amountCol.id]?.value : null;
        const strAmount = (rawAmount !== null && rawAmount !== undefined) ? String(rawAmount).trim() : '';

        if (!strAmount) {
            // Chưa điền hoặc học sinh không đăng ký -> ĐỂ TRỐNG TUYỆT ĐỐI!
            sRow.getCell(5).value = '';
            sRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
        } else if (strAmount.toLowerCase().includes('miễn') || strAmount.toLowerCase() === 'free') {
            sRow.getCell(5).value = 'Miễn';
            sRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
            // Có số tiền -> Định dạng NUMBER thực tế để Excel tự động tính tổng (không bị 'Number Stored as Text')
            const cleanDigits = strAmount.replace(/[^\d]/g, '');
            if (cleanDigits) {
                let numVal = parseInt(cleanDigits, 10);
                if (numVal <= 500) numVal = numVal * 1000;
                sRow.getCell(5).value = numVal; // NUMBER type
                sRow.getCell(5).numFmt = '#,##0'; // Excel number format
                sRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
                totalCalculatedMoney += numVal;
            } else {
                sRow.getCell(5).value = sanitizeExcelCellValue(strAmount);
                sRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
            }
        }

        // 6. Không đăng ký
        const rawNotReg = notRegCol ? records[studentCode]?.[notRegCol.id]?.value : null;
        const isNotReg = rawNotReg === true || rawNotReg === 'X' || rawNotReg === 'x' || rawNotReg === 'Có' || rawNotReg === 1;
        sRow.getCell(6).value = isNotReg ? 'X' : (rawNotReg ? sanitizeExcelCellValue(String(rawNotReg)) : '');
        sRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };

        // 7. Đăng ký tham gia (Dấu X)
        const rawReg = regCol ? records[studentCode]?.[regCol.id]?.value : null;
        const isReg = rawReg === true || rawReg === 'X' || rawReg === 'x' || rawReg === 'Có' || rawReg === 1;
        if (isReg) {
            sRow.getCell(7).value = 'X';
            sRow.getCell(7).font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FF16A34A' } };
            totalRegisteredCount++;
        } else {
            sRow.getCell(7).value = rawReg ? sanitizeExcelCellValue(String(rawReg)) : '';
        }
        sRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

        // 8. Ký xác nhận tham gia
        const rawSig = sigCol ? records[studentCode]?.[sigCol.id]?.value : null;
        sRow.getCell(8).value = sanitizeExcelCellValue(rawSig || '');
        sRow.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

        for (let c = 1; c <= 8; c++) {
            if (!sRow.getCell(c).font) sRow.getCell(c).font = fontData;
            sRow.getCell(c).border = borderSlate;
            if (idx % 2 === 1) {
                sRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            }
        }

        currentRowIdx++;
    });

    // Dưới bảng: Tổng số học sinh tham gia & Thành tiền
    currentRowIdx += 1;
    const totalRow = worksheet.getRow(currentRowIdx);
    totalRow.getCell(1).value = `Tổng số học sinh tham gia :  ${totalRegisteredCount > 0 ? totalRegisteredCount : '..........'}  học sinh`;
    totalRow.getCell(1).font = fontHeader;
    worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, 5);

    currentRowIdx += 1;
    const amountTotalRow = worksheet.getRow(currentRowIdx);
    const finalMoney = totalCalculatedMoney > 0 ? totalCalculatedMoney : (totalRegisteredCount * unitPrice);
    amountTotalRow.getCell(1).value = `Thành tiền :  ${finalMoney > 0 ? new Intl.NumberFormat('vi-VN').format(finalMoney) + ' đ' : '...............................'}`;
    amountTotalRow.getCell(1).font = fontHeader;
    worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, 5);

    // Khối chữ ký
    currentRowIdx += 2;
    const dateRow = worksheet.getRow(currentRowIdx);
    dateRow.getCell(6).value = 'Ngày ..... tháng ..... năm 2026';
    dateRow.getCell(6).font = { name: 'Times New Roman', size: 11, italic: true };
    dateRow.getCell(6).alignment = { horizontal: 'center' };
    worksheet.mergeCells(currentRowIdx, 6, currentRowIdx, 8);

    currentRowIdx += 1;
    const sigTitleRow = worksheet.getRow(currentRowIdx);
    sigTitleRow.getCell(2).value = 'NGƯỜI LẬP BẢNG';
    sigTitleRow.getCell(2).font = fontHeader;
    sigTitleRow.getCell(2).alignment = { horizontal: 'center' };
    worksheet.mergeCells(currentRowIdx, 2, currentRowIdx, 3);

    sigTitleRow.getCell(6).value = 'GIÁO VIÊN CHỦ NHIỆM';
    sigTitleRow.getCell(6).font = fontHeader;
    sigTitleRow.getCell(6).alignment = { horizontal: 'center' };
    worksheet.mergeCells(currentRowIdx, 6, currentRowIdx, 8);

    currentRowIdx += 1;
    const sigSubRow = worksheet.getRow(currentRowIdx);
    sigSubRow.getCell(2).value = '(Ký và ghi rõ họ tên)';
    sigSubRow.getCell(2).font = { name: 'Times New Roman', size: 10, italic: true };
    sigSubRow.getCell(2).alignment = { horizontal: 'center' };
    worksheet.mergeCells(currentRowIdx, 2, currentRowIdx, 3);

    sigSubRow.getCell(6).value = '(Ký và ghi rõ họ tên)';
    sigSubRow.getCell(6).font = { name: 'Times New Roman', size: 10, italic: true };
    sigSubRow.getCell(6).alignment = { horizontal: 'center' };
    worksheet.mergeCells(currentRowIdx, 6, currentRowIdx, 8);

    // Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DanhSach_BHTN_${classInfo.name}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}
