'use server';

import { db } from '@/services/db';
import { AttendanceRecord, AttendanceStatus, PeriodRecord, AppUser } from '@/types/models';
import { getCustomColumns } from '@/services/column-service';
import { getAllRecordsForColumn, getOneTimeRecords } from '@/services/record-service';
import { TermReportData } from '@/lib/export-utils';
import { markAttendance, markPresent } from '@/services/attendance-v3-service';
import { normalizeAttendanceRecord } from '@/services/attendance-v3-utils';
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

// --- Production Utils ---
const statusOrder = ['K', 'P', 'VP', 'T', 'KH'];

function resolveDailyStatus(rawItems: any[]) {
    if (!rawItems || rawItems.length === 0) return { labels: [], notes: '', stats: {} };

    const board: Record<string, Record<number, any>> = { 'S': {}, 'C': {} };
    rawItems.forEach(item => {
        const sessions = item.session === 'both' ? ['S', 'C'] : [item.session];
        sessions.forEach(sess => {
            const periods = item.periods || [1, 2, 3, 4, 5];
            periods.forEach((p: number) => {
                const current = board[sess][p];
                const newPriority = statusOrder.indexOf(item.base);
                if (newPriority === -1) return;
                if (!current || newPriority < statusOrder.indexOf(current.base)) {
                    board[sess][p] = item;
                }
            });
        });
    });

    const groupByType: Record<string, Record<string, { sessions: Set<string>, periodsBySession: Record<string, Set<number>> }>> = {};
    
    ['S', 'C'].forEach(sess => {
        for (let p = 1; p <= 5; p++) {
            const item = board[sess][p];
            if (item) {
                const type = item.base;
                const noteText = item.note || ''; 
                // Xóa tiền tố T cũ nếu có để gộp chính xác
                const cleanNote = noteText.replace(/^T\d+[0-9,-]*:\s*/, '');
                
                if (!groupByType[type]) groupByType[type] = {};
                if (!groupByType[type][cleanNote]) {
                    groupByType[type][cleanNote] = { sessions: new Set(), periodsBySession: { 'S': new Set(), 'C': new Set() } };
                }
                groupByType[type][cleanNote].sessions.add(sess);
                groupByType[type][cleanNote].periodsBySession[sess].add(p);
            }
        }
    });

    const labels: string[] = [];
    const stats: Record<string, number> = {};

    statusOrder.forEach(type => {
        const noteGroups = groupByType[type];
        if (!noteGroups) return;

        stats[type] = 1;
        
        // If there's only one group and it has NO note, use the old simple formatting
        const notes = Object.keys(noteGroups);
        if (notes.length === 1 && !notes[0]) {
            const info = noteGroups[notes[0]];
            let label = type;
            const hasS = info.periodsBySession['S'].size > 0;
            const hasC = info.periodsBySession['C'].size > 0;
            const fullS = info.periodsBySession['S'].size === 5;
            const fullC = info.periodsBySession['C'].size === 5;

            if (fullS && fullC) {
                label += '(SC)';
            } else {
                let sessionPart = '';
                if (hasS) {
                    sessionPart += 's';
                    if (!fullS) {
                        const pList = Array.from(info.periodsBySession['S']).sort();
                        if (pList.length > 1 && pList[pList.length - 1] - pList[0] === pList.length - 1) {
                            sessionPart += `${pList[0]}-${pList[pList.length - 1]}`;
                        } else {
                            sessionPart += pList.join('');
                        }
                    }
                }
                if (hasC) {
                    sessionPart += 'c';
                    if (!fullC) {
                        const pList = Array.from(info.periodsBySession['C']).sort();
                        if (pList.length > 1 && pList[pList.length - 1] - pList[0] === pList.length - 1) {
                            sessionPart += `${pList[0]}-${pList[pList.length - 1]}`;
                        } else {
                            sessionPart += pList.join('');
                        }
                    }
                }
                label += `(${sessionPart})`;
            }
            labels.push(label);
            return;
        }

        // Complex formatting: Group by notes
        // Example: VP(s1,2 [Lỗi A]; c3 [Lỗi B])
        const segmentStrings: string[] = [];
        Object.entries(noteGroups).forEach(([note, info]) => {
            const hasS = info.periodsBySession['S'].size > 0;
            const hasC = info.periodsBySession['C'].size > 0;
            const fullS = info.periodsBySession['S'].size === 5;
            const fullC = info.periodsBySession['C'].size === 5;

            let periodPart = '';
            if (fullS && fullC) {
                periodPart = 'SC';
            } else {
                if (hasS) {
                    periodPart += 's';
                    if (!fullS) {
                        const pList = Array.from(info.periodsBySession['S']).sort();
                        if (pList.length > 1 && pList[pList.length - 1] - pList[0] === pList.length - 1) {
                            periodPart += `${pList[0]}-${pList[pList.length - 1]}`;
                        } else {
                            periodPart += pList.join('');
                        }
                    }
                }
                if (hasC) {
                    periodPart += 'c';
                    if (!fullC) {
                        const pList = Array.from(info.periodsBySession['C']).sort();
                        if (pList.length > 1 && pList[pList.length - 1] - pList[0] === pList.length - 1) {
                            periodPart += `${pList[0]}-${pList[pList.length - 1]}`;
                        } else {
                            periodPart += pList.join('');
                        }
                    }
                }
            }
            
            if (note) {
                // Xây dựng tiền tố T gộp (ví dụ: T1-3) cho nhãn ghi chú
                const sPs = Array.from(info.periodsBySession['S']);
                const cPs = Array.from(info.periodsBySession['C']);
                const allPs = Array.from(new Set([...sPs, ...cPs])).sort();
                let prefix = "";
                if (allPs.length > 0 && allPs.length < 5) {
                    const ranges: string[] = [];
                    let start = allPs[0], prev = allPs[0];
                    for (let i = 1; i <= allPs.length; i++) {
                        if (i < allPs.length && allPs[i] === prev + 1) prev = allPs[i];
                        else {
                            if (start === prev) ranges.push(`${start}`);
                            else ranges.push(`${start}-${prev}`);
                            if (i < allPs.length) { start = allPs[i]; prev = allPs[i]; }
                        }
                    }
                    prefix = `T${ranges.join(',')}: `;
                }
                segmentStrings.push(`${periodPart} [${prefix}${note}]`);
            } else {
                segmentStrings.push(periodPart);
            }
        });

        labels.push(`${type}(${segmentStrings.join('; ')})`);
    });

    return {
        labels,
        notes: Array.from(new Set(rawItems.map(i => i.note).filter(Boolean))).join('; '),
        stats
    };
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
            // Học sinh nghỉ học vẫn phải hiện trong báo cáo nếu ngày nghỉ >= ngày bắt đầu báo cáo
            return dropDate >= reportStart;
        }
        return false; // exclude legacy dropped out students without a date
    });
}

export async function getReports(criteria: ReportCriteria, userRole: string = 'teacher'): Promise<ReportResult> {
    console.log('=== GET REPORT CALLED ===', criteria, { userRole });
    console.time('getReports_Timer');
    
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
    let totalP = 0, totalK = 0, totalV = 0, totalT = 0, totalVP = 0, totalKH = 0;

    // Map: classId -> studentCode -> date -> { items: [] }
    const mergedMap: Record<string, Record<string, Record<string, { items: any[] }>>> = {};

    const recordsByClass: Record<string, any[]> = {};
    records.forEach(r => {
        if (!recordsByClass[r.classId]) recordsByClass[r.classId] = [];
        recordsByClass[r.classId].push(r);
    });

    const classSizes: Record<string, number> = {};

    for (const [classId, classRecords] of Object.entries(recordsByClass)) {
        let students = await db.getStudentsByClass(classId);
        students = filterActiveStudentsForReport(students, criteria.startDate);
        const classObj = classes.find(c => c.id === classId);
        classSizes[classId] = classObj ? getClassSize(classObj, appSettings) : students.length;

        const studentInfoMap = new Map();
        students.forEach((s, index) => {
            const info = { name: s.fullName, stt: index + 1 };
            studentInfoMap.set(s.code, info);
            if (s.id) studentInfoMap.set(s.id, info);
        });

        // Phase 1: Group all raw status items by class -> student -> date
        if (!mergedMap[classId]) mergedMap[classId] = {};

        classRecords.forEach((record: any) => {
            const dateKey = record.date || (record.timestamp ? record.timestamp.split('T')[0] : '');
            
            if (record.absences) {
                // V1
                Object.entries(record.absences).forEach(([code, status]) => {
                    if (status && status !== 'C' && status !== '') {
                        if (!mergedMap[classId][code]) mergedMap[classId][code] = {};
                        if (!mergedMap[classId][code][dateKey]) mergedMap[classId][code][dateKey] = { items: [] };
                        
                        mergedMap[classId][code][dateKey].items.push({
                            base: (status as string).trim().toUpperCase(),
                            session: 'both',
                            periods: [1, 2, 3, 4, 5],
                            note: record.notes?.[code] || ''
                        });
                    }
                });
            } else if (record.studentId && record.status) {
                // V3
                const normRecord = normalizeAttendanceRecord(record);
                const code = normRecord.studentId;
                if (!mergedMap[classId][code]) mergedMap[classId][code] = {};
                if (!mergedMap[classId][code][dateKey]) mergedMap[classId][code][dateKey] = { items: [] };

                let s = normRecord.status as any;
                if (s === 'absent') s = 'K';
                else if (s === 'excused') s = 'P';
                else if (s === 'late') s = 'T';

                const session = normRecord.session === 'morning' ? 'S' : 'C';
                const periods = normRecord.missedPeriods && normRecord.missedPeriods.length > 0 
                    ? normRecord.missedPeriods 
                    : [1, 2, 3, 4, 5];

                if (s !== 'present' && s !== 'C' && s && s !== 'violation' && s !== 'reward') {
                    mergedMap[classId][code][dateKey].items.push({
                        base: s,
                        session,
                        periods,
                        note: normRecord.note || ''
                    });
                }

                if (normRecord.violation) {
                    mergedMap[classId][code][dateKey].items.push({
                        base: 'VP',
                        session,
                        periods: normRecord.violationPeriods || periods,
                        note: normRecord.violationNote || normRecord.note || ''
                    });
                }
                if (normRecord.reward) {
                    mergedMap[classId][code][dateKey].items.push({
                        base: 'KH',
                        session,
                        periods: normRecord.rewardPeriods || periods,
                        note: normRecord.rewardNote || normRecord.note || ''
                    });
                }
            }
        });
    }

    // Phase 2: Process each student/day to apply priority and generate Ps13c2 labels
    for (const [classId, studentDates] of Object.entries(mergedMap)) {
        const classObj = classes.find(c => c.id === classId);
        const className = classObj?.name || classId;
        
        let students = await db.getStudentsByClass(classId);
        const studentInfoMap = new Map();
        students.forEach((s, index) => {
            const info = { name: s.fullName, stt: index + 1 };
            studentInfoMap.set(s.code, info);
            if (s.id) studentInfoMap.set(s.id, info);
        });

        for (const [code, dates] of Object.entries(studentDates)) {
            const info = studentInfoMap.get(code) || { name: code, stt: 0 };
            
            for (const [date, data] of Object.entries(dates)) {
                const rawItems = data.items;
                if (!rawItems || rawItems.length === 0) continue;

                const resolved = resolveDailyStatus(rawItems);
                
                // Update overall stats
                Object.keys(resolved.stats).forEach(type => {
                    if (type === 'P') totalP++;
                    else if (type === 'K') totalK++;
                    else if (type === 'T') totalT++;
                    else if (type === 'VP') totalVP++;
                    else if (type === 'KH') totalKH++;
                });

                absences.push({
                    id: `${date}_${code}`,
                    date,
                    classId,
                    className,
                    studentCode: code,
                    studentName: info.name,
                    stt: info.stt,
                    status: resolved.labels.join(' | ') as any,
                    notes: resolved.notes
                });
            }
        }
    }

    // Sort: STT asc, then Date desc
    absences.sort((a, b) => {
        if (a.stt !== b.stt) return a.stt - b.stt;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    console.log(`[getReports] Processed ${absences.length} merged records. Totals: P=${totalP}, K=${totalK}, T=${totalT}, VP=${totalVP}, KH=${totalKH}`);
    console.timeEnd('getReports_Timer');

    return {
        totalP, totalK, totalV, totalT, totalVP, totalKH,
        absences,
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
    console.log(`[Excel] Records fetched: ${records.length}`);

    // 2. Fetch target classes
    const classesInfo = await db.getClasses();
    const targetClasses = classIds.length > 0
        ? classesInfo.filter(c => classIds.includes(c.id))
        : classesInfo;
    console.log(`[Excel] Target classes: ${targetClasses.length}`);

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
        let students = await db.getStudentsByClass(cls.id);
        students = filterActiveStudentsForReport(students, startDate);
        console.log(`[Excel] Class ${cls.name}: Students count: ${students.length}`);

        const classRecords = recordsByClass[cls.id] || [];
        const studentRawMap: Record<string, Record<string, any[]>> = {};

        // Phase 1: Collect raw records for this class
        classRecords.forEach((r: any) => {
            const dateStr = r.date || (r.timestamp ? r.timestamp.split('T')[0] : '');
            if (!dateStr) return;

            const processRecord = (code: string, rawItem: any) => {
                if (!studentRawMap[code]) studentRawMap[code] = {};
                if (!studentRawMap[code][dateStr]) studentRawMap[code][dateStr] = [];
                studentRawMap[code][dateStr].push(rawItem);
            };

            if (r.absences) {
                Object.entries(r.absences).forEach(([code, status]) => {
                    const st = (status as string).trim().toUpperCase();
                    if (st && st !== 'C' && st !== 'PRESENT') {
                        processRecord(code, { base: st, session: 'both', periods: [1,2,3,4,5], note: r.notes?.[code] || '' });
                    }
                });
            } else if (r.studentId && r.status) {
                const normRecord = normalizeAttendanceRecord(r);
                const code = normRecord.studentId;
                const session = normRecord.session === 'morning' ? 'S' : 'C';
                const periods = normRecord.missedPeriods && normRecord.missedPeriods.length > 0 ? normRecord.missedPeriods : [1,2,3,4,5];
                
                let s = normRecord.status as any;
                if (s === 'absent') s = 'K';
                else if (s === 'excused') s = 'P';
                else if (s === 'late') s = 'T';

                if (s !== 'present' && s !== 'C' && s && s !== 'violation' && s !== 'reward' && s !== 'VP' && s !== 'KH') {
                    processRecord(code, { base: s, session, periods, note: normRecord.note || '' });
                }
                if (normRecord.violation) {
                    processRecord(code, { base: 'VP', session, periods: normRecord.violationPeriods || periods, note: normRecord.violationNote || normRecord.note || '' });
                }
                if (normRecord.reward) {
                    processRecord(code, { base: 'KH', session, periods: normRecord.rewardPeriods || periods, note: normRecord.rewardNote || normRecord.note || '' });
                }
            }
        });

        // Phase 2: Resolve and Map
        const mappedStudents: { code: string; name: string; absences: Record<string, string> }[] = [];

        students.forEach((student) => {
            const absences: Record<string, string> = {};
            let hasPrimaryAbsence = false; // Only P or K count for "isCompact" filter
            const rawByDate = studentRawMap[student.code] || studentRawMap[student.id] || {};

            Object.keys(rawByDate).forEach(dateKey => {
                const resolved = resolveDailyStatus(rawByDate[dateKey]);
                absences[dateKey] = resolved.labels.join(' | ');
                
                if (resolved.stats['P'] || resolved.stats['K']) {
                    hasPrimaryAbsence = true;
                }
            });

            if (!isCompact || (isCompact && hasPrimaryAbsence)) {
                mappedStudents.push({
                    code: student.code,
                    name: student.fullName,
                    absences
                });
            }
        });

        if (mappedStudents.length > 0) {
            result.push({
                className: cls.name,
                year: exportYear,
                month: exportMonth,
                startDate: startDate,
                endDate: endDate,
                totalStudents: getClassSize(cls, appSettings),
                students: mappedStudents.sort((a, b) => a.name.localeCompare(b.name))
            });
        }
    }

    // Sort by class name naturally (e.g. 6A1, 6A2, 6A10)
    result.sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));
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
    // Phase 1: Collect raw records
    const studentRawMap: Record<string, Record<string, any[]>> = {};
    records.forEach((r: any) => {
        const dateStr = r.date || (r.timestamp ? r.timestamp.split('T')[0] : '');
        if (!dateStr) return;

        const processRecord = (code: string, rawItem: any) => {
            if (!studentRawMap[code]) studentRawMap[code] = {};
            if (!studentRawMap[code][dateStr]) studentRawMap[code][dateStr] = [];
            studentRawMap[code][dateStr].push(rawItem);
        };

        if (r.absences) {
            // V1
            Object.entries(r.absences).forEach(([code, status]) => {
                const st = (status as string).trim().toUpperCase();
                if (st && st !== 'C' && st !== 'PRESENT') {
                    processRecord(code, { base: st, session: 'both', periods: [1,2,3,4,5], note: r.notes?.[code] || '' });
                }
            });
        } else if (r.studentId && r.status) {
            // V3
            const normRecord = normalizeAttendanceRecord(r);
            const code = normRecord.studentId;
            const session = normRecord.session === 'morning' ? 'S' : 'C';
            const periods = normRecord.missedPeriods && normRecord.missedPeriods.length > 0 ? normRecord.missedPeriods : [1,2,3,4,5];
            
            let s = normRecord.status as any;
            if (s === 'absent') s = 'K';
            else if (s === 'excused') s = 'P';
            else if (s === 'late') s = 'T';

            if (s !== 'present' && s !== 'C' && s && s !== 'violation' && s !== 'reward' && s !== 'VP' && s !== 'KH') {
                processRecord(code, { base: s, session, periods, note: normRecord.note || '' });
            }
            if (normRecord.violation) {
                processRecord(code, { base: 'VP', session, periods: normRecord.violationPeriods || periods, note: normRecord.violationNote || normRecord.note || '' });
            }
            if (normRecord.reward) {
                processRecord(code, { base: 'KH', session, periods: normRecord.rewardPeriods || periods, note: normRecord.rewardNote || normRecord.note || '' });
            }
        }
    });

    // Phase 2: Resolve and Map students
    const studentData = students.map((s, idx) => {
        const absences: Record<string, string> = {};
        const rawByDate = studentRawMap[s.id] || {};
        
        Object.keys(rawByDate).forEach(dateKey => {
            const resolved = resolveDailyStatus(rawByDate[dateKey]);
            absences[dateKey] = resolved.labels.join(' | ');
        });

        return {
            stt: idx + 1,
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
        students.forEach(s => {
            data[s.id] = { stats: {}, custom: {} };
        });

        const attendanceRecords = await db.getReportData(startDate, endDate, [cls.id]);
        const studentRawMap: Record<string, Record<string, any[]>> = {};

        attendanceRecords.forEach((r: any) => {
            const dateStr = r.date || (r.timestamp ? r.timestamp.split('T')[0] : '');
            if (!dateStr) return;
            
            const processRecord = (code: string, rawItem: any) => {
                if (!studentRawMap[code]) studentRawMap[code] = {};
                if (!studentRawMap[code][dateStr]) studentRawMap[code][dateStr] = [];
                studentRawMap[code][dateStr].push(rawItem);
            };

            if (r.absences) {
                Object.entries(r.absences).forEach(([code, status]) => {
                    const st = (status as string).trim().toUpperCase();
                    if (st && st !== 'C' && st !== 'PRESENT') {
                        processRecord(code, { base: st, session: 'both', periods: [1,2,3,4,5], note: r.notes?.[code] || '' });
                    }
                });
            } else if (r.studentId && r.status) {
                const normRecord = normalizeAttendanceRecord(r);
                const code = normRecord.studentId;
                const session = normRecord.session === 'morning' ? 'S' : 'C';
                const periods = normRecord.missedPeriods && normRecord.missedPeriods.length > 0 ? normRecord.missedPeriods : [1,2,3,4,5];
                
                let s = normRecord.status as any;
                if (s === 'absent') s = 'K';
                else if (s === 'excused') s = 'P';
                else if (s === 'late') s = 'T';

                if (s !== 'present' && s !== 'C' && s && s !== 'violation' && s !== 'reward' && s !== 'VP' && s !== 'KH') {
                    processRecord(code, { base: s, session, periods, note: normRecord.note || '' });
                }
                if (normRecord.violation) {
                    processRecord(code, { base: 'VP', session, periods: normRecord.violationPeriods || periods, note: normRecord.violationNote || normRecord.note || '' });
                }
                if (normRecord.reward) {
                    processRecord(code, { base: 'KH', session, periods: normRecord.rewardPeriods || periods, note: normRecord.rewardNote || normRecord.note || '' });
                }
            }
        });

        // 4.1 Process raw records with resolveDailyStatus
        students.forEach(s => {
            const rawByDate = studentRawMap[s.id] || {};
            const stats: Record<string, number> = { 'P': 0, 'K': 0, 'T': 0, 'VP': 0, 'KH': 0 };
            
            Object.keys(rawByDate).forEach(dateKey => {
                const resolved = resolveDailyStatus(rawByDate[dateKey]);
                // Increment stats based on resolved types
                Object.keys(resolved.stats).forEach(type => {
                    stats[type] = (stats[type] || 0) + 1;
                });
            });
            
            data[s.id].stats = stats;
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
