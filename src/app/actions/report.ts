'use server';

import { db } from '@/services/db';
import { AttendanceRecord, AttendanceStatus, PeriodRecord, AppUser } from '@/types/models';
import { getCustomColumns } from '@/services/column-service';
import { getAllRecordsForColumn, getOneTimeRecords } from '@/services/record-service';
import { TermReportData } from '@/lib/export-utils';
import { normalizeAttendanceRecord, markAttendance, markPresent } from '@/services/attendance-v3-service';
import { revalidatePath } from 'next/cache';
import { fetchAppSettings } from './settings';
import { getClassSize } from '@/services/student-status-service';

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
    startDate?: string;
    endDate?: string;
    totalStudents?: number;
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
        // Hỗ trợ status từ Supabase ('dropped_out') và các status cũ của Firebase
        const isDroppedOut = s.status === 'Nghỉ học' || 
                           s.status === 'Chuyển trường' || 
                           s.status === 'dropped_out' || 
                           s.statusV3 === 'dropped_out';
        
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

export async function getReports(criteria: ReportCriteria, userRole: string = 'teacher'): Promise<ReportResult> {
    console.log('=== GET REPORT CALLED ===', criteria, { userRole });
    
    // VALIDATION: Quota Optimization
    const start = new Date(criteria.startDate);
    const end = new Date(criteria.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 31) {
        throw new Error(`Khoảng thời gian báo cáo quá dài (${diffDays} ngày). Vui lòng chọn tối đa 31 ngày để bảo vệ hệ thống.`);
    }

    const classCount = criteria.classIds?.length || 0;
    if ((userRole === 'teacher' || userRole === 'gvbm') && classCount > 10) {
        throw new Error(`Giáo viên chỉ được phép chọn tối đa 10 lớp mỗi lần báo cáo. Bạn đã chọn ${classCount} lớp.`);
    }

    console.log(`[getReports] Validation passed: ${diffDays} days, ${classCount} classes.`);

    // 0. Get Settings
    const settingsRes = await fetchAppSettings();
    const appSettings = settingsRes.success ? settingsRes.settings : null;

    // 1. Get raw attendance records
    // Optimization: Chúng ta sẽ truyền thêm tín hiệu 'onlyExceptions' nếu cần (V3 mặc định chỉ có exceptions)
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

        // Lấy Class object để có sĩ số tự nhập
        const classObj = classes.find(c => c.id === classId);
        classSizes[classId] = classObj ? getClassSize(classObj, appSettings) : students.length;

        // Map Code -> { Name, STT }
        const studentInfoMap = new Map();
        students.forEach((s, index) => {
            const info = { name: s.fullName, stt: index + 1 };
            studentInfoMap.set(s.code, info);
            if (s.id) studentInfoMap.set(s.id, info); // Supabase UUID support
        });

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
                        const noteV1 = record.notes ? record.notes[code] : undefined;
                        const finalStatus = noteV1 ? `${status} (${noteV1})` : status;

                        absences.push({
                            id: `${record.date}_${code}`,
                            date: record.date,
                            classId: classId,
                            className: classMap.get(classId) || classId,
                            studentCode: code,
                            studentName: info.name,
                            stt: info.stt,
                            status: finalStatus as AttendanceStatus,
                            notes: noteV1
                        });
                    }
                });
            } else if (record.studentId && record.status) {
                // Xử lý logic Format mới V3 (Từng Record điểm danh lẻ)
                // Chuẩn hoá dữ liệu trước khi tính toán
                const normRecord = normalizeAttendanceRecord(record);
                const code = normRecord.studentId;
                let status = normRecord.status;

                // Map status sang mã ngắn để tính toán logic bên dưới
                if (status === 'absent') status = 'K';
                if (status === 'excused') status = 'P';
                if (status === 'late') {
                    const periods = normRecord.missedPeriods || [];
                    status = periods.length > 0 
                        ? `T (Vắng T${periods.join(', T')})` 
                        : (normRecord.note ? `T (${normRecord.note})` : 'T');
                }
                
                // Trạng thái VP/KH được xử lý qua flag sau khi normalize
                const getWeight = (statusType: string) => {
                    if (normRecord.missedPeriods) return normRecord.missedPeriods.length;
                    return 0;
                };

                const getVPWeight = () => {
                    if (normRecord.violationPeriods) return normRecord.violationPeriods.length;
                    if (normRecord.violation) return 5; // Mặc định cũ là cả buổi
                    return 0;
                };

                if (status === 'P') totalP += getWeight('P') || 1;
                else if (status === 'K') totalK += getWeight('K') || 1;
                else if (status === 'V') totalV += getWeight('V') || 1;
                else if (status.startsWith('T')) totalT += getWeight('T') || 1;

                if (normRecord.reward) {
                    totalKH++;
                }

                if (normRecord.violation) {
                    totalVP += getVPWeight() || 1;
                    const vpLabel = normRecord.violationNote ? `VP (${normRecord.violationNote})` : 'VP';
                    if (status === 'present' || !status) {
                        status = vpLabel;
                    } else if (!status.includes('VP')) {
                        status = `${status}, ${vpLabel}`;
                    }
                }
                
                if (normRecord.reward && !status.includes('KH')) {
                     const khLabel = normRecord.rewardNote ? `KH (${normRecord.rewardNote})` : 'KH';
                     status = (status === 'present' || !status) ? khLabel : `${status}, ${khLabel}`;
                }


                const studentInfo = studentInfoMap.get(code);
                const info = studentInfo || { name: record.studentName || code, stt: 0 };

                // Do V3 lưu timestamp, extract lại ngày nếu Date không chuẩn
                const dateKey = record.date || (record.timestamp ? record.timestamp.split('T')[0] : '');

                let finalNote = record.note || undefined;
                if (status === 'T' && record.missedPeriods && record.missedPeriods.length > 0) {
                    const missedPeriodsText = `Vắng tiết ${record.missedPeriods.join(', ')}`;
                    finalNote = finalNote ? `${finalNote} (${missedPeriodsText})` : missedPeriodsText;
                }

                absences.push({
                    id: record.id || `${dateKey}_${code}`,
                    date: dateKey,
                    classId: classId,
                    className: classMap.get(classId) || classId,
                    studentCode: code,
                    studentName: info.name,
                    stt: info.stt,
                    status: status as AttendanceStatus,
                    notes: finalNote
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
    isCompact: boolean = false,
    userRole: string = 'teacher'
): Promise<ExportData[]> {
    console.log('=== GET EXCEL EXPORT CALLED ===', { startDate, endDate, classCount: classIds.length, userRole });
    
    // VALIDATION: Quota Optimization
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 31) {
        throw new Error(`Khoảng thời gian xuất báo cáo quá dài (${diffDays} ngày). Vui lòng chọn tối đa 31 ngày.`);
    }

    if ((userRole === 'teacher' || userRole === 'gvbm') && classIds.length > 10) {
        throw new Error(`Giáo viên chỉ được phép xuất tối đa 10 lớp mỗi lần. Bạn đã chọn ${classIds.length} lớp.`);
    }
    // 0. Get Settings
    const settingsRes = await fetchAppSettings();
    const appSettings = settingsRes.success ? settingsRes.settings : null;

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
            classRecords.filter(r => {
                // Chỉ lấy bản ghi thuộc về học sinh này
                // TH1: V3 format (studentId khớp)
                // TH2: V1 format (absences chứa student code)
                return r.studentId === student.code || (r.absences && r.absences[student.code]);
            }).forEach(r => {
                let statusCode = '';
                let dateStr = '';

                if (r.studentId && r.status) {
                    // It's V3 format - Chuẩn hoá dữ liệu trước khi tính toán
                    const normRecord = normalizeAttendanceRecord(r);
                    statusCode = normRecord.status;

                    if (statusCode === 'absent') statusCode = 'K';
                    if (statusCode === 'excused') statusCode = 'P';
                    
                    if (statusCode === 'K' || statusCode === 'P' || statusCode === 'late' || (statusCode === 'T' && !statusCode.includes('('))) {
                        if (statusCode === 'late') statusCode = 'T';
                        const periods = normRecord.missedPeriods || [];
                        if (periods.length > 0 && periods.length < 5) {
                            statusCode = `${statusCode} (T${periods.join(', T')})`;
                        } else if (statusCode === 'T' && periods.length === 0 && (normRecord.note || normRecord.violationNote)) {
                            statusCode = `T (${normRecord.note || normRecord.violationNote})`;
                        }
                    }

                    // Xử lý Violation tập trung
                    if (normRecord.violation) {
                        const vPeriods = normRecord.violationPeriods || [];
                        const note = normRecord.violationNote || normRecord.note || '';
                        const pTag = (vPeriods.length > 0 && vPeriods.length < 5) ? ` [T${vPeriods.join(', T')}]` : '';
                        const vpLabel = note ? `VP (${note}${pTag})` : `VP${pTag}`;
                        
                        if (statusCode === 'present' || !statusCode) {
                            statusCode = vpLabel;
                        } else if (!statusCode.includes('VP')) {
                            statusCode = `${statusCode}, ${vpLabel}`;
                        }
                    }

                    // Xử lý Reward/KH tập trung
                    if (normRecord.reward) {
                        const khLabel = normRecord.rewardNote || normRecord.note ? `KH (${normRecord.rewardNote || normRecord.note})` : 'KH';
                        if (statusCode === 'present' || !statusCode) {
                            statusCode = khLabel;
                        } else if (!statusCode.includes('KH')) {
                            statusCode = `${statusCode}, ${khLabel}`;
                        }
                    }

                    dateStr = normRecord.date || normRecord.timestamp?.split('T')[0];
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
                startDate: startDate, // Thêm ngày bắt đầu để helper tính toán cột
                endDate: endDate,     // Thêm ngày kết thúc
                totalStudents: getClassSize(cls, appSettings),
                students: mappedStudents.sort((a, b) => a.name.localeCompare(b.name))
            });
        }
    }

    // Sort by class name
    result.sort((a, b) => a.className.localeCompare(b.className));
    return result;
}

export async function getMonthlyReportData(classId: string, month: number, year: number) {
    // 0. Get Settings
    const settingsRes = await fetchAppSettings();
    const appSettings = settingsRes.success ? settingsRes.settings : null;

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
                const baseStatus = r.absences[s.code];
                const noteV1 = r.notes ? r.notes[s.code] : undefined;
                const status = noteV1 ? `${baseStatus} (${noteV1})` : baseStatus;
                
                if (baseStatus && baseStatus !== 'C' && baseStatus !== '') {
                    absences[r.date] = status;
                }
            }
            // V3 logic
            else if (r.studentId === s.code && r.status) {
                let status = r.status;
                // Hỗ trợ cả Firebase English VÀ Supabase short codes
                if (status === 'absent') status = 'K';
                if (status === 'excused') status = 'P';
                if (status === 'late' || (status === 'T' && !status.includes('('))) {
                    const periods = r.missedPeriods || [];
                    status = periods.length > 0 
                        ? `T (Vắng T${periods.join(', T')})` 
                        : (r.note ? `T (${r.note})` : 'T');
                }
                if (status === 'violation' || (status === 'VP' && !status.includes('('))) {
                    const note = r.violationNote || r.note || '';
                    status = note ? `VP (${note})` : 'VP';
                }
                if (status === 'praise' || status === 'KH') status = 'KH';
                const dateKey = r.date || (r.timestamp ? r.timestamp.split('T')[0] : '');
                if (dateKey) {
                    const existing = absences[dateKey];
                    if (existing) {
                        const parts = existing.split(',').map(p => p.trim());
                        if (!parts.includes(status)) {
                            absences[dateKey] = `${existing}, ${status}`;
                        }
                    } else {
                        absences[dateKey] = status;
                    }

                    // Bổ sung Violation/Praise từ V3 fields mới
                    if (r.violation) {
                        const current = absences[dateKey];
                        const vpLabel = r.violationNote ? `VP (${r.violationNote})` : 'VP';
                        if (!current.includes('VP')) {
                            absences[dateKey] = current ? `${current}, ${vpLabel}` : vpLabel;
                        }
                    }
                    if (r.praise) {
                        const current = absences[dateKey];
                        if (!current.includes('KH')) absences[dateKey] = `${current}, KH`;
                    }
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
        totalStudents: getClassSize(cls, appSettings),
        students: studentData
    };
}


export async function getAdvancedReportData(
    startDate: string, 
    endDate: string, 
    classIds: string[], 
    userId?: string,
    userRole: string = 'teacher'
): Promise<TermReportData[]> {
    console.log('=== GET ADVANCED REPORT CALLED ===', { startDate, endDate, classCount: classIds.length, userRole });

    // VALIDATION: Quota Optimization
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 31) {
        throw new Error(`Khoảng thời gian báo cáo học kỳ quá dài (${diffDays} ngày). Vui lòng chọn tối đa 31 ngày.`);
    }

    if ((userRole === 'teacher' || userRole === 'gvbm') && classIds.length > 10) {
        throw new Error(`Giáo viên chỉ được phép báo cáo học kỳ tối đa 10 lớp mỗi lần.`);
    }
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
                const normRecord = normalizeAttendanceRecord(record);
                const studentCode = normRecord.studentId;
                let status = normRecord.status;

                // Map status sang mã ngắn
                if (status === 'absent') status = 'K';
                else if (status === 'excused') status = 'P';
                else if (status === 'late') status = 'T';

                const weight = normRecord.missedPeriods ? normRecord.missedPeriods.length : 1;
                const vpWeight = normRecord.violationPeriods ? normRecord.violationPeriods.length : (normRecord.violation ? 5 : 0);

                const student = students.find(s => s.code === studentCode);
                if (student) {
                    if (status && status !== 'present') {
                        // Tránh đếm trùng VP/KH nếu gán trực tiếp qua status
                        if (status !== 'violation' && status !== 'reward' && status !== 'VP' && status !== 'KH') {
                            if (!data[student.id].stats[status]) data[student.id].stats[status] = 0;
                            data[student.id].stats[status] += weight;
                        }
                    }
                    // Đếm Violation
                    if (normRecord.violation) {
                        if (!data[student.id].stats['VP']) data[student.id].stats['VP'] = 0;
                        data[student.id].stats['VP'] += vpWeight || 1;
                    }
                    // Đếm Praise/Reward
                    if (normRecord.reward) {
                        if (!data[student.id].stats['KH']) data[student.id].stats['KH'] = 0;
                        data[student.id].stats['KH']++;
                    }
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
