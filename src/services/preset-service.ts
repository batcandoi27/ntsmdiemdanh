/**
 * Preset Service - CRUD operations for report presets
 */

import { ReportPreset, ColumnFrequency } from '@/types/models';
import { supabaseAdmin } from '@/lib/supabase-admin';

function mapPresetFromDB(row: any): ReportPreset {
    return {
        id: row.id,
        classId: row.class_id,
        name: row.name,
        visibleColumnIds: row.visible_column_ids || [],
        frequencyFilters: row.frequency_filters || [],
        showArchived: row.show_archived || false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapPresetToDB(preset: Partial<ReportPreset>) {
    const data: any = {};
    if (preset.classId !== undefined) data.class_id = preset.classId;
    if (preset.name !== undefined) data.name = preset.name;
    if (preset.visibleColumnIds !== undefined) data.visible_column_ids = preset.visibleColumnIds;
    if (preset.frequencyFilters !== undefined) data.frequency_filters = preset.frequencyFilters;
    if (preset.showArchived !== undefined) data.show_archived = preset.showArchived;
    return data;
}

/**
 * Get all presets for a class
 */
export async function getPresets(classId: string): Promise<ReportPreset[]> {
    const { data, error } = await supabaseAdmin.from('report_presets').select('*').eq('class_id', classId);
    if (error) {
        console.error('Error fetching presets:', error);
        return [];
    }
    return data.map(mapPresetFromDB);
}

/**
 * Get a single preset
 */
export async function getPreset(presetId: string): Promise<ReportPreset | null> {
    const { data, error } = await supabaseAdmin.from('report_presets').select('*').eq('id', presetId).single();
    if (error || !data) return null;
    return mapPresetFromDB(data);
}

/**
 * Create a new preset
 */
export async function createPreset(preset: Omit<ReportPreset, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportPreset> {
    const { data, error } = await supabaseAdmin.from('report_presets')
        .insert([mapPresetToDB(preset)])
        .select()
        .single();
    
    if (error) throw error;
    return mapPresetFromDB(data);
}

/**
 * Update a preset
 */
export async function updatePreset(presetId: string, updates: Partial<ReportPreset>): Promise<void> {
    const { error } = await supabaseAdmin.from('report_presets')
        .update(mapPresetToDB(updates))
        .eq('id', presetId);
        
    if (error) throw error;
}

/**
 * Delete a preset
 */
export async function deletePreset(presetId: string): Promise<void> {
    const { error } = await supabaseAdmin.from('report_presets').delete().eq('id', presetId);
    if (error) throw error;
}

/**
 * Default preset for "Nề nếp hàng ngày"
 */
export function getDefaultDailyPreset(classId: string): Omit<ReportPreset, 'id' | 'createdAt' | 'updatedAt'> {
    return {
        classId,
        name: 'Nề nếp hàng ngày',
        visibleColumnIds: [],
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
        if (preset.frequencyFilters.length > 0 && !preset.frequencyFilters.includes(column.frequency)) {
            return false;
        }

        if (!preset.showArchived && column.archived) {
            return false;
        }

        if (preset.visibleColumnIds.length > 0 && !preset.visibleColumnIds.includes(column.id)) {
            return false;
        }

        return true;
    });
}
