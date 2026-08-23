/**
 * Column Service - CRUD operations for custom columns
 * Supabase implementation (100%)
 */

import { Column, ColumnFrequency } from '@/types/models';
import { createFixedColumnsForClass, isFixedColumn } from '@/lib/defaults';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

const dbClient = (typeof window === 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;

// ============================================
// Helper: Supabase row ↔ TypeScript Column
// ============================================

interface ColumnRow {
    id: string;
    class_id: string;
    user_id: string;
    name: string;
    scope: string;
    frequency: string;
    period_config: Record<string, unknown> | null;
    sub_periods: Record<string, unknown>[] | null;
    suggestions: string[] | null;
    allow_free_text: boolean;
    applicable_scope: string | null;
    applicable_student_ids: string[] | null;
    archived: boolean;
    default_visibility: boolean;
    is_shared_with_parents?: boolean;
    payment_config?: Record<string, unknown> | null;
    order: number;
    created_at: string;
    updated_at: string;
}

function rowToColumn(row: ColumnRow): Column {
    let paymentConfig: Column['paymentConfig'] = undefined;
    if (row.payment_config) {
        const raw = row.payment_config as any;
        paymentConfig = {
            enabled: !!raw.enabled,
            recipientType: (raw.recipientType || raw.recipient_type || 'school') as 'school' | 'teacher',
            defaultAmount: Number(raw.defaultAmount ?? raw.default_amount ?? 0),
            unit: raw.unit || 'VNĐ',
        };
    }

    return {
        id: row.id,
        classId: row.class_id,
        userId: row.user_id,
        name: row.name,
        scope: row.scope as Column['scope'],
        frequency: row.frequency as ColumnFrequency,
        periodConfig: (row.period_config as unknown) as Column['periodConfig'],
        subPeriods: ((row.sub_periods as unknown) as Column['subPeriods']) ?? [],
        suggestions: row.suggestions ?? [],
        allowFreeText: row.allow_free_text,
        applicableScope: (row.applicable_scope as Column['applicableScope']) ?? 'all',
        applicableStudentIds: row.applicable_student_ids ?? undefined,
        archived: row.archived,
        defaultVisibility: row.default_visibility,
        isSharedWithParents: row.is_shared_with_parents ?? false,
        paymentConfig,
        order: row.order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function columnToRow(col: Column): Record<string, unknown> {
    return {
        id: col.id,
        class_id: col.classId,
        user_id: col.userId,
        name: col.name,
        scope: col.scope,
        frequency: col.frequency,
        period_config: col.periodConfig ?? null,
        sub_periods: col.subPeriods ?? [],
        suggestions: col.suggestions ?? [],
        allow_free_text: col.allowFreeText,
        applicable_scope: col.applicableScope ?? 'all',
        applicable_student_ids: col.applicableStudentIds ?? null,
        archived: col.archived,
        default_visibility: col.defaultVisibility ?? true,
        is_shared_with_parents: col.isSharedWithParents ?? false,
        payment_config: col.paymentConfig ?? null,
        order: col.order,
        created_at: col.createdAt,
        updated_at: col.updatedAt,
    };
}

// ============================================
// CRUD Functions
// ============================================

/**
 * Lấy các cột sổ theo dõi được bật chia sẻ cho Phụ huynh tại /portal
 */
export async function getSharedColumnsForClass(classId: string): Promise<Column[]> {
    const { data, error } = await dbClient
        .from('columns')
        .select('*')
        .eq('class_id', classId)
        .eq('is_shared_with_parents', true)
        .eq('archived', false)
        .order('order', { ascending: true });

    if (error) {
        console.error('Error fetching shared columns for class:', error);
        return [];
    }

    return (data || []).map(r => rowToColumn(r as ColumnRow));
}

/**
 * Get all columns for a class
 */
export async function getColumns(classId: string, userId?: string): Promise<Column[]> {
    let q = dbClient
        .from('columns')
        .select('*')
        .eq('class_id', classId);

    if (userId) {
        q = q.or(`user_id.eq.system,user_id.eq.${userId}`);
    }

    q = q.order('order', { ascending: true }).order('created_at', { ascending: true });

    const { data, error } = await q;
    if (error) {
        console.error('Error fetching columns:', error);
        return [];
    }
    return (data as ColumnRow[]).map(rowToColumn);
}

/**
 * Get columns filtered by frequency
 */
export async function getColumnsByFrequency(classId: string, frequency: ColumnFrequency, userId?: string): Promise<Column[]> {
    const columns = await getColumns(classId, userId);
    return columns.filter(c => c.frequency === frequency && !c.archived);
}

/**
 * Get a single column by ID
 */
export async function getColumn(columnId: string): Promise<Column | null> {
    const { data, error } = await dbClient
        .from('columns')
        .select('*')
        .eq('id', columnId)
        .maybeSingle();

    if (error || !data) return null;
    return rowToColumn(data as ColumnRow);
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

    // Validate student scope
    if (column.applicableScope === 'subset' && (!column.applicableStudentIds || column.applicableStudentIds.length === 0)) {
        throw new Error('Student IDs are required when scope is subset');
    }

    const now = new Date().toISOString();
    const fullColumn: Column = {
        ...column,
        applicableScope: column.applicableScope || 'all',
        defaultVisibility: column.defaultVisibility ?? true,
        subPeriods: column.subPeriods || [],
        createdAt: now,
        updatedAt: now,
    };

    const { error } = await dbClient
        .from('columns')
        .upsert(columnToRow(fullColumn));

    if (error) {
        console.error('Error creating column:', error);
        throw new Error('Lỗi tạo cột: ' + error.message);
    }

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

    // Fixed columns can update suggestions, sharing and payment config
    if (isFixedColumn(columnId)) {
        const fixedUpdate: Record<string, unknown> = {
            suggestions: updates.suggestions ?? existing.suggestions,
            updated_at: new Date().toISOString(),
        };
        if (updates.isSharedWithParents !== undefined) fixedUpdate.is_shared_with_parents = updates.isSharedWithParents;
        if (updates.paymentConfig !== undefined) fixedUpdate.payment_config = updates.paymentConfig;

        const { error } = await dbClient
            .from('columns')
            .update(fixedUpdate)
            .eq('id', columnId);

        if (error) throw new Error('Lỗi cập nhật cột: ' + error.message);
        return;
    }

    // Custom columns can update all fields
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.suggestions !== undefined) updateData.suggestions = updates.suggestions;
    if (updates.allowFreeText !== undefined) updateData.allow_free_text = updates.allowFreeText;
    if (updates.archived !== undefined) updateData.archived = updates.archived;
    if (updates.defaultVisibility !== undefined) updateData.default_visibility = updates.defaultVisibility;
    if (updates.order !== undefined) updateData.order = updates.order;
    if (updates.periodConfig !== undefined) updateData.period_config = updates.periodConfig;
    if (updates.subPeriods !== undefined) updateData.sub_periods = updates.subPeriods;
    if (updates.applicableScope !== undefined) updateData.applicable_scope = updates.applicableScope;
    if (updates.applicableStudentIds !== undefined) updateData.applicable_student_ids = updates.applicableStudentIds;
    if (updates.isSharedWithParents !== undefined) updateData.is_shared_with_parents = updates.isSharedWithParents;
    if (updates.paymentConfig !== undefined) updateData.payment_config = updates.paymentConfig;

    const { error } = await dbClient
        .from('columns')
        .update(updateData)
        .eq('id', columnId);

    if (error) throw new Error('Lỗi cập nhật cột: ' + error.message);
}

/**
 * Delete a column (only custom columns)
 */
export async function deleteColumn(columnId: string): Promise<void> {
    if (isFixedColumn(columnId)) {
        throw new Error('Cannot delete fixed columns');
    }

    const { error } = await dbClient
        .from('columns')
        .delete()
        .eq('id', columnId);

    if (error) throw new Error('Lỗi xóa cột: ' + error.message);
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

    const newRows: Record<string, unknown>[] = [];

    for (const template of fixedColumnTemplates) {
        if (!existingIds.has(template.id)) {
            const fullColumn: Column = {
                ...template,
                createdAt: now,
                updatedAt: now,
            };
            newRows.push(columnToRow(fullColumn));
        }
    }

    if (newRows.length > 0) {
        const { error } = await dbClient
            .from('columns')
            .upsert(newRows);

        if (error) console.error('Error initializing fixed columns:', error);
    }
}

/**
 * Get fixed columns for a class
 */
export async function getFixedColumns(classId: string, userId?: string): Promise<Column[]> {
    const columns = await getColumns(classId, userId);
    return columns.filter(c => c.scope === 'fixed');
}

/**
 * Get custom columns for a class
 */
export async function getCustomColumns(classId: string, userId?: string): Promise<Column[]> {
    const columns = await getColumns(classId, userId);
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

/**
 * Get columns that are candidates for archiving (e.g. expired period)
 */
export async function getExpiredColumns(classId: string, userId?: string): Promise<Column[]> {
    const columns = await getColumns(classId, userId);
    const now = new Date();

    return columns.filter(c => {
        if (c.archived) return false;
        if (c.frequency === 'period' && c.periodConfig) {
            const endDate = new Date(c.periodConfig.endDate);
            endDate.setHours(23, 59, 59, 999);
            return endDate < now;
        }
        return false;
    });
}
