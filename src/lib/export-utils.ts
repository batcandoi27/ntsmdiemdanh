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
    totalStudents?: number; // Sĩ số cấu hình
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
    P: 'FFEAB308', // Yellow (Vàng) - yellow-500
    K: 'FFEF4444', // Red (Đỏ) - red-500
    V: 'FF9CA3AF', // Gray
    T: 'FF3B82F6', // Blue (Xanh) - blue-500
    VP: 'FFA855F7', // Purple (Tím) - purple-500
    KH: 'FFF97316'  // Orange (Cam) - orange-500
};

const STATUS_TEXT_COLORS: Record<string, string> = {
    P: 'FFFFFF', // White text on colored bg
    K: 'FFFFFF',
    V: 'FFFFFF',
    T: 'FFFFFF',
    VP: 'FFFFFF'
};


// --- Main Export Function ---

export const exportMonthlyReport = async (data: ExportData[], fileName: string, visibleColumns: string[] = ['P', 'K', 'V']) => {
    const workbook = new ExcelJS.Workbook();

    data.forEach(classData => {
        const sheet = workbook.addWorksheet(`Lớp ${classData.className}`);

        // --- 1. Chuẩn bị dữ liệu cột ---
        const dates: Date[] = [];
        if (classData.startDate && classData.endDate) {
            let curr = new Date(classData.startDate);
            const end = new Date(classData.endDate);
            while (curr <= end) {
                dates.push(new Date(curr));
                curr.setDate(curr.getDate() + 1);
            }
        } else {
            const daysInMonth = new Date(classData.year, classData.month, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                dates.push(new Date(classData.year, classData.month - 1, d));
            }
        }

        const allSummaryHeadersConfig = [
            { id: 'P', label: 'P' },
            { id: 'K', label: 'K' },
            { id: 'V', label: 'V' },
            { id: 'T', label: 'T' },
            { id: 'VP', label: 'VP' },
            { id: 'KH', label: 'KH' }
        ];
        const activeSummaryHeaders = allSummaryHeadersConfig.filter(h => visibleColumns.includes(h.id));

        // Tính toán tổng số cột để merge Header phủ kín chiều rộng
        // 3 (STT, Tên, Mã) + dates.length + activeSummaryHeaders.length + 1 (Tổng)
        const totalCols = 3 + dates.length + activeSummaryHeaders.length + 1;
        const lastColChar = getColumnLabel(totalCols);

        // --- 2. Title Section ---
        sheet.mergeCells(`A1:${lastColChar}1`);
        const title1 = sheet.getCell('A1');
        title1.value = "TRƯỜNG THCS TRẦN BỘI CƠ";
        title1.font = { bold: true, size: 14, name: 'Times New Roman' };
        title1.alignment = { horizontal: 'left', vertical: 'middle' };

        sheet.mergeCells(`A2:${lastColChar}2`);
        const titleType = sheet.getCell('A2');
        titleType.value = classData.startDate && classData.endDate ? "BÁO CÁO ĐIỂM DANH CHI TIẾT THEO TUẦN" : "BÁO CÁO ĐIỂM DANH CHI TIẾT THEO THÁNG";
        titleType.font = { bold: true, size: 18, name: 'Times New Roman', color: { argb: 'FF1E40AF' } };
        titleType.alignment = { horizontal: 'center', vertical: 'middle' };

        sheet.mergeCells(`A3:${lastColChar}3`);
        const titleMain = sheet.getCell('A3');
        if (classData.startDate && classData.endDate) {
            titleMain.value = `Thời gian trích xuất: Từ ngày ${format(new Date(classData.startDate), 'dd/MM/yyyy')} đến ngày ${format(new Date(classData.endDate), 'dd/MM/yyyy')}`;
        } else {
            titleMain.value = `Tháng ${classData.month} - Năm ${classData.year}`;
        }
        titleMain.font = { italic: true, size: 12, name: 'Times New Roman' };
        titleMain.alignment = { horizontal: 'center', vertical: 'middle' };

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

        // Generate Days Columns (Đã chuẩn bị ở trên)
        let colIdx = 4; // Start from D
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

            sheet.getColumn(colIdx).width = 7.5; // Wider for detailed notation e.g., Ps13c2
            colIdx++;
        });

        activeSummaryHeaders.forEach(h => {
            const cell = sheet.getRow(headerRowIdx).getCell(colIdx);
            cell.value = h.label;
            sheet.mergeCells(headerRowIdx, colIdx, subHeaderRowIdx, colIdx);
            setHeaderStyle(cell, 'FEF3C7'); // Light Yellow
            sheet.getColumn(colIdx).width = 5;
            colIdx++;
        });

        // Cột Tổng cộng luôn hiện
        const totalCell = sheet.getRow(headerRowIdx).getCell(colIdx);
        totalCell.value = "Tổng";
        sheet.mergeCells(headerRowIdx, colIdx, subHeaderRowIdx, colIdx);
        setHeaderStyle(totalCell, 'FEF3C7');
        sheet.getColumn(colIdx).width = 6;
        colIdx++;


        // --- 3. Data Rows ---
        // LỌC HỌC SINH: Chỉ giữ những em có ít nhất 1 lỗi hiển thị
        const studentsToDisplay = classData.students.filter(s => {
            // Kiểm tra xem có bất kỳ lỗi nào NẰM TRONG visibleColumns không
            return Object.values(s.absences).some(raw => {
                const parts = raw.split(';').map(p => p.trim());
                return parts.some(p => visibleColumns.includes(p.split('(')[0].trim()));
            });
        });

        console.log(`[Export] Processing Class: ${classData.className}, Students: ${studentsToDisplay.length}`);
        if (studentsToDisplay.length > 0) {
            console.log(`[Export] Sample student:`, studentsToDisplay[0].name, studentsToDisplay[0].absences);
        }
        
        // Cập nhật tiêu đề lớp (dòng 5) để khớp với bộ lọc
        const totalStudents = classData.totalStudents || classData.students.length;
        const titleCell = sheet.getCell('A5');
        const activeSTTLabel = ['P', 'K', 'T', 'VP', 'KH'].filter(id => visibleColumns.includes(id)).join('/');
        
        sheet.mergeCells(`A5:${lastColChar}5`);
        titleCell.value = {
            richText: [
                { text: `| LỚP ${classData.className} \t`, font: { bold: true, size: 12, name: 'Times New Roman', color: { argb: 'FF059669' } } },
                { text: `(Sĩ số: ${totalStudents}, `, font: { italic: true, size: 11, name: 'Times New Roman', color: { argb: 'FF1E3A8A' } } }, // Blue
                { text: `Số HS ${activeSTTLabel}: ${studentsToDisplay.length})`, font: { bold: true, italic: true, size: 11, name: 'Times New Roman', color: { argb: 'FFEF4444' } } } // Red
            ]
        };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // Light Green BG
        titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
        sheet.getRow(5).height = 25;

        let currentRowIdx = 7;
        studentsToDisplay.forEach((s, index) => {
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
                const rawStatus = s.absences[dateStr] || '';
                
                // Hỗ trợ hiển thị đa trạng thái (ví dụ: "T, VP")
                // Lọc theo visibleColumns: Chỉ hiện những gì người dùng muốn xem
                const statuses = rawStatus.split(';')
                    .map(st => st.trim())
                    .filter(Boolean)
                    .filter(st => {
                        const baseCode = st.split('(')[0].trim(); // Trích xuất P/K/T/VP/KH
                        return visibleColumns.includes(baseCode);
                    });
                    
                // Tách mã gốc để hiển thị trong ô, chi tiết đưa vào Comment
                // Tách mã gốc để hiển thị trong ô, chi tiết đưa vào Comment
                const displayStatus = statuses.map(st => st.split('(')[0].trim()).join('; ');
                const fullDetails = statuses.join('\n');
                
                const cell = row.getCell(dayColIdx);
                cell.value = displayStatus;

                // DEBUG LOG: Hiển thị trong Console F12 để kiểm tra trích xuất
                if (fullDetails.includes('(')) {
                    console.log(`[Export-Monthly] Student: ${s.name}, Date: ${dateStr}, Note: ${fullDetails}`);
                }

                // Thêm Comment nếu có chi tiết (VD: vắng tiết, lỗi vi phạm)
                if (fullDetails.trim().includes('(')) {
                    cell.note = {
                        texts: [
                            { 
                                text: fullDetails, 
                                font: { size: 8.5, name: 'Times New Roman' } 
                            }
                        ],
                        // Kích thước chuẩn để không bị cắt nội dung dài (Đã tăng gấp đôi)
                        width: 1200,
                        height: 600,
                        margins: { inset: [0.4, 0.3, 0.4, 0.3], insetmode: 'custom' }
                    } as any;
                }
                cell.border = BORDER_STYLE;
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.font = { name: 'Times New Roman', size: 10, bold: true };

                // Stats: Chỉ đếm nếu trạng thái đó được hiển thị
                if (statuses.some(st => st.startsWith('P'))) countP++;
                if (statuses.some(st => st.startsWith('K'))) countK++;
                if (statuses.some(st => st.startsWith('V'))) countV++;

                // Color Logic - Ưu tiên màu theo độ nghiêm trọng: K > P > T > VP
                let activeColor = '';
                if (statuses.some(st => st.startsWith('K'))) activeColor = STATUS_COLORS['K'];
                else if (statuses.some(st => st.startsWith('P'))) activeColor = STATUS_COLORS['P'];
                else if (statuses.some(st => st.startsWith('T'))) activeColor = STATUS_COLORS['T'];
                else if (statuses.some(st => st.startsWith('VP'))) activeColor = STATUS_COLORS['VP'];

                if (activeColor) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: activeColor }
                    };
                    cell.font = { ...cell.font, color: { argb: 'FFFFFFFF' } }; // White text
                } else {
                    const dayOfWeek = date.getDay(); // 0 is Sunday
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } };
                    }
                }

                dayColIdx++;
            });

            // Summary Data (Lọc theo visibleColumns)
            let rowTotal = 0;
            activeSummaryHeaders.forEach(h => {
                let val = 0;
                if (h.id === 'P') val = countP;
                else if (h.id === 'K') val = countK;
                else if (h.id === 'V') val = countV;
                else if (h.id === 'T') val = Object.values(s.absences).filter(v => v.split(';').some(x => x.trim().split('(')[0].trim() === 'T')).length;
                else if (h.id === 'VP') val = Object.values(s.absences).filter(v => v.split(';').some(x => x.trim().split('(')[0].trim() === 'VP')).length;
                else if (h.id === 'KH') val = Object.values(s.absences).filter(v => v.split(';').some(x => x.trim().split('(')[0].trim() === 'KH')).length;
                
                row.getCell(dayColIdx).value = val > 0 ? val : '';
                rowTotal += val;
                
                const cell = row.getCell(dayColIdx);
                cell.border = BORDER_STYLE;
                cell.alignment = { horizontal: 'center' };
                cell.font = { bold: true, name: 'Times New Roman' };
                dayColIdx++;
            });

            const totalCell = row.getCell(dayColIdx);
            totalCell.value = rowTotal > 0 ? rowTotal : '';
            totalCell.border = BORDER_STYLE;
            totalCell.alignment = { horizontal: 'center' };
            totalCell.font = { bold: true, name: 'Times New Roman' };

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
            studentsToDisplay.forEach(s => {
                const raw = s.absences[dateStr] || '';
                const parts = raw.split(';').map(p => p.trim());
                const activeOnThisDay = parts.some(p => visibleColumns.includes(p.split('(')[0].trim()));
                if (activeOnThisDay) {
                    dayTotal++;
                }
            });

            const cell = summaryRow.getCell(colIdx);
            cell.value = dayTotal > 0 ? dayTotal : '';
            setHeaderStyle(cell, 'F3F4F6'); // Light Gray
            cell.font = { bold: true, name: 'Times New Roman', size: 10 };
            colIdx++;
        });

        // Total active columns sums
        let grandTotal = 0;
        activeSummaryHeaders.forEach(h => {
            let hSum = 0;
            classData.students.forEach(s => {
                if (h.id === 'P') hSum += Object.values(s.absences).filter(v => v.split(';').some(x => x.trim().startsWith('P('))).length;
                else if (h.id === 'K') hSum += Object.values(s.absences).filter(v => v.split(';').some(x => x.trim().startsWith('K('))).length;
                else if (h.id === 'V') hSum += Object.values(s.absences).filter(v => v.split(';').some(x => x.trim().startsWith('V('))).length;
                else if (h.id === 'T') hSum += Object.values(s.absences).filter(v => v.split(';').some(x => x.trim().startsWith('T('))).length;
                else if (h.id === 'VP') hSum += Object.values(s.absences).filter(v => v.split(';').some(x => x.trim().startsWith('VP'))).length;
                else if (h.id === 'KH') hSum += Object.values(s.absences).filter(v => v.split(';').some(x => x.trim().startsWith('KH'))).length;
            });
            
            const cell = summaryRow.getCell(colIdx);
            cell.value = hSum > 0 ? hSum : '';
            setHeaderStyle(cell, 'FEF3C7');
            cell.font = { bold: true, name: 'Times New Roman', size: 10 };
            grandTotal += hSum;
            colIdx++;
        });

        const gTotalCell = summaryRow.getCell(colIdx);
        gTotalCell.value = grandTotal > 0 ? grandTotal : '';
        setHeaderStyle(gTotalCell, 'FEF3C7');
        gTotalCell.font = { bold: true, name: 'Times New Roman', size: 10 };

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

export const exportTermReport = async (reports: TermReportData[], fileName: string, visibleColumns: string[] = ['P', 'K', 'T', 'VP', 'KH']) => {
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

        // Fixed Info (Lọc theo visibleColumns)
        const fixedHeadersConfig = [
            { id: 'fixed1', label: "STT" },
            { id: 'fixed2', label: "Mã HS" },
            { id: 'fixed3', label: "Họ và Tên" },
            { id: 'P', label: "Có phép (P)" },
            { id: 'K', label: "Không phép (K)" },
            { id: 'T', label: "Đi trễ (T)" },
            { id: 'VP', label: "Vi phạm" },
            { id: 'KH', label: "Khen thưởng" }
        ];

        const activeFixedHeaders = fixedHeadersConfig.filter(h => h.id.startsWith('fixed') || visibleColumns.includes(h.id));

        activeFixedHeaders.forEach(h => {
            const cell = headerRow.getCell(colIdx);
            cell.value = h.label;
            setHeaderStyle(cell, 'E0E0E0');
            sheet.getColumn(colIdx).width = h.label === "Họ và Tên" ? 25 : 10;
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

            // Stats (Lọc theo visibleColumns)
            activeFixedHeaders.filter(h => !h.id.startsWith('fixed')).forEach(h => {
                const val = stdData.stats[h.id] || 0;
                row.getCell(c++).value = val > 0 ? val : '';
            });

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

        // Calculate and Set Sums (Lọc theo visibleColumns)
        let sumColIdx = 4;
        activeFixedHeaders.filter(h => !h.id.startsWith('fixed')).forEach(h => {
            let sumValue = 0;
            report.students.forEach(std => {
                const stdData = report.data[std.id] || { stats: {} };
                sumValue += stdData.stats[h.id] || 0;
            });
            const cell = summaryRow.getCell(sumColIdx++);
            cell.value = sumValue > 0 ? sumValue : '';
        });

        // Style summary cells
        for (let i = 1; i < sumColIdx; i++) {
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

export const exportToExcel = async (data: ExportData[], fileName: string, isCompact: boolean = false, visibleColumns: string[] = ['P', 'K', 'V']) => {
    // Simply proxy to exportMonthlyReport because it uses ExcelJS styling 
    // And is structurally matching our goal for single or multi-class export.
    await exportMonthlyReport(data, isCompact ? `${fileName}_RutGon` : fileName, visibleColumns);
};

// --- Grade Report Export (Lưới theo Khối) ---
export const exportGradeReport = async (data: ExportData[], fileName: string, visibleColumns: string[] = ['P', 'K', 'T', 'VP', 'KH']) => {
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

        // Summary Columns (P, K, T, VP, KH) - Lọc theo visibleColumns
        const allSummaryHeadersConfig = [
            { id: 'P', label: 'P', color: 'EAB308' },
            { id: 'K', label: 'K', color: 'EF4444' },
            { id: 'V', label: 'V', color: '9CA3AF' },
            { id: 'T', label: 'T', color: '3B82F6' },
            { id: 'VP', label: 'VP', color: 'A855F7' },
            { id: 'KH', label: 'KH', color: 'F97316' }
        ];
        const activeSummaryHeaders = allSummaryHeadersConfig.filter(h => visibleColumns.includes(h.id));

        // Tính toán tổng số cột để merge Header (phải khớp với thực tế vẽ ở dưới)
        // 2 (STT/Mã, Tên) + dates.length + activeSummaryHeaders.length
        const totalCols = 2 + dates.length + activeSummaryHeaders.length; 
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

        // Summary Columns (P, K, T, VP, KH) - Lọc theo visibleColumns
        const allSumConfig = [
            { id: 'P', label: 'P', color: 'FEF08A' }, // Yellow-100
            { id: 'K', label: 'K', color: 'FECACA' }, // Red-100
            { id: 'T', label: 'T', color: 'DBEAFE' }, // Blue-100
            { id: 'VP', label: 'VP', color: 'F3E8FF' }, // Purple-100
            { id: 'KH', label: 'KH', color: 'FFEDD5' }  // Orange-100
        ];
        const activeSumConfigs = allSumConfig.filter(h => visibleColumns.includes(h.id));

        // Vẽ từng Lớp trong Sheet (Sắp xếp tự nhiên 9A1, 9A2... 9A10)
        classes.sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true, sensitivity: 'base' }))
               .forEach((classData) => {
            // LỌC HỌC SINH cho báo cáo Khối: Chỉ giữ em có lỗi thuộc visibleColumns
            const studentsToDisplay = classData.students.filter(s => {
                return Object.values(s.absences).some((raw: any) => {
                    const parts = (raw || '').split(';').map((p: string) => p.trim());
                    return parts.some((p: string) => {
                        const baseCode = p.split('(')[0].trim(); // Lấy "T" từ "T(S)"
                        return visibleColumns.includes(baseCode);
                    });
                });
            });

            const totalStudents = classData.totalStudents || classData.students.length;
            const issueStudentsCount = studentsToDisplay.length;

            gradeTotalStudents += totalStudents;
            gradeIssueStudents += issueStudentsCount;

            // --- Title Lớp ---
            sheet.mergeCells(`A${currentRowIdx}:${lastColChar}${currentRowIdx}`);
            const titleRow = sheet.getRow(currentRowIdx);
            const titleCell = titleRow.getCell(1);

            const activeSTTLabel = ['P', 'K', 'T', 'VP', 'KH'].filter(id => visibleColumns.includes(id)).join('/');
            titleCell.value = {
                richText: [
                    { text: `| LỚP ${classData.className} \t`, font: { bold: true, size: 12, name: 'Times New Roman', color: { argb: 'FF059669' } } },
                    { text: `(Sĩ số: ${totalStudents}, `, font: { italic: true, size: 11, name: 'Times New Roman', color: { argb: 'FF1E3A8A' } } }, // Blue
                    { text: `Số HS ${activeSTTLabel}: ${issueStudentsCount})`, font: { bold: true, italic: true, size: 11, name: 'Times New Roman', color: { argb: 'FFEF4444' } } } // Red
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

            activeSumConfigs.forEach((h) => {
                const hCell = sheet.getRow(headerRowIdx).getCell(colIdx);
                hCell.value = h.label;
                sheet.mergeCells(headerRowIdx, colIdx, subHeaderRowIdx, colIdx);
                setHeaderStyle(hCell, h.color);
                sheet.getColumn(colIdx).width = 6;
                colIdx++;
            });

            currentRowIdx += 2;

            // --- Rows Học Sinh Vi Phạm ---
            let classSumP = 0, classSumK = 0, classSumT = 0, classSumVP = 0, classSumKH = 0;
            const classDaySums: Record<string, number> = {};

            if (studentsToDisplay.length === 0) {
                sheet.mergeCells(`A${currentRowIdx}:${lastColChar}${currentRowIdx}`);
                const emptyCell = sheet.getRow(currentRowIdx).getCell(1);
                const activeLoi = ['P', 'K', 'T', 'VP', 'KH'].filter(id => visibleColumns.includes(id)).join('/');
                emptyCell.value = `Không có học sinh báo lỗi ( ${activeLoi} ) trong thời gian này.`;
                emptyCell.font = { italic: true, name: 'Times New Roman', size: 11 };
                emptyCell.alignment = { horizontal: 'center' };
                emptyCell.border = BORDER_STYLE;
                currentRowIdx++;
            } else {
                studentsToDisplay.forEach((s) => {
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
                        const rawStatus = s.absences[dateStr] || '';
                        if (rawStatus) {
                            console.log(`[Raw-Data-Check] Student: ${s.name}, Date: ${dateStr}, Raw: ${rawStatus}`);
                        }
                        const statuses = rawStatus.split(';')
                            .map(st => st.trim())
                            .filter(Boolean)
                            .filter(st => {
                                const baseCode = st.split('(')[0].trim();
                                return visibleColumns.includes(baseCode);
                            });
                        
                        // Tách mã gốc để hiển thị, chi tiết đưa vào Comment
                        const displayStatus = statuses.map(st => st.split('(')[0].trim()).join('; ');
                        const fullDetails = statuses.join('\n');
                        
                        const cell = row.getCell(cIdx);
                        cell.value = displayStatus;

                        // DEBUG LOG: Hiển thị trong Console F12 để kiểm tra trích xuất
                        // Kiểm tra cả dấu ngoặc đơn ()
                        if (fullDetails.trim().includes('(')) {
                            (cell as any).note = {
                                texts: [{ text: fullDetails, font: { size: 9, name: 'Times New Roman' } }],
                                width: 1000,
                                height: 500,
                                margins: { inset: [0.4, 0.4, 0.4, 0.4], insetmode: 'custom' }
                            };
                        }
                        cell.border = BORDER_STYLE;
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        cell.font = { name: 'Times New Roman', size: 10, bold: true };

                        if (statuses.some(st => st.startsWith('P'))) sP++;
                        if (statuses.some(st => st.startsWith('K'))) sK++;
                        if (statuses.some(st => st.startsWith('T'))) sT++;
                        if (statuses.some(st => st.startsWith('VP'))) sVP++;
                        if (statuses.some(st => st.startsWith('KH'))) sKH++;

                        // Lấy màu trạng thái đầu tiên được hiển thị
                        const firstActive = statuses[0];
                        if (firstActive) {
                            const baseCode = firstActive.split('(')[0].trim().toUpperCase();
                            if (STATUS_COLORS[baseCode]) {
                                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_COLORS[baseCode] } };
                                cell.font = { ...cell.font, color: { argb: 'FFFFFFFF' } };
                            }
                        }
                        
                        if (statuses.length > 0) {
                            classDaySums[dateStr] = (classDaySums[dateStr] || 0) + 1;
                        }

                        cIdx++;
                    });

                    // Summary Stats (Lọc theo visibleColumns)
                    activeSumConfigs.forEach(h => {
                        let val = 0;
                        if (h.id === 'P') val = sP;
                        else if (h.id === 'K') val = sK;
                        else if (h.id === 'T') val = sT;
                        else if (h.id === 'VP') val = sVP;
                        else if (h.id === 'KH') val = sKH;

                        const cell = row.getCell(cIdx++);
                        cell.value = val > 0 ? val : '';
                        cell.border = BORDER_STYLE;
                        cell.alignment = { horizontal: 'center' };
                        cell.font = { name: 'Times New Roman' };
                    });

                    classSumP += sP; classSumK += sK; classSumT += sT; classSumVP += sVP; classSumKH += sKH;
                    currentRowIdx++;
                });

                // --- Dòng Tổng cộng Lớp (Lọc theo số cột đang hiện)
                sheet.mergeCells(`A${currentRowIdx}:B${currentRowIdx}`);
                const classSumLabelCell = sheet.getRow(currentRowIdx).getCell(1);
                classSumLabelCell.value = `TỔNG CỘNG LỚP ${classData.className}`;
                setHeaderStyle(classSumLabelCell, 'FEE2E2'); // Light Red
                classSumLabelCell.font = { bold: true, size: 11, name: 'Times New Roman', color: { argb: 'FF991B1B' } };
                classSumLabelCell.alignment = { horizontal: 'center' };

                let footerCIdx = 3;
                dates.forEach(date => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const val = classDaySums[dateStr] || 0;
                    const cell = sheet.getRow(currentRowIdx).getCell(footerCIdx++);
                    cell.value = val > 0 ? val : '';
                    setHeaderStyle(cell, 'F3F4F6');
                    cell.font = { bold: true, name: 'Times New Roman' };
                });

                activeSumConfigs.forEach(h => {
                    let val = 0;
                    if (h.id === 'P') val = classSumP;
                    else if (h.id === 'K') val = classSumK;
                    else if (h.id === 'T') val = classSumT;
                    else if (h.id === 'VP') val = classSumVP;
                    else if (h.id === 'KH') val = classSumKH;

                    const cell = sheet.getRow(currentRowIdx).getCell(footerCIdx++);
                    cell.value = val > 0 ? val : '';
                    setHeaderStyle(cell, h.color);
                    cell.font = { bold: true, name: 'Times New Roman' };
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

        const fixedSummaryData = [
            { label: 'Tổng số học sinh trong khối:', value: gradeTotalStudents, unit: 'HS', color: 'FF1E3A8A' },
            { label: 'Số học sinh có phát sinh nghỉ/trễ:', value: gradeIssueStudents, unit: 'HS', color: 'FFB91C1C' },
        ];

        fixedSummaryData.forEach((item, idx) => {
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

// --- BÁO CÁO V2: TÁCH CỘT SÁNG/CHIỀU ---
export const exportMonthlyReportV2 = async (data: ExportData[], fileName: string, visibleColumns: string[] = ['P', 'K', 'V', 'T', 'VP', 'KH']) => {
    const workbook = new ExcelJS.Workbook();

    data.forEach(classData => {
        const sheet = workbook.addWorksheet(`Lớp ${classData.className}`);

        // --- 1. Chuẩn bị dữ liệu cột ---
        const dates: Date[] = [];
        if (classData.startDate && classData.endDate) {
            let curr = new Date(classData.startDate);
            const end = new Date(classData.endDate);
            while (curr <= end) {
                dates.push(new Date(curr));
                curr.setDate(curr.getDate() + 1);
            }
        } else {
            const daysInMonth = new Date(classData.year, classData.month, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                dates.push(new Date(classData.year, classData.month - 1, d));
            }
        }

        const allSummaryHeadersConfig = [
            { id: 'P', label: 'P' },
            { id: 'K', label: 'K' },
            { id: 'V', label: 'V' },
            { id: 'T', label: 'T' },
            { id: 'VP', label: 'VP' },
            { id: 'KH', label: 'KH' }
        ];
        const activeSummaryHeaders = allSummaryHeadersConfig.filter(h => visibleColumns.includes(h.id));

        // TỔNG CỘT (V2): 3 (STT, Tên, Mã) + (dates.length * 2) + activeSummaryHeaders.length + 1
        const totalCols = 3 + (dates.length * 2) + activeSummaryHeaders.length + 1;
        const lastColChar = getColumnLabel(totalCols);

        // --- 2. Title Section ---
        sheet.mergeCells(`A1:${lastColChar}1`);
        const title1 = sheet.getCell('A1');
        title1.value = "TRƯỜNG THCS TRẦN BỘI CƠ";
        title1.font = { bold: true, size: 14, name: 'Times New Roman' };
        title1.alignment = { horizontal: 'left' };

        sheet.mergeCells(`A2:${lastColChar}2`);
        const titleType = sheet.getCell('A2');
        titleType.value = "BÁO CÁO ĐIỂM DANH (BẢN V2 - TÁCH CỘT SÁNG/CHIỀU)";
        titleType.font = { bold: true, size: 18, name: 'Times New Roman', color: { argb: 'FF059669' } };
        titleType.alignment = { horizontal: 'center' };

        sheet.mergeCells(`A3:${lastColChar}3`);
        const titleMain = sheet.getCell('A3');
        titleMain.value = classData.startDate && classData.endDate 
            ? `Thời gian: Từ ${format(new Date(classData.startDate), 'dd/MM/yyyy')} đến ${format(new Date(classData.endDate), 'dd/MM/yyyy')}`
            : `Tháng ${classData.month} - Năm ${classData.year}`;
        titleMain.font = { italic: true, size: 12, name: 'Times New Roman' };
        titleMain.alignment = { horizontal: 'center' };

        // --- 2. Header Rows ---
        const headerRowIdx = 5;
        const subHeaderRowIdx = 6;

        sheet.getColumn(1).width = 5;  // STT
        sheet.getColumn(2).width = 25; // Họ Tên
        sheet.getColumn(3).width = 10; // Mã HS

        sheet.getCell(`A${headerRowIdx}`).value = "STT";
        sheet.mergeCells(`A${headerRowIdx}:A${subHeaderRowIdx}`);
        sheet.getCell(`B${headerRowIdx}`).value = "Họ và Tên";
        sheet.mergeCells(`B${headerRowIdx}:B${subHeaderRowIdx}`);
        sheet.getCell(`C${headerRowIdx}`).value = "Mã HS";
        sheet.mergeCells(`C${headerRowIdx}:C${subHeaderRowIdx}`);

        setHeaderStyle(sheet.getCell(`A${headerRowIdx}`));
        setHeaderStyle(sheet.getCell(`B${headerRowIdx}`));
        setHeaderStyle(sheet.getCell(`C${headerRowIdx}`));
        setHeaderStyle(sheet.getCell(`A${subHeaderRowIdx}`));
        setHeaderStyle(sheet.getCell(`B${subHeaderRowIdx}`));
        setHeaderStyle(sheet.getCell(`C${subHeaderRowIdx}`));

        // --- GENERATE DAYS (SPLIT S/C) ---
        let colIdx = 4;
        dates.forEach(date => {
            const d = date.getDate();
            const dayOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
            const isWeekend = dayOfWeek === 'CN' || dayOfWeek === 'T7';
            const bg = isWeekend ? 'FFEDD5' : 'F3F4F6';

            // Merge Ngày ở dòng 5 (phủ 2 cột S và C)
            sheet.mergeCells(headerRowIdx, colIdx, headerRowIdx, colIdx + 1);
            const cellDate = sheet.getRow(headerRowIdx).getCell(colIdx);
            cellDate.value = `${d}\n${dayOfWeek}`;
            setHeaderStyle(cellDate, bg);
            cellDate.alignment = { ...cellDate.alignment, wrapText: true };

            // Cột S và C ở dòng 6
            const cellS = sheet.getRow(subHeaderRowIdx).getCell(colIdx);
            cellS.value = "s";
            setHeaderStyle(cellS, bg);
            sheet.getColumn(colIdx).width = 4;

            const cellC = sheet.getRow(subHeaderRowIdx).getCell(colIdx + 1);
            cellC.value = "c";
            setHeaderStyle(cellC, bg);
            sheet.getColumn(colIdx + 1).width = 4;

            if (isWeekend) {
                [cellDate, cellS, cellC].forEach(c => {
                    c.font = { ...c.font, color: { argb: 'FFDD6B20' } };
                });
            }

            colIdx += 2;
        });

        // Summary Headers
        activeSummaryHeaders.forEach(h => {
            const cell = sheet.getRow(headerRowIdx).getCell(colIdx);
            cell.value = h.label;
            sheet.mergeCells(headerRowIdx, colIdx, subHeaderRowIdx, colIdx);
            setHeaderStyle(cell, 'FEF3C7');
            sheet.getColumn(colIdx).width = 5;
            colIdx++;
        });

        const totalCell = sheet.getRow(headerRowIdx).getCell(colIdx);
        totalCell.value = "Tổng";
        sheet.mergeCells(headerRowIdx, colIdx, subHeaderRowIdx, colIdx);
        setHeaderStyle(totalCell, 'FEF3C7');
        sheet.getColumn(colIdx).width = 6;
        colIdx++;

        // --- 3. Data Rows ---
        const studentsToDisplay = classData.students.filter(s => {
            return Object.values(s.absences).some(raw => {
                const parts = raw.split(';').map(p => p.trim());
                return parts.some(p => visibleColumns.includes(p.split('(')[0].trim()));
            });
        });

        // Cập nhật tiêu đề lớp (dòng 4)
        const titleCell = sheet.getCell('A4');
        sheet.mergeCells(`A4:${lastColChar}4`);
        titleCell.value = `| LỚP ${classData.className} \t (Sĩ số: ${classData.totalStudents || classData.students.length}, Số HS vắng/vi phạm: ${studentsToDisplay.length})`;
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        titleCell.font = { bold: true, name: 'Times New Roman' };

        let currentRowIdx = 7;
        studentsToDisplay.forEach((s, index) => {
            const row = sheet.getRow(currentRowIdx);
            row.getCell(1).value = index + 1;
            row.getCell(2).value = s.name;
            row.getCell(3).value = s.code;

            [1, 2, 3].forEach(c => {
                const cell = row.getCell(c);
                cell.border = BORDER_STYLE;
                cell.font = { name: 'Times New Roman', size: 11 };
                if (c !== 2) cell.alignment = { horizontal: 'center' };
            });

            let dayColIdx = 4;
            let counts = { P: 0, K: 0, V: 0, T: 0, VP: 0, KH: 0 };

            dates.forEach(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const rawStatus = s.absences[dateStr] || '';
                const parts = rawStatus.split(';').map(p => p.trim()).filter(Boolean);

                const getSessionStatuses = (session: 'S' | 'C') => {
                    return parts.filter(p => {
                        const baseCode = p.split('(')[0].trim();
                        if (!visibleColumns.includes(baseCode)) return false;

                        const isMorning = p.includes('(s)') || p.includes('(S)') || p.includes('Sáng') || /T[1-5]/.test(p);
                        const isAfternoon = p.includes('(c)') || p.includes('(C)') || p.includes('Chiều') || /T([6-9]|10)/.test(p);
                        const isSC = p.includes('(sc)') || p.includes('(SC)');
                        const noMarker = !isMorning && !isAfternoon && !isSC;

                        if (isSC || noMarker) return true; 
                        if (session === 'S') return isMorning;
                        return isAfternoon;
                    });
                };

                const sParts = getSessionStatuses('S');
                const cParts = getSessionStatuses('C');

                const renderCell = (idx: number, sessionParts: string[]) => {
                    const cell = row.getCell(idx);
                    const displayCode = Array.from(new Set(sessionParts.map(st => st.split('(')[0].trim()))).join(';');
                    cell.value = displayCode;
                    cell.border = BORDER_STYLE;
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.font = { name: 'Times New Roman', size: 10, bold: true };

                    if (sessionParts.length > 0) {
                        let colorIdx = sessionParts.some(st => st.startsWith('K')) ? 'K' :
                                       sessionParts.some(st => st.startsWith('P')) ? 'P' :
                                       sessionParts.some(st => st.startsWith('T')) ? 'T' :
                                       sessionParts.some(st => st.startsWith('VP')) ? 'VP' : '';
                        if (colorIdx && STATUS_COLORS[colorIdx]) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_COLORS[colorIdx] } };
                            cell.font = { ...cell.font, color: { argb: 'FFFFFFFF' } };
                        }

                        if (sessionParts.some(st => st.includes('('))) {
                            cell.note = {
                                texts: [{ text: sessionParts.join('\n'), font: { size: 9, name: 'Times New Roman' } }],
                                width: 1200, height: 600
                            } as any;
                        }

                        // Cập nhật stats
                        sessionParts.forEach(st => {
                            const code = st.split('(')[0].trim();
                            if (counts.hasOwnProperty(code)) {
                                (counts as any)[code]++;
                            }
                        });
                    } else {
                        const dayOfWeek = date.getDay();
                        if (dayOfWeek === 0 || dayOfWeek === 6) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } };
                        }
                    }
                };

                renderCell(dayColIdx, sParts);
                renderCell(dayColIdx + 1, cParts);
                dayColIdx += 2;
            });

            // Row Summary
            let rowTotal = 0;
            activeSummaryHeaders.forEach(h => {
                const val = (counts as any)[h.id] || 0;
                row.getCell(dayColIdx).value = val > 0 ? val : '';
                rowTotal += val;
                const cell = row.getCell(dayColIdx);
                cell.border = BORDER_STYLE;
                cell.alignment = { horizontal: 'center' };
                cell.font = { bold: true, name: 'Times New Roman' };
                dayColIdx++;
            });

            const totalCellValue = row.getCell(dayColIdx);
            totalCellValue.value = rowTotal > 0 ? rowTotal : '';
            totalCellValue.border = BORDER_STYLE;
            totalCellValue.alignment = { horizontal: 'center' };
            totalCellValue.font = { bold: true, name: 'Times New Roman' };

            currentRowIdx++;
        });
    });

    try {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        triggerDownload(blob, `${fileName}_V2.xlsx`);
    } catch (err) {
        console.error("[exportMonthlyReportV2] Lỗi:", err);
        throw err;
    }
};
