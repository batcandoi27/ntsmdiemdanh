/**
 * Preset Service - CRUD operations for report presets
 */

import { db } from '@/lib/firebase';
import { ReportPreset, ColumnFrequency } from '@/types/models';
import {
    collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where
} from 'firebase/firestore';
import { SCHOOL_ID, DEFAULT_YEAR as CURRENT_YEAR } from '@/config/constants';

/**
 * Get all presets for a class
 */
export async function getPresets(classId: string): Promise<ReportPreset[]> {
    const colRef = collection(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'reportPresets');
    const q = query(colRef, where('classId', '==', classId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ReportPreset);
}

/**
 * Get a single preset
 */
export async function getPreset(presetId: string): Promise<ReportPreset | null> {
    const docRef = doc(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'reportPresets', presetId);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as ReportPreset) : null;
}

/**
 * Create a new preset
 */
export async function createPreset(preset: Omit<ReportPreset, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportPreset> {
    const id = `preset_${Date.now()}`;
    const now = new Date().toISOString();

    const fullPreset: ReportPreset = {
        ...preset,
        id,
        createdAt: now,
        updatedAt: now,
    };

    const docRef = doc(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'reportPresets', id);
    await setDoc(docRef, fullPreset);

    return fullPreset;
}

/**
 * Update a preset
 */
export async function updatePreset(presetId: string, updates: Partial<ReportPreset>): Promise<void> {
    const existing = await getPreset(presetId);
    if (!existing) {
        throw new Error('Preset not found');
    }

    const docRef = doc(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'reportPresets', presetId);
    await setDoc(docRef, {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
    }, { merge: true });
}

/**
 * Delete a preset
 */
export async function deletePreset(presetId: string): Promise<void> {
    const docRef = doc(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'reportPresets', presetId);
    await deleteDoc(docRef);
}

/**
 * Default preset for "Nề nếp hàng ngày"
 */
export function getDefaultDailyPreset(classId: string): Omit<ReportPreset, 'id' | 'createdAt' | 'updatedAt'> {
    return {
        classId,
        name: 'Nề nếp hàng ngày',
        visibleColumnIds: [], // Empty means show all
        frequencyFilters: ['daily'],
        showArchived: false,
    };
}

/**
 * Default preset for "Tình hình đóng phí"
 */
export function getPaymentPreset(classId: string): Omit<ReportPreset, 'id' | 'createdAt' | 'updatedAt'> {
    return {
        classId,
        name: 'Tình hình đóng phí',
        visibleColumnIds: [],
        frequencyFilters: ['period', 'one_time'],
        showArchived: false,
    };
}

/**
 * Apply preset filters to columns
 */
export function applyPresetToColumns<T extends { frequency: ColumnFrequency; archived: boolean; id: string }>(
    columns: T[],
    preset: ReportPreset
): T[] {
    return columns.filter(column => {
        // Filter by frequency
        if (preset.frequencyFilters.length > 0 && !preset.frequencyFilters.includes(column.frequency)) {
            return false;
        }

        // Filter archived
        if (!preset.showArchived && column.archived) {
            return false;
        }

        // Filter by visible columns (if specified)
        if (preset.visibleColumnIds.length > 0 && !preset.visibleColumnIds.includes(column.id)) {
            return false;
        }

        return true;
    });
}
