'use server';

import { db } from '@/services/db';
import { Class, AttendanceStatus, Student, Column, DailyRecord } from '@/types/models';
import { SessionType } from '@/types/timetable';
import { getEffectiveStatus, getClassSize } from '@/services/student-status-service';
import { fetchAppSettings } from './settings';
import { 
    getClassAttendance, 
    getAttendanceByClasses, 
    normalizeAttendanceRecord,
    batchMarkAttendance 
} from '@/services/attendance-v3-service';
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

            const studentRecords = new Map<string, typeof classRecords>();
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

                const mainRecord = records.find(r => r.period === null);
                if (mainRecord) {
                    const status = mainRecord.status;
                    const note = mainRecord.note || '';
                    const itemWithNote = { ...item, note };

                    if (status === 'excused' || status === 'P') { counts.P++; lists.P.push(itemWithNote); }
                    else if (status === 'absent' || status === 'K') { counts.K++; lists.K.push(itemWithNote); }
                    else if (status === 'late' || status === 'T') { counts.T++; lists.T.push(itemWithNote); }
                    else if (status === 'absent_unknown' || status === 'V') { counts.V++; lists.V.push(itemWithNote); }
                }

                const violationRec = records.find(r => r.violation || r.status === 'VP' || r.status === 'violation');
                if (violationRec) {
                    counts.VP++;
                    lists.VP.push({ ...item, note: violationRec.violationNote || violationRec.note || '' });
                }

                const rewardRec = records.find(r => r.reward || r.status === 'KH' || r.status === 'reward' || r.status === 'praise');
                if (rewardRec) {
                    counts.KH++;
                    lists.KH.push({ ...item, note: rewardRec.rewardNote || rewardRec.note || '' });
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
        const recordMap = new Map<string, typeof records[0]>();
        records.forEach(r => {
            if (r.studentId) recordMap.set(r.studentId, r);
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
                    rewardNote: record.rewardNote
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

            const studentRecords = new Map<string, typeof classRecords>();
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

                const mainRecord = records.find(r => r.period === null);
                if (mainRecord) {
                    const status = mainRecord.status;
                    if (status === 'excused') { counts.P++; lists.P.push({...item, note: mainRecord.note}); }
                    else if (status === 'absent') { counts.K++; lists.K.push({...item, note: mainRecord.note}); }
                    else if (status === 'late') { counts.T++; lists.T.push({...item, note: mainRecord.note}); }
                }

                const violationRec = records.find(r => r.violation || r.status === 'VP');
                if (violationRec) { counts.VP++; lists.VP.push({...item, note: violationRec.violationNote || violationRec.note}); }
                
                const rewardRec = records.find(r => r.reward || r.status === 'KH');
                if (rewardRec) { counts.KH++; lists.KH.push({...item, note: rewardRec.rewardNote || rewardRec.note}); }
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
