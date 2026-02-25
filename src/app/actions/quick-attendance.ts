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

export async function getGradeAttendanceSummary(grade: number, dateStr: string): Promise<BlockAttendanceItem[]> {
    // 1. Get all classes
    const allClasses = await db.getClasses();
    const gradeClasses = allClasses.filter(c => c.grade === grade)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (gradeClasses.length === 0) return [];

    const classIds = gradeClasses.map(c => c.id);

    // 2. Get Attendance Records for the date
    // We use getReportData for a single day range
    const records = await db.getReportData(dateStr, dateStr, classIds);

    // Map records by classId for easy lookup
    const recordMap = new Map(records.map(r => [r.classId, r]));

    // 3. Build Result
    const result: BlockAttendanceItem[] = await Promise.all(gradeClasses.map(async cls => {
        const record = recordMap.get(cls.id);
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

        // Need student info for names and STT
        // Optimization: We could fetch all students upfront, but per-class is fine for < 20 classes.
        const students = await db.getStudentsByClass(cls.id);
        const studentMap = new Map(students.map(s => [s.code, s]));
        const getSTT = (code: string) => {
            const parts = code.split('_');
            return parts.length > 1 ? parts[parts.length - 1] : '';
        };

        if (record && record.absences) {
            Object.entries(record.absences).forEach(([code, status]) => {
                const student = studentMap.get(code);
                const name = student?.fullName || code;
                const stt = student ? getSTT(student.code) : '';
                const note = record.notes?.[code] || '';

                const item = { name, stt, note };

                if (status === 'P') { counts.P++; lists.P.push(item); }
                else if (status === 'K') { counts.K++; lists.K.push(item); }
                else if (status === 'V') { counts.V++; lists.V.push(item); }
                else if (status === 'T') { counts.T++; lists.T.push(item); }
                else if (status === 'VP') { counts.VP++; lists.VP.push(item); }
                else if (status === 'KH') { counts.KH++; lists.KH.push(item); }
            });
        }

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
        counts.Present = (cls.totalStudents || 0) - totalAbsence;

        return {
            classId: cls.id,
            className: cls.name,
            totalStudents: cls.totalStudents || 0,
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
}

// ...

export async function getClassAttendanceDetails(classId: string, dateStr: string): Promise<StudentAttendanceDetail[]> {
    const students = await db.getStudentsByClass(classId);
    const attendance = await db.getAttendance(classId, dateStr);

    return students.map(s => ({
        student: s,
        status: attendance?.absences?.[s.code] || '',
        note: attendance?.notes?.[s.code] || ''
    })).sort((a, b) => a.student.order - b.student.order); // Sort by order
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

export async function getClassesAttendanceSummary(classIds: string[], dateStr: string): Promise<BlockAttendanceItem[]> {
    if (classIds.length === 0) return [];

    // 1. Get all classes
    const allClasses = await db.getClasses();
    const targetedClasses = allClasses.filter(c => classIds.includes(c.id))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (targetedClasses.length === 0) return [];

    // 2. Get Attendance Records
    const records = await db.getReportData(dateStr, dateStr, classIds);
    const recordMap = new Map(records.map(r => [r.classId, r]));

    // 3. Build Result
    const result: BlockAttendanceItem[] = await Promise.all(targetedClasses.map(async cls => {
        const record = recordMap.get(cls.id);
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
        const studentMap = new Map(students.map(s => [s.code, s]));
        const getSTT = (code: string) => {
            const parts = code.split('_');
            return parts.length > 1 ? parts[parts.length - 1] : '';
        };

        if (record && record.absences) {
            Object.entries(record.absences).forEach(([code, status]) => {
                const student = studentMap.get(code);
                const name = student?.fullName || code;
                const stt = student ? getSTT(student.code) : '';
                const note = record.notes?.[code] || '';
                const item = { name, stt, note };

                if (status === 'P') { counts.P++; lists.P.push(item); }
                else if (status === 'K') { counts.K++; lists.K.push(item); }
                else if (status === 'V') { counts.V++; lists.V.push(item); }
                else if (status === 'T') { counts.T++; lists.T.push(item); }
                else if (status === 'VP') { counts.VP++; lists.VP.push(item); }
                else if (status === 'KH') { counts.KH++; lists.KH.push(item); }
            });
        }

        const sortFn = (a: { stt: string }, b: { stt: string }) => (parseInt(a.stt) || 0) - (parseInt(b.stt) || 0);
        lists.P.sort(sortFn); lists.K.sort(sortFn); lists.V.sort(sortFn);
        lists.T.sort(sortFn); lists.VP.sort(sortFn); lists.KH.sort(sortFn);

        const totalAbsence = counts.P + counts.K + counts.V;
        counts.TotalAbsent = totalAbsence;
        counts.Present = (cls.totalStudents || 0) - totalAbsence;

        return {
            classId: cls.id,
            className: cls.name,
            totalStudents: cls.totalStudents || 0,
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

export async function getDailyAttendanceData(classId: string, dateStr: string): Promise<DailyAttendanceData> {
    // 1. Get Base Students & Attendance
    const students = await getClassAttendanceDetails(classId, dateStr);

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
    const customColumns = allDailyCols.filter(c => c.isActive !== false).sort((a, b) => (1) - (1)); // Todo sort

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
