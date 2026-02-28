/**
 * Record Service - CRUD operations for column records
 * Handles DailyRecord, PeriodRecord, and OneTimeRecord
 */

import { db } from '@/lib/firebase';
import { DailyRecord, PeriodRecord, OneTimeRecord, ColumnFrequency, Column } from '@/types/models';
import { getColumn } from './column-service';
import {
    collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch
} from 'firebase/firestore';

const SCHOOL_ID = 'default';
const CURRENT_YEAR = '2025-2026';

/**
 * Get the Firestore path for column data
 */
function getColumnDataPath(columnId: string) {
    return `schools/${SCHOOL_ID}/years/${CURRENT_YEAR}/columnData/${columnId}/records`;
}

// ============================================
// DAILY RECORDS
// ============================================

/**
 * Save a daily record
 */
export async function saveDailyRecord(record: Omit<DailyRecord, 'id' | 'updatedAt'>): Promise<DailyRecord> {
    const column = await getColumn(record.columnId);
    if (!column || column.frequency !== 'daily') {
        throw new Error('Invalid column for daily record');
    }

    const id = `${record.columnId}_${record.date}_${record.studentCode}`;
    const fullRecord: DailyRecord = {
        ...record,
        id,
        updatedAt: new Date().toISOString(),
    };

    const docRef = doc(db, getColumnDataPath(record.columnId), id);
    await setDoc(docRef, fullRecord);

    return fullRecord;
}

/**
 * Get daily records for a column on a specific date
 */
export async function getDailyRecords(columnId: string, date: string): Promise<DailyRecord[]> {
    const colRef = collection(db, getColumnDataPath(columnId));
    const q = query(colRef, where('date', '==', date));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as DailyRecord);
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
    const colRef = collection(db, getColumnDataPath(columnId));
    const q = query(
        colRef,
        where('studentCode', '==', studentCode),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as DailyRecord);
}

/**
 * Batch save daily records for multiple students
 */
export async function saveDailyRecordsBatch(
    columnId: string,
    date: string,
    records: { studentCode: string; selectedSuggestions: string[]; note?: string }[]
): Promise<void> {
    const column = await getColumn(columnId);
    if (!column || column.frequency !== 'daily') {
        throw new Error('Invalid column for daily record');
    }

    const batch = writeBatch(db);
    const now = new Date().toISOString();

    for (const record of records) {
        const id = `${columnId}_${date}_${record.studentCode}`;
        const fullRecord: DailyRecord = {
            id,
            columnId,
            classId: column.classId,
            studentCode: record.studentCode,
            date,
            selectedSuggestions: record.selectedSuggestions,
            note: record.note,
            updatedAt: now,
        };
        const docRef = doc(db, getColumnDataPath(columnId), id);
        batch.set(docRef, fullRecord);
    }

    await batch.commit();
}

// ============================================
// PERIOD RECORDS
// ============================================

/**
 * Save a period record
 */
export async function savePeriodRecord(record: Omit<PeriodRecord, 'id' | 'updatedAt'>): Promise<PeriodRecord> {
    const column = await getColumn(record.columnId);
    if (!column || column.frequency !== 'period') {
        throw new Error('Invalid column for period record');
    }

    const id = `${record.columnId}_${record.periodKey}_${record.studentCode}`;
    const fullRecord: PeriodRecord = {
        ...record,
        id,
        updatedAt: new Date().toISOString(),
    };

    const docRef = doc(db, getColumnDataPath(record.columnId), id);
    await setDoc(docRef, fullRecord);

    return fullRecord;
}

/**
 * Get period records for a column
 */
export async function getPeriodRecords(columnId: string, periodKey: string): Promise<PeriodRecord[]> {
    const colRef = collection(db, getColumnDataPath(columnId));
    const q = query(colRef, where('periodKey', '==', periodKey));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as PeriodRecord);
}

// ============================================
// ONE-TIME RECORDS
// ============================================

/**
 * Save a one-time record
 */
export async function saveOneTimeRecord(record: Omit<OneTimeRecord, 'id' | 'updatedAt'>): Promise<OneTimeRecord> {
    const column = await getColumn(record.columnId);
    if (!column || column.frequency !== 'one_time') {
        throw new Error('Invalid column for one-time record');
    }

    const id = `${record.columnId}_${record.studentCode}`;
    const fullRecord: OneTimeRecord = {
        ...record,
        id,
        updatedAt: new Date().toISOString(),
        completedAt: record.status === 'done' ? new Date().toISOString() : undefined,
    };

    const docRef = doc(db, getColumnDataPath(record.columnId), id);
    await setDoc(docRef, fullRecord);

    return fullRecord;
}

/**
 * Get all one-time records for a column
 */
export async function getOneTimeRecords(columnId: string): Promise<OneTimeRecord[]> {
    const colRef = collection(db, getColumnDataPath(columnId));
    const snap = await getDocs(colRef);
    return snap.docs.map(d => d.data() as OneTimeRecord);
}

/**
 * Check if all students have completed a one-time column
 */
export async function checkOneTimeComplete(columnId: string, totalStudents: number): Promise<boolean> {
    const records = await getOneTimeRecords(columnId);
    const doneCount = records.filter(r => r.status === 'done').length;
    return doneCount >= totalStudents;
}

// ============================================
// GENERIC HELPERS
// ============================================

/**
 * Delete a record
 */
export async function deleteRecord(columnId: string, recordId: string): Promise<void> {
    const docRef = doc(db, getColumnDataPath(columnId), recordId);
    await deleteDoc(docRef);
}

/**
 * Get records for a column with optional filters
 */
export async function getAllRecordsForColumn(
    columnId: string,
    filters?: { startDate?: string; endDate?: string; periodKey?: string }
): Promise<(DailyRecord | PeriodRecord | OneTimeRecord)[]> {
    const colRef = collection(db, getColumnDataPath(columnId));
    let q = query(colRef);

    if (filters) {
        if (filters.periodKey) {
            q = query(q, where('periodKey', '==', filters.periodKey));
        }
        if (filters.startDate) {
            q = query(q, where('date', '>=', filters.startDate));
        }
        if (filters.endDate) {
            q = query(q, where('date', '<=', filters.endDate));
        }
    }

    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as DailyRecord | PeriodRecord | OneTimeRecord);
}
