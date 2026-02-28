'use server';

import { db } from '@/services/db';
import { AttendanceRecord, AttendanceStatus, PeriodRecord, AppUser } from '@/types/models';
import { getCustomColumns } from '@/services/column-service';
import { getAllRecordsForColumn, getOneTimeRecords } from '@/services/record-service';
import { TermReportData } from '@/lib/export-utils';
import { markAttendance, markPresent } from '@/services/attendance-v3-service';
import { revalidatePath } from 'next/cache';

const mockAdminUser: AppUser = {
    uid: 'admin-report',
    displayName: 'Report System',
    role: 'admin',
    assignedClassIds: [],
    permissions: {
        canEditAttendance: true,
        canEditStudentStatus: true,
        canCreateAccounts: true,
        canViewAllClasses: true,
        canExportData: true,
        canManageTimetable: true,
        canAccessAPI: true,
    },
    editWindowMinutes: -1,
    isActive: true,
    createdAt: new Date().toISOString()
};

export interface ExportData {
    className: string;
    students: {
        code: string;
        name: string;
        absences: Record<string, string>; // date (YYYY-MM-DD) -> status
    }[];
    year: number;
    month: number;
}

export interface ReportCriteria {
    startDate: string;
    endDate: string;
    classIds?: string[];
    grade?: number; // Optional filter by grade
}

export interface AbsenceDetail {
    id: string; // unique key
    studentName: string;
    studentCode: string;
    className: string;
    classId: string;
    stt: number; // Student's index in class
    date: string;
    status: AttendanceStatus;
    notes?: string;
}

export interface ReportResult {
    totalP: number;
    totalK: number;
    totalV: number;
    totalT: number;
    totalVP: number;
    totalKH: number;
    absences: AbsenceDetail[];
    classSizes?: Record<string, number>;
}

function filterActiveStudentsForReport(students: any[], reportStartDate: string) {
    const reportStart = new Date(reportStartDate);
    reportStart.setHours(0, 0, 0, 0);

    return students.filter(s => {
        const isDroppedOut = s.status === 'Nghỉ học' || s.status === 'Chuyển trường' || s.statusV3 === 'dropped_out';
        if (!isDroppedOut) return true;

        if (s.statusDate) {
            const dropDate = new Date(s.statusDate);
            dropDate.setHours(0, 0, 0, 0);
            // Include iff they dropped out strictly AFTER the report start date
            return dropDate > reportStart;
        }
        return false; // exclude legacy dropped out students without a date
    });
}

export async function getReports(criteria: ReportCriteria): Promise<ReportResult> {
    console.log('=== GET REPORT CALLED ===', criteria);
    // 1. Get raw attendance records
    const records = await db.getReportData(criteria.startDate, criteria.endDate, criteria.classIds);
    console.log('Records returned from DB:', records.length);
    if (records.length > 0) {
        console.log('Sample record:', records[0]);
    }

    // 2. Fetch Class Info if needed (to map Class ID -> Name)
    // Optimization: Fetch all classes once and cache map
    const classes = await db.getClasses();
    const classMap = new Map(classes.map(c => [c.id, c.name]));

    // 3. Process Data
    const absences: AbsenceDetail[] = [];
    let totalP = 0;
    let totalK = 0;
    let totalV = 0;
    let totalT = 0;
    let totalVP = 0;
    let totalKH = 0;

    const recordsByClass: Record<string, AttendanceRecord[]> = {};
    records.forEach(r => {
        if (!recordsByClass[r.classId]) recordsByClass[r.classId] = [];
        recordsByClass[r.classId].push(r);
    });

    const classSizes: Record<string, number> = {};

    for (const [classId, classRecords] of Object.entries(recordsByClass)) {
        // Fetch students for this class
        let students = await db.getStudentsByClass(classId);
        students = filterActiveStudentsForReport(students, criteria.startDate);

        classSizes[classId] = students.length;

        // Map Code -> { Name, STT }
        const studentInfoMap = new Map(students.map((s, index) => [
            s.code,
            { name: s.fullName, stt: index + 1 }
        ]));

        classRecords.forEach((record: any) => {
            // Hỗ trợ cả Format cũ (V1 có absences map) và Format mới (V3 - Exception only)

            // Xử lý logic Format cũ V1
            if (record.absences) {
                Object.entries(record.absences).forEach(([code, status]) => {
                    if (status && status !== 'C' && (status as string) !== '') {
                        if (status === 'P') totalP++;
                        if (status === 'K') totalK++;
                        if (status === 'V') totalV++;
                        if (status === 'T') totalT++;
                        if (status === 'VP') totalVP++;
                        if (status === 'KH') totalKH++;

                        const info = studentInfoMap.get(code) || { name: code, stt: 0 };

                        absences.push({
                            id: `${record.date}_${code}`,
                            date: record.date,
                            classId: classId,
                            className: classMap.get(classId) || classId,
                            studentCode: code,
                            studentName: info.name,
                            stt: info.stt,
                            status: status as AttendanceStatus,
                            notes: record.notes ? record.notes[code] : undefined
                        });
                    }
                });
            } else if (record.studentId && record.status) {
                // Xử lý logic Format mới V3 (Từng Record điểm danh lẻ)
                const code = record.studentId;
                let status = record.status;

                // Chuẩn hoá status vì V3 format mới dài chữ tiếng anh
                if (status === 'absent') status = 'K';
                if (status === 'excused') status = 'P';
                if (status === 'late') status = 'T';
                if (status === 'violation') status = 'VP';
                if (status === 'praise') status = 'KH';

                if (status === 'P') totalP++;
                if (status === 'K') totalK++;
                if (status === 'V') totalV++;
                if (status === 'T') totalT++;
                if (status === 'VP') totalVP++;
                if (status === 'KH') totalKH++;

                const info = studentInfoMap.get(code) || { name: record.studentName || code, stt: 0 };

                // Do V3 lưu timestamp, extract lại ngày nếu Date không chuẩn
                const dateKey = record.date || (record.timestamp ? record.timestamp.split('T')[0] : '');

                absences.push({
                    id: record.id || `${dateKey}_${code}`,
                    date: dateKey,
                    classId: classId,
                    className: classMap.get(classId) || classId,
                    studentCode: code,
                    studentName: info.name,
                    stt: info.stt,
                    status: status as AttendanceStatus,
                    notes: record.note || undefined
                });
            }
        });
    }

    // Sort by Date DESC
    // The instruction implies sorting by STT, but the original code sorts by date.
    // Assuming the instruction wants to change the sorting for getReports as well.
    // The provided snippet was malformed, so I'm interpreting it as:
    // 1. Keep the `absences` array name.
    // 2. Sort by `stt` then by `date` (to maintain some order).
    // 3. The `results` variable in the snippet was likely a placeholder for `absences`.
    absences.sort((a, b) => {
        if (a.stt !== b.stt) {
            return a.stt - b.stt;
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime(); // Secondary sort by date DESC
    });

    return {
        totalP, totalK, totalV, totalT, totalVP, totalKH,
        absences: absences,
        classSizes
    };
}

export async function getExcelExportData(
    startDate: string,
    endDate: string,
    classIds: string[],
    isCompact: boolean = false
): Promise<ExportData[]> {
    // 1. Get raw attendance records
    const records = await db.getReportData(startDate, endDate, classIds);

    // 2. Fetch target classes
    const classesInfo = await db.getClasses();
    const targetClasses = classIds.length > 0
        ? classesInfo.filter(c => classIds.includes(c.id))
        : classesInfo;

    const startD = new Date(startDate);
    const exportYear = startD.getFullYear();
    const exportMonth = startD.getMonth() + 1; // 1-12

    const result: ExportData[] = [];

    // Group records by class
    const recordsByClass: Record<string, any[]> = {};
    records.forEach(r => {
        if (!recordsByClass[r.classId]) recordsByClass[r.classId] = [];
        recordsByClass[r.classId].push(r);
    });

    for (const cls of targetClasses) {
        // Fetch all students in this class
        let students = await db.getStudentsByClass(cls.id);
        students = filterActiveStudentsForReport(students, startDate);

        const classRecords = recordsByClass[cls.id] || [];

        const mappedStudents: { code: string; name: string; absences: Record<string, string> }[] = [];

        students.forEach((student) => {
            const absences: Record<string, string> = {};
            let hasAbsence = false;

            // V3 data: record is 1 exception
            classRecords.filter(r => r.studentId === student.code || (r.absences && r.absences[student.code])).forEach(r => {
                if (r.studentId && r.status) {
                    // It's V3 format
                    let statusCode = r.status;
                    if (statusCode === 'absent') statusCode = 'K';
                    if (statusCode === 'excused') statusCode = 'P';
                    if (statusCode === 'late') statusCode = 'T';
                    if (statusCode === 'violation') statusCode = 'VP';
                    if (statusCode === 'praise') statusCode = 'KH';

                    const dateStr = r.date || r.timestamp?.split('T')[0];
                    if (dateStr) {
                        absences[dateStr] = statusCode;
                        if (statusCode && statusCode !== '' && statusCode !== 'C') hasAbsence = true;
                    }
                } else if (r.absences && r.absences[student.code]) {
                    // It's V1 format
                    const statusCode = r.absences[student.code];
                    absences[r.date] = statusCode;
                    if (statusCode && statusCode !== '' && statusCode !== 'C') hasAbsence = true;
                }
            });

            // Filter compact logic
            if (!isCompact || (isCompact && hasAbsence)) {
                mappedStudents.push({
                    code: student.code,
                    name: student.fullName,
                    absences
                });
            }
        });

        // Only add class sheet if there are students to display
        if (mappedStudents.length > 0) {
            result.push({
                className: cls.name,
                year: exportYear,
                month: exportMonth,
                students: mappedStudents.map(({ code, name, absences }) => ({ code, name, absences }))
            });
        }
    }

    // Sort by class name
    result.sort((a, b) => a.className.localeCompare(b.className));
    return result;
}

export async function getMonthlyReportData(classId: string, month: number, year: number) {
    // 1. Get Class Info
    const classes = await db.getClasses();
    const cls = classes.find(c => c.id === classId);
    if (!cls) throw new Error('Class not found');

    // 2. Get Students
    // Sorting by Name (or default DB order which is usually STT)
    let students = await db.getStudentsByClass(classId);
    // Start of the given month
    const reportStartDate = new Date(year, month - 1, 1).toISOString();
    students = filterActiveStudentsForReport(students, reportStartDate);

    // 3. Get Attendance Records for Month
    const records = await db.getMonthlyAttendance(classId, month, year);

    // 4. Map to Export Format
    // Format: date "YYYY-MM-DD" -> status
    const studentData = students.map((s, idx) => {
        const absences: Record<string, string> = {};
        records.forEach((r: any) => {
            // V1 logic
            if (r.absences && r.absences[s.code]) {
                const status = r.absences[s.code];
                if (status && status !== 'C' && status !== '') {
                    absences[r.date] = status;
                }
            }
            // V3 logic
            else if (r.studentId === s.code && r.status) {
                let status = r.status;
                if (status === 'absent') status = 'K';
                if (status === 'excused') status = 'P';
                if (status === 'late') status = 'T';
                if (status === 'violation') status = 'VP';
                const dateKey = r.date || (r.timestamp ? r.timestamp.split('T')[0] : '');
                if (dateKey) {
                    absences[dateKey] = status;
                }
            }
        });
        return {
            stt: idx + 1, // Export STT as well if needed
            code: s.code,
            name: s.fullName,
            absences
        };
    });

    return {
        className: cls.name,
        year,
        month,
        students: studentData
    };
}


export async function getAdvancedReportData(startDate: string, endDate: string, classIds: string[], userId?: string): Promise<TermReportData[]> {
    // 1. Get Classes
    const allClasses = await db.getClasses();
    const targetClasses = classIds.length > 0
        ? allClasses.filter(c => classIds.includes(c.id))
        : allClasses;

    const reports: TermReportData[] = [];

    for (const cls of targetClasses) {
        // 2. Get Students
        let students = await db.getStudentsByClass(cls.id);
        students = filterActiveStudentsForReport(students, startDate);

        // 3. Get Custom Columns (Filtered by userId)
        const columns = await getCustomColumns(cls.id, userId);
        const reportColumns = columns.filter(c => !c.archived && (c.frequency === 'period' || c.frequency === 'one_time'))
            .map(c => ({
                id: c.id,
                name: c.name,
                frequency: c.frequency,
                subPeriods: c.subPeriods?.map(sp => sp.label)
            }));

        // 4. Get Data
        const data: Record<string, { stats: Record<string, number>; custom: Record<string, string> }> = {};

        // Initialize Data
        students.forEach(s => {
            data[s.id] = { stats: {}, custom: {} };
        });

        // 4a. Get Basic Stats (P, K, T...)
        // We reuse getReportData from DB service which returns raw records
        const attendanceRecords = await db.getReportData(startDate, endDate, [cls.id]);

        attendanceRecords.forEach((record: any) => {
            // V1 logic
            if (record.absences) {
                Object.entries(record.absences).forEach(([studentCode, status]) => {
                    const student = students.find(s => s.code === studentCode);
                    if (student && status && status !== 'C' && (status as string) !== '') {
                        if (!data[student.id].stats[status as string]) data[student.id].stats[status as string] = 0;
                        data[student.id].stats[status as string]++;
                    }
                });
            }
            // V3 logic
            else if (record.studentId && record.status) {
                const studentCode = record.studentId;
                let status = record.status;
                if (status === 'absent') status = 'K';
                if (status === 'excused') status = 'P';
                if (status === 'late') status = 'T';
                if (status === 'violation') status = 'VP';

                const student = students.find(s => s.code === studentCode);
                if (student && status) {
                    if (!data[student.id].stats[status]) data[student.id].stats[status] = 0;
                    data[student.id].stats[status]++;
                }
            }
        });

        // 4b. Get Custom Records
        for (const col of columns) {
            if (col.archived) continue;

            if (col.frequency === 'period') {
                const allR = await getAllRecordsForColumn(col.id, { startDate, endDate });
                const records = allR as PeriodRecord[];
                records.forEach(r => {
                    const student = students.find(s => s.code === r.studentCode); // periods use Code
                    if (student) {
                        // For Multi-Period, we might want to allow formatting
                        // But for Excel single cell, maybe join them? 
                        // Or if spreadsheet expects multiple columns?
                        // capture: "Sub1: Val, Sub2: Val"
                        const existing = data[student.id].custom[col.id] || '';
                        // Helper to append?
                        // Actually, let's just store Last Value or specialized formatter
                        // For simplicity in this version:
                        // If subPeriods exist, format as "Label: Value\nLabel2: Value"
                        // Or just "Value" if single.

                        let val = String(r.value);
                        if (col.subPeriods && col.subPeriods.length > 0) {
                            const sub = col.subPeriods.find(sp => sp.id === r.periodKey);
                            if (sub) {
                                val = `${sub.label}: ${val}`;
                                // Append if multiple
                                if (existing) val = `${existing}\n${val}`;
                            }
                        }

                        data[student.id].custom[col.id] = val;
                    }
                });
            } else if (col.frequency === 'one_time') {
                const records = await getOneTimeRecords(col.id);
                records.forEach(r => {
                    const student = students.find(s => s.code === r.studentCode);
                    if (student) {
                        const recStatus = r.status === 'done' ? 'Hoàn thành' : '';
                        data[student.id].custom[col.id] = recStatus;
                    }
                });
            }
        }

        reports.push({
            className: cls.name,
            students: students.map(s => ({ id: s.id, code: s.code, name: s.fullName })),
            columns: reportColumns,
            data,
            timeRange: `${startDate} - ${endDate}`
        });
    }

    return reports;
}

// ===================================
// Phase 6: Quick Report Edit Actions
// ===================================

export async function updateReportAttendance(
    user: AppUser | null,
    classId: string,
    studentCode: string,
    studentName: string,
    dateStr: string,
    newStatus: AttendanceStatus | 'DELETE' | string
) {
    try {
        if (!user) return { success: false, message: "Vui lòng đăng nhập để thực hiện" };

        const dateObj = new Date(dateStr);

        if (newStatus === 'DELETE' || newStatus === 'C' || !newStatus) {
            // Remove exception record => fallback to default (Present)
            await markPresent(user, classId, studentCode, 'morning', null, dateObj);
        } else {
            // Map models AttendanceStatus to AttendanceStatusV3
            let v3Status = 'present';
            if (newStatus === 'K' || newStatus === 'absent') v3Status = 'absent';
            else if (newStatus === 'P' || newStatus === 'excused') v3Status = 'excused';
            else if (newStatus === 'T' || newStatus === 'late') v3Status = 'late';
            else if (newStatus === 'VP' || newStatus === 'violation') v3Status = 'violation';
            else if (newStatus === 'KH' || newStatus === 'praise') v3Status = 'praise';
            else v3Status = newStatus;

            // Update to a new exception status
            await markAttendance(user, {
                classId,
                studentId: studentCode,
                studentName,
                session: 'morning',
                period: null, // Full day Period
                status: v3Status as any // Map models AttendanceStatus to AttendanceStatusV3
            }, dateObj);
        }

        return { success: true };
    } catch (error: any) {
        console.error("updateReportAttendance Error:", error);
        return { success: false, message: error.message || "Lỗi khi cập nhật điểm danh." };
    }
}

export async function addReportAttendance(
    user: AppUser | null,
    classId: string,
    studentCode: string,
    studentName: string,
    dateStr: string,
    status: AttendanceStatus
) {
    // Add is practically the same logic as Update in V3
    return await updateReportAttendance(user, classId, studentCode, studentName, dateStr, status);
}
