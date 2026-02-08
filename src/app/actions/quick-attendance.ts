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
        Present: number; // Có mặt (sĩ số - vắng)
        TotalAbsent: number; // Tổng Vắng (P + K + V)
    };
    studentLists: {
        P: { name: string; stt: string; note?: string }[];
        K: { name: string; stt: string; note?: string }[];
        V: { name: string; stt: string; note?: string }[];
        T: { name: string; stt: string; note?: string }[];
        VP: { name: string; stt: string; note?: string }[];
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
            P: 0, K: 0, V: 0, T: 0, VP: 0, Present: 0, TotalAbsent: 0
        };
        const lists = {
            P: [] as { name: string; stt: string; note?: string }[],
            K: [] as { name: string; stt: string; note?: string }[],
            V: [] as { name: string; stt: string; note?: string }[],
            T: [] as { name: string; stt: string; note?: string }[],
            VP: [] as { name: string; stt: string; note?: string }[]
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
            });
        }

        // Sort lists by STT
        const sortFn = (a: { stt: string }, b: { stt: string }) => (parseInt(a.stt) || 0) - (parseInt(b.stt) || 0);
        lists.P.sort(sortFn);
        lists.K.sort(sortFn);
        lists.V.sort(sortFn);
        lists.T.sort(sortFn);
        lists.VP.sort(sortFn);

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
