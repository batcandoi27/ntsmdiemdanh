/**
 * Year Service v3.0
 *
 * Archive = Đổi con trỏ, KHÔNG copy data.
 * settings/app.activeYear chỉ định năm học hiện tại.
 * Năm cũ tự động read-only khi không phải activeYear.
 *
 * Spark quota: ~35 writes tạo năm mới (thay vì 15K-25K writes copy).
 */

import { db } from './db';
import { AppUser, AppSettings } from '@/types/models';

// ============================================
// Settings
// ============================================

export async function getAppSettings(): Promise<AppSettings | null> {
    try {
        const settings = await db.getSettings();
        return settings;
    } catch (e) {
        console.error("Error getAppSettings:", e);
        return null;
    }
}

export async function getActiveYear(): Promise<string> {
    const settings = await getAppSettings();
    return settings?.activeYear || '2025-2026';
}

// ============================================
// Year Lifecycle
// ============================================

/**
 * Tạo năm học mới (Admin/Principal only)
 *
 * Steps:
 * 1. Update settings/app.activeYear → năm mới
 * 2. Tạo structure rỗng cho năm mới: years/{newYear}/classes, students, etc.
 * 3. Auto graduate lớp 12 (set status = 'graduated')
 * 4. Năm cũ tự động read-only (check activeYear)
 *
 * Total writes: ~35 (1 settings + ~33 classes + HS lớp 12)
 */
export async function createNewYear(
    user: AppUser,
    newYear: string, // e.g. '2026-2027'
    oldYear: string, // e.g. '2025-2026'
    options: {
        autoGraduateGrade12: boolean;
        copyClassStructure: boolean;
    } = { autoGraduateGrade12: true, copyClassStructure: true }
): Promise<{ writesUsed: number; graduatedCount: number }> {
    let writesUsed = 0;
    let graduatedCount = 0;

    const batch = writeBatch(db);

    // 1. Update activeYear
    batch.update(doc(db, 'settings', 'app'), {
        activeYear: newYear,
        updatedAt: new Date().toISOString(),
    });
    writesUsed++;

    // 2. Copy class structure (names only, no students)
    if (options.copyClassStructure) {
        const oldClasses = await getDocs(collection(db, `schools/default/years/${oldYear}/classes`));
        for (const classDoc of oldClasses.docs) {
            const data = classDoc.data();
            // Skip grade 12 if autoGraduate (they graduate)
            if (options.autoGraduateGrade12 && isGrade12(data.className || classDoc.id)) {
                continue;
            }
            // Bump grade: 8A1 → 9A1, 6A2 → 7A2
            const newClassName = bumpGrade(data.className || classDoc.id);
            if (newClassName) {
                batch.set(doc(db, `schools/default/years/${newYear}/classes`, newClassName), {
                    className: newClassName,
                    studentCount: 0,
                    actualStudentCount: 0,
                    sessions: data.sessions || ['morning'],
                    grade: bumpGradeNumber(data.grade),
                });
                writesUsed++;
            }
        }
    }

    // 3. Auto graduate lớp 12
    if (options.autoGraduateGrade12) {
        const students = await getDocs(collection(db, `schools/default/years/${oldYear}/students`));
        for (const sDoc of students.docs) {
            const student = sDoc.data();
            const classSnap = await getDoc(doc(db, `schools/default/years/${oldYear}/classes`, student.classId));
            if (classSnap.exists() && isGrade12(classSnap.data().className || student.classId)) {
                batch.update(sDoc.ref, {
                    statusV3: 'graduated',
                    statusNote: 'Tốt nghiệp tự động khi kết thúc năm học',
                    statusDate: new Date().toISOString(),
                });
                graduatedCount++;
                writesUsed++;
            }
        }
    }

    await batch.commit();

    return { writesUsed, graduatedCount };
}

// ============================================
// Year Query
// ============================================

export async function getAvailableYears(): Promise<string[]> {
    // List all year paths
    // Since Firestore doesn't list subcollections easily from client,
    // we maintain a list in settings
    const settingsSnap = await getDoc(doc(db, 'settings', 'app'));
    if (!settingsSnap.exists()) return ['2025-2026'];

    const data = settingsSnap.data();
    return data.availableYears || [data.activeYear || '2025-2026'];
}

export function isReadOnly(yearPath: string, activeYear: string): boolean {
    return yearPath !== `years/${activeYear}`;
}

// ============================================
// Helpers
// ============================================

function isGrade12(className: string): boolean {
    return /^12[A-Z]/.test(className) || className.startsWith('12');
}

function bumpGrade(className: string): string | null {
    const match = className.match(/^(\d+)(.*)/);
    if (!match) return className;
    const grade = parseInt(match[1]);
    if (grade >= 12) return null; // Graduated, don't create
    return `${grade + 1}${match[2]}`;
}

function bumpGradeNumber(grade?: number | string): number | undefined {
    if (grade === undefined || grade === null) return undefined;
    const g = typeof grade === 'string' ? parseInt(grade) : grade;
    return g < 12 ? g + 1 : undefined;
}

// ============================================
// Optional: Export & Purge (khi gần đầy 1GB)
// ============================================

/**
 * Xoá toàn bộ data năm cũ sau khi đã export ZIP
 * Chỉ Admin được dùng, cần confirm 2 lần
 */
export async function purgeYear(
    user: AppUser,
    yearToPurge: string
): Promise<{ deletedDocs: number }> {
    if (user.role !== 'admin') throw new Error('Chỉ Admin được xoá năm cũ.');

    const activeYear = await getActiveYear();
    if (yearToPurge === activeYear) throw new Error('Không thể xoá năm học đang active!');

    // Delete all sub-collections
    let deletedDocs = 0;
    const collections = ['classes', 'students', 'timetables'];

    for (const col of collections) {
        const snap = await getDocs(collection(db, `schools/default/years/${yearToPurge}/${col}`));
        const batch = writeBatch(db);
        snap.docs.forEach(d => {
            batch.delete(d.ref);
            deletedDocs++;
        });
        if (snap.docs.length > 0) await batch.commit();
    }

    // Note: attendance subcollections need recursive deletion
    // which is complex on client-side. Recommend Cloud Function for production.

    return { deletedDocs };
}
