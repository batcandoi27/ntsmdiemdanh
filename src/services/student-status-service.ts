/**
 * Student Status Service v3.0
 *
 * Quản lý 5 trạng thái HS: active, temporary_leave, dropped_out, suspended, graduated
 * Tự động cập nhật actualStudentCount khi status thay đổi.
 */

import { Student, StudentStatus, StatusChange, AppUser, Class, AppSettings } from '@/types/models';
import { checkClassAccess, checkStatusChangePermission } from './auth-guard';
import { SCHOOL_ID, DEFAULT_YEAR } from '@/config/constants';
import { supabase } from '@/lib/supabase';

// ============================================
// Status Helpers
// ============================================

/** Statuses that count toward actual student count */
const COUNTED_STATUSES: StudentStatus[] = ['active', 'temporary_leave'];

/** Get effective status (v3 if available, fallback to legacy mapping) */
export function getEffectiveStatus(student: Student): StudentStatus {
    // Nếu HS đã bị xóa mềm, coi như dropped_out
    if (student.is_deleted) return 'dropped_out';

    // Ưu tiên status từ Supabase (nếu có)
    if (student.status && ['active', 'temporary_leave', 'dropped_out', 'suspended', 'graduated'].includes(student.status as any)) {
        return student.status as StudentStatus;
    }
    if (student.statusV3) return student.statusV3;
    // Legacy mapping cho dữ liệu cũ (trước migration)
    switch (student.status) {
        case 'Đang học': return 'active';
        case 'Nghỉ học': return 'dropped_out';
        case 'Chuyển trường': return 'dropped_out';
        default: return 'active';
    }
}

/** Check if student is counted in actual student count */
export function isStudentCounted(student: Student): boolean {
    return COUNTED_STATUSES.includes(getEffectiveStatus(student));
}

/** Check if student can be marked for attendance */
export function isStudentAttendable(student: Student): boolean {
    return getEffectiveStatus(student) === 'active';
}

// ============================================
// Change Status
// ============================================

interface ChangeStatusInput {
    studentId: string;
    classId: string;
    newStatus: StudentStatus;
    note: string;
    decisionNumber?: string;
    expectedReturn?: string; // ISO, for temp_leave
}

/**
 * Đổi trạng thái HS + ghi lịch sử + cập nhật sĩ số thực tế
 */
export async function changeStudentStatus(
    user: AppUser,
    input: ChangeStatusInput,
    yearPath: string = `years/${DEFAULT_YEAR}`
): Promise<void> {
    // 1. Check quyền truy cập lớp
    checkClassAccess(user, input.classId);

    const { data, error } = await supabase
        .from('students')
        .select('status')
        .eq('id', input.studentId)
        .single();
    
    if (error || !data) throw new Error('Không tìm thấy học sinh trong Supabase.');
    const currentStatus = data.status as StudentStatus;

    // 2. Check quyền đổi status
    checkStatusChangePermission(user, currentStatus, input.newStatus);

    // 3. (Optional) Ghi log history - có thể tạo table student_status_history sau này nếu cần
    // Mặc định hiện tại chỉ update status ở bảng students

    // 4. Update student
    const { error: updateError } = await supabase
        .from('students')
        .update({
            status: input.newStatus,
        })
        .eq('id', input.studentId);
    
    if (updateError) throw updateError;

    // 5. Cập nhật sĩ số thực tế của lớp
    await recalculateActualCount(input.classId, yearPath);
}

// ============================================
// Recalculate Count
// ============================================

/**
 * Đếm lại sĩ số thực tế (active + temp_leave) và cập nhật Class document
 */
export async function recalculateActualCount(
    classId: string,
    yearPath: string = `years/${DEFAULT_YEAR}`
): Promise<number> {
    let count = 0;

    const { data, error } = await supabase
        .from('student_classes')
        .select('students!inner(status)')
        .eq('class_id', classId)
        .eq('is_active', true);
    
    if (!error && data) {
        count = (data as any[]).filter((d: any) => 
            COUNTED_STATUSES.includes(d.students?.status as StudentStatus)
        ).length;
    }

    // Cập nhật record lớp trực tiếp dù có lỗi lấy list hoặc k có HS
    await supabase
        .from('classes')
        .update({ actual_student_count: count })
        .eq('id', classId);

    return count;
}

// ============================================
// Queries
// ============================================

/** Lấy danh sách HS theo status */
export async function getStudentsByStatus(
    classId: string,
    status: StudentStatus | 'all',
    yearPath: string = `years/${DEFAULT_YEAR}`
): Promise<Student[]> {
    const { data, error } = await supabase
        .from('student_classes')
        .select('students(*)')
        .eq('class_id', classId)
        .eq('is_active', true);
    
    if (error || !data) return [];

    return data.map((d: any) => {
        const s = d.students;
        return {
            id: s.id,
            code: s.student_code,
            fullName: s.full_name,
            statusV3: s.status,
            order: s.order || 0
        } as any;
    }).filter(s => status === 'all' || s.statusV3 === status);
}

/** Đếm nhanh sĩ số thực tế (không update DB) */
export async function getActualStudentCount(
    classId: string,
    yearPath: string = `years/${DEFAULT_YEAR}`
): Promise<{ actual: number; total: number }> {
    const { data, error } = await supabase
        .from('student_classes')
        .select('students!inner(status)')
        .eq('class_id', classId)
        .eq('is_active', true);
    
    if (error || !data) return { actual: 0, total: 0 };

    let actual = 0;
    data.forEach((d: any) => {
        if (d.students && d.students.status && COUNTED_STATUSES.includes(d.students.status as StudentStatus)) actual++;
    });

    return { actual, total: data.length };
}

/**
 * Lấy sĩ số chuẩn của lớp dựa trên cấu hình hệ thống
 */
export function getClassSize(cls: Class, settings?: AppSettings | null): number {
    // Logic mới: Sĩ số thực tế = Sĩ số theo danh sách + Biến động (+/-)
    const listCount = cls.actualStudentCount || 0;
    const adjustment = cls.adjustmentCount || 0;
    return listCount + adjustment;
}
