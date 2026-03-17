/**
 * Attendance Service v3.0
 *
 * Exception-only model: chỉ write records cho HS vắng/trễ/phép.
 * HS có mặt = mặc định, KHÔNG lưu → giảm ~93% Firestore writes.
 *
 * Supports:
 * - Cả buổi (period = null) – 99% use case
 * - Theo tiết (period = 1-5) – only khi cần thiết
 * - Sáng/Chiều sessions
 */

import {
    doc, setDoc, deleteDoc, getDocs, getDoc,
    collection, query, where, writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    AttendanceRecordV3, AttendanceStatusV3, AttendanceSummaryV3,
    buildRecordId, getAttendancePath, formatDateKey,
} from '@/types/attendance-v3';
import { SessionType } from '@/types/timetable';
import { AppUser, Student } from '@/types/models';
import { checkClassEditAccess, checkEditWindow, checkStudentActive } from './auth-guard';
import { getEffectiveStatus, isStudentAttendable } from './student-status-service';

import { DEFAULT_YEAR as ACTIVE_YEAR } from '@/config/constants';

// ============================================
// Mark Attendance (Single Student)
// ============================================

interface MarkInput {
    classId: string;
    studentId: string;
    studentName: string;
    session: SessionType;
    period: number | null;
    status: AttendanceStatusV3;
    subject?: string;
    note?: string;
    missedPeriods?: number[];
    violation?: boolean;
    violationNote?: string;
    praise?: boolean;
    praiseNote?: string;
}

/**
 * Đánh dấu HS vắng/trễ/phép. 
 * Nếu status thay đổi thành "present" (có mặt) → XOÁ record (exception-only).
 */
export async function markAttendance(
    user: AppUser,
    input: MarkInput,
    date?: Date
): Promise<void> {
    // Security checks
    checkClassEditAccess(user, input.classId);

    const dateKey = formatDateKey(date || new Date());
    const recordId = buildRecordId(input.classId, input.session, input.period, input.studentId);
    const path = getAttendancePath(ACTIVE_YEAR, dateKey);
    const recordRef = doc(db, path, recordId);

    const record: AttendanceRecordV3 = {
        id: recordId,
        classId: input.classId,
        studentId: input.studentId,
        studentName: input.studentName,
        session: input.session,
        period: input.period,
        status: input.status,
        subject: input.subject,
        note: input.note,
        missedPeriods: input.missedPeriods,
        violation: input.violation,
        violationNote: input.violationNote,
        praise: input.praise,
        praiseNote: input.praiseNote,
        markedBy: user.uid,
        markedByName: user.displayName,
        markedByRole: user.role,
        timestamp: new Date().toISOString(),
    };

    // Firebase Firestore không hỗ trợ giá trị `undefined`, chúng ta cần xoá các khoá này
    if (record.subject === undefined) delete record.subject;
    if (record.note === undefined) delete record.note;
    if (record.missedPeriods === undefined) delete record.missedPeriods;
    if (record.violation === undefined) delete record.violation;
    if (record.violationNote === undefined) delete record.violationNote;
    if (record.praise === undefined) delete record.praise;
    if (record.praiseNote === undefined) delete record.praiseNote;
    if (record.period === undefined) record.period = null;

    // Exception-only: Nếu HS không có bất kỳ trạng thái đặc biệt nào (vắng/trễ/vi phạm/khen) 
    // và status là 'present' -> Xoá record
    const hasException = record.status !== 'present' || record.violation || record.praise;
    if (!hasException) {
        await deleteDoc(recordRef);
    } else {
        await setDoc(recordRef, record);
    }
}

/**
 * Đánh dấu HS có mặt = XOÁ record ngoại lệ
 */
export async function markPresent(
    user: AppUser,
    classId: string,
    studentId: string,
    session: SessionType,
    period: number | null,
    date?: Date
): Promise<void> {
    checkClassEditAccess(user, classId);

    // Check edit window: chỉ sửa/xoá trong thời gian cho phép
    const dateKey = formatDateKey(date || new Date());
    const recordId = buildRecordId(classId, session, period, studentId);
    const path = getAttendancePath(ACTIVE_YEAR, dateKey);
    const recordRef = doc(db, path, recordId);

    const existing = await getDoc(recordRef);
    if (existing.exists()) {
        checkEditWindow(user, existing.data().timestamp);
        await deleteDoc(recordRef);
    }
}

// ============================================
// Batch Mark (Whole Class Quick)
// ============================================

interface BatchMarkInput {
    classId: string;
    session: SessionType;
    period: number | null;
    /** Map studentId → status. Chỉ bao gồm HS vắng/trễ/phép (không cần HS có mặt) */
    marks: { 
        studentId: string; 
        studentName: string; 
        status: AttendanceStatusV3; 
        note?: string; 
        missedPeriods?: number[];
        violation?: boolean;
        violationNote?: string;
        praise?: boolean;
        praiseNote?: string;
    }[];
}

/**
 * Điểm danh nhanh cả lớp
 * - Chỉ write records cho HS vắng/trễ
 * - HS không có trong marks = có mặt (xoá record cũ nếu có)
 */
export async function batchMarkAttendance(
    user: AppUser,
    input: BatchMarkInput,
    allStudentIds: string[],
    date?: Date
): Promise<{ written: number; deleted: number }> {
    checkClassEditAccess(user, input.classId);

    const dateKey = formatDateKey(date || new Date());
    const path = getAttendancePath(ACTIVE_YEAR, dateKey);
    const batch = writeBatch(db);

    // Students who are absent/late/excused
    const markedIds = new Set(input.marks.map(m => m.studentId));

    let written = 0;
    let deleted = 0;

    // Write exception records
    for (const mark of input.marks) {
        const recordId = buildRecordId(input.classId, input.session, input.period, mark.studentId);
        const record: AttendanceRecordV3 = {
            id: recordId,
            classId: input.classId,
            studentId: mark.studentId,
            studentName: mark.studentName,
            session: input.session,
            period: input.period,
            status: mark.status,
            note: mark.note,
            missedPeriods: mark.missedPeriods,
            violation: mark.violation,
            violationNote: mark.violationNote,
            praise: mark.praise,
            praiseNote: mark.praiseNote,
            markedBy: user.uid,
            markedByName: user.displayName,
            markedByRole: user.role,
            timestamp: new Date().toISOString(),
        };

        // Firebase Firestore không hỗ trợ giá trị `undefined`
        if (record.note === undefined) delete record.note;
        if (record.missedPeriods === undefined) delete record.missedPeriods;
        if (record.violation === undefined) delete record.violation;
        if (record.violationNote === undefined) delete record.violationNote;
        if (record.praise === undefined) delete record.praise;
        if (record.praiseNote === undefined) delete record.praiseNote;
        if (record.period === undefined) record.period = null;

        batch.set(doc(db, path, recordId), record);
        written++;
    }

    // Delete old records for students now marked as present
    for (const studentId of allStudentIds) {
        if (!markedIds.has(studentId)) {
            const recordId = buildRecordId(input.classId, input.session, input.period, studentId);
            const recordRef = doc(db, path, recordId);
            batch.delete(recordRef);
            deleted++;
        }
    }

    await batch.commit();
    return { written, deleted };
}

// ============================================
// Query
// ============================================

/**
 * Lấy attendance records cho 1 lớp 1 ngày 1 buổi
 */
export async function getClassAttendance(
    classId: string,
    date: string,
    session?: SessionType
): Promise<AttendanceRecordV3[]> {
    const path = getAttendancePath(ACTIVE_YEAR, date);
    const ref = collection(db, path);

    let q;
    if (session) {
        q = query(ref,
            where('classId', '==', classId),
            where('session', '==', session)
        );
    } else {
        q = query(ref, where('classId', '==', classId));
    }

    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as AttendanceRecordV3);
}

/**
 * Tính summary: đếm vắng/trễ/phép từ records, tính present = total - exceptions
 */
export function calculateSummary(
    classId: string,
    date: string,
    session: SessionType,
    records: AttendanceRecordV3[],
    totalActive: number,
    totalStudents: number
): AttendanceSummaryV3 {
    const sessionRecords = records.filter(r => r.session === session && r.period === null);

    const absentCount = sessionRecords.filter(r => r.status === 'absent').length;
    const lateCount = sessionRecords.filter(r => r.status === 'late').length;
    const excusedCount = sessionRecords.filter(r => r.status === 'excused').length;
    
    // Violation được đếm riêng, không phụ thuộc vào trạng thái chuyên cần
    const recordsWithViolation = sessionRecords.filter(r => r.violation === true);
    
    const presentCount = totalActive - absentCount - lateCount - excusedCount;
    const attendanceRate = totalActive > 0 ? Math.round((presentCount / totalActive) * 100) : 0;

    return {
        classId,
        date,
        session,
        totalStudents,
        activeStudents: totalActive,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        attendanceRate,
        isComplete: records.length > 0 || presentCount === totalActive,
        records: sessionRecords,
    };
}

/**
 * Lấy full attendance cho toàn trường 1 ngày (Admin/Principal view)
 */
export async function getSchoolAttendance(date: string): Promise<AttendanceRecordV3[]> {
    const path = getAttendancePath(ACTIVE_YEAR, date);
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(d => d.data() as AttendanceRecordV3);
}

/**
 * Lấy attendance records cho nhiều lớp cùng lúc (tối đa 30 lớp/batch do Firestore `in` limit)
 */
export async function getAttendanceByClasses(
    date: string,
    classIds: string[],
    session?: SessionType
): Promise<AttendanceRecordV3[]> {
    if (!classIds || classIds.length === 0) return [];

    const path = getAttendancePath(ACTIVE_YEAR, date);
    const ref = collection(db, path);

    // Firestore 'in' query supports max 30 items
    const CHUNK_SIZE = 30;
    const chunks: string[][] = [];
    for (let i = 0; i < classIds.length; i += CHUNK_SIZE) {
        chunks.push(classIds.slice(i, i + CHUNK_SIZE));
    }

    const results: AttendanceRecordV3[] = [];
    for (const chunk of chunks) {
        let q;
        if (session) {
            q = query(ref,
                where('classId', 'in', chunk),
                where('session', '==', session)
            );
        } else {
            q = query(ref, where('classId', 'in', chunk));
        }
        const snap = await getDocs(q);
        results.push(...snap.docs.map(d => d.data() as AttendanceRecordV3));
    }

    return results;
}
