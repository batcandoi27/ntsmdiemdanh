'use server';

import { db } from '@/services/db';
import { Class, AttendanceStatus, Student, Column, DailyRecord } from '@/types/models';
import { SessionType } from '@/types/timetable';
import { getEffectiveStatus, getClassSize } from '@/services/student-status-service';
import { fetchAppSettings } from './settings';
import { 
    getClassAttendance, 
    getAttendanceByClasses, 
    batchMarkAttendance 
} from '@/services/attendance-v3-service';
import { normalizeAttendanceRecord } from '@/services/attendance-v3-utils';
import { getColumnsByFrequency } from '@/services/column-service';
import { getDailyRecords, saveDailyRecord, deleteRecord } from '@/services/record-service';

export interface BlockAttendanceItem {
    classId: string;
    className: string;
    teacherName?: string;
    totalStudents: number;
    attendanceCount: {
        P: number;
        K: number;
        V: number;
        T: number;
        VP: number;
        KH: number;
        Present: number;
        TotalAbsent: number;
    };
    studentLists: {
        P: { name: string; stt: string; note?: string }[];
        K: { name: string; stt: string; note?: string }[];
        V: { name: string; stt: string; note?: string }[];
        T: { name: string; stt: string; note?: string }[];
        VP: { name: string; stt: string; note?: string }[];
        KH: { name: string; stt: string; note?: string }[];
    };
}

export interface StudentAttendanceDetail {
    student: Student;
    status: AttendanceStatus;
    note?: string;
    effectiveStatus?: string;
    violation?: boolean;
    violationNote?: string;
    violationPeriods?: number[];
    reward?: boolean;
    rewardNote?: string;
    rewardNotes?: Record<number, string>;
    missedPeriods?: number[];
    statusNotes?: Record<number, string>;
    violationNotes?: Record<number, string>;
}

export interface DailyAttendanceData {
    students: StudentAttendanceDetail[];
    customColumns: Column[];
    studentRecords: Record<string, Record<string, boolean>>;
}

export async function getGradeAttendanceSummary(grade: number, dateStr: string, session: SessionType = 'morning'): Promise<BlockAttendanceItem[]> {
    let appSettings = null;
    try {
        const settingsRes = await fetchAppSettings();
        appSettings = settingsRes.success ? settingsRes.settings : null;
    } catch (e) {
        console.error("Lỗi fetchAppSettings:", e);
    }

    let allClasses: Class[] = [];
    try {
        allClasses = await db.getClasses();
    } catch (e) {
        console.error("Lỗi db.getClasses:", e);
        return [];
    }
    
    const gradeClasses = allClasses.filter(c => c.grade === grade)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (gradeClasses.length === 0) return [];
    const classIds = gradeClasses.map(c => c.id);

    try {
        const allRecords = await getAttendanceByClasses(dateStr, classIds, session);
        const recordMap = new Map<string, typeof allRecords>();
        allRecords.forEach(r => {
            if (!recordMap.has(r.classId)) recordMap.set(r.classId, []);
            recordMap.get(r.classId)!.push(r);
        });

        const result: BlockAttendanceItem[] = await Promise.all(gradeClasses.map(async cls => {
            const classRecords = recordMap.get(cls.id) || [];
            const counts = { P: 0, K: 0, V: 0, T: 0, VP: 0, KH: 0, Present: 0, TotalAbsent: 0 };
            const lists = {
                P: [] as { name: string; stt: string; note?: string }[],
                K: [] as { name: string; stt: string; note?: string }[],
                V: [] as { name: string; stt: string; note?: string }[],
                T: [] as { name: string; stt: string; note?: string }[],
                VP: [] as { name: string; stt: string; note?: string }[],
                KH: [] as { name: string; stt: string; note?: string }[]
            };

            const students = await db.getStudentsByClass(cls.id);
            const activeStudents = students.filter(s => getEffectiveStatus(s) !== 'dropped_out');
            const studentMap = new Map<string, Student>();
            activeStudents.forEach(s => {
                if (s.code) studentMap.set(s.code, s);
                if (s.id) studentMap.set(s.id, s);
            });

            const getSTT = (code: string) => {
                const parts = code.split('_');
                return parts.length > 1 ? parts[parts.length - 1] : '';
            };

            const studentRecords = new Map<string, any[]>();
            classRecords.forEach(r => {
                const normR = normalizeAttendanceRecord(r);
                if (!studentRecords.has(normR.studentId)) studentRecords.set(normR.studentId, []);
                studentRecords.get(normR.studentId)!.push(normR);
            });

            studentRecords.forEach((records, studentIdOrCode) => {
                const student = studentMap.get(studentIdOrCode);
                if (!student) return;

                const name = student.fullName || studentIdOrCode;
                const stt = getSTT(student.code);
                const item = { name, stt };

                // --- GỘP DỮ LIỆU TIẾT LẺ ---
                // Chúng ta sẽ gộp các bản ghi có cùng student thành 1 thực thể ảo cho UI
                const aggregated: any = {
                    missedPeriods: [] as number[],
                    violationPeriods: [] as number[],
                    status: '' as string,
                    note: '',
                    violationNote: '',
                    rewardNote: '',
                    violation: false,
                    reward: false
                };

                records.forEach(r => {
                    // Chuyên cần
                    if (['excused', 'absent', 'late', 'absent_unknown', 'P', 'K', 'T', 'V'].includes(r.status)) {
                        aggregated.status = r.status;
                        aggregated.note = r.note || aggregated.note;
                        if (r.period) aggregated.missedPeriods.push(r.period);
                        else if (r.period === null) aggregated.missedPeriods = [1, 2, 3, 4, 5];
                    }
                    // Vi phạm
                    if (r.violation || r.status === 'violation' || r.status === 'VP') {
                        aggregated.violation = true;
                        aggregated.violationNote = r.violationNote || r.note || aggregated.violationNote;
                        if (r.period) aggregated.violationPeriods.push(r.period);
                        else if (r.period === null) aggregated.violationPeriods = [1, 2, 3, 4, 5];
                    }
                    // Khen thưởng
                    if (r.reward || r.status === 'reward' || r.status === 'praise' || r.status === 'KH') {
                        aggregated.reward = true;
                        aggregated.rewardNote = r.rewardNote || r.note || aggregated.rewardNote;
                        if (r.period) aggregated.rewardPeriods = Array.from(new Set([...(aggregated.rewardPeriods || []), r.period])).sort();
                        else if (r.period === null) aggregated.rewardPeriods = [1, 2, 3, 4, 5];
                    }
                });
                
                // Chuẩn hóa mảng tiết
                aggregated.missedPeriods = Array.from(new Set(aggregated.missedPeriods)).sort();
                aggregated.violationPeriods = Array.from(new Set(aggregated.violationPeriods)).sort();
                aggregated.rewardPeriods = Array.from(new Set(aggregated.rewardPeriods || [])).sort();

                // Tạo Suffix hiển thị tiết lẻ
                const getSuffix = (pArr: number[]) => {
                    // Nếu vắng >= 5 tiết (hoặc đủ 5 tiết 1,2,3,4,5) thì coi như toàn buổi -> KHÔNG HIỆN
                    if (pArr.length >= 5 || pArr.length === 0) return "";
                    return ` (T${pArr.join(',')})`;
                };

                // 1. Chuyên cần chính
                if (aggregated.status) {
                    const status = aggregated.status;
                    const suffix = getSuffix(aggregated.missedPeriods);
                    const itemWithSuffix = { ...item, name: item.name + suffix, note: aggregated.note };

                    if (status === 'excused' || status === 'P') { counts.P++; lists.P.push(itemWithSuffix); }
                    else if (status === 'absent' || status === 'K') { counts.K++; lists.K.push(itemWithSuffix); }
                    else if (status === 'late' || status === 'T') { counts.T++; lists.T.push(itemWithSuffix); }
                    else if (status === 'absent_unknown' || status === 'V') { counts.V++; lists.V.push(itemWithSuffix); }
                }

                // 2. Vi phạm
                if (aggregated.violation) {
                    counts.VP++;
                    const suffix = getSuffix(aggregated.violationPeriods);
                    lists.VP.push({ ...item, name: item.name + suffix, note: aggregated.violationNote });
                }

                // 3. Khen thưởng
                if (aggregated.reward) {
                    counts.KH++;
                    const suffix = getSuffix(aggregated.rewardPeriods);
                    lists.KH.push({ ...item, name: item.name + suffix, note: aggregated.rewardNote });
                }
            });

            const sortFn = (a: { stt: string }, b: { stt: string }) => (parseInt(a.stt) || 0) - (parseInt(b.stt) || 0);
            Object.values(lists).forEach(list => list.sort(sortFn));

            const totalAbsence = counts.P + counts.K + counts.V;
            counts.TotalAbsent = totalAbsence;
            const displaySize = getClassSize(cls, appSettings);
            counts.Present = displaySize - totalAbsence;

            return {
                classId: cls.id,
                className: cls.name,
                teacherName: cls.teacherName || '',
                totalStudents: displaySize,
                attendanceCount: counts,
                studentLists: lists
            };
        }));

        return result;
    } catch (e) {
        console.error("Lỗi getGradeAttendanceSummary:", e);
        return [];
    }
}

export async function getClassAttendanceDetails(classId: string, dateStr: string, session: SessionType = 'morning'): Promise<StudentAttendanceDetail[]> {
    try {
        const allStudents = await db.getStudentsByClass(classId);
        const students = allStudents.filter(s => {
            const status = getEffectiveStatus(s);
            return status !== 'dropped_out' && status !== 'suspended';
        });

        const records = (await getClassAttendance(classId, dateStr, session)).map(r => normalizeAttendanceRecord(r));
        const recordMap = new Map<string, any>();
        
        records.forEach(r => {
            const sid = r.studentId;
            if (!sid) return;
            
            if (!recordMap.has(sid)) {
                recordMap.set(sid, { 
                    ...r, 
                    missedPeriods: r.period ? [r.period] : (r.period === null ? [1,2,3,4,5] : []),
                    violationPeriods: r.violation ? (r.period ? [r.period] : [1,2,3,4,5]) : [],
                    rewardPeriods: r.reward ? (r.period ? [r.period] : [1,2,3,4,5]) : [],
                    statusNotes: r.status && r.status !== 'present' ? { [r.period || 0]: r.note || '' } : {},
                    violationNotes: r.violation ? { [r.period || 0]: r.violationNote || r.note || '' } : {},
                    rewardNotes: r.reward ? { [r.period || 0]: r.rewardNote || r.note || '' } : {}
                });
            } else {
                const existing = recordMap.get(sid);
                // Gộp Vi phạm
                if (r.violation) {
                    existing.violation = true;
                    existing.violationNote = r.violationNote || r.note || existing.violationNote;
                    existing.violationNotes = { ...existing.violationNotes, [r.period || 0]: r.violationNote || r.note || '' };
                    if (r.period) existing.violationPeriods = Array.from(new Set([...(existing.violationPeriods || []), r.period])).sort();
                    else if (r.period === null) existing.violationPeriods = [1,2,3,4,5];
                }
                // Gộp Khen thưởng
                if (r.reward) {
                    existing.reward = true;
                    existing.rewardNote = r.rewardNote || r.note || existing.rewardNote;
                    existing.rewardNotes = { ...existing.rewardNotes, [r.period || 0]: r.rewardNote || r.note || '' };
                    if (r.period) existing.rewardPeriods = Array.from(new Set([...(existing.rewardPeriods || []), r.period])).sort();
                    else if (r.period === null) existing.rewardPeriods = [1,2,3,4,5];
                }
                // Gộp Chuyên cần & Tiết lẻ
                if (['absent', 'late', 'excused'].includes(r.status)) {
                    existing.status = r.status;
                    if (!existing.note) existing.note = r.note;
                    existing.statusNotes = { ...existing.statusNotes, [r.period || 0]: r.note || '' };
                    if (r.period) existing.missedPeriods = Array.from(new Set([...(existing.missedPeriods || []), r.period])).sort();
                    else if (r.period === null) existing.missedPeriods = [1,2,3,4,5];
                }
            }
        });

        return students.map(s => {
            const record = recordMap.get(s.id) || recordMap.get(s.code);
            let uiStatus = ''; 
            let note = '';

            if (record) {
                note = record.note || '';
                const status = record.status;
                if (status === 'excused') uiStatus = 'P';
                else if (status === 'absent') uiStatus = 'K';
                else if (status === 'late') uiStatus = 'T';
                else if (status === 'present') uiStatus = '';

                return {
                    student: s,
                    status: uiStatus as AttendanceStatus,
                    note: note,
                    effectiveStatus: getEffectiveStatus(s),
                    violation: record.violation,
                    violationNote: record.violationNote,
                    violationPeriods: record.violationPeriods,
                    reward: record.reward,
                    rewardNote: record.rewardNote,
                    rewardNotes: record.rewardNotes,
                    missedPeriods: record.missedPeriods,
                    statusNotes: record.statusNotes,
                    violationNotes: record.violationNotes
                };
            }

            return {
                student: s,
                status: uiStatus as AttendanceStatus,
                note: note,
                effectiveStatus: getEffectiveStatus(s)
            };
        }).sort((a, b) => a.student.order - b.student.order);
    } catch (e) {
        console.error("Lỗi getClassAttendanceDetails:", e);
        return [];
    }
}

export async function updateBatchAttendance(
    user: any,
    classId: string,
    dateStr: string,
    session: SessionType,
    updates: any[],
    allStudentIds: string[]
) {
    const date = new Date(dateStr);
    const effectiveUser = user || { uid: 'system', role: 'admin', displayName: 'System' };

    const batchInput = {
        classId,
        session,
        period: null,
        marks: updates.map(u => ({
            studentId: u.studentCode,
            studentName: u.studentName,
            status: u.status as any,
            note: u.note,
            missedPeriods: u.missedPeriods,
            violation: u.violation,
            violationNote: u.violationNote,
            violationPeriods: u.violationPeriods,
            reward: u.reward,
            rewardNote: u.rewardNote
        }))
    };

    await batchMarkAttendance(effectiveUser, batchInput, allStudentIds, date);
}

export async function getClassesAttendanceSummary(classIds: string[], dateStr: string, session: SessionType = 'morning'): Promise<BlockAttendanceItem[]> {
    if (classIds.length === 0) return [];
    
    let appSettings = null;
    try {
        const settingsRes = await fetchAppSettings();
        appSettings = settingsRes.success ? settingsRes.settings : null;
    } catch (e) {}

    try {
        const allClasses = await db.getClasses();
        const targetedClasses = allClasses.filter(c => classIds.includes(c.id))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        if (targetedClasses.length === 0) return [];

        const allRecords = await getAttendanceByClasses(dateStr, classIds, session);
        const recordMap = new Map<string, typeof allRecords>();
        allRecords.forEach(r => {
            if (!recordMap.has(r.classId)) recordMap.set(r.classId, []);
            recordMap.get(r.classId)!.push(r);
        });

        const result: BlockAttendanceItem[] = await Promise.all(targetedClasses.map(async cls => {
            const classRecords = recordMap.get(cls.id) || [];
            const counts = { P: 0, K: 0, V: 0, T: 0, VP: 0, KH: 0, Present: 0, TotalAbsent: 0 };
            const lists = {
                P: [] as any[], K: [] as any[], V: [] as any[],
                T: [] as any[], VP: [] as any[], KH: [] as any[]
            };

            const students = await db.getStudentsByClass(cls.id);
            const studentMap = new Map(students.map(s => [s.code, s]));
            const studentUuidMap = new Map(students.map(s => [s.id, s]));
            
            const getSTT = (code: string) => {
                const parts = code.split('_');
                return parts.length > 1 ? parts[parts.length - 1] : '';
            };

            const studentRecords = new Map<string, any[]>();
            classRecords.forEach(r => {
                const normR = normalizeAttendanceRecord(r);
                if (!studentRecords.has(normR.studentId)) studentRecords.set(normR.studentId, []);
                studentRecords.get(normR.studentId)!.push(normR);
            });

            studentRecords.forEach((records, studentIdOrCode) => {
                const student = studentMap.get(studentIdOrCode) || studentUuidMap.get(studentIdOrCode);
                if (!student) return;

                const stt = getSTT(student.code);
                const item = { name: student.fullName, stt };

                // --- GỘP DỮ LIỆU TIẾT LÈ ---
                const aggregated: any = {
                    missedPeriods: [] as number[],
                    violationPeriods: [] as number[],
                    status: '' as string,
                    note: '',
                    violationNote: '',
                    rewardNote: '',
                    violation: false,
                    reward: false
                };

                records.forEach(r => {
                    if (['excused', 'absent', 'late', 'absent_unknown', 'P', 'K', 'T', 'V'].includes(r.status)) {
                        aggregated.status = r.status;
                        aggregated.note = r.note || aggregated.note;
                        if (r.period) aggregated.missedPeriods.push(r.period);
                        else if (r.period === null) aggregated.missedPeriods = [1, 2, 3, 4, 5];
                    }
                    if (r.violation || r.status === 'violation' || r.status === 'VP') {
                        aggregated.violation = true;
                        aggregated.violationNote = r.violationNote || r.note || aggregated.violationNote;
                        if (r.period) aggregated.violationPeriods.push(r.period);
                        else if (r.period === null) aggregated.violationPeriods = [1, 2, 3, 4, 5];
                    }
                    if (r.reward || r.status === 'reward' || r.status === 'praise' || r.status === 'KH') {
                        aggregated.reward = true;
                        aggregated.rewardNote = r.rewardNote || r.note || aggregated.rewardNote;
                    }
                });

                aggregated.missedPeriods = Array.from(new Set(aggregated.missedPeriods)).sort();
                aggregated.violationPeriods = Array.from(new Set(aggregated.violationPeriods)).sort();

                const getSuffix = (pArr: number[]) => (pArr.length > 0 && pArr.length < 5) ? ` (T${pArr.join(',')})` : "";

                // 1. Chuyên cần chính
                if (aggregated.status) {
                    const status = aggregated.status;
                    const suffix = getSuffix(aggregated.missedPeriods);
                    const itemWithSuffix = { ...item, name: item.name + suffix, note: aggregated.note };
                    if (status === 'excused' || status === 'P') { counts.P++; lists.P.push(itemWithSuffix); }
                    else if (status === 'absent' || status === 'K') { counts.K++; lists.K.push(itemWithSuffix); }
                    else if (status === 'late' || status === 'T') { counts.T++; lists.T.push(itemWithSuffix); }
                }

                // 2. Vi phạm
                if (aggregated.violation) { 
                    counts.VP++; 
                    const suffix = getSuffix(aggregated.violationPeriods);
                    lists.VP.push({...item, name: item.name + suffix, note: aggregated.violationNote}); 
                }
                
                // 3. Khen thưởng
                if (aggregated.reward) { 
                    counts.KH++; 
                    lists.KH.push({...item, note: aggregated.rewardNote}); 
                }
            });

            const sortFn = (a: any, b: any) => (parseInt(a.stt) || 0) - (parseInt(b.stt) || 0);
            Object.values(lists).forEach(l => l.sort(sortFn));

            const totalAbsence = counts.P + counts.K + counts.V;
            counts.TotalAbsent = totalAbsence;
            const displaySize = getClassSize(cls, appSettings);
            counts.Present = displaySize - totalAbsence;

            return {
                classId: cls.id,
                className: cls.name,
                teacherName: cls.teacherName || '',
                totalStudents: displaySize,
                attendanceCount: counts,
                studentLists: lists
            };
        }));

        return result;
    } catch (e) {
        console.error("Lỗi getClassesAttendanceSummary:", e);
        return [];
    }
}

export async function getDailyAttendanceData(classId: string, dateStr: string, session: SessionType = 'morning'): Promise<DailyAttendanceData> {
    const students = await getClassAttendanceDetails(classId, dateStr, session);
    const allDailyCols = await getColumnsByFrequency(classId, 'daily');
    const customColumns = allDailyCols.filter(c => !c.archived);

    const studentRecords: Record<string, Record<string, boolean>> = {};
    students.forEach(s => {
        studentRecords[s.student.code] = {};
    });

    await Promise.all(customColumns.map(async (col) => {
        const records = await getDailyRecords(col.id, dateStr);
        records.forEach(r => {
            if (studentRecords[r.studentCode]) {
                studentRecords[r.studentCode][col.id] = true;
            }
        });
    }));

    return {
        students,
        customColumns,
        studentRecords
    };
}

export async function toggleDailyCheck(columnId: string, dateStr: string, studentCode: string, checked: boolean) {
    if (checked) {
        await saveDailyRecord({
            columnId,
            classId: 'unknown',
            studentCode,
            date: dateStr,
            selectedSuggestions: ['True'],
            note: ''
        });
    } else {
        const id = `${columnId}_${dateStr}_${studentCode}`;
        await deleteRecord(columnId, id);
    }
}
