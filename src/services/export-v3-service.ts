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
            year: classes.length > 0 ? classes[0].academicYear || '2025-2026' : '2025-2026',
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

    // Build attendance maps: studentCode → date → status/note
    const attendanceMap = new Map<string, Map<string, string>>();
    const notesMap = new Map<string, Map<string, string>>();

    // Helper: Build Display text for Excel cell (VPc1-5 style)
    const getShortCode = (type: string, periods: number[]) => {
        if (periods.length === 0) return type; // If no periods, just return the type
        if (periods.length >= 5) {
            // If 5 or more periods are present, assume full session and simplify to just the type
            return type;
        }
        const sorted = Array.from(new Set(periods)).sort((a,b) => a - b);
        const ranges: string[] = [];
        let start = sorted[0], prev = sorted[0];
        for (let i = 1; i <= sorted.length; i++) {
            if (i < sorted.length && sorted[i] === prev + 1) prev = sorted[i];
            else {
                if (start === prev) ranges.push(`${start}`); else ranges.push(`${start}-${prev}`);
                if (i < sorted.length) { start = sorted[i]; prev = sorted[i]; }
            }
        }
        return `${type}c${ranges.join(',')}`;
    };

    // Helper: Deep format notes (T1,3: ...)
    const formatDeepNotes = (notesMap: Record<number, string>) => {
        const notePs: Record<string, number[]> = {};
        Object.entries(notesMap).forEach(([p, v]) => {
            if (!v) return;
            if (!notePs[v]) notePs[v] = [];
            notePs[v].push(Number(p));
        });
        const parts: string[] = [];
        Object.entries(notePs).forEach(([noteText, periods]) => {
            const sorted = Array.from(new Set(periods)).sort((a,b) => a - b);
            if (sorted.length >= 5 && sorted.includes(1) && sorted.includes(5)) {
                 parts.push(noteText);
            } else {
                const ranges: string[] = [];
                let start = sorted[0], prev = sorted[0];
                for (let i = 1; i <= sorted.length; i++) {
                    if (i < sorted.length && sorted[i] === prev + 1) prev = sorted[i];
                    else {
                        if (start === prev) ranges.push(`${start}`); else ranges.push(`${start}-${prev}`);
                        if (i < sorted.length) { start = sorted[i]; prev = sorted[i]; }
                    }
                }
                parts.push(`T${ranges.join(',')}: ${noteText}`);
            }
        });
        return parts.join(", ");
    };

    const getCoreType = (st: string) => {
        if (!st) return '';
        const core = st.split(/[\(\[sc]/)[0].trim().toUpperCase();
        return core;
    };

    for (const [date, records] of Object.entries(data.attendance)) {
        // Group records by student
        const studentToRecords = new Map<string, typeof records>();
        records.forEach(r => {
            const sid = r.studentId;
            if (!studentToRecords.has(sid)) studentToRecords.set(sid, []);
            studentToRecords.get(sid)!.push(r);
        });

        studentToRecords.forEach((sRecords, sKey) => {
            if (!attendanceMap.has(sKey)) {
                attendanceMap.set(sKey, new Map());
                notesMap.set(sKey, new Map());
            }

            const aggregated: any = {
                statuses: new Set<string>(),
                vPs: new Set<number>(),
                kHs: new Set<number>(),
                vNotes: {} as Record<number, string>,
                sNotes: {} as Record<number, string>
            };

            const explode = (notes?: Record<number, string>, fallbackNote?: string, p?: number | null) => {
                const result: Record<number, string> = { ...notes };
                if (result[0]) {
                    const n = result[0];
                    [1,2,3,4,5].forEach(i => { if (!result[i]) result[i] = n; });
                    delete result[0];
                }
                if (Object.keys(result).length === 0 && fallbackNote) {
                    if (p) result[p] = fallbackNote;
                    else [1,2,3,4,5].forEach(i => { result[i] = fallbackNote; });
                }
                return result;
            };

            sRecords.forEach(r => {
                // Status chính
                const st = r.status as string;
                if (['absent', 'K', 'V', 'excused', 'P', 'late', 'T'].includes(st)) {
                    let code = 'K';
                    if (st === 'excused' || st === 'P') code = 'P';
                    else if (st === 'late' || st === 'T') code = 'T';
                    aggregated.statuses.add(code);
                    
                    const decoded = explode((r as any).statusNotes, r.note, r.period);
                    Object.entries(decoded).forEach(([p, v]) => { aggregated.sNotes[Number(p)] = v; });
                }

                // Vi phạm
                if (r.violation || st === 'violation' || st === 'VP') {
                    aggregated.statuses.add('VP');
                    if (r.violationPeriods) r.violationPeriods.forEach(p => aggregated.vPs.add(p));
                    else if (r.period) aggregated.vPs.add(r.period);
                    else [1,2,3,4,5].forEach(p => aggregated.vPs.add(p));

                    const decoded = explode((r as any).violationNotes, r.violationNote || r.note, r.period);
                    Object.entries(decoded).forEach(([p, v]) => { 
                        const pk = Number(p);
                        aggregated.vNotes[pk] = aggregated.vNotes[pk] ? `${aggregated.vNotes[pk]}, ${v}` : v;
                    });
                }
                
                // Khen thưởng
                if (r.reward || (r as any).praise || st === 'KH' || st === 'reward') {
                    aggregated.statuses.add('KH');
                }
            });

            // Build Short Codes for Cell
            const codes: string[] = [];
            if (aggregated.statuses.has('P')) codes.push('P');
            if (aggregated.statuses.has('K')) codes.push('K');
            if (aggregated.statuses.has('T')) codes.push('T');
            if (aggregated.statuses.has('VP')) codes.push(getShortCode('VP', Array.from(aggregated.vPs)));
            if (aggregated.statuses.has('KH')) codes.push('KH');
            
            attendanceMap.get(sKey)!.set(date, codes.join(', '));

            // Build Full Note for Comment
            const part1 = formatDeepNotes(aggregated.sNotes);
            const part2 = formatDeepNotes(aggregated.vNotes);
            const fullComment = [part1, part2].filter(Boolean).join(" | ");
            if (fullComment) {
                notesMap.get(sKey)!.set(date, fullComment);
            }
        });
    }

    const sortedStudents = [...data.students].sort((a, b) => {
        const nameA = (a as any).name || a.fullName || '';
        const nameB = (b as any).name || b.fullName || '';
        return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' });
    });

    sortedStudents.forEach(s => {
        const sKey = s.code || s.id; // Fallback to id if code not present (legacy)
        const rowData: any[] = [(s as any).stt || '', (s as any).name || s.fullName, s.classId || ''];
        
        dates.forEach(date => {
            rowData.push(attendanceMap.get(sKey)?.get(date) || '');
        });

        // Add row to sheet
        const row = sheet2.addRow(rowData);

        // Add notes (comments) to cells
        dates.forEach((date, idx) => {
            const note = notesMap.get(sKey)?.get(date);
            if (note) {
                const cell = row.getCell(4 + idx); // 1:order, 2:name, 3:class, 4+:dates
                cell.note = note;
            }
        });
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
