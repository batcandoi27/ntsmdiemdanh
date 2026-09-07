/**
 * School Matrix Timetable Exporter
 * Xuất toàn bộ Thời Khóa Biểu của trường ra file Excel (.xlsx) chuẩn 100% mẫu ma trận (TKB Lớp).
 * Gồm 2 Sheet: SÁNG và CHIỀU.
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Timetable, DayOfWeek, DAY_ORDER } from '@/types/timetable';
import { SchoolMatrixMetadata } from './school-matrix-timetable-parser';

const DAY_HEADER = [null, 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export function generateSchoolMatrixWorkbook(
    timetables: Timetable[],
    meta?: SchoolMatrixMetadata
): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();

    const schoolName = meta?.schoolName || 'THCS TRẦN BỘI CƠ';
    const semester = meta?.semester || '1';
    const academicYear = meta?.academicYear || '2026-2027';

    // Sắp xếp danh sách lớp theo thứ tự tự nhiên
    const sortedTimetables = [...timetables].sort((a, b) => {
        return a.className.localeCompare(b.className, 'vi', { numeric: true });
    });

    // Helper tạo data cho 1 sheet (SÁNG hoặc CHIỀU)
    function buildSheetData(session: 'morning' | 'afternoon', maxPeriods: number): any[][] {
        const rows: any[][] = [];

        // 3 dòng tiêu đề đầu
        rows.push(['Trường', schoolName]);
        rows.push(['Học kỳ', semester]);
        rows.push(['Năm học', academicYear]);

        for (const tt of sortedTimetables) {
            // Định dạng ngày có hiệu lực (dd/mm/yyyy)
            let formattedDate = '07/09/2026';
            if (tt.effectiveFrom) {
                const parts = tt.effectiveFrom.split('-');
                if (parts.length === 3) {
                    formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
            }

            // Dòng Lớp
            rows.push([null, null, null, 'Lớp', tt.className]);
            // Dòng Ngày hiệu lực
            rows.push([null, null, null, 'Có tác dụng từ ngày', null, formattedDate]);
            // Dòng Buổi
            rows.push([session === 'morning' ? 'Buổi sáng' : 'Buổi chiều']);
            // Dòng Tiêu đề ngày
            rows.push(DAY_HEADER);

            // Các dòng tiết học (1..maxPeriods)
            for (let p = 1; p <= maxPeriods; p++) {
                const periodRow: any[] = [p];
                for (const day of DAY_ORDER) {
                    const slots = tt.schedule[day]?.[session] || [];
                    const found = slots.find(s => s.period === p);
                    periodRow.push(found ? found.subject : null);
                }
                rows.push(periodRow);
            }
        }

        return rows;
    }

    // 1. Sheet SÁNG (Tối đa 5 tiết)
    const sangData = buildSheetData('morning', 5);
    const wsSang = XLSX.utils.aoa_to_sheet(sangData);
    // Thiết lập độ rộng cột
    wsSang['!cols'] = [
        { wch: 10 }, // Cột Tiết / Metadata
        { wch: 18 }, // Thứ 2
        { wch: 18 }, // Thứ 3
        { wch: 18 }, // Thứ 4
        { wch: 18 }, // Thứ 5
        { wch: 18 }, // Thứ 6
        { wch: 18 }, // Thứ 7
    ];
    XLSX.utils.book_append_sheet(wb, wsSang, 'SÁNG');

    // 2. Sheet CHIỀU (Tối đa 4 tiết)
    const chieuData = buildSheetData('afternoon', 4);
    const wsChieu = XLSX.utils.aoa_to_sheet(chieuData);
    wsChieu['!cols'] = [
        { wch: 10 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsChieu, 'CHIỀU');

    return wb;
}

/**
 * Tải file Excel TKB Toàn Trường về máy người dùng
 */
export function exportSchoolMatrixTimetableFile(
    timetables: Timetable[],
    meta?: SchoolMatrixMetadata,
    customFileName?: string
): void {
    const wb = generateSchoolMatrixWorkbook(timetables, meta);
    const fileName = customFileName || `TKB_TOAN_TRUONG_${meta?.academicYear || '2026-2027'}_HK${meta?.semester || '1'}.xlsx`;

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, fileName);
}
