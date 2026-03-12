/**
 * Export Service v3.0
 *
 * Multi-format export: Excel (multi-sheet), JSON, ZIP bundle.
 * Client-side processing using ExcelJS + jszip + file-saver.
 */

import { Student, Class, AppUser, StudentStatus } from '@/types/models';
import { AttendanceRecordV3 } from '@/types/attendance-v3';
import { Timetable, DAY_LABELS, SESSION_LABELS, DAY_ORDER } from '@/types/timetable';

// ============================================
// JSON Export
// ============================================

export interface ExportData {
    meta: {
        schoolName: string;
        schoolCode: string;
        year: string;
        exportDate: string;
        exportedBy: string;
        version: '3.0';
    };
    classes: Class[];
    students: Student[];
    attendance: Record<string, AttendanceRecordV3[]>; // date → records
    timetables: Timetable[];
}

export function buildExportData(
    classes: Class[],
    students: Student[],
    attendance: Record<string, AttendanceRecordV3[]>,
    timetables: Timetable[],
    exportedBy: string
): ExportData {
    return {
        meta: {
            schoolName: process.env.NEXT_PUBLIC_SCHOOL_NAME || 'Unknown',
            schoolCode: process.env.NEXT_PUBLIC_SCHOOL_CODE || '',
            year: '2025-2026',
            exportDate: new Date().toISOString(),
            exportedBy,
            version: '3.0',
        },
        classes,
        students,
        attendance,
        timetables,
    };
}

export function exportToJSON(data: ExportData): string {
    return JSON.stringify(data, null, 2);
}

// ============================================
// Excel Export (using ExcelJS)
// ============================================

/**
 * Build multi-sheet Excel workbook
 * Sheet 1: Danh sách HS (kèm status, sĩ số thực tế)
 * Sheet 2: Điểm danh pivot
 * Sheet 3: Thời Khoá Biểu
 * Sheet 4: Lịch sử Status HS
 */
export async function buildExcelWorkbook(
    data: ExportData
): Promise<ArrayBuffer> {
    // Dynamic import to avoid SSR issues
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();

    workbook.creator = data.meta.exportedBy;
    workbook.created = new Date();

    // === Sheet 1: Danh sách HS ===
    const sheet1 = workbook.addWorksheet('Danh sách HS');
    sheet1.columns = [
        { header: 'STT', key: 'order', width: 6 },
        { header: 'Mã HS', key: 'code', width: 12 },
        { header: 'Họ tên', key: 'fullName', width: 25 },
        { header: 'Lớp', key: 'classId', width: 10 },
        { header: 'Giới tính', key: 'gender', width: 10 },
        { header: 'Ngày sinh', key: 'birthday', width: 12 },
        { header: 'Trạng thái', key: 'status', width: 15 },
        { header: 'Dân tộc', key: 'ethnicity', width: 10 },
    ];

    // Bold header + freeze
    sheet1.getRow(1).font = { bold: true };
    sheet1.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];

    data.students.forEach(s => {
        sheet1.addRow({
            order: s.order,
            code: s.code,
            fullName: s.fullName,
            classId: s.classId,
            gender: s.gender,
            birthday: s.birthday,
            status: s.statusV3 || s.status,
            ethnicity: s.ethnicity || '',
        });
    });

    // === Sheet 2: Điểm danh ===
    const sheet2 = workbook.addWorksheet('Điểm danh');
    // Get all dates that have attendance data
    const dates = Object.keys(data.attendance).sort();

    const attendanceHeaders = [
        { header: 'STT', key: 'order', width: 6 },
        { header: 'Họ tên', key: 'fullName', width: 25 },
        { header: 'Lớp', key: 'classId', width: 10 },
        ...dates.map(d => ({ header: d, key: d, width: 8 })),
        { header: 'Tổng vắng', key: 'totalAbsent', width: 10 },
    ];
    sheet2.columns = attendanceHeaders;
    sheet2.getRow(1).font = { bold: true };
    sheet2.views = [{ state: 'frozen', ySplit: 1, xSplit: 3 }];

    // Build attendance map: studentId → date → status
    const attendanceMap = new Map<string, Map<string, string>>();
    for (const [date, records] of Object.entries(data.attendance)) {
        for (const record of records) {
            if (!attendanceMap.has(record.studentId)) {
                attendanceMap.set(record.studentId, new Map());
            }
            let statusCode = '';
            if (record.status === 'absent') statusCode = 'K';
            else if (record.status === 'excused') statusCode = 'P';
            else if (record.status === 'late') {
                statusCode = 'T';
                if (record.missedPeriods && record.missedPeriods.length > 0) {
                    statusCode = `T (T${record.missedPeriods.join(', ')})`;
                }
            }

            // Nếu có vi phạm, ghi thêm vào mã (cho export v3)
            if (record.violation) {
                statusCode = statusCode ? `${statusCode}, VP` : 'VP';
            }
            if (record.praise) {
                statusCode = statusCode ? `${statusCode}, KH` : 'KH';
            }

            attendanceMap.get(record.studentId)!.set(date, statusCode);
        }
    }

    data.students.forEach(s => {
        const row: Record<string, unknown> = {
            order: s.order,
            fullName: s.fullName,
            classId: s.classId,
        };
        let totalAbsent = 0;
        for (const date of dates) {
            const val = attendanceMap.get(s.id)?.get(date) || '';
            row[date] = val;
            if (val === 'V') totalAbsent++;
        }
        row['totalAbsent'] = totalAbsent;
        sheet2.addRow(row);
    });

    // === Sheet 3: Thời Khoá Biểu ===
    const sheet3 = workbook.addWorksheet('TKB');
    sheet3.columns = [
        { header: 'Lớp', key: 'className', width: 10 },
        { header: 'Thứ', key: 'day', width: 10 },
        { header: 'Buổi', key: 'session', width: 8 },
        { header: 'Tiết', key: 'period', width: 6 },
        { header: 'Môn', key: 'subject', width: 15 },
        { header: 'GV', key: 'teacherName', width: 20 },
        { header: 'Phòng', key: 'room', width: 10 },
    ];
    sheet3.getRow(1).font = { bold: true };

    for (const tt of data.timetables) {
        for (const day of DAY_ORDER) {
            for (const session of ['morning', 'afternoon'] as const) {
                const slots = tt.schedule[day][session];
                for (const slot of slots) {
                    sheet3.addRow({
                        className: tt.className,
                        day: DAY_LABELS[day],
                        session: SESSION_LABELS[session],
                        period: slot.period,
                        subject: slot.subject,
                        teacherName: slot.teacherName || '',
                        room: slot.room || '',
                    });
                }
            }
        }
    }

    // === Sheet 4: Status History ===
    const sheet4 = workbook.addWorksheet('Lịch sử trạng thái');
    sheet4.columns = [
        { header: 'Mã HS', key: 'code', width: 12 },
        { header: 'Họ tên', key: 'fullName', width: 25 },
        { header: 'Trạng thái', key: 'status', width: 15 },
        { header: 'Ngày', key: 'date', width: 12 },
        { header: 'Lý do', key: 'note', width: 30 },
        { header: 'Người đổi', key: 'changedBy', width: 20 },
    ];
    sheet4.getRow(1).font = { bold: true };

    for (const s of data.students) {
        if (s.statusHistory) {
            for (const change of s.statusHistory) {
                sheet4.addRow({
                    code: s.code,
                    fullName: s.fullName,
                    status: change.status,
                    date: change.date?.split('T')[0] || '',
                    note: change.note,
                    changedBy: change.changedByName,
                });
            }
        }
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as ArrayBuffer;
}

// ============================================
// ZIP Bundle (using jszip)
// ============================================

export async function buildZipBundle(data: ExportData): Promise<Blob> {
    const JSZip = (await import('jszip')).default || await import('jszip');
    await import('file-saver');

    const zip = new (JSZip as any)();

    // JSON
    zip.file('FullData.json', exportToJSON(data));

    // Excel
    const excelBuffer = await buildExcelWorkbook(data);
    zip.file('DanhSach_DiemDanh.xlsx', excelBuffer);

    return await zip.generateAsync({ type: 'blob' });
}

// ============================================
// Download Helpers
// ============================================

export function downloadJSON(data: ExportData, filename?: string) {
    const json = exportToJSON(data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `Data_${data.meta.year}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

export async function downloadExcel(data: ExportData, filename?: string) {
    const buffer = await buildExcelWorkbook(data);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `DanhSach_DiemDanh_${data.meta.year}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
}

export async function downloadZip(data: ExportData, filename?: string) {
    const blob = await buildZipBundle(data);
    const { saveAs } = await import('file-saver');
    saveAs(blob, filename || `Data_${data.meta.year}.zip`);
}
