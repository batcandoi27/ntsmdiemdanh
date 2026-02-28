/**
 * Attendance v3 Types
 *
 * Exception-only model: chỉ lưu record cho HS vắng/trễ/phép.
 * HS có mặt → KHÔNG write DB → giảm ~93% writes.
 *
 *
 * Schema: schools/{schoolId}/years/{year}/attendance/{date}/records/{recordId}
 *   recordId = {classId}_{session}_{period|all}_{studentId}
 */

import { UserRole } from './models';
import { SessionType } from './timetable';

// ============================================
// Core Types
// ============================================

export type AttendanceStatusV3 = 'absent' | 'late' | 'excused' | 'violation' | 'praise';

export interface AttendanceRecordV3 {
    id: string;                     // Document ID = classId_session_period_studentId
    classId: string;
    studentId: string;
    studentName: string;
    session: SessionType;           // 'morning' | 'afternoon'
    period: number | null;          // null = CẢ BUỔI (99% trường hợp), 1-5 = theo tiết
    status: AttendanceStatusV3;     // 'absent' | 'late' | 'excused'
    subject?: string;               // Chỉ khi period != null
    note?: string;
    markedBy: string;               // UID
    markedByName: string;
    markedByRole: UserRole;
    timestamp: string;              // ISO
}

/** Quick attendance summary for a class on a date */
export interface AttendanceSummaryV3 {
    classId: string;
    date: string;
    session: SessionType;
    totalStudents: number;          // Sĩ số thực tế (active + temp_leave)
    activeStudents: number;         // Chỉ active (có thể điểm danh)
    presentCount: number;           // = activeStudents - absentCount - lateCount - excusedCount
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    attendanceRate: number;         // % có mặt (present / active * 100)
    isComplete: boolean;            // Đã điểm danh chưa
    records: AttendanceRecordV3[];
}

// ============================================
// Record ID Helper
// ============================================

export function buildRecordId(
    classId: string,
    session: SessionType,
    period: number | null,
    studentId: string
): string {
    const periodPart = period !== null ? String(period) : 'all';
    return `${classId}_${session}_${periodPart}_${studentId}`;
}

export function parseRecordId(id: string): {
    classId: string;
    session: SessionType;
    period: number | null;
    studentId: string;
} | null {
    const parts = id.split('_');
    if (parts.length < 4) return null;
    // classId can contain underscores, studentId is last part
    const studentId = parts[parts.length - 1];
    const period = parts[parts.length - 2];
    const session = parts[parts.length - 3] as SessionType;
    const classId = parts.slice(0, parts.length - 3).join('_');
    return {
        classId,
        session,
        period: period === 'all' ? null : parseInt(period),
        studentId,
    };
}

// ============================================
// Date Path Helper
// ============================================

const SCHOOL_ID = 'default';

export function getAttendancePath(year: string, date: string): string {
    return `schools/${SCHOOL_ID}/years/${year}/attendance/${date}/records`;
}

export function formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
}
