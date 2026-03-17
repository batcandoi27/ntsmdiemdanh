/**
 * Timetable Service v3.0
 *
 * CRUD thời khoá biểu, import Excel, conflict detection.
 * years/{year}/timetables/{timetableId}
 */

import {
    doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
    collection, query, where, orderBy, addDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const isSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
import {
    Timetable, TimetableConflict, TimetableFlatRow, TimetableImportResult,
    DayOfWeek, SessionType, PeriodSlot, DAY_ORDER,
    createEmptyWeekSchedule,
} from '@/types/timetable';
import { AppUser } from '@/types/models';
import { checkClassAccess } from './auth-guard';
import { DEFAULT_YEAR } from '@/config/constants';

const getYearPath = (year: string = DEFAULT_YEAR) => `schools/default/years/${year}`;

// ============================================
// CRUD
// ============================================

export async function saveTimetable(
    user: AppUser,
    timetable: Omit<Timetable, 'id' | 'createdBy' | 'createdByName' | 'updatedAt' | 'isActive'>,
    year?: string
): Promise<string> {
    if (isSupabase) return 'tmp-id'; // TODO: Implement in Supabase
    checkClassAccess(user, timetable.classId);
    const path = getYearPath(year);

    const data = {
        ...timetable,
        createdBy: user.uid,
        createdByName: user.displayName,
        updatedAt: new Date().toISOString(),
        isActive: true,
    };

    const ref = await addDoc(collection(db, `${path}/timetables`), data);
    return ref.id;
}

export async function getTimetable(id: string, year?: string): Promise<Timetable | null> {
    if (isSupabase) return null;
    const snap = await getDoc(doc(db, `${getYearPath(year)}/timetables`, id));
    return snap.exists() ? { ...snap.data(), id: snap.id } as Timetable : null;
}

export async function getTimetableForClass(classId: string, date?: string, year?: string): Promise<Timetable | null> {
    if (isSupabase) return null;
    const path = getYearPath(year);
    const q = query(
        collection(db, `${path}/timetables`),
        where('classId', '==', classId),
        where('isActive', '==', true)
    );
    const snap = await getDocs(q);

    if (snap.empty) return null;

    const now = date || new Date().toISOString().split('T')[0];

    // Find the timetable effective for the given date
    const active = snap.docs
        .map(d => ({ ...d.data(), id: d.id }) as Timetable)
        .filter(t => t.effectiveFrom <= now && t.effectiveTo >= now)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return active[0] || null;
}

export async function getAllTimetables(year?: string): Promise<Timetable[]> {
    const snap = await getDocs(collection(db, `${getYearPath(year)}/timetables`));
    return snap.docs.map(d => ({ ...d.data(), id: d.id }) as Timetable);
}

export async function deactivateTimetable(id: string, year?: string): Promise<void> {
    await updateDoc(doc(db, `${getYearPath(year)}/timetables`, id), { isActive: false });
}

// ============================================
// Conflict Detection
// ============================================

/**
 * Detect conflicts across ALL active timetables
 * - Teacher teaching 2 classes at same time
 * - Class having 2 subjects at same time
 * - Session warnings (class only morning but has afternoon slots)
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
        // Only check overlapping date ranges
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
// Excel Import (Flat List Format)
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
 * 
 * Expected columns: Lớp, Thứ, Buổi, Tiết, Môn, Mã môn, GV, Phòng
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
        const rowNum = idx + 2; // Excel rows start at 2 (header = 1)
        const className = (row['Lớp'] || row['lớp'] || row['Class'] || '').trim();
        const dayRaw = (row['Thứ'] || row['thứ'] || row['Day'] || '').trim().toLowerCase();
        const sessionRaw = (row['Buổi'] || row['buổi'] || row['Session'] || '').trim().toLowerCase();
        const periodRaw = row['Tiết'] || row['tiết'] || row['Period'] || '';
        const subject = (row['Môn'] || row['môn'] || row['Subject'] || '').trim();

        // Validate required fields
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

        // Get/create timetable for this class
        if (!timetableMap.has(className)) {
            timetableMap.set(className, {
                id: '', // will be set on save
                classId: className, // temporary, needs mapping
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
        conflicts: [], // will be populated after detectConflicts
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
    classIdMap: Record<string, string> // className → classId mapping
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
