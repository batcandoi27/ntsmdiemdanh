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

// Hàm helper để convert sang border style (Xám nhạt thay vì Đen theo feedback Sếp)
const BORDER_STYLE: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
};

// Hàm set style chung cho header
const setHeaderStyle = (cell: ExcelJS.Cell, bgColor: string = 'F3F4F6') => {
    cell.font = { bold: true, size: 11, name: 'Times New Roman' };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${bgColor}` } 
    };
    cell.border = BORDER_STYLE;
};

// --- Bảng màu Pastel (Màu nền nhẹ nhàng theo feedback Sếp) ---
const STATUS_COLORS: Record<string, string> = {
    P: 'FEF9C3',   // Vàng nhạt
    K: 'FEE2E2',   // Hồng nhạt
    V: 'F3F4F6',   // Xám nhạt
    T: 'DBEAFE',   // Xanh lơ nhạt
    VP: 'F3E8FF',  // Tím nhạt
    KH: 'FFEDD5'   // Cam nhạt
};

// --- Màu chữ đậm đi kèm màu Pastel tương ứng ---
const STATUS_TEXT_COLORS: Record<string, string> = {
    P: '854D0E',   // Nâu vàng
    K: '991B1B',   // Đỏ đậm
    V: '4B5563',   // Xám đậm
    T: '1E40AF',   // Xanh dương đậm
    VP: '6B21A8',  // Tím đậm
    KH: '9A3412'   // Cam đất
};

// --- Helpers: Mã băm & Nhận diện ---
/**
 * Trích xuất mã gốc (P, K, T, VP, KH) từ các nhãn phức tạp (ví dụ: Ks, Ps, VPc1-5, T(S))
 */
const getBaseCode = (label: string): string => {
    if (!label) return '';
    const match = label.trim().match(/^([A-Z]+)/);
    return match ? match[1] : label.split('(')[0].trim();
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
            
            // Màu sắc đồng bộ Web Grid
            const bgColor = STATUS_COLORS[h.id] || 'FEF3C7';
            setHeaderStyle(cell, bgColor);
            if (STATUS_TEXT_COLORS[h.id]) {
                cell.font = { ...cell.font, color: { argb: `FF${STATUS_TEXT_COLORS[h.id]}` } };
            }

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
                return parts.some(p => visibleColumns.includes(getBaseCode(p)));
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
        
        const vCount = classData.students.reduce((acc, s) => {
            const subTotal = Object.values(s.absences).filter(v => 
                v && (v.toUpperCase().startsWith('P') || v.toUpperCase().startsWith('K'))
            ).length;
            return acc + subTotal;
        }, 0);
        
        sheet.mergeCells(`A5:${lastColChar}5`);
        titleCell.value = {
            richText: [
                { text: `| LỚP ${classData.className} \t`, font: { bold: true, size: 12, name: 'Times New Roman', color: { argb: 'FF059669' } } },
                { text: `(Sĩ số: ${totalStudents}, `, font: { italic: true, size: 11, name: 'Times New Roman', color: { argb: 'FF1E3A8A' } } }, // Blue
                { text: `Tổng lượt Vắng (P/K): ${vCount})`, font: { bold: true, italic: true, size: 11, name: 'Times New Roman', color: { argb: 'FFEF4444' } } } // Red
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
                        const baseCode = getBaseCode(st); // Trích xuất P/K/T/VP/KH
                        return visibleColumns.includes(baseCode);
                    });
                    
                // Tách mã gốc để hiển thị trong ô, chi tiết đưa vào Comment
                // Tách mã gốc để hiển thị trong ô, chi tiết đưa vào Comment
                const displayStatus = statuses.map(st => getBaseCode(st)).join('; ');
                const fullDetails = statuses.join('\n');
                
                const cell = row.getCell(dayColIdx);
                cell.value = displayStatus;

                // DEBUG LOG: Hiển thị trong Console F12 để kiểm tra trích xuất
                if (fullDetails.includes('[')) {
                    console.log(`[Export-Monthly] Student: ${s.name}, Date: ${dateStr}, Note: ${fullDetails}`);
                }

                // Thêm Comment nếu có chi tiết (VD: vắng tiết, lỗi vi phạm)
                if (fullDetails.trim().includes('[')) {
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
                else if (h.id === 'T') val = Object.values(s.absences).filter(v => (v || '').split(';').some(x => getBaseCode(x.trim()) === 'T')).length;
                else if (h.id === 'VP') val = Object.values(s.absences).filter(v => (v || '').split(';').some(x => getBaseCode(x.trim()) === 'VP')).length;
                else if (h.id === 'KH') val = Object.values(s.absences).filter(v => (v || '').split(';').some(x => getBaseCode(x.trim()) === 'KH')).length;
                
                const cell = row.getCell(dayColIdx);
                cell.value = val > 0 ? val : '';
                rowTotal += val;
                
                cell.border = BORDER_STYLE;
                cell.alignment = { horizontal: 'center' };
                cell.font = { bold: true, name: 'Times New Roman' };

                // Tô màu Pastel đồng bộ Web Grid
                if (STATUS_COLORS[h.id]) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${STATUS_COLORS[h.id]}` } };
                    if (STATUS_TEXT_COLORS[h.id]) {
                        cell.font = { ...cell.font, color: { argb: `FF${STATUS_TEXT_COLORS[h.id]}` } };
                    }
                }
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
                const activeOnThisDay = parts.some(p => visibleColumns.includes(getBaseCode(p)));
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
            
            // Màu sắc đồng bộ
            const bgColor = STATUS_COLORS[h.id] || 'FEF3C7';
            setHeaderStyle(cell, bgColor);
            if (STATUS_TEXT_COLORS[h.id]) {
                cell.font = { ...cell.font, color: { argb: `FF${STATUS_TEXT_COLORS[h.id]}` } };
            }
            
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
            { id: 'P', label: 'P', color: 'EAB308' },
            { id: 'K', label: 'K', color: 'EF4444' },
            { id: 'V', label: 'V', color: '9CA3AF' },
            { id: 'T', label: 'T', color: '3B82F6' },
            { id: 'VP', label: 'VP', color: 'A855F7' },
            { id: 'KH', label: 'KH', color: 'F97316' }
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
                        const baseCode = getBaseCode(p); // Lấy "T" từ "T(S)" hoặc "Ts"
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

            // Đồng bộ V2: Chỉ đếm vắng P/K (không đếm T/VP/KH)
            const vCount = classData.students.reduce((acc: number, s: any) => {
                const subTotal = Object.values(s.absences || {}).filter((v: any) => 
                    v && (v.toUpperCase().startsWith('P') || v.toUpperCase().startsWith('K'))
                ).length;
                return acc + subTotal;
            }, 0);

            titleCell.value = {
                richText: [
                    { text: `| LỚP ${classData.className} \t`, font: { bold: true, size: 13, name: 'Times New Roman', color: { argb: 'FF059669' } } },
                    { text: `(Sĩ số: ${totalStudents}, `, font: { italic: true, size: 11, name: 'Times New Roman', color: { argb: 'FF1E3A8A' } } },
                    { text: `Tổng lượt Vắng (P/K): ${vCount})`, font: { bold: true, italic: true, size: 11, name: 'Times New Roman', color: { argb: 'FFEF4444' } } }
                ]
            };
            titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } }; // Đồng bộ V2
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
                // Đồng bộ V2: Dùng STATUS_COLORS
                const bgColor = STATUS_COLORS[h.id] || h.color;
                setHeaderStyle(hCell, bgColor);
                if (STATUS_TEXT_COLORS[h.id]) {
                    hCell.font = { ...hCell.font, color: { argb: `FF${STATUS_TEXT_COLORS[h.id]}` } };
                }
                sheet.getColumn(colIdx).width = 5;
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
                                const baseCode = getBaseCode(st);
                                return visibleColumns.includes(baseCode);
                            });
                        
                        // Đồng bộ V2: Giá trị ô chỉ hiển thị base code rút gọn
                        const codes = Array.from(new Set(statuses.map(p => getBaseCode(p)))).join(';');
                        const fullDetails = statuses.join('\n');
                        
                        const cell = row.getCell(cIdx);
                        cell.value = codes;

                        // Đồng bộ V2: Comment note không dùng width/height cứng, font 9pt
                        if (fullDetails.trim().includes('[')) {
                            cell.note = {
                                texts: [{ text: fullDetails, font: { size: 9, name: 'Times New Roman' } }]
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

                        // Đồng bộ V2: Lấy màu trạng thái đầu tiên, dùng STATUS_COLORS/STATUS_TEXT_COLORS
                        const firstActive = statuses[0];
                        if (firstActive) {
                            const baseCode = getBaseCode(firstActive);
                            if (STATUS_COLORS[baseCode]) {
                                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${STATUS_COLORS[baseCode]}` } };
                                if (STATUS_TEXT_COLORS[baseCode]) {
                                    cell.font = { ...cell.font, color: { argb: `FF${STATUS_TEXT_COLORS[baseCode]}` } };
                                }
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
                        else if (h.id === 'V') val = sP + sK; // Đồng bộ V2: Vắng = P + K
                        else if (h.id === 'T') val = sT;
                        else if (h.id === 'VP') val = sVP;
                        else if (h.id === 'KH') val = sKH;

                        const cell = row.getCell(cIdx++);
                        cell.value = val > 0 ? val : '';
                        cell.border = BORDER_STYLE;
                        cell.alignment = { horizontal: 'center' };
                        cell.font = { bold: true, name: 'Times New Roman' };
                        
                        // Đồng bộ V2: Tô màu Pastel cho ô dữ liệu thống kê
                        if (STATUS_COLORS[h.id]) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${STATUS_COLORS[h.id]}` } };
                            if (STATUS_TEXT_COLORS[h.id]) {
                                cell.font = { ...cell.font, color: { argb: `FF${STATUS_TEXT_COLORS[h.id]}` } };
                            }
                        }
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
                    else if (h.id === 'V') val = classSumP + classSumK; // Đồng bộ V2: Vắng = P + K
                    else if (h.id === 'T') val = classSumT;
                    else if (h.id === 'VP') val = classSumVP;
                    else if (h.id === 'KH') val = classSumKH;

                    const c = sheet.getRow(currentRowIdx).getCell(footerCIdx++);
                    c.value = val > 0 ? val : '';
                    setHeaderStyle(c, STATUS_COLORS[h.id] || h.color);
                    
                    // Đồng bộ V2: Giữ màu chữ khác nhau cho từng loại
                    if (STATUS_TEXT_COLORS[h.id]) {
                        c.font = { bold: true, name: 'Times New Roman', size: 11, color: { argb: `FF${STATUS_TEXT_COLORS[h.id]}` } };
                    } else {
                        c.font = { bold: true, name: 'Times New Roman', size: 11 };
                    }
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

// --- BÁO CÁO V2: TÁCH CỘT SÁNG/CHIỀU (Bản nâng cấp: Group Khối & Định dạng V1 + Pastel Style) ---
export const exportMonthlyReportV2 = async (data: ExportData[], fileName: string, visibleColumns: string[] = ['P', 'K', 'T', 'VP', 'KH']) => {
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
        
        // --- 1. View Configuration (Freeze Panes) ---
        // Cố định 4 dòng đầu theo yêu cầu Sếp và 2 cột đầu (Mã HS, Tên)
        sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 4 }];
        
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

        const activeSumConfigs = [
            { id: 'P', label: 'P', color: 'EAB308' },
            { id: 'K', label: 'K', color: 'EF4444' },
            { id: 'V', label: 'V', color: '9CA3AF' },
            { id: 'T', label: 'T', color: '3B82F6' },
            { id: 'VP', label: 'VP', color: 'A855F7' },
            { id: 'KH', label: 'KH', color: 'F97316' }
        ].filter(h => visibleColumns.includes(h.id));

        // TỔNG CỘT (V2): 2 (Mã, Tên) + (dates.length * 2) + activeSumConfigs.length
        const totalCols = 2 + (dates.length * 2) + activeSumConfigs.length;
        const lastColChar = getColumnLabel(totalCols);

        // --- 2. Title Section (Giống V1) ---
        sheet.mergeCells(`A1:${lastColChar}1`);
        const title1 = sheet.getCell('A1');
        title1.value = "TRƯỜNG THCS TRẦN BỘI CƠ";
        title1.font = { bold: true, size: 14, name: 'Times New Roman' };
        title1.alignment = { horizontal: 'left' };

        sheet.mergeCells(`A2:${lastColChar}2`);
        const titleType = sheet.getCell('A2');
        titleType.value = "BÁO CÁO ĐIỂM DANH LỚN (V2: TIẾT/SÁNG/CHIỀU)";
        titleType.font = { bold: true, size: 18, name: 'Times New Roman', color: { argb: 'FF1E40AF' } }; 
        titleType.alignment = { horizontal: 'center' };

        sheet.mergeCells(`A3:${lastColChar}3`);
        const titleMain = sheet.getCell('A3');
        const rangeText = firstClass.startDate && firstClass.endDate 
            ? `Từ ${format(new Date(firstClass.startDate), 'dd/MM/yyyy')} đến ${format(new Date(firstClass.endDate), 'dd/MM/yyyy')}`
            : `Tháng ${firstClass.month} / ${firstClass.year}`;
        titleMain.value = `Khối ${grade} - ${rangeText}`;
        titleMain.font = { italic: true, size: 12, name: 'Times New Roman' };
        titleMain.alignment = { horizontal: 'center' };

        let currentRowIdx = 5;
        let gradeTotalStudents = 0;
        let gradeIssueStudents = 0;
        let gradeSumP = 0, gradeSumK = 0, gradeSumT = 0, gradeSumVP = 0, gradeSumKH = 0;

        // --- 3. Render từng Lớp ---
        classes.forEach(classData => {
            // Lọc học sinh có lỗi
            const studentsToDisplay = classData.students.filter((s: any) => {
                const absencesArray = Object.values(s.absences || {});
                return absencesArray.some((raw: any) => {
                    const parts = (raw || '').split(';').map((p: string) => p.trim());
                    return parts.some((p: string) => {
                        // Regex trích xuất phần chữ cái hoa đầu tiên (P, K, T, VP, KH)
                        const baseCodeMatch = p.match(/^([A-Z]+)/);
                        const baseCode = baseCodeMatch ? baseCodeMatch[1] : p.split('(')[0].trim();
                        return visibleColumns.includes(baseCode);
                    });
                });
            });

            gradeTotalStudents += (classData.totalStudents || classData.students.length);
            gradeIssueStudents += studentsToDisplay.length;

            // --- Class Header (RichText Giống V1) ---
            sheet.mergeCells(`A${currentRowIdx}:${lastColChar}${currentRowIdx}`);
            const classTitleCell = sheet.getCell(`A${currentRowIdx}`);
            const vCount = classData.students.reduce((acc: number, s: any) => {
                const subTotal = Object.values(s.absences || {}).filter((v: any) => 
                    v && (v.toUpperCase().startsWith('P') || v.toUpperCase().startsWith('K'))
                ).length;
                return acc + subTotal;
            }, 0);

            classTitleCell.value = {
                richText: [
                    { text: `| LỚP ${classData.className} \t`, font: { bold: true, size: 13, name: 'Times New Roman', color: { argb: 'FF059669' } } },
                    { text: `(Sĩ số: ${classData.totalStudents || classData.students.length}, `, font: { italic: true, size: 11, name: 'Times New Roman', color: { argb: 'FF1E3A8A' } } },
                    { text: `Tổng lượt Vắng (P/K): ${vCount})`, font: { bold: true, italic: true, size: 11, name: 'Times New Roman', color: { argb: 'FFEF4444' } } }
                ]
            };
            classTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
            classTitleCell.border = BORDER_STYLE;
            currentRowIdx++;

            // --- Table Headers (3 Rows: Date - Day - s/c) ---
            const hIdx = currentRowIdx;
            const subHIdx = currentRowIdx + 1;
            const sesHIdx = currentRowIdx + 2;

            sheet.getColumn(1).width = 12; 
            sheet.getColumn(2).width = 28;

            sheet.getCell(`A${hIdx}`).value = "Mã HS";
            sheet.mergeCells(`A${hIdx}:A${sesHIdx}`);
            sheet.getCell(`B${hIdx}`).value = "Họ và Tên";
            sheet.mergeCells(`B${hIdx}:B${sesHIdx}`);

            [sheet.getCell(`A${hIdx}`), sheet.getCell(`B${hIdx}`)].forEach(c => setHeaderStyle(c, 'F3F4F6'));

            let colIdx = 3;
            dates.forEach(date => {
                const d = date.getDate();
                const dayOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
                const isT7 = dayOfWeek === 'T7';
                const isCN = dayOfWeek === 'CN';
                
                // --- Màu nền tiêu chuẩn ---
                const bgDate = isCN ? 'FEE2E2' : isT7 ? 'FFEDD5' : 'F9FAFB'; 
                const bgDay = 'F1F5F9'; // Nền dòng Thứ theo hình 4
                
                // --- Phân cấp màu S/C (Hình 3) ---
                const bgS = isCN ? 'FEE2E2' : isT7 ? 'FFEDD5' : 'FFFFFF'; // S trắng (Hình 3)
                const bgC = isCN ? 'FEE2E2' : isT7 ? 'FFEDD5' : 'F3F4F6'; // C xám nhạt

                const fCol = isCN ? 'FFB91C1C' : isT7 ? 'FFDD6B20' : 'FF374151'; 

                // Row 1: Date
                const cellDate = sheet.getRow(hIdx).getCell(colIdx);
                cellDate.value = d;
                sheet.mergeCells(hIdx, colIdx, hIdx, colIdx + 1);
                setHeaderStyle(cellDate, bgDate);
                cellDate.font = { ...cellDate.font, color: { argb: fCol } };
                cellDate.alignment = { horizontal: 'center', vertical: 'middle' };

                // Row 2: Day (Nền Xám xanh, Chữ Xanh đậm - Hình 4)
                const cellDay = sheet.getRow(subHIdx).getCell(colIdx);
                cellDay.value = dayOfWeek;
                sheet.mergeCells(subHIdx, colIdx, subHIdx, colIdx + 1);
                setHeaderStyle(cellDay, bgDay);
                cellDay.font = { bold: true, size: 11, name: 'Times New Roman', color: { argb: 'FF1E3A8A' } }; 
                cellDay.alignment = { horizontal: 'center', vertical: 'middle' };

                // Row 3: S / C (S trắng, C xám - Hình 3)
                const cellS = sheet.getRow(sesHIdx).getCell(colIdx);
                cellS.value = "S";
                setHeaderStyle(cellS, bgS);
                sheet.getColumn(colIdx).width = 5.5; 

                const cellC = sheet.getRow(sesHIdx).getCell(colIdx + 1);
                cellC.value = "C";
                setHeaderStyle(cellC, bgC);
                sheet.getColumn(colIdx + 1).width = 5.5;

                // Thêm viền dọc đậm sau mỗi ngày
                [hIdx, subHIdx, sesHIdx].forEach(rIdx => {
                    const c = sheet.getRow(rIdx).getCell(colIdx + 1);
                    c.border = { ...c.border, right: { style: 'medium', color: { argb: 'FFD1D5DB' } } };
                });

                colIdx += 2;
            });

            activeSumConfigs.forEach(h => {
                const cell = sheet.getRow(hIdx).getCell(colIdx);
                cell.value = h.label;
                sheet.mergeCells(hIdx, colIdx, sesHIdx, colIdx);
                
                // Màu sắc đồng bộ Web Grid
                const bgColor = STATUS_COLORS[h.id] || 'FEF9C3';
                setHeaderStyle(cell, bgColor);
                
                if (STATUS_TEXT_COLORS[h.id]) {
                    cell.font = { ...cell.font, color: { argb: `FF${STATUS_TEXT_COLORS[h.id]}` } };
                }
                
                sheet.getColumn(colIdx).width = 5;
                colIdx++;
            });

            currentRowIdx += 3;

            // --- Data Rows ---
            let classSumP = 0, classSumK = 0, classSumT = 0, classSumVP = 0, classSumKH = 0;
            const classDaySums: Record<string, number> = {};

            if (studentsToDisplay.length === 0) {
                sheet.mergeCells(`A${currentRowIdx}:${lastColChar}${currentRowIdx}`);
                const emptyCell = sheet.getCell(`A${currentRowIdx}`);
                emptyCell.value = "Không có dữ liệu vắng/vi phạm";
                emptyCell.font = { italic: true, name: 'Times New Roman' };
                emptyCell.alignment = { horizontal: 'center' };
                emptyCell.border = BORDER_STYLE;
                currentRowIdx++;
            } else {
                studentsToDisplay.forEach(s => {
                    const row = sheet.getRow(currentRowIdx);
                    row.getCell(1).value = s.code;
                    row.getCell(2).value = s.name;
                    row.getCell(2).font = { bold: true, name: 'Times New Roman' };

                    [1, 2].forEach(c => {
                        row.getCell(c).border = BORDER_STYLE;
                        if (c === 1) row.getCell(c).alignment = { horizontal: 'center' };
                    });

                    let dayCIdx = 3;
                    let counts = { P: 0, K: 0, T: 0, VP: 0, KH: 0 };

                    dates.forEach(date => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const rawStatus = s.absences[dateStr] || '';
                        const parts = rawStatus.split(';').map(p => p.trim()).filter(Boolean);

                        const getSessionParts = (session: 'S' | 'C') => {
                            return parts.filter(p => {
                                const code = getBaseCode(p);
                                if (!visibleColumns.includes(code)) return false;
                                const isM = p.includes('(s)') || p.includes('(S)') || p.includes('Sáng') || /T[1-5]/.test(p) || /^[A-Z]+s/i.test(p);
                                const isA = p.includes('(c)') || p.includes('(C)') || p.includes('Chiều') || /T([6-9]|10)/.test(p) || /^[A-Z]+c/i.test(p);
                                const isSC = p.includes('(sc)') || p.includes('(SC)');
                                if (isSC || (!isM && !isA)) return true;
                                return session === 'S' ? isM : isA;
                            });
                        };

                        const sP = getSessionParts('S');
                        const cP = getSessionParts('C');

                        const renderCell = (idx: number, ps: string[]) => {
                            const cell = row.getCell(idx);
                            const codes = Array.from(new Set(ps.map(p => getBaseCode(p)))).join(';');
                            cell.value = codes;
                            cell.border = BORDER_STYLE;
                            cell.alignment = { horizontal: 'center', vertical: 'middle' };
                            cell.font = { name: 'Times New Roman', size: 10, bold: true };

                            if (ps.length > 0) {
                                classDaySums[dateStr] = (classDaySums[dateStr] || 0) + 1;
                                let topCode = ps.some(p => getBaseCode(p).startsWith('K')) ? 'K' :
                                             ps.some(p => getBaseCode(p).startsWith('P')) ? 'P' :
                                             ps.some(p => getBaseCode(p).startsWith('T')) ? 'T' :
                                             ps.some(p => getBaseCode(p).startsWith('VP')) ? 'VP' : '';
                                if (topCode && STATUS_COLORS[topCode]) {
                                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${STATUS_COLORS[topCode]}` } };
                                    if (STATUS_TEXT_COLORS[topCode]) {
                                        cell.font = { ...cell.font, color: { argb: `FF${STATUS_TEXT_COLORS[topCode]}` } };
                                    }
                                }
                                if (ps.some(p => p.includes('['))) {
                                    // Sửa lỗi kiểu dữ liệu: ExcelJS Comment không có width/height trực tiếp
                                    cell.note = {
                                        texts: [{ text: ps.join('\n'), font: { size: 9, name: 'Times New Roman' } }]
                                    };
                                }
                                ps.forEach(p => {
                                    const code = getBaseCode(p);
                                    if (counts.hasOwnProperty(code)) (counts as any)[code]++;
                                });
                            } else if (date.getDay() === 0 || date.getDay() === 6) {
                                const isCN = date.getDay() === 0;
                                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isCN ? 'FFFEE2E2' : 'FFFFEDD5' } };
                            } else {
                                // Hình 3: S trắng, C xám
                                const isC = idx % 2 === 0; // index start from 3 (S) 4 (C)
                                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isC ? 'FFFFFFFF' : 'FFF3F4F6' } };
                            }
                        };

                        renderCell(dayCIdx, sP);
                        renderCell(dayCIdx + 1, cP);
                        
                        // Thêm viền dọc đậm sau mỗi ngày trong phần dữ liệu
                        row.getCell(dayCIdx + 1).border = { 
                            ...row.getCell(dayCIdx + 1).border, 
                            right: { style: 'medium', color: { argb: 'FFD1D5DB' } } 
                        };

                        dayCIdx += 2;
                    });

                    activeSumConfigs.forEach(h => {
                        const val = (counts as any)[h.id] || 0;
                        const cell = row.getCell(dayCIdx++);
                        cell.value = val > 0 ? val : '';
                        cell.border = BORDER_STYLE;
                        cell.alignment = { horizontal: 'center' };
                        cell.font = { bold: true, name: 'Times New Roman' };
                        
                        // Tô màu Pastel cho ô dữ liệu thống kê
                        if (STATUS_COLORS[h.id]) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${STATUS_COLORS[h.id]}` } };
                            if (STATUS_TEXT_COLORS[h.id]) {
                                cell.font = { ...cell.font, color: { argb: `FF${STATUS_TEXT_COLORS[h.id]}` } };
                            }
                        }
                    });

                    classSumP += counts.P; classSumK += counts.K; classSumT += counts.T; classSumVP += counts.VP; classSumKH += counts.KH;
                    currentRowIdx++;
                });
            }

            // --- Class Summary Footer (Merge s/c for centering) ---
            sheet.mergeCells(`A${currentRowIdx}:B${currentRowIdx}`);
            const classSumCell = sheet.getRow(currentRowIdx).getCell(1);
            classSumCell.value = `TỔNG CỘNG LỚP ${classData.className}`;
            setHeaderStyle(classSumCell, 'FEE2E2'); // Nền hồng nhạt đồng nhất theo feedback Sếp
            classSumCell.font = { bold: true, size: 11, name: 'Times New Roman', color: { argb: 'FF991B1B' } };
            
            let footerIdx = 3;
            dates.forEach(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const val = classDaySums[dateStr] || 0;
                
                sheet.mergeCells(currentRowIdx, footerIdx, currentRowIdx, footerIdx + 1);
                const c = sheet.getRow(currentRowIdx).getCell(footerIdx);
                c.value = val > 0 ? val : '';
                setHeaderStyle(c, 'FEE2E2'); // Nền hồng nhạt đồng nhất
                c.font = { bold: true, name: 'Times New Roman', color: { argb: 'FF1F2937' } };
                
                // Viền dọc đậm cho footer
                c.border = { ...c.border, right: { style: 'medium', color: { argb: 'FFD1D5DB' } } };
                
                footerIdx += 2;
            });

            activeSumConfigs.forEach(h => {
                let val = 0;
                if (h.id === 'P') val = classSumP;
                else if (h.id === 'K') val = classSumK;
                else if (h.id === 'T') val = classSumT;
                else if (h.id === 'VP') val = classSumVP;
                else if (h.id === 'KH') val = classSumKH;
                
                const c = sheet.getRow(currentRowIdx).getCell(footerIdx++);
                c.value = val > 0 ? val : '';
                setHeaderStyle(c, STATUS_COLORS[h.id] || 'FEF9C3');
                
                // Giữ màu chữ khác nhau cho từng loại
                if (STATUS_TEXT_COLORS[h.id]) {
                    c.font = { bold: true, name: 'Times New Roman', size: 11, color: { argb: `FF${STATUS_TEXT_COLORS[h.id]}` } };
                } else {
                    c.font = { bold: true, name: 'Times New Roman', size: 11 };
                }
            });

            gradeSumP += classSumP; gradeSumK += classSumK; gradeSumT += classSumT; gradeSumVP += classSumVP; gradeSumKH += classSumKH;
            currentRowIdx += 3;
        });

        // --- Grand Summary for Grade ---
        sheet.mergeCells(`A${currentRowIdx}:${getColumnLabel(6)}${currentRowIdx}`);
        const gradeSumTitle = sheet.getCell(`A${currentRowIdx}`);
        gradeSumTitle.value = `BẢNG TỔNG HỢP TOÀN KHỐI ${grade}`;
        gradeSumTitle.font = { bold: true, size: 14, name: 'Times New Roman', color: { argb: 'FFFFFFFF' } };
        gradeSumTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
        gradeSumTitle.alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getRow(currentRowIdx).height = 30;
        currentRowIdx++;

        const summaryData = [
            { label: 'Tổng số học sinh toàn khối:', value: gradeTotalStudents, color: 'FF1E3A8A' },
            { label: 'Số học sinh có vắng/vi phạm:', value: gradeIssueStudents, color: 'FFB91C1C' }
        ];

        summaryData.forEach((item, idx) => {
            sheet.mergeCells(`A${currentRowIdx}:D${currentRowIdx}`);
            const lbl = sheet.getCell(`A${currentRowIdx}`);
            lbl.value = item.label;
            lbl.border = BORDER_STYLE;
            lbl.font = { name: 'Times New Roman', size: 12 };

            // Merge Value cells (E-F) to avoid text overflow
            sheet.mergeCells(`E${currentRowIdx}:F${currentRowIdx}`);
            const val = sheet.getCell(`E${currentRowIdx}`);
            val.value = `${item.value} HS`;
            val.font = { bold: true, name: 'Times New Roman', size: 12, color: { argb: item.color } };
            val.border = BORDER_STYLE;
            val.alignment = { horizontal: 'right' };

            const bg = idx % 2 === 0 ? 'F9FAFB' : 'F3F4F6';
            lbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bg}` } };
            val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bg}` } };
            currentRowIdx++;
        });
    });

    try {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        triggerDownload(blob, `${fileName}_V2_SC.xlsx`);
    } catch (err) {
        console.error("[exportMonthlyReportV2] Lỗi:", err);
        throw err;
    }
};
