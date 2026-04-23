/**
 * Year Service v3.0
 *
 * Archive = Đổi con trỏ, KHÔNG copy data.
 * settings/app.activeYear chỉ định năm học hiện tại.
 * Năm cũ tự động read-only khi không phải activeYear.
 *
 * Spark quota: ~35 writes tạo năm mới (thay vì 15K-25K writes copy).
 */

import { AppUser, AppSettings } from '@/types/models';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Ưu tiên dùng Admin Client trên server để bypass RLS
const dbClient = (typeof window === 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;

// ============================================
// Settings
// ============================================

export async function getAppSettings(): Promise<AppSettings | null> {
    try {
        const { data } = await dbClient.from('settings').select('value').eq('key', 'app_settings').maybeSingle();
        return data?.value as AppSettings | null;
    } catch (e) {
        console.error("Error getAppSettings:", e);
        return null;
    }
}

export async function getActiveYear(): Promise<string> {
    const { data } = await dbClient.from('academic_years').select('name').eq('is_active', true).maybeSingle();
    return data?.name || '2025-2026';
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

    // 1. Lấy hoặc tạo newYear trong academic_years
    let { data: newYearData } = await dbClient.from('academic_years').select('id').eq('name', newYear).maybeSingle();
    if (!newYearData) {
        const startString = newYear.split('-')[0];
        const res = await dbClient.from('academic_years').insert({
            name: newYear,
            start_date: `${startString}-09-05`,
            end_date: `${parseInt(startString)+1}-05-31`,
            is_active: true
        }).select().single();
        if (res.error) throw res.error;
        newYearData = res.data;
        writesUsed++;
    } else {
        await dbClient.from('academic_years').update({ is_active: true }).eq('id', newYearData.id);
        writesUsed++;
    }

    // Set old years as not active
    await dbClient.from('academic_years').update({ is_active: false }).neq('id', newYearData.id);

    // Lấy oldYearId
    const { data: oldYearData } = await dbClient.from('academic_years').select('id').eq('name', oldYear).maybeSingle();
    const oldYearId = oldYearData?.id;

    if (oldYearId) {
        // 2. Copy class structure
        if (options.copyClassStructure) {
            const { data: oldClasses } = await dbClient.from('classes').select('*').eq('year_id', oldYearId);
            if (oldClasses) {
                for (const classData of oldClasses) {
                    if (options.autoGraduateGrade12 && isGrade12(classData.name || '')) continue;

                    const newClassName = bumpGrade(classData.name || '');
                    if (newClassName) {
                        await dbClient.from('classes').insert({
                            year_id: newYearData.id,
                            name: newClassName,
                            grade: bumpGradeNumber(classData.grade),
                            actual_student_count: 0,
                            adjustment_count: 0,
                            manual_student_count: 0,
                            class_type: classData.class_type
                        });
                        writesUsed++;
                    }
                }
            }
        }

        // 3. Auto graduate lớp 12 (chỉ lấy học sinh của năm cũ đang học lớp 12)
        if (options.autoGraduateGrade12) {
            const { data: oldGrade12Classes } = await dbClient.from('classes')
                .select('id, name').eq('year_id', oldYearId);
            
            const g12Ids = oldGrade12Classes?.filter(c => isGrade12(c.name || '')).map(c => c.id) || [];
            
            if (g12Ids.length > 0) {
                const { data: studentClasses } = await dbClient.from('student_classes')
                    .select('student_id')
                    .in('class_id', g12Ids);
                
                const studentIds = studentClasses?.map(sc => sc.student_id) || [];
                if (studentIds.length > 0) {
                    await dbClient.from('students')
                        .update({ status: 'graduated' })
                        .in('id', studentIds);
                    graduatedCount += studentIds.length;
                    writesUsed++;
                }
            }
        }
    }

    return { writesUsed, graduatedCount };
}

// ============================================
// Year Query
// ============================================

export async function getAvailableYears(): Promise<string[]> {
    const { data } = await dbClient.from('academic_years').select('name').order('start_date', { ascending: false });
    return data?.map(y => y.name) || ['2025-2026'];
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
 * Xoá toàn bộ data năm cũ.
 * Chỉ Admin được dùng, cần confirm 2 lần.
 */
export async function purgeYear(
    user: AppUser,
    yearToPurge: string
): Promise<{ deletedDocs: number }> {
    if (user.role !== 'admin') throw new Error('Chỉ Admin được xoá năm cũ.');

    const activeYear = await getActiveYear();
    if (yearToPurge === activeYear) throw new Error('Không thể xoá năm học đang active!');

    const { data: yearData } = await dbClient.from('academic_years').select('id').eq('name', yearToPurge).maybeSingle();
    if (!yearData) return { deletedDocs: 0 };
    const yearId = yearData.id;

    const { error, count } = await dbClient.from('academic_years').delete().eq('id', yearId);
    if (error) throw error;
    
    return { deletedDocs: count || 1 };
}

export async function switchActiveYear(yearName: string): Promise<void> {
    const { data: yearData } = await dbClient.from('academic_years').select('id').eq('name', yearName).maybeSingle();
    if (!yearData) throw new Error("Năm học không tồn tại");

    await dbClient.from('academic_years').update({ is_active: false }).neq('id', yearData.id);
    await dbClient.from('academic_years').update({ is_active: true }).eq('id', yearData.id);
}
