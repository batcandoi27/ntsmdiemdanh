/**
 * Column Service - CRUD operations for custom columns
 * Supabase implementation (100%)
 */

import { Column, ColumnFrequency } from '@/types/models';
import { createFixedColumnsForClass, isFixedColumn } from '@/lib/defaults';
import { supabase } from '@/lib/supabase';

const dbClient = supabase;

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
    parent_column_id?: string | null;
    activity_config?: Record<string, unknown> | null;
    display_config?: Record<string, unknown> | null;
    schema_version?: number;
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
        parentColumnId: row.parent_column_id ?? null,
        activityConfig: (row.activity_config as any) ?? null,
        displayConfig: (row.display_config as any) ?? null,
        schemaVersion: row.schema_version ?? 1,
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
        parent_column_id: col.parentColumnId ?? null,
        activity_config: col.activityConfig ?? null,
        display_config: col.displayConfig ?? null,
        schema_version: col.schemaVersion ?? 1,
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
 * Archive a column (Cascades to child columns if this is a composite parent)
 */
export async function archiveColumn(columnId: string): Promise<void> {
    await updateColumn(columnId, { archived: true });
    // C13 Blocker: Cascade archive to all child columns
    await dbClient
        .from('columns')
        .update({ archived: true, updated_at: new Date().toISOString() })
        .eq('parent_column_id', columnId);
}

/**
 * Unarchive a column (Cascades unarchive to child columns)
 */
export async function unarchiveColumn(columnId: string): Promise<void> {
    await updateColumn(columnId, { archived: false });
    // C14 Blocker: Cascade unarchive to all child columns
    await dbClient
        .from('columns')
        .update({ archived: false, updated_at: new Date().toISOString() })
        .eq('parent_column_id', columnId);
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
 * Get custom columns for a class (Top-level only, filters out child/sub columns of composite activities)
 */
export async function getCustomColumns(classId: string, userId?: string): Promise<Column[]> {
    const columns = await getColumns(classId, userId);
    return columns.filter(c => c.scope === 'custom' && !c.parentColumnId);
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

// ============================================
// COMPOSITE ACTIVITY REGISTRY (MULTI-COLUMN)
// ============================================

export interface CreateChildColumnDto {
    name: string;
    dataType?: 'boolean' | 'text' | 'number' | 'select';
    inputMode?: 'checkbox' | 'inline_text' | 'select' | 'number';
    isNotesColumn?: boolean;
    order?: number;
    options?: string[];
    suggestions?: string[];
}

/**
 * Lấy toàn bộ cây Hoạt động phức hợp (Composite Activities) cho một lớp
 */
export async function getCompositeActivitiesForClass(classId: string, userId?: string, includeArchived = false): Promise<Column[]> {
    // 1. Fetch parent columns
    let parentQuery = dbClient
        .from('columns')
        .select('*')
        .eq('class_id', classId)
        .is('parent_column_id', null)
        .not('activity_config', 'is', null);

    if (!includeArchived) {
        parentQuery = parentQuery.eq('archived', false);
    }
    if (userId) {
        parentQuery = parentQuery.or(`user_id.eq.system,user_id.eq.${userId}`);
    }

    const { data: parentRows, error: parentError } = await parentQuery.order('order', { ascending: true });
    if (parentError || !parentRows) {
        console.error('Error fetching composite parents:', parentError);
        return [];
    }

    const parents = (parentRows as ColumnRow[]).map(rowToColumn);
    if (parents.length === 0) return [];

    // 2. Fetch all child columns for these parents
    const parentIds = parents.map(p => p.id);
    let childQuery = dbClient
        .from('columns')
        .select('*')
        .in('parent_column_id', parentIds);

    if (!includeArchived) {
        childQuery = childQuery.eq('archived', false);
    }

    const { data: childRows, error: childError } = await childQuery.order('order', { ascending: true });
    if (childError) {
        console.error('Error fetching composite children:', childError);
    }

    const children = ((childRows as ColumnRow[]) || []).map(rowToColumn);

    // 3. Attach children to parents
    return parents.map(parent => ({
        ...parent,
        children: children.filter(c => c.parentColumnId === parent.id)
    }));
}

/**
 * Tạo một Hoạt động phức hợp kèm các cột con (Composite Activity with Sub-columns)
 */
export async function createCompositeActivityWithChildren(
    activity: Omit<Column, 'createdAt' | 'updatedAt' | 'id'> & { id?: string },
    subColumns: CreateChildColumnDto[]
): Promise<Column> {
    // C01 Blocker: Hoạt động phức hợp phải có ít nhất một cột con
    if (!subColumns || subColumns.length === 0) {
        throw new Error('Hoạt động phức hợp phải có ít nhất một cột con.');
    }

    const parentId = activity.id || `${activity.classId}_act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Parent column
    const parentData: Omit<Column, 'createdAt' | 'updatedAt'> = {
        ...activity,
        id: parentId,
        parentColumnId: null,
        activityConfig: {
            type: 'composite',
            version: 1,
            activityCode: activity.activityConfig?.activityCode || parentId,
            hasNotes: activity.activityConfig?.hasNotes ?? false,
            allowDynamicChildren: true,
        },
    };

    const createdParent = await createColumn(parentData);

    // Create children
    const childPromises = subColumns.map(async (sub, idx) => {
        const childId = `${parentId}_col_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`;
        const childData: Omit<Column, 'createdAt' | 'updatedAt'> = {
            id: childId,
            classId: activity.classId, // Invariant: strict inheritance
            userId: activity.userId,
            name: sub.name,
            scope: 'custom',
            frequency: 'one_time',
            allowFreeText: true,
            archived: false,
            order: (sub.order ?? idx) + 1,
            suggestions: sub.suggestions || [],
            applicableScope: activity.applicableScope || 'all',
            applicableStudentIds: activity.applicableStudentIds,
            parentColumnId: parentId,
            activityConfig: {
                type: 'field',
                version: 1,
                dataType: sub.dataType || (sub.isNotesColumn ? 'text' : 'boolean'),
                inputMode: sub.inputMode || (sub.isNotesColumn ? 'inline_text' : 'checkbox'),
                exportHeader: sub.name,
                exportFormat: sub.isNotesColumn ? 'text' : 'mark',
                options: sub.options,
            },
            displayConfig: {
                isNotesColumn: sub.isNotesColumn || false,
            }
        };
        return createColumn(childData);
    });

    const createdChildren = await Promise.all(childPromises);
    return {
        ...createdParent,
        children: createdChildren,
    };
}

/**
 * Thêm cột con vào một Hoạt động đã có
 */
export async function addChildColumnToActivity(
    parentColumnId: string,
    subColumn: CreateChildColumnDto,
    userId?: string
): Promise<Column> {
    const parent = await getColumn(parentColumnId);
    if (!parent) {
        throw new Error('Không tìm thấy hoạt động cha');
    }
    // C02/C03 Blocker: Cấm lồng sâu hơn 2 tầng
    if (parent.parentColumnId) {
        throw new Error('Không thể thêm cột con vào một cột con khác (chỉ hỗ trợ cấu trúc 2 tầng).');
    }

    const childId = `${parentColumnId}_col_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const childData: Omit<Column, 'createdAt' | 'updatedAt'> = {
        id: childId,
        classId: parent.classId, // Invariant: strict inheritance
        userId: userId || parent.userId,
        name: subColumn.name,
        scope: 'custom',
        frequency: 'one_time',
        allowFreeText: true,
        archived: false,
        order: subColumn.order ?? 10,
        suggestions: subColumn.suggestions || [],
        applicableScope: parent.applicableScope || 'all',
        applicableStudentIds: parent.applicableStudentIds,
        parentColumnId: parent.id,
        activityConfig: {
            type: 'field',
            version: 1,
            dataType: subColumn.dataType || (subColumn.isNotesColumn ? 'text' : 'boolean'),
            inputMode: subColumn.inputMode || (subColumn.isNotesColumn ? 'inline_text' : 'checkbox'),
            exportHeader: subColumn.name,
            exportFormat: subColumn.isNotesColumn ? 'text' : 'mark',
            options: subColumn.options,
        },
        displayConfig: {
            isNotesColumn: subColumn.isNotesColumn || false,
        }
    };

    return createColumn(childData);
}
