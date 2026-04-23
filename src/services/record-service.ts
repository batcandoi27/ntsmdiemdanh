/**
 * Record Service - CRUD operations for column records
 * Supabase implementation (100%)
 * Handles DailyRecord, PeriodRecord, and OneTimeRecord
 */

import { DailyRecord, PeriodRecord, OneTimeRecord } from '@/types/models';
import { supabase } from '@/lib/supabase';

// ============================================
// Helper: Supabase row ↔ TypeScript types
// ============================================

interface RecordRow {
    id: string;
    column_id: string;
    class_id: string;
    student_code: string;
    record_type: string;
    date: string | null;
    selected_suggestions: string[] | null;
    period_key: string | null;
    value: unknown;
    status: string | null;
    completed_at: string | null;
    note: string | null;
    updated_at: string;
}

function rowToDailyRecord(row: RecordRow): DailyRecord {
    return {
        id: row.id,
        columnId: row.column_id,
        classId: row.class_id,
        studentCode: row.student_code,
        date: row.date ?? '',
        selectedSuggestions: (row.selected_suggestions as string[]) ?? [],
        note: row.note ?? undefined,
        updatedAt: row.updated_at,
    };
}

function rowToPeriodRecord(row: RecordRow): PeriodRecord {
    return {
        id: row.id,
        columnId: row.column_id,
        classId: row.class_id,
        studentCode: row.student_code,
        periodKey: row.period_key ?? '',
        value: row.value as string | number | boolean,
        note: row.note ?? undefined,
        updatedAt: row.updated_at,
    };
}

function rowToOneTimeRecord(row: RecordRow): OneTimeRecord {
    return {
        id: row.id,
        columnId: row.column_id,
        classId: row.class_id,
        studentCode: row.student_code,
        status: (row.status as 'done' | 'pending') ?? 'pending',
        completedAt: row.completed_at ?? undefined,
        note: row.note ?? undefined,
        updatedAt: row.updated_at,
    };
}

// ============================================
// DAILY RECORDS
// ============================================

/**
 * Save a daily record
 */
export async function saveDailyRecord(record: Omit<DailyRecord, 'id' | 'updatedAt'>): Promise<DailyRecord> {
    const id = `${record.columnId}_${record.date}_${record.studentCode}`;
    const now = new Date().toISOString();

    const row = {
        id,
        column_id: record.columnId,
        class_id: record.classId,
        student_code: record.studentCode,
        record_type: 'daily',
        date: record.date,
        selected_suggestions: record.selectedSuggestions,
        note: record.note ?? null,
        updated_at: now,
    };

    const { error } = await supabase
        .from('column_records')
        .upsert(row, { onConflict: 'id' });

    if (error) {
        console.error('Error saving daily record:', error);
        throw new Error('Lỗi lưu record: ' + error.message);
    }

    return { ...record, id, updatedAt: now };
}

/**
 * Get daily records for a column on a specific date
 */
export async function getDailyRecords(columnId: string, date: string): Promise<DailyRecord[]> {
    const { data, error } = await supabase
        .from('column_records')
        .select('*')
        .eq('column_id', columnId)
        .eq('date', date)
        .eq('record_type', 'daily');

    if (error) {
        console.error('Error fetching daily records:', error);
        return [];
    }
    return (data as RecordRow[]).map(rowToDailyRecord);
}

/**
 * Get daily records for a student in a date range
 */
export async function getDailyRecordsForStudent(
    columnId: string,
    studentCode: string,
    startDate: string,
    endDate: string
): Promise<DailyRecord[]> {
    const { data, error } = await supabase
        .from('column_records')
        .select('*')
        .eq('column_id', columnId)
        .eq('student_code', studentCode)
        .eq('record_type', 'daily')
        .gte('date', startDate)
        .lte('date', endDate);

    if (error) {
        console.error('Error fetching daily records for student:', error);
        return [];
    }
    return (data as RecordRow[]).map(rowToDailyRecord);
}

/**
 * Batch save daily records for multiple students
 */
export async function saveDailyRecordsBatch(
    columnId: string,
    date: string,
    records: { studentCode: string; classId?: string; selectedSuggestions: string[]; note?: string }[]
): Promise<void> {
    const now = new Date().toISOString();

    const rows = records.map(record => ({
        id: `${columnId}_${date}_${record.studentCode}`,
        column_id: columnId,
        class_id: record.classId ?? 'unknown',
        student_code: record.studentCode,
        record_type: 'daily',
        date,
        selected_suggestions: record.selectedSuggestions,
        note: record.note ?? null,
        updated_at: now,
    }));

    const { error } = await supabase
        .from('column_records')
        .upsert(rows, { onConflict: 'id' });

    if (error) {
        console.error('Error batch saving daily records:', error);
        throw new Error('Lỗi lưu batch records: ' + error.message);
    }
}

// ============================================
// PERIOD RECORDS
// ============================================

/**
 * Save a period record
 */
export async function savePeriodRecord(record: Omit<PeriodRecord, 'id' | 'updatedAt'>): Promise<PeriodRecord> {
    const id = `${record.columnId}_${record.periodKey}_${record.studentCode}`;
    const now = new Date().toISOString();

    const row = {
        id,
        column_id: record.columnId,
        class_id: record.classId,
        student_code: record.studentCode,
        record_type: 'period',
        period_key: record.periodKey,
        value: record.value,
        note: record.note ?? null,
        updated_at: now,
    };

    const { error } = await supabase
        .from('column_records')
        .upsert(row, { onConflict: 'id' });

    if (error) {
        console.error('Error saving period record:', error);
        throw new Error('Lỗi lưu period record: ' + error.message);
    }

    return { ...record, id, updatedAt: now };
}

/**
 * Get period records for a column
 */
export async function getPeriodRecords(columnId: string, periodKey: string): Promise<PeriodRecord[]> {
    const { data, error } = await supabase
        .from('column_records')
        .select('*')
        .eq('column_id', columnId)
        .eq('period_key', periodKey)
        .eq('record_type', 'period');

    if (error) {
        console.error('Error fetching period records:', error);
        return [];
    }
    return (data as RecordRow[]).map(rowToPeriodRecord);
}

// ============================================
// ONE-TIME RECORDS
// ============================================

/**
 * Save a one-time record
 */
export async function saveOneTimeRecord(record: Omit<OneTimeRecord, 'id' | 'updatedAt'>): Promise<OneTimeRecord> {
    const id = `${record.columnId}_${record.studentCode}`;
    const now = new Date().toISOString();

    const row = {
        id,
        column_id: record.columnId,
        class_id: record.classId,
        student_code: record.studentCode,
        record_type: 'one_time',
        status: record.status,
        completed_at: record.status === 'done' ? now : null,
        note: record.note ?? null,
        updated_at: now,
    };

    const { error } = await supabase
        .from('column_records')
        .upsert(row, { onConflict: 'id' });

    if (error) {
        console.error('Error saving one-time record:', error);
        throw new Error('Lỗi lưu one-time record: ' + error.message);
    }

    return {
        ...record,
        id,
        completedAt: record.status === 'done' ? now : undefined,
        updatedAt: now,
    };
}

/**
 * Get all one-time records for a column
 */
export async function getOneTimeRecords(columnId: string): Promise<OneTimeRecord[]> {
    const { data, error } = await supabase
        .from('column_records')
        .select('*')
        .eq('column_id', columnId)
        .eq('record_type', 'one_time');

    if (error) {
        console.error('Error fetching one-time records:', error);
        return [];
    }
    return (data as RecordRow[]).map(rowToOneTimeRecord);
}

/**
 * Check if all students have completed a one-time column
 */
export async function checkOneTimeComplete(columnId: string, totalStudents: number): Promise<boolean> {
    const { count, error } = await supabase
        .from('column_records')
        .select('*', { count: 'exact', head: true })
        .eq('column_id', columnId)
        .eq('record_type', 'one_time')
        .eq('status', 'done');

    if (error) return false;
    return (count ?? 0) >= totalStudents;
}

// ============================================
// GENERIC HELPERS
// ============================================

/**
 * Delete a record
 */
export async function deleteRecord(columnId: string, recordId: string): Promise<void> {
    const { error } = await supabase
        .from('column_records')
        .delete()
        .eq('id', recordId);

    if (error) {
        console.error('Error deleting record:', error);
    }
}

/**
 * Get records for a column with optional filters
 */
export async function getAllRecordsForColumn(
    columnId: string,
    filters?: { startDate?: string; endDate?: string; periodKey?: string }
): Promise<(DailyRecord | PeriodRecord | OneTimeRecord)[]> {
    let q = supabase
        .from('column_records')
        .select('*')
        .eq('column_id', columnId);

    if (filters) {
        if (filters.periodKey) {
            q = q.eq('period_key', filters.periodKey);
        }
        if (filters.startDate) {
            q = q.gte('date', filters.startDate);
        }
        if (filters.endDate) {
            q = q.lte('date', filters.endDate);
        }
    }

    const { data, error } = await q;
    if (error) {
        console.error('Error fetching records for column:', error);
        return [];
    }

    return (data as RecordRow[]).map(row => {
        switch (row.record_type) {
            case 'period': return rowToPeriodRecord(row);
            case 'one_time': return rowToOneTimeRecord(row);
            default: return rowToDailyRecord(row);
        }
    });
}
