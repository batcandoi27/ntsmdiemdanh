import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx'; // Giữ lại nếu cần helper phụ, nhưng logic chính sẽ override.
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

// --- Chrome-compatible download helper ---
function triggerDownload(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.download = filename;
    link.setAttribute('data-downloadurl', `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:${filename}:${url}`);
    document.body.appendChild(link);

    // Dùng MouseEvent thay vì .click() để Chrome nhận diện tốt hơn
    const event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: false
    });
    link.dispatchEvent(event);

    // Dọn dẹp sau 60 giây (đủ thời gian cho Chrome xử lý)
    setTimeout(() => {
        if (document.body.contains(link)) {
            document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(url);
    }, 60000);
}

// --- Types ---
interface ExportData {
    className: string;
    students: {
        code: string;
        name: string;
        absences: Record<string, string>; // date (YYYY-MM-DD) -> status
    }[];
    year: number;
    month: number;
    startDate?: string;
    endDate?: string;
}

// --- Helpers ---

// Hàm helper để convert sang border style
const BORDER_STYLE: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
};

// Hàm set style chung cho header
const setHeaderStyle = (cell: ExcelJS.Cell, bgColor: string = 'E0E0E0') => {
    cell.font = { bold: true, size: 11, name: 'Times New Roman' };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${bgColor}` } // Add FF for Alpha
    };
    cell.border = BORDER_STYLE;
};

// Màu cho từng loại trạng thái (ARGB)
const STATUS_COLORS: Record<string, string> = {
    P: 'FFF59E0B', // Yellow
    K: 'FFEF4444', // Red
    V: 'FF9CA3AF', // Gray
    T: 'FF3B82F6', // Blue
    VP: 'FF8B5CF6' // Purple
};

const STATUS_TEXT_COLORS: Record<string, string> = {
    P: 'FFFFFF', // White text on colored bg
    K: 'FFFFFF',
    V: 'FFFFFF',
    T: 'FFFFFF',
    VP: 'FFFFFF'
};


// --- Main Export Function ---

export const exportMonthlyReport = async (data: ExportData[], fileName: string) => {
    const workbook = new ExcelJS.Workbook();

    data.forEach(classData => {
        const sheet = workbook.addWorksheet(`Lớp ${classData.className}`);

        // --- 1. Title Section ---
        sheet.mergeCells('A1:E1');
        const title1 = sheet.getCell('A1');
        title1.value = "TRƯỜNG THCS TRẦN BỘI CƠ";
        title1.font = { bold: true, size: 12, name: 'Times New Roman' };
        title1.alignment = { horizontal: 'left' };

        sheet.mergeCells('A3:AC3'); // Merge Rộng ra
        const titleMain = sheet.getCell('A3');
        if (classData.startDate && classData.endDate) {
            titleMain.value = `BẢNG ĐIỂM DANH TỪ ${format(new Date(classData.startDate), 'dd/MM/yyyy')} ĐẾN ${format(new Date(classData.endDate), 'dd/MM/yyyy')} - LỚP ${classData.className}`;
        } else {
            titleMain.value = `BẢNG ĐIỂM DANH THÁNG ${classData.month} - NĂM ${classData.year} - LỚP ${classData.className}`;
        }
        titleMain.font = { bold: true, size: 14, name: 'Times New Roman', color: { argb: 'FF0000FF' } }; // Blue Title
        titleMain.alignment = { horizontal: 'center' };

        // --- 2. Header Rows ---
        // Row 5: STT, Họ Tên, Mã HS | Ngày 1...31 | Tổng kết
        const headerRowIdx = 5;
        const subHeaderRowIdx = 6;

        // Cấu hình cột
        // A: STT, B: Họ Tên, C: Mã HS
        sheet.getColumn(1).width = 5;  // STT
        sheet.getColumn(2).width = 25; // Name
        sheet.getColumn(3).width = 10; // Code

        sheet.getCell(`A${headerRowIdx}`).value = "STT";
        sheet.mergeCells(`A${headerRowIdx}:A${subHeaderRowIdx}`);

        sheet.getCell(`B${headerRowIdx}`).value = "Họ và Tên";
        sheet.mergeCells(`B${headerRowIdx}:B${subHeaderRowIdx}`);

        sheet.getCell(`C${headerRowIdx}`).value = "Mã HS";
        sheet.mergeCells(`C${headerRowIdx}:C${subHeaderRowIdx}`);

        setHeaderStyle(sheet.getCell(`A${headerRowIdx}`));
        setHeaderStyle(sheet.getCell(`B${headerRowIdx}`));
        setHeaderStyle(sheet.getCell(`C${headerRowIdx}`));
        setHeaderStyle(sheet.getCell(`A${subHeaderRowIdx}`)); // Apply border to merged
        setHeaderStyle(sheet.getCell(`B${subHeaderRowIdx}`));
        setHeaderStyle(sheet.getCell(`C${subHeaderRowIdx}`));

        // Generate Days Columns based on date range or full month
        let colIdx = 4; // Start from D
        const dates: Date[] = [];

        if (classData.startDate && classData.endDate) {
            // Use specific range (e.g. for Weekly or Custom reports)
            let curr = new Date(classData.startDate);
            const end = new Date(classData.endDate);
            while (curr <= end) {
                dates.push(new Date(curr));
                curr.setDate(curr.getDate() + 1);
            }
        } else {
            // Default to full month
            const daysInMonth = new Date(classData.year, classData.month, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                dates.push(new Date(classData.year, classData.month - 1, d));
            }
        }

        dates.forEach(date => {
            const d = date.getDate();
            const dayOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
            const isWeekend = dayOfWeek === 'CN' || dayOfWeek === 'T7';

            // Row 5: Date
            const cellDate = sheet.getRow(headerRowIdx).getCell(colIdx);
            cellDate.value = d;

            // Row 6: Day Name (T2, T3...)
            const cellDay = sheet.getRow(subHeaderRowIdx).getCell(colIdx);
            cellDay.value = dayOfWeek;

            // Style
            const bg = isWeekend ? 'FFEDD5' : 'F3F4F6'; // Orange-ish for weekend
            setHeaderStyle(cellDate, bg);
            setHeaderStyle(cellDay, bg);
            if (isWeekend) {
                cellDate.font = { ...cellDate.font, color: { argb: 'FFDD6B20' } }; // Orange text
                cellDay.font = { ...cellDay.font, color: { argb: 'FFDD6B20' } };
            }

            sheet.getColumn(colIdx).width = 4; // Narrow for days
            colIdx++;
        });

        // Summary Columns
        const summaryHeaders = ["P", "K", "V", "Tổng"];
        summaryHeaders.forEach(h => {
            const cell = sheet.getRow(headerRowIdx).getCell(colIdx);
            cell.value = h;
            sheet.mergeCells(headerRowIdx, colIdx, subHeaderRowIdx, colIdx);
            setHeaderStyle(cell, 'FEF3C7'); // Light Yellow
            sheet.getColumn(colIdx).width = 5;
            colIdx++;
        });


        // --- 3. Data Rows ---
        console.log(`Bắt đầu ghi dữ liệu Excel cho lớp: ${classData.className}, số lượng HS: ${classData.students.length}`);
        let currentRowIdx = 7;
        classData.students.forEach((s, index) => {
            const row = sheet.getRow(currentRowIdx);

            // Basic Info
            row.getCell(1).value = index + 1;
            row.getCell(2).value = s.name;
            row.getCell(3).value = s.code;

            // Style Basic Info
            [1, 2, 3].forEach(c => {
                const cell = row.getCell(c);
                cell.border = BORDER_STYLE;
                cell.font = { name: 'Times New Roman', size: 11 };
                if (c !== 2) cell.alignment = { horizontal: 'center' }; // Center STT & Code
            });

            // Iterate Days
            let dayColIdx = 4;
            let countP = 0, countK = 0, countV = 0;

            dates.forEach(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const status = s.absences[dateStr] || '';
                const cell = row.getCell(dayColIdx);

                cell.value = status;
                cell.border = BORDER_STYLE;
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.font = { name: 'Times New Roman', size: 10, bold: true };

                // Stats
                if (status === 'P') countP++;
                if (status === 'K') countK++;
                if (status === 'V') countV++;

                // Color Logic
                if (STATUS_COLORS[status]) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: STATUS_COLORS[status] }
                    };
                    cell.font = { ...cell.font, color: { argb: 'FFFFFFFF' } }; // White text
                } else {
                    // Default weekend color for empty cells?
                    const dayOfWeek = date.getDay(); // 0 is Sunday
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } };
                    }
                }

                dayColIdx++;
            });

            // Summary Data
            row.getCell(dayColIdx).value = countP > 0 ? countP : '';
            row.getCell(dayColIdx + 1).value = countK > 0 ? countK : '';
            row.getCell(dayColIdx + 2).value = countV > 0 ? countV : '';
            const total = countP + countK + countV;
            row.getCell(dayColIdx + 3).value = total > 0 ? total : '';

            // Style Summary
            [0, 1, 2, 3].forEach(offset => {
                const cell = row.getCell(dayColIdx + offset);
                cell.border = BORDER_STYLE;
                cell.alignment = { horizontal: 'center' };
                cell.font = { bold: true };
            });

            currentRowIdx++;
        });

        // --- 4. Summary Row (Total by Day) ---
        const summaryRowIdx = currentRowIdx;
        const summaryRow = sheet.getRow(summaryRowIdx);

        // Merge STT, Name, Code
        sheet.mergeCells(`A${summaryRowIdx}:C${summaryRowIdx}`);
        const sumLabelCell = summaryRow.getCell(1);
        sumLabelCell.value = "TỔNG CỘNG";
        setHeaderStyle(sumLabelCell, '4F46E5'); // Indigo
        sumLabelCell.font = { bold: true, size: 11, name: 'Times New Roman', color: { argb: 'FFFFFFFF' } };

        // Calculate sums for each date column
        colIdx = 4;
        dates.forEach((date, dIdx) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            let dayTotal = 0;
            classData.students.forEach(s => {
                const status = s.absences[dateStr];
                if (status && status !== '' && status !== 'C') {
                    dayTotal++;
                }
            });

            const cell = summaryRow.getCell(colIdx);
            cell.value = dayTotal > 0 ? dayTotal : '';
            setHeaderStyle(cell, 'F3F4F6'); // Light Gray
            cell.font = { bold: true, name: 'Times New Roman', size: 10 };
            colIdx++;
        });

        // Total P, K, V, Grand Total sums
        const grandSums = { P: 0, K: 0, V: 0, Total: 0 };
        classData.students.forEach(s => {
            Object.values(s.absences).forEach(status => {
                if (status === 'P') grandSums.P++;
                if (status === 'K') grandSums.K++;
                if (status === 'V') grandSums.V++;
            });
        });
        grandSums.Total = grandSums.P + grandSums.K + grandSums.V;

        [grandSums.P, grandSums.K, grandSums.V, grandSums.Total].forEach(val => {
            const cell = summaryRow.getCell(colIdx);
            cell.value = val > 0 ? val : '';
            setHeaderStyle(cell, 'FEF3C7'); // Light Yellow
            cell.font = { bold: true, name: 'Times New Roman', size: 10 };
            colIdx++;
        });

    });

    // Write file
    try {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        triggerDownload(blob, `${fileName}.xlsx`);
    } catch (err) {
        console.error("[exportMonthlyReport] Lỗi:", err);
        throw err;
    }
};

// Simple export fallback (unchanged or updated if needed, but Monthly is priority)
// --- Term Report Export ---

export interface TermReportData {
    className: string;
    students: {
        id: string;
        code: string;
        name: string;
    }[];
    columns: {
        id: string;
        name: string;
        frequency: string;
        subPeriods?: string[]; // Labels
    }[];
    data: Record<string, { // studentId
        stats: Record<string, number>; // P, K, T...
        custom: Record<string, string>; // columnId -> Value string
    }>;
    timeRange: string;
}

export const exportTermReport = async (reports: TermReportData[], fileName: string) => {
    const workbook = new ExcelJS.Workbook();

    reports.forEach(report => {
        const sheet = workbook.addWorksheet(`Lớp ${report.className}`);

        // Title
        sheet.mergeCells('A1:F1');
        const title = sheet.getCell('A1');
        title.value = `BÁO CÁO TỔNG HỢP - LỚP ${report.className}`;
        title.font = { bold: true, size: 16, name: 'Times New Roman' };
        title.alignment = { horizontal: 'center' };

        sheet.mergeCells('A2:F2');
        const subtitle = sheet.getCell('A2');
        subtitle.value = `Thời gian: ${report.timeRange}`;
        subtitle.alignment = { horizontal: 'center' };

        // Headers
        let colIdx = 1;
        const headerRow = sheet.getRow(4);

        // Fixed Info
        const fixedHeaders = ["STT", "Mã HS", "Họ và Tên", "Có phép (P)", "Không phép (K)", "Đi trễ (T)", "Vi phạm", "Khen thưởng"];
        fixedHeaders.forEach(h => {
            const cell = headerRow.getCell(colIdx);
            cell.value = h;
            setHeaderStyle(cell, 'E0E0E0');
            sheet.getColumn(colIdx).width = colIdx === 3 ? 25 : 10;
            colIdx++;
        });

        // Custom Columns Headers
        report.columns.forEach(col => {
            const cell = headerRow.getCell(colIdx);
            cell.value = col.name;
            setHeaderStyle(cell, 'D1FAE5'); // Light Green
            sheet.getColumn(colIdx).width = 15;
            colIdx++;
        });

        // Data Rows
        report.students.forEach((std, idx) => {
            const row = sheet.getRow(5 + idx);
            const stdData = report.data[std.id] || { stats: {}, custom: {} };

            let c = 1;
            // Basic Info
            row.getCell(c++).value = idx + 1;
            row.getCell(c++).value = std.code;
            row.getCell(c++).value = std.name;

            // Stats
            row.getCell(c++).value = stdData.stats['P'] || 0;
            row.getCell(c++).value = stdData.stats['K'] || 0;
            row.getCell(c++).value = stdData.stats['T'] || 0;
            row.getCell(c++).value = stdData.stats['VP'] || 0;
            row.getCell(c++).value = stdData.stats['KH'] || 0;

            // Custom Data
            report.columns.forEach(col => {
                row.getCell(c).value = stdData.custom[col.id] || '';
                c++;
            });

            // Styling
            for (let i = 1; i < c; i++) {
                const cell = row.getCell(i);
                cell.border = BORDER_STYLE;
                cell.font = { name: 'Times New Roman', size: 11 };
                if (i !== 3 && i > 2) cell.alignment = { horizontal: 'center' }; // Center numbers
            }
        });

        // Summary Row at the bottom
        const summaryRowIdx = 5 + report.students.length;
        const summaryRow = sheet.getRow(summaryRowIdx);

        sheet.mergeCells(`A${summaryRowIdx}:C${summaryRowIdx}`);
        const sumLabelCell = summaryRow.getCell(1);
        sumLabelCell.value = "TỔNG CỘNG LỚP";
        sumLabelCell.font = { bold: true, size: 12, name: 'Times New Roman', color: { argb: 'FFFFFFFF' } };
        sumLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
        sumLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo background

        // Calculate Sums
        let sumP = 0, sumK = 0, sumT = 0, sumVP = 0, sumKH = 0;
        report.students.forEach(std => {
            const stdData = report.data[std.id] || { stats: {} };
            sumP += stdData.stats['P'] || 0;
            sumK += stdData.stats['K'] || 0;
            sumT += stdData.stats['T'] || 0;
            sumVP += stdData.stats['VP'] || 0;
            sumKH += stdData.stats['KH'] || 0;
        });

        summaryRow.getCell(4).value = sumP > 0 ? sumP : '';
        summaryRow.getCell(5).value = sumK > 0 ? sumK : '';
        summaryRow.getCell(6).value = sumT > 0 ? sumT : '';
        summaryRow.getCell(7).value = sumVP > 0 ? sumVP : '';
        summaryRow.getCell(8).value = sumKH > 0 ? sumKH : '';

        // Style summary cells
        for (let i = 1; i <= 8; i++) {
            const cell = summaryRow.getCell(i);
            cell.border = BORDER_STYLE;
            if (i > 3) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.font = { bold: true, name: 'Times New Roman', size: 12 };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }; // Light gray background
            }
        }

    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    triggerDownload(blob, `${fileName}.xlsx`);
};

export const exportToExcel = async (data: ExportData[], fileName: string, isCompact: boolean = false) => {
    // Simply proxy to exportMonthlyReport because it uses ExcelJS styling 
    // And is structurally matching our goal for single or multi-class export.
    await exportMonthlyReport(data, isCompact ? `${fileName}_RutGon` : fileName);
};

// --- Grade Report Export (Lưới theo Khối) ---
export const exportGradeReport = async (data: ExportData[], fileName: string) => {
    const workbook = new ExcelJS.Workbook();

    // 1. Phân loại lớp theo Khối (Dựa vào chữ số đầu tiên của Tên Lớp)
    const gradeGroups: Record<string, ExportData[]> = {};
    
    data.forEach(classData => {
        const match = classData.className.match(/^(\d+)/);
        const gradeStr = match ? match[1] : 'Khác';
        if (!gradeGroups[gradeStr]) {
            gradeGroups[gradeStr] = [];
        }
        gradeGroups[gradeStr].push(classData);
    });

    // 2. Lặp qua từng Khối (Mỗi khối 1 Sheet)
    Object.entries(gradeGroups).sort(([g1], [g2]) => g1.localeCompare(g2)).forEach(([grade, classes]) => {
        const sheet = workbook.addWorksheet(`Khối ${grade}`);
        
        // --- Chuẩn bị Tên Ngày (Header Cột) chung cho cả Sheet Khối ---
        let dates: Date[] = [];
        const firstClass = classes[0];
        if (firstClass.startDate && firstClass.endDate) {
            let curr = new Date(firstClass.startDate);
            const end = new Date(firstClass.endDate);
            while (curr <= end) {
                dates.push(new Date(curr));
                curr.setDate(curr.getDate() + 1);
            }
        } else {
            const daysInMonth = new Date(firstClass.year, firstClass.month, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                dates.push(new Date(firstClass.year, firstClass.month - 1, d));
            }
        }

        const totalCols = 2 + dates.length + 5; 
        const lastColChar = getColumnLabel(totalCols);

        // --- 0. TIÊU ĐỀ CHUNG CỦA SHEET ---
        let currentRowIdx = 1;
        
        // Dòng 1: Tên Trường
        sheet.mergeCells(`A${currentRowIdx}:${lastColChar}${currentRowIdx}`);
        const schoolRow = sheet.getRow(currentRowIdx);
        schoolRow.height = 25;
        const schoolCell = schoolRow.getCell(1);
        schoolCell.value = "TRƯỜNG THCS TRẦN BỘI CƠ";
        schoolCell.font = { bold: true, size: 14, name: 'Times New Roman' };
        schoolCell.alignment = { horizontal: 'left', vertical: 'middle' };
        currentRowIdx++;

        // Dòng 2: Tên Báo Cáo
        sheet.mergeCells(`A${currentRowIdx}:${lastColChar}${currentRowIdx}`);
        const reportTitleRow = sheet.getRow(currentRowIdx);
        reportTitleRow.height = 30;
        const reportTitleCell = reportTitleRow.getCell(1);
        reportTitleCell.value = `BÁO CÁO ĐIỂM DANH CHI TIẾT THEO KHỐI - KHỐI ${grade}`;
        reportTitleCell.font = { bold: true, size: 18, name: 'Times New Roman', color: { argb: 'FF1E40AF' } };
        reportTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        currentRowIdx++;

        // Dòng 3: Thời gian
        sheet.mergeCells(`A${currentRowIdx}:${lastColChar}${currentRowIdx}`);
        const timeRow = sheet.getRow(currentRowIdx);
        timeRow.height = 20;
        const timeCell = timeRow.getCell(1);
        const timeRangeStr = firstClass.startDate && firstClass.endDate 
            ? `Từ ngày ${format(new Date(firstClass.startDate), 'dd/MM/yyyy')} đến ngày ${format(new Date(firstClass.endDate), 'dd/MM/yyyy')}`
            : `Tháng ${firstClass.month}/${firstClass.year}`;
        timeCell.value = `Thời gian trích xuất: ${timeRangeStr}`;
        timeCell.font = { italic: true, size: 11, name: 'Times New Roman' };
        timeCell.alignment = { horizontal: 'center', vertical: 'middle' };
        currentRowIdx += 2; // Cách 1 dòng trống

        // Lưu trữ tổng hợp cho khối
        let gradeSumP = 0, gradeSumK = 0, gradeSumT = 0, gradeSumVP = 0, gradeSumKH = 0;
        let gradeTotalStudents = 0;
        let gradeIssueStudents = 0;

        // Vẽ từng Lớp trong Sheet (Sắp xếp tự nhiên 9A1, 9A2... 9A10)
        classes.sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true, sensitivity: 'base' }))
               .forEach((classData) => {
            const studentsWithData = classData.students.filter(s => Object.values(s.absences).some(status => status && status !== 'C'));
            const totalStudents = classData.students.length;
            const issueStudentsCount = studentsWithData.length;

            gradeTotalStudents += totalStudents;
            gradeIssueStudents += issueStudentsCount;

            // --- Title Lớp ---
            sheet.mergeCells(`A${currentRowIdx}:${lastColChar}${currentRowIdx}`);
            const titleRow = sheet.getRow(currentRowIdx);
            const titleCell = titleRow.getCell(1);

            // Sửa yêu cầu 1: Chia 2 (thực tế là 3) nhóm màu sắc cho tiêu đề lớp
            titleCell.value = {
                richText: [
                    { text: `| LỚP ${classData.className} \t`, font: { bold: true, size: 12, name: 'Times New Roman', color: { argb: 'FF059669' } } },
                    { text: `(Sĩ số: ${totalStudents}, `, font: { italic: true, size: 11, name: 'Times New Roman', color: { argb: 'FF1E3A8A' } } }, // Blue
                    { text: `Số HS vắng/trễ/vi phạm: ${issueStudentsCount})`, font: { bold: true, italic: true, size: 11, name: 'Times New Roman', color: { argb: 'FFEF4444' } } } // Red
                ]
            };
            titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // Light Green BG
            titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
            titleRow.height = 25;
            
            currentRowIdx++;

            // --- Headers Lớp ---
            const headerRowIdx = currentRowIdx;
            const subHeaderRowIdx = currentRowIdx + 1;

            sheet.getColumn(1).width = 12; 
            sheet.getColumn(2).width = 30; 
            
            sheet.getCell(`A${headerRowIdx}`).value = "STT / Mã";
            sheet.mergeCells(`A${headerRowIdx}:A${subHeaderRowIdx}`);
            setHeaderStyle(sheet.getCell(`A${headerRowIdx}`));

            sheet.getCell(`B${headerRowIdx}`).value = "Họ và Tên Học Sinh";
            sheet.mergeCells(`B${headerRowIdx}:B${subHeaderRowIdx}`);
            setHeaderStyle(sheet.getCell(`B${headerRowIdx}`));

            // Columns cho Từng ngày
            let colIdx = 3; 
            dates.forEach(date => {
                const d = date.getDate();
                const dayOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
                const isWeekend = dayOfWeek === 'CN' || dayOfWeek === 'T7';

                const cellDate = sheet.getRow(headerRowIdx).getCell(colIdx);
                cellDate.value = dayOfWeek;
                const cellDay = sheet.getRow(subHeaderRowIdx).getCell(colIdx);
                cellDay.value = d;

                // Sửa yêu cầu 3: Cột CN/T7 bắt mắt hơn
                let bg = 'F3F4F6';
                if (dayOfWeek === 'T7') bg = 'FFEDD5'; // Light Orange
                if (dayOfWeek === 'CN') bg = 'FEE2E2'; // Light Red/Pink

                setHeaderStyle(cellDate, bg);
                setHeaderStyle(cellDay, bg);
                if (isWeekend) {
                    cellDate.font = { ...cellDate.font, color: { argb: 'FFB91C1C' } }; // Dark Red
                    cellDay.font = { ...cellDay.font, color: { argb: 'FFB91C1C' } };
                }
                sheet.getColumn(colIdx).width = 5;
                colIdx++;
            });

            // Summary Columns (P, K, T, VP, KH)
            const sumHeaders = ['P', 'K', 'T', 'VP', 'KH'];
            const sumBgColors = ['FEF08A', 'FECACA', 'BFDBFE', 'E9D5FF', 'FBCFE8'];

            sumHeaders.forEach((h, idx) => {
                const hCell = sheet.getRow(headerRowIdx).getCell(colIdx);
                hCell.value = h;
                sheet.mergeCells(headerRowIdx, colIdx, subHeaderRowIdx, colIdx);
                setHeaderStyle(hCell, sumBgColors[idx]);
                sheet.getColumn(colIdx).width = 6;
                colIdx++;
            });

            currentRowIdx += 2;

            // --- Rows Học Sinh Vi Phạm ---
            let classSumP = 0, classSumK = 0, classSumT = 0, classSumVP = 0, classSumKH = 0;
            const classDaySums: Record<string, number> = {};

            if (studentsWithData.length === 0) {
                sheet.mergeCells(`A${currentRowIdx}:${lastColChar}${currentRowIdx}`);
                const emptyCell = sheet.getRow(currentRowIdx).getCell(1);
                emptyCell.value = "Không có học sinh vi phạm hay nghỉ học trong thời gian này.";
                emptyCell.font = { italic: true, name: 'Times New Roman', size: 11 };
                emptyCell.alignment = { horizontal: 'center' };
                emptyCell.border = BORDER_STYLE;
                currentRowIdx++;
            } else {
                studentsWithData.forEach((s) => {
                    const row = sheet.getRow(currentRowIdx);
                    let cIdx = 1;
                    
                    const codeCell = row.getCell(cIdx++);
                    codeCell.value = s.code;
                    codeCell.alignment = { horizontal: 'center' };
                    codeCell.border = BORDER_STYLE;
                    
                    const nameCell = row.getCell(cIdx++);
                    nameCell.value = s.name;
                    nameCell.font = { bold: true, name: 'Times New Roman' };
                    nameCell.border = BORDER_STYLE;

                    let sP = 0, sK = 0, sT = 0, sVP = 0, sKH = 0;

                    dates.forEach(date => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const status = s.absences[dateStr] || '';
                        
                        const cell = row.getCell(cIdx);
                        cell.value = status;
                        cell.border = BORDER_STYLE;
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        cell.font = { name: 'Times New Roman', size: 10, bold: true };

                        if (status === 'P') sP++;
                        if (status === 'K') sK++;
                        if (status === 'T' || status.startsWith('T ')) sT++;
                        if (status === 'VP') sVP++;
                        if (status === 'KH') sKH++;

                        if (STATUS_COLORS[status]) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_COLORS[status] } };
                            cell.font = { ...cell.font, color: { argb: 'FFFFFFFF' } };
                        }
                        
                        if (status && status !== 'KH') {
                            classDaySums[dateStr] = (classDaySums[dateStr] || 0) + 1;
                        }

                        cIdx++;
                    });

                    const statsArr = [sP, sK, sT, sVP, sKH];
                    statsArr.forEach((v, vIdx) => {
                        const cell = row.getCell(cIdx++);
                        cell.value = v > 0 ? v : '';
                        cell.border = BORDER_STYLE;
                        cell.alignment = { horizontal: 'center' };
                        cell.font = { bold: true, name: 'Times New Roman' };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${sumBgColors[vIdx]}` } };
                    });

                    classSumP += sP; classSumK += sK; classSumT += sT; classSumVP += sVP; classSumKH += sKH;
                    currentRowIdx++;
                });

                // --- Dòng Tổng Cộng của Lớp ---
                const sumRow = sheet.getRow(currentRowIdx);
                sheet.mergeCells(`A${currentRowIdx}:B${currentRowIdx}`);
                const sumLabel = sumRow.getCell(1);
                sumLabel.value = "TỔNG CỘNG LỚP";
                
                // Sửa yêu cầu 2: Cho màu nền dòng Tổng Cộng Lớp khác biệt
                setHeaderStyle(sumLabel, 'E2E8F0'); // Light Blue/Gray
                sumLabel.font = { bold: true, name: 'Times New Roman', color: { argb: 'FF1F2937' } };
                sumLabel.alignment = { horizontal: 'right' };
                sumRow.getCell(2).border = BORDER_STYLE;
                sumRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

                let cIdx = 3;
                dates.forEach(date => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const cell = sumRow.getCell(cIdx++);
                    cell.value = classDaySums[dateStr] || '';
                    cell.font = { bold: true, color: { argb: 'FFFF0000' } };
                    cell.alignment = { horizontal: 'center' };
                    cell.border = BORDER_STYLE;
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                });

                const cStatsArr = [classSumP, classSumK, classSumT, classSumVP, classSumKH];
                cStatsArr.forEach((v, vIdx) => {
                    const cell = sumRow.getCell(cIdx++);
                    cell.value = v > 0 ? v : '';
                    cell.border = BORDER_STYLE;
                    cell.alignment = { horizontal: 'center' };
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } }; // Red
                });
                currentRowIdx++;
            }

            gradeSumP += classSumP;
            gradeSumK += classSumK;
            gradeSumT += classSumT;
            gradeSumVP += classSumVP;
            gradeSumKH += classSumKH;

            currentRowIdx += 2;
        });

        // --- BẢNG TỔNG HỢP TOÀN KHỐI (Cuối Sheet) ---
        // Sửa yêu cầu 4: Đưa ra ngoài tý (thêm dòng trống)
        currentRowIdx += 3;

        sheet.mergeCells(`A${currentRowIdx}:F${currentRowIdx}`);
        const gradeSummaryTitleCell = sheet.getCell(`A${currentRowIdx}`);
        gradeSummaryTitleCell.value = `BẢNG TỔNG HỢP TOÀN KHỐI ${grade}`;
        gradeSummaryTitleCell.font = { bold: true, size: 14, name: 'Times New Roman', color: { argb: 'FFFFFFFF' } };
        gradeSummaryTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } }; // Indigo 700
        gradeSummaryTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        gradeSummaryTitleCell.border = BORDER_STYLE;
        sheet.getRow(currentRowIdx).height = 30;
        currentRowIdx++;

        const summaryData = [
            { label: 'Tổng số học sinh trong khối:', value: gradeTotalStudents, unit: 'HS', color: 'FF1E3A8A' },
            { label: 'Số học sinh có phát sinh nghỉ/trễ:', value: gradeIssueStudents, unit: 'HS', color: 'FFB91C1C' },
            { label: 'Tổng số lượt Nghỉ Có Phép (P):', value: gradeSumP, unit: 'Lượt', color: 'FF92400E' },
            { label: 'Tổng số lượt Nghỉ Không Phép (K):', value: gradeSumK, unit: 'Lượt', color: 'FFB91C1C' },
            { label: 'Tổng số lượt Đi Trễ (T):', value: gradeSumT, unit: 'Lượt', color: 'FF1E40AF' },
            { label: 'Tổng số lượt Vi Phạm (VP):', value: gradeSumVP, unit: 'Lượt', color: 'FF6D28D9' },
            { label: 'Tổng số lượt Khen Thưởng (KH):', value: gradeSumKH, unit: 'Lượt', color: 'FFBE185D' },
        ];

        summaryData.forEach((item, idx) => {
            const row = sheet.getRow(currentRowIdx);
            row.height = 25;
            
            // Gộp 4 cột cho label
            sheet.mergeCells(`A${currentRowIdx}:D${currentRowIdx}`);
            const labelCell = row.getCell(1);
            labelCell.value = item.label;
            labelCell.font = { name: 'Times New Roman', size: 12 };
            labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
            labelCell.border = BORDER_STYLE;

            // Sửa yêu cầu 4: Gộp 2 cột mới hiển thị đủ info (E và F)
            sheet.mergeCells(`E${currentRowIdx}:F${currentRowIdx}`);
            const valCell = row.getCell(5);
            valCell.value = `${item.value} ${item.unit}`;
            valCell.font = { bold: true, name: 'Times New Roman', size: 12, color: { argb: item.color } };
            valCell.alignment = { horizontal: 'right', vertical: 'middle' };
            valCell.border = BORDER_STYLE;
            
            // Zebra stripes cho bảng tổng hợp
            const rowBg = idx % 2 === 0 ? 'F9FAFB' : 'F3F4F6';
            labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${rowBg}` } };
            valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${rowBg}` } };
            row.getCell(6).border = BORDER_STYLE; // Border cho ô bị merge

            currentRowIdx++;
        });
    });

    try {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        triggerDownload(blob, `${fileName}.xlsx`);
    } catch (err) {
        console.error("[exportGradeReport] Lỗi:", err);
        throw err;
    }
};

// Helper function to get Excel column letter from index (1-based)
function getColumnLabel(index: number): string {
    let label = '';
    while (index > 0) {
        let remainder = (index - 1) % 26;
        label = String.fromCharCode(65 + remainder) + label;
        index = Math.floor((index - 1) / 26);
    }
    return label;
}

// --- MẪU EXCEL IMPORT --- 
export const exportSampleClassTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('CSDL');

    const headers = [
        "STT", "Họ tên", "Ngày sinh", "Giới tính", "Mã dân tộc", "Dân tộc", "Mã tỉnh HSĐ", "Tỉnh HSĐ",
        "Quận/huyện HSĐ", "Phường/Xã HSĐ", "Thôn/Xóm/Ấp HSĐ", "Mã định danh Bộ GD&ĐT", "Trạng thái HS", "Mã lớp"
    ];

    const headerRow = sheet.getRow(1);
    headers.forEach((h, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = h;
        cell.font = { bold: true };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };
        cell.border = BORDER_STYLE;
        sheet.getColumn(idx + 1).width = Math.max(15, h.length + 5);
    });

    const sampleClass = "LỚP CỦA TÔI (VD: 6A1)";
    const sampleData = [
        [1, "Nguyễn Văn A", "15/05/2012", "Nam", "", "Kinh", "", "", "", "", "", "0123456789", "Đang học", sampleClass],
        [2, "Trần Thị B", "20/08/2012", "Nữ", "", "Kinh", "", "", "", "", "", "0987654321", "Đang học", sampleClass],
        [3, "Lê Minh C", "05/11/2012", "Nam", "", "Kinh", "", "", "", "", "", "1122334455", "Đang học", sampleClass],
        [4, "Phạm Hoàng D", "12/02/2012", "Nam", "", "Kinh", "", "", "", "", "", "6677889900", "Đang học", sampleClass],
        [5, "Vũ Thanh E", "30/09/2012", "Nữ", "", "Kinh", "", "", "", "", "", "9988776655", "Đang học", sampleClass]
    ];

    sampleData.forEach((data, idx) => {
        const row = sheet.getRow(idx + 2);
        data.forEach((val, cIdx) => {
            const cell = row.getCell(cIdx + 1);
            cell.value = val;
            cell.border = BORDER_STYLE;

            // Highlight Mã lớp để user dễ biết phải sửa chỗ này
            if (headers[cIdx] === "Mã lớp") {
                cell.font = { bold: true, color: { argb: 'FF059669' } }; // Green
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
            }
        });
    });

    try {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        triggerDownload(blob, `Mau_Danh_Sach_5_Hoc_Sinh.xlsx`);
    } catch (err) {
        console.error("[exportSample] Lỗi:", err);
        throw err;
    }
};
