/**
 * Column Service - CRUD operations for custom columns
 */

import { db } from '@/lib/firebase';
import { Column, ColumnFrequency } from '@/types/models';
import { createFixedColumnsForClass, isFixedColumn, FIXED_COLUMN_IDS } from '@/lib/defaults';
import {
    collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch
} from 'firebase/firestore';

const SCHOOL_ID = 'default';
const CURRENT_YEAR = '2025-2026';

/**
 * Get all columns for a class
 */
export async function getColumns(classId: string): Promise<Column[]> {
    const colRef = collection(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'columns');
    const q = query(colRef, where('classId', '==', classId));
    const snap = await getDocs(q);
    const columns = snap.docs.map(d => d.data() as Column);

    // Sort by order, then by createdAt
    return columns.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.createdAt.localeCompare(b.createdAt);
    });
}

/**
 * Get columns filtered by frequency
 */
export async function getColumnsByFrequency(classId: string, frequency: ColumnFrequency): Promise<Column[]> {
    const columns = await getColumns(classId);
    return columns.filter(c => c.frequency === frequency && !c.archived);
}

/**
 * Get a single column by ID
 */
export async function getColumn(columnId: string): Promise<Column | null> {
    const docRef = doc(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'columns', columnId);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as Column) : null;
}

/**
 * Create a new column
 */
export async function createColumn(column: Omit<Column, 'createdAt' | 'updatedAt'>): Promise<Column> {
    // Validate frequency is provided
    if (!column.frequency) {
        throw new Error('Column frequency is required');
    }

    // Validate period config for period columns
    if (column.frequency === 'period' && !column.periodConfig) {
        throw new Error('Period config is required for period columns');
    }

    const now = new Date().toISOString();
    const fullColumn: Column = {
        ...column,
        createdAt: now,
        updatedAt: now,
    };

    const docRef = doc(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'columns', column.id);
    await setDoc(docRef, fullColumn);

    return fullColumn;
}

/**
 * Update an existing column
 */
export async function updateColumn(columnId: string, updates: Partial<Column>): Promise<void> {
    const existing = await getColumn(columnId);
    if (!existing) {
        throw new Error('Column not found');
    }

    // Fixed columns can only update suggestions
    if (isFixedColumn(columnId)) {
        const allowedUpdates: Partial<Column> = {
            suggestions: updates.suggestions,
            updatedAt: new Date().toISOString(),
        };

        const docRef = doc(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'columns', columnId);
        await setDoc(docRef, { ...existing, ...allowedUpdates }, { merge: true });
        return;
    }

    // Custom columns can update more fields
    const docRef = doc(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'columns', columnId);
    await setDoc(docRef, {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
    }, { merge: true });
}

/**
 * Delete a column (only custom columns)
 */
export async function deleteColumn(columnId: string): Promise<void> {
    if (isFixedColumn(columnId)) {
        throw new Error('Cannot delete fixed columns');
    }

    const docRef = doc(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'columns', columnId);
    await deleteDoc(docRef);
}

/**
 * Archive a column
 */
export async function archiveColumn(columnId: string): Promise<void> {
    await updateColumn(columnId, { archived: true });
}

/**
 * Unarchive a column
 */
export async function unarchiveColumn(columnId: string): Promise<void> {
    await updateColumn(columnId, { archived: false });
}

/**
 * Initialize fixed columns for a class (if not exist)
 */
export async function initializeFixedColumns(classId: string): Promise<void> {
    const existingColumns = await getColumns(classId);
    const existingIds = new Set(existingColumns.map(c => c.id));

    const fixedColumnTemplates = createFixedColumnsForClass(classId);
    const now = new Date().toISOString();

    const batch = writeBatch(db);
    let hasNewColumns = false;

    for (const template of fixedColumnTemplates) {
        if (!existingIds.has(template.id)) {
            const fullColumn: Column = {
                ...template,
                createdAt: now,
                updatedAt: now,
            };
            const docRef = doc(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'columns', template.id);
            batch.set(docRef, fullColumn);
            hasNewColumns = true;
        }
    }

    if (hasNewColumns) {
        await batch.commit();
    }
}

/**
 * Get fixed columns for a class
 */
export async function getFixedColumns(classId: string): Promise<Column[]> {
    const columns = await getColumns(classId);
    return columns.filter(c => c.scope === 'fixed');
}

/**
 * Get custom columns for a class
 */
export async function getCustomColumns(classId: string): Promise<Column[]> {
    const columns = await getColumns(classId);
    return columns.filter(c => c.scope === 'custom');
}

/**
 * Clone a period column for a new period
 */
export async function clonePeriodColumn(columnId: string, newPeriodConfig: Column['periodConfig']): Promise<Column> {
    const existing = await getColumn(columnId);
    if (!existing) {
        throw new Error('Column not found');
    }

    if (existing.frequency !== 'period') {
        throw new Error('Can only clone period columns');
    }

    const newId = `${existing.classId}_${Date.now()}`;
    const newColumn: Omit<Column, 'createdAt' | 'updatedAt'> = {
        ...existing,
        id: newId,
        periodConfig: newPeriodConfig,
        archived: false,
    };

    return createColumn(newColumn);
}
