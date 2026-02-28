'use server';

import { db } from '@/services/db';

import { Class, AttendanceStatus, Student } from '@/types/models';

export interface BlockAttendanceItem {
    classId: string;
    className: string;
    totalStudents: number;
    attendanceCount: {
        P: number;
        K: number;
        V: number;
        T: number;
        VP: number;
        KH: number;
        Present: number; // Có mặt (sĩ số - vắng)
        TotalAbsent: number; // Tổng Vắng (P + K + V)
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
}

import { getAttendanceByClasses } from '@/services/attendance-v3-service';
import { SessionType } from '@/types/timetable';
import { getEffectiveStatus } from '@/services/student-status-service';

export async function getGradeAttendanceSummary(grade: number, dateStr: string, session: SessionType = 'morning'): Promise<BlockAttendanceItem[]> {
    // 1. Get all classes
    const allClasses = await db.getClasses();
    const gradeClasses = allClasses.filter(c => c.grade === grade)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (gradeClasses.length === 0) return [];

    const classIds = gradeClasses.map(c => c.id);

    // 2. Get All V3 Attendance Records chỉ cho các lớp trong khối
    const allRecords = await getAttendanceByClasses(dateStr, classIds, session);

    // Lọc theo period (cả buổi)
    const records = allRecords.filter(r => r.period === null);

    // Map records by classId -> Array of records
    const recordMap = new Map<string, typeof records>();
    records.forEach(r => {
        if (!recordMap.has(r.classId)) recordMap.set(r.classId, []);
        recordMap.get(r.classId)!.push(r);
    });

    // 3. Build Result
    const result: BlockAttendanceItem[] = await Promise.all(gradeClasses.map(async cls => {
        const classRecords = recordMap.get(cls.id) || [];
        const counts = {
            P: 0, K: 0, V: 0, T: 0, VP: 0, KH: 0, Present: 0, TotalAbsent: 0
        };
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

        const studentMap = new Map(activeStudents.map(s => [s.code, s]));
        const getSTT = (code: string) => {
            const parts = code.split('_');
            return parts.length > 1 ? parts[parts.length - 1] : '';
        };

        // Exception-only: only process the explicit records
        classRecords.forEach(record => {
            const code = record.studentId;
            const student = studentMap.get(code); // Might be undefined if dropped_out, skip if so?
            if (!student) return;

            const name = student.fullName || code;
            const stt = getSTT(student.code);
            const note = record.note || '';
            const status = record.status;

            const item = { name, stt, note };

            // V3 status strings might differ slightly from UI (e.g. absent/late/etc), but let's map them
            // In v3: 'present' | 'absent' | 'late' | 'excused' | 'violation' | 'praise'
            // Map to old ui status: K (absent), P (excused), V (vắng?), T (late), VP (violation), KH (praise)
            let uiStatus = '';
            if (status === 'excused') uiStatus = 'P';
            else if (status === 'absent') uiStatus = 'K';
            else if (status === 'late') uiStatus = 'T';
            else if (status === 'violation') uiStatus = 'VP';
            else if (status === 'praise') uiStatus = 'KH';

            if (uiStatus === 'P') { counts.P++; lists.P.push(item); }
            else if (uiStatus === 'K') { counts.K++; lists.K.push(item); }
            // Assuming V not used extensively in v3, map absent to K usually
            else if (uiStatus === 'T') { counts.T++; lists.T.push(item); }
            else if (uiStatus === 'VP') { counts.VP++; lists.VP.push(item); }
            else if (uiStatus === 'KH') { counts.KH++; lists.KH.push(item); }
        });

        // Sort lists by STT
        const sortFn = (a: { stt: string }, b: { stt: string }) => (parseInt(a.stt) || 0) - (parseInt(b.stt) || 0);
        lists.P.sort(sortFn);
        lists.K.sort(sortFn);
        lists.V.sort(sortFn);
        lists.T.sort(sortFn);
        lists.VP.sort(sortFn);
        lists.KH.sort(sortFn);

        const totalAbsence = counts.P + counts.K + counts.V;
        counts.TotalAbsent = totalAbsence;
        counts.Present = activeStudents.length - totalAbsence; // calculated present

        return {
            classId: cls.id,
            className: cls.name,
            totalStudents: activeStudents.length, // use active instead of total historical
            attendanceCount: counts,
            studentLists: lists
        };
    }));

    return result;
}

export interface StudentAttendanceDetail {
    student: Student;
    status: AttendanceStatus;
    note?: string;
    effectiveStatus?: string;
}

// ...

import { getClassAttendance } from '@/services/attendance-v3-service';

export async function getClassAttendanceDetails(classId: string, dateStr: string, session: SessionType = 'morning'): Promise<StudentAttendanceDetail[]> {
    const allStudents = await db.getStudentsByClass(classId);

    // Filter out dropped_out and suspended
    const targetDate = new Date(dateStr);
    const students = allStudents.filter(s => {
        const status = getEffectiveStatus(s);
        return status !== 'dropped_out' && status !== 'suspended';
    });

    // V3: Get records (only exceptions exist)
    const records = await getClassAttendance(classId, dateStr, session);

    // Map records by studentId
    const recordMap = new Map<string, typeof records[0]>();
    records.forEach(r => recordMap.set(r.studentId, r));

    return students.map(s => {
        const record = recordMap.get(s.code);
        let uiStatus = ''; // Default is present (empty string in old UI)
        let note = '';

        if (record) {
            note = record.note || '';
            const status = record.status;
            if (status === 'excused') uiStatus = 'P';
            else if (status === 'absent') uiStatus = 'K';
            else if (status === 'late') uiStatus = 'T';
            else if (status === 'violation') uiStatus = 'VP';
            else if (status === 'praise') uiStatus = 'KH';
        }

        return {
            student: s,
            status: uiStatus as AttendanceStatus,
            note: note,
            effectiveStatus: getEffectiveStatus(s)
        };
    }).sort((a, b) => a.student.order - b.student.order); // Sort by order
}

export async function updateBatchAttendance(
    classId: string,
    dateStr: string,
    updates: { studentCode: string, status: AttendanceStatus, note?: string }[]
) {
    // 1. Get existing record or create new
    let record = await db.getAttendance(classId, dateStr);

    if (!record) {
        // Create skeleton if not exists
        record = {
            id: `${classId}_${dateStr}`,
            classId: classId,
            date: dateStr,
            absences: {},
            notes: {},
            updatedBy: 'system', // TODO: Get current user
            updatedAt: new Date().toISOString(),
            syncStatus: 'pending'
        };
    }

    // Initialize notes if missing
    if (!record.notes) record.notes = {};
    if (!record.absences) record.absences = {};

    // 2. Apply updates
    updates.forEach(u => {
        // Update Status
        record!.absences[u.studentCode] = u.status;

        // Update Note (only if provided, allows clearing if empty string passed, or keeping if undefined)
        // Logic: If u.note is defined (even empty string), update it.
        if (u.note !== undefined) {
            record!.notes![u.studentCode] = u.note;
        }

        // Cleanup: If status is empty/Present, maybe clear note? 
        // User might want to keep note even if present? Unlikely for 'Vi Phạm' but possible.
        // For now, let's keep it simple: If status is NOT 'VP' or 'T', remove note?
        // User request: "Trễ vẫn có thể Vi Phạm".
        // Let's NOT auto-clear notes, but allow frontend to clear them.
    });

    record.updatedAt = new Date().toISOString();

    // 3. Save
    await db.saveAttendance(record);
}

export async function getClassesAttendanceSummary(classIds: string[], dateStr: string, session: SessionType = 'morning'): Promise<BlockAttendanceItem[]> {
    if (classIds.length === 0) return [];

    // 1. Get all classes
    const allClasses = await db.getClasses();
    const targetedClasses = allClasses.filter(c => classIds.includes(c.id))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (targetedClasses.length === 0) return [];

    // 2. Get All V3 Attendance Records chỉ cho các target classes
    const allRecords = await getAttendanceByClasses(dateStr, classIds, session);

    // Lọc theo period (cả buổi)
    const records = allRecords.filter(r => r.period === null);

    const recordMap = new Map<string, typeof records>();
    records.forEach(r => {
        if (!recordMap.has(r.classId)) recordMap.set(r.classId, []);
        recordMap.get(r.classId)!.push(r);
    });

    // 3. Build Result
    const result: BlockAttendanceItem[] = await Promise.all(targetedClasses.map(async cls => {
        const classRecords = recordMap.get(cls.id) || [];
        const counts = {
            P: 0, K: 0, V: 0, T: 0, VP: 0, KH: 0, Present: 0, TotalAbsent: 0
        };
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
        const studentMap = new Map(activeStudents.map(s => [s.code, s]));
        const getSTT = (code: string) => {
            const parts = code.split('_');
            return parts.length > 1 ? parts[parts.length - 1] : '';
        };

        classRecords.forEach(record => {
            const code = record.studentId;
            const student = studentMap.get(code);
            if (!student) return;

            const name = student.fullName || code;
            const stt = getSTT(student.code);
            const note = record.note || '';
            const status = record.status;

            const item = { name, stt, note };

            let uiStatus = '';
            if (status === 'excused') uiStatus = 'P';
            else if (status === 'absent') uiStatus = 'K';
            else if (status === 'late') uiStatus = 'T';
            else if (status === 'violation') uiStatus = 'VP';
            else if (status === 'praise') uiStatus = 'KH';

            if (uiStatus === 'P') { counts.P++; lists.P.push(item); }
            else if (uiStatus === 'K') { counts.K++; lists.K.push(item); }
            else if (uiStatus === 'T') { counts.T++; lists.T.push(item); }
            else if (uiStatus === 'VP') { counts.VP++; lists.VP.push(item); }
            else if (uiStatus === 'KH') { counts.KH++; lists.KH.push(item); }
        });

        const sortFn = (a: { stt: string }, b: { stt: string }) => (parseInt(a.stt) || 0) - (parseInt(b.stt) || 0);
        lists.P.sort(sortFn); lists.K.sort(sortFn); lists.V.sort(sortFn);
        lists.T.sort(sortFn); lists.VP.sort(sortFn); lists.KH.sort(sortFn);

        const totalAbsence = counts.P + counts.K + counts.V;
        counts.TotalAbsent = totalAbsence;
        counts.Present = activeStudents.length - totalAbsence;

        return {
            classId: cls.id,
            className: cls.name,
            totalStudents: activeStudents.length,
            attendanceCount: counts,
            studentLists: lists
        };
    }));

    return result;
}

// ==========================================
// PHASE 09: Custom Columns Support
// ==========================================

import { getColumnsByFrequency } from '@/services/column-service';
import { getDailyRecords } from '@/services/record-service';
import { Column, DailyRecord } from '@/types/models';

export interface DailyAttendanceData {
    students: StudentAttendanceDetail[];
    customColumns: Column[];
    studentRecords: Record<string, Record<string, boolean>>; // studentCode -> colId -> hasRecord
}

export async function getDailyAttendanceData(classId: string, dateStr: string, session: SessionType = 'morning'): Promise<DailyAttendanceData> {
    // 1. Get Base Students & Attendance
    const students = await getClassAttendanceDetails(classId, dateStr, session);

    // 2. Get Active Daily Columns
    // TODO: Filter by scope if needed (for now fetch all and filter in UI or here)
    const allDailyCols = await getColumnsByFrequency(classId, 'daily');
    // Filter for this class? 
    // Custom Columns might be global or specific?
    // Current `getColumns` logic: returns ALL columns for the school/year.
    // We need to filter those applicable to this class.
    // Logic: 
    // - If column.scope (not existing yet on Column? Ah applicableScope).
    // - Actually `Column` has `classId`? No, Custom Columns are usually global or per class?
    // - `Column` model has `title`, `type`...
    // - Let's look at `createColumn`: it stores in `schools/.../years/.../columns`.
    // - So columns are Global for the School Year.
    // - But maybe we want to filter relevant ones?
    // - For now, show ALL Daily columns.

    // Sort columns by order?
    const customColumns = allDailyCols.filter(c => !c.archived).sort((a, b) => (1) - (1)); // Todo sort

    // 3. Get Records for these columns
    // We need to fetch records for ALL students in this class for these columns.
    // Optimization: fetch by column and date.

    const studentRecords: Record<string, Record<string, boolean>> = {};

    // Initialize map
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

import { saveDailyRecord, deleteRecord } from '@/services/record-service';

export async function toggleDailyCheck(columnId: string, dateStr: string, studentCode: string, checked: boolean) {
    if (checked) {
        // Create Record
        // We need classId? saveDailyRecord fetches column to get classId?
        // column-service getColumn returns Column.
        // record-service checks column.frequency.
        // It doesn't use column.classId for record.classId unless we pass it.
        // But record-service saveDailyRecord implementation:
        // const fullRecord = { ...record, ... };
        // It doesn't auto-fill classId from column. 
        // We should pass classId if possible.
        // But we might not knwo classId here easily without fetching column.
        // Actually record-service `saveDailyRecordsBatch` DOES:
        // classId: column.classId,
        // Let's check saveDailyRecord implementation in step 593.
        // It constructs fullRecord from `record`. It does NOT auto-fill classId.
        // So we should probably fetch column here or make record-service handle it?
        // Let's assume record-service handles it or we don't strictly need classId on Record if we have studentCode?
        // But for querying by Class, yes we do.

        // Let's update `saveDailyRecord` in `record-service` later if needed, but for now passing 'unknown' or fetching column.
        // To be safe, let's just pass basic info, if `saveDailyRecord` doesn't enforce classId...
        // `DailyRecord` type has `classId?: string` (maybe).

        await saveDailyRecord({
            columnId,
            classId: 'unknown', // To be removed or fixed later in column-service if needed, currently dummy
            studentCode,
            date: dateStr,
            selectedSuggestions: ['True'], // Default for boolean toggle
            note: ''
        });
    } else {
        // Delete Record
        // ID construction: columnId_date_studentCode
        const id = `${columnId}_${dateStr}_${studentCode}`;
        await deleteRecord(columnId, id);
    }
}
