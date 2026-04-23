/**
 * Timetable Service v3.0
 * Supabase implementation (100%)
 *
 * CRUD thời khoá biểu, import Excel, conflict detection.
 */

import {
    Timetable, TimetableConflict, TimetableFlatRow, TimetableImportResult,
    DayOfWeek, SessionType, PeriodSlot, DAY_ORDER, WeekSchedule,
    createEmptyWeekSchedule,
} from '@/types/timetable';
import { AppUser } from '@/types/models';
import { checkClassAccess } from './auth-guard';
import { supabase } from '@/lib/supabase';

// ============================================
// Helper: Supabase row ↔ TypeScript Timetable
// ============================================

interface TimetableRow {
    id: string;
    class_id: string;
    class_name: string;
    effective_from: string;
    effective_to: string;
    schedule: WeekSchedule;
    created_by: string;
    created_by_name: string;
    is_active: boolean;
    updated_at: string;
}

function rowToTimetable(row: TimetableRow): Timetable {
    return {
        id: row.id,
        classId: row.class_id,
        className: row.class_name,
        effectiveFrom: row.effective_from,
        effectiveTo: row.effective_to,
        schedule: row.schedule,
        createdBy: row.created_by,
        createdByName: row.created_by_name,
        isActive: row.is_active,
        updatedAt: row.updated_at,
    };
}

// ============================================
// CRUD
// ============================================

export async function saveTimetable(
    user: AppUser,
    timetable: Omit<Timetable, 'id' | 'createdBy' | 'createdByName' | 'updatedAt' | 'isActive'>,
): Promise<string> {
    checkClassAccess(user, timetable.classId);

    const row = {
        class_id: timetable.classId,
        class_name: timetable.className,
        effective_from: timetable.effectiveFrom,
        effective_to: timetable.effectiveTo,
        schedule: timetable.schedule,
        created_by: user.uid,
        created_by_name: user.displayName,
        is_active: true,
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('timetables')
        .insert(row)
        .select('id')
        .single();

    if (error) {
        console.error('Error saving timetable:', error);
        throw new Error('Lỗi lưu thời khoá biểu: ' + error.message);
    }

    return data.id;
}

export async function getTimetable(id: string): Promise<Timetable | null> {
    const { data, error } = await supabase
        .from('timetables')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error || !data) return null;
    return rowToTimetable(data as TimetableRow);
}

export async function getTimetableForClass(classId: string, date?: string): Promise<Timetable | null> {
    const now = date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('timetables')
        .select('*')
        .eq('class_id', classId)
        .eq('is_active', true)
        .lte('effective_from', now)
        .gte('effective_to', now)
        .order('updated_at', { ascending: false })
        .limit(1);

    if (error || !data || data.length === 0) return null;
    return rowToTimetable(data[0] as TimetableRow);
}

export async function getAllTimetables(): Promise<Timetable[]> {
    const { data, error } = await supabase
        .from('timetables')
        .select('*')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching timetables:', error);
        return [];
    }
    return (data as TimetableRow[]).map(rowToTimetable);
}

export async function deactivateTimetable(id: string): Promise<void> {
    const { error } = await supabase
        .from('timetables')
        .update({ is_active: false })
        .eq('id', id);

    if (error) throw new Error('Lỗi vô hiệu hóa TKB: ' + error.message);
}

// ============================================
// Conflict Detection (pure logic, không DB)
// ============================================

/**
 * Detect conflicts across ALL active timetables
 */
export async function detectConflicts(
    newTimetable: Timetable,
    existingTimetables: Timetable[]
): Promise<TimetableConflict[]> {
    const conflicts: TimetableConflict[] = [];

    // Check within the new timetable itself (class overlap)
    for (const day of DAY_ORDER) {
        const schedule = newTimetable.schedule[day];
        for (const session of ['morning', 'afternoon'] as SessionType[]) {
            const slots = schedule[session];
            const periods = slots.map(s => s.period);
            const duplicates = periods.filter((p, i) => periods.indexOf(p) !== i);
            for (const dup of duplicates) {
                conflicts.push({
                    type: 'class_overlap',
                    severity: 'error',
                    message: `Lớp ${newTimetable.className}: Tiết ${dup} ${session === 'morning' ? 'Sáng' : 'Chiều'} ${day} bị trùng 2 môn`,
                    day, session, period: dup,
                    details: { classId: newTimetable.classId, className: newTimetable.className },
                });
            }
        }
    }

    // Check teacher conflicts against existing timetables
    for (const existing of existingTimetables) {
        if (existing.classId === newTimetable.classId) continue;
        if (existing.effectiveTo < newTimetable.effectiveFrom ||
            existing.effectiveFrom > newTimetable.effectiveTo) continue;

        for (const day of DAY_ORDER) {
            for (const session of ['morning', 'afternoon'] as SessionType[]) {
                const newSlots = newTimetable.schedule[day][session];
                const existSlots = existing.schedule[day][session];

                for (const ns of newSlots) {
                    for (const es of existSlots) {
                        if (ns.period === es.period && ns.teacherName && es.teacherName &&
                            ns.teacherName === es.teacherName) {
                            conflicts.push({
                                type: 'teacher_overlap',
                                severity: 'error',
                                message: `GV ${ns.teacherName} dạy 2 lớp cùng Tiết ${ns.period} ${session === 'morning' ? 'Sáng' : 'Chiều'} ${day}: ${newTimetable.className} và ${existing.className}`,
                                day, session, period: ns.period,
                                details: { teacherName: ns.teacherName, className: existing.className },
                            });
                        }
                    }
                }
            }
        }
    }

    return conflicts;
}

// ============================================
// Excel Import (Flat List Format) - Pure logic
// ============================================

const DAY_MAP: Record<string, DayOfWeek> = {
    '2': 'monday', 'thứ 2': 'monday', 'monday': 'monday', 'thu 2': 'monday',
    '3': 'tuesday', 'thứ 3': 'tuesday', 'tuesday': 'tuesday', 'thu 3': 'tuesday',
    '4': 'wednesday', 'thứ 4': 'wednesday', 'wednesday': 'wednesday', 'thu 4': 'wednesday',
    '5': 'thursday', 'thứ 5': 'thursday', 'thursday': 'thursday', 'thu 5': 'thursday',
    '6': 'friday', 'thứ 6': 'friday', 'friday': 'friday', 'thu 6': 'friday',
    '7': 'saturday', 'thứ 7': 'saturday', 'saturday': 'saturday', 'thu 7': 'saturday',
};

const SESSION_MAP: Record<string, SessionType> = {
    'sáng': 'morning', 'sang': 'morning', 'morning': 'morning', 's': 'morning',
    'chiều': 'afternoon', 'chieu': 'afternoon', 'afternoon': 'afternoon', 'c': 'afternoon',
};

/**
 * Parse flat rows (from Excel) → Timetable objects grouped by class
 */
export function parseFlatRows(
    rows: Record<string, string>[],
    effectiveFrom: string,
    effectiveTo: string,
    createdBy: string,
    createdByName: string
): TimetableImportResult {
    const timetableMap = new Map<string, Timetable>();
    const errors: { row: number; message: string }[] = [];
    let totalPeriods = 0;

    rows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const className = (row['Lớp'] || row['lớp'] || row['Class'] || '').trim();
        const dayRaw = (row['Thứ'] || row['thứ'] || row['Day'] || '').trim().toLowerCase();
        const sessionRaw = (row['Buổi'] || row['buổi'] || row['Session'] || '').trim().toLowerCase();
        const periodRaw = row['Tiết'] || row['tiết'] || row['Period'] || '';
        const subject = (row['Môn'] || row['môn'] || row['Subject'] || '').trim();

        if (!className) { errors.push({ row: rowNum, message: 'Thiếu tên lớp' }); return; }
        if (!subject) { errors.push({ row: rowNum, message: 'Thiếu tên môn học' }); return; }

        const day = DAY_MAP[dayRaw];
        if (!day) { errors.push({ row: rowNum, message: `Thứ "${dayRaw}" không hợp lệ` }); return; }

        const session = SESSION_MAP[sessionRaw];
        if (!session) { errors.push({ row: rowNum, message: `Buổi "${sessionRaw}" không hợp lệ` }); return; }

        const period = parseInt(periodRaw);
        if (isNaN(period) || period < 1 || period > 5) {
            errors.push({ row: rowNum, message: `Tiết "${periodRaw}" không hợp lệ (1-5)` });
            return;
        }

        if (!timetableMap.has(className)) {
            timetableMap.set(className, {
                id: '',
                classId: className,
                className,
                effectiveFrom,
                effectiveTo,
                schedule: createEmptyWeekSchedule(),
                createdBy,
                createdByName,
                updatedAt: new Date().toISOString(),
                isActive: true,
            });
        }

        const timetable = timetableMap.get(className)!;
        const slot: PeriodSlot = {
            period,
            subject,
            subjectCode: (row['Mã môn'] || row['mã môn'] || row['SubjectCode'] || '').trim() || undefined,
            teacherName: (row['GV'] || row['gv'] || row['Teacher'] || '').trim() || undefined,
            room: (row['Phòng'] || row['phòng'] || row['Room'] || '').trim() || undefined,
        };

        timetable.schedule[day][session].push(slot);
        totalPeriods++;
    });

    const timetables = Array.from(timetableMap.values());

    return {
        success: errors.length === 0,
        timetables,
        conflicts: [],
        errors,
        stats: {
            classesProcessed: timetables.length,
            totalPeriods,
            conflictCount: 0,
            errorCount: errors.length,
        },
    };
}

/**
 * Import timetables from flat rows: parse → detect conflicts → save
 */
export async function importTimetablesFromRows(
    user: AppUser,
    rows: Record<string, string>[],
    effectiveFrom: string,
    effectiveTo: string,
    classIdMap: Record<string, string>
): Promise<TimetableImportResult> {
    const result = parseFlatRows(rows, effectiveFrom, effectiveTo, user.uid, user.displayName);

    // Map className → classId
    result.timetables.forEach(tt => {
        tt.classId = classIdMap[tt.className] || tt.className;
    });

    // Detect conflicts against existing timetables
    const existing = await getAllTimetables();
    for (const tt of result.timetables) {
        const conflicts = await detectConflicts(tt, existing);
        result.conflicts.push(...conflicts);
    }
    result.stats.conflictCount = result.conflicts.length;

    // Only save if no errors (warnings OK)
    if (result.errors.length === 0 && !result.conflicts.some(c => c.severity === 'error')) {
        for (const tt of result.timetables) {
            await saveTimetable(user, tt);
        }
        result.success = true;
    } else {
        result.success = false;
    }

    return result;
}
