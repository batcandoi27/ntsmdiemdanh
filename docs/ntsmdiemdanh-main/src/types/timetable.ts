/**
 * Timetable Types v3.0
 *
 * Schema: years/{year}/timetables/{timetableId}
 * Hỗ trợ nhiều đợt TKB (effectiveFrom/To), Sáng/Chiều, tối đa 5 tiết/buổi.
 */

import { UserRole } from './models';

// ============================================
// Core Types
// ============================================

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type SessionType = 'morning' | 'afternoon';

export interface PeriodSlot {
    period: number;          // 1-5
    subject: string;         // 'Toán', 'Văn', ...
    subjectCode?: string;    // 'TOAN', 'VAN'
    teacherName?: string;    // 'Cô Lan'
    teacherId?: string;      // UID
    room?: string;           // 'Phòng 301'
}

export interface DaySchedule {
    morning: PeriodSlot[];   // Tối đa 5 tiết. [] nếu không học sáng
    afternoon: PeriodSlot[]; // Tối đa 5 tiết. [] nếu không học chiều
}

export type WeekSchedule = Record<DayOfWeek, DaySchedule>;

export interface Timetable {
    id: string;              // Document ID
    classId: string;
    className: string;
    effectiveFrom: string;   // ISO date
    effectiveTo: string;     // ISO date
    schedule: WeekSchedule;
    createdBy: string;       // UID
    createdByName: string;
    updatedAt: string;       // ISO
    isActive: boolean;
}

// ============================================
// Conflict Detection
// ============================================

export interface TimetableConflict {
    type: 'teacher_overlap' | 'class_overlap' | 'session_warning';
    severity: 'error' | 'warning';
    message: string;
    day: DayOfWeek;
    session: SessionType;
    period: number;
    details: {
        classId?: string;
        className?: string;
        teacherName?: string;
        subject?: string;
    };
}

// ============================================
// Import/Export
// ============================================

/** Flat row for Excel import (1 row = 1 period slot) */
export interface TimetableFlatRow {
    className: string;
    day: DayOfWeek;
    session: SessionType;
    period: number;
    subject: string;
    subjectCode?: string;
    teacherName?: string;
    room?: string;
}

/** Import result */
export interface TimetableImportResult {
    success: boolean;
    timetables: Timetable[];
    conflicts: TimetableConflict[];
    errors: { row: number; message: string }[];
    stats: {
        classesProcessed: number;
        totalPeriods: number;
        conflictCount: number;
        errorCount: number;
    };
}

// ============================================
// Day/Session Display
// ============================================

export const DAY_LABELS: Record<DayOfWeek, string> = {
    monday: 'Thứ 2',
    tuesday: 'Thứ 3',
    wednesday: 'Thứ 4',
    thursday: 'Thứ 5',
    friday: 'Thứ 6',
    saturday: 'Thứ 7',
    sunday: 'Chủ nhật',
};

export const SESSION_LABELS: Record<SessionType, string> = {
    morning: 'Sáng',
    afternoon: 'Chiều',
};

export const DAY_ORDER: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function createEmptyDaySchedule(): DaySchedule {
    return { morning: [], afternoon: [] };
}

export function createEmptyWeekSchedule(): WeekSchedule {
    return {
        monday: createEmptyDaySchedule(),
        tuesday: createEmptyDaySchedule(),
        wednesday: createEmptyDaySchedule(),
        thursday: createEmptyDaySchedule(),
        friday: createEmptyDaySchedule(),
        saturday: createEmptyDaySchedule(),
        sunday: createEmptyDaySchedule(),
    };
}
