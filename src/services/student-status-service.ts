/**
 * Student Status Service v3.0
 *
 * Quản lý 5 trạng thái HS: active, temporary_leave, dropped_out, suspended, graduated
 * Tự động cập nhật actualStudentCount khi status thay đổi.
 */

import {
    doc, updateDoc, getDoc, getDocs,
    collection, query, where, arrayUnion,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Student, StudentStatus, StatusChange, AppUser, Class, AppSettings } from '@/types/models';
import { checkClassAccess, checkStatusChangePermission } from './auth-guard';
import { SCHOOL_ID, DEFAULT_YEAR } from '@/config/constants';
import { supabase } from '@/lib/supabase';

const isSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';

const BASE_PATH = `schools/${SCHOOL_ID}`;

// ============================================
// Status Helpers
// ============================================

/** Statuses that count toward actual student count */
const COUNTED_STATUSES: StudentStatus[] = ['active', 'temporary_leave'];

/** Get effective status (v3 if available, fallback to legacy mapping) */
export function getEffectiveStatus(student: Student): StudentStatus {
    // Ưu tiên status từ Supabase (nếu có)
    if (student.status && ['active', 'temporary_leave', 'dropped_out', 'suspended', 'graduated'].includes(student.status as any)) {
        return student.status as StudentStatus;
    }
    if (student.statusV3) return student.statusV3;
    // Legacy mapping cho Firebase cũ
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
    const fullYearPath = `${BASE_PATH}/${yearPath}`;
    // 1. Check quyền truy cập lớp
    checkClassAccess(user, input.classId);

    // 2. Load student hiện tại
    const studentRef = doc(db, `${fullYearPath}/students`, input.studentId);
    const studentSnap = await getDoc(studentRef);
    if (!studentSnap.exists()) throw new Error('Không tìm thấy học sinh.');
    const student = studentSnap.data() as Student;

    // 3. Check quyền đổi status
    const currentStatus = getEffectiveStatus(student);
    checkStatusChangePermission(user, currentStatus, input.newStatus);

    // 4. Tạo history entry
    const historyEntry: StatusChange = {
        status: input.newStatus,
        date: new Date().toISOString(),
        note: input.note,
        changedBy: user.uid,
        changedByName: user.displayName,
        changedByRole: user.role,
        decisionNumber: input.decisionNumber,
    };

    // 5. Update student
    if (isSupabase) {
        try {
            const { error } = await supabase
                .from('students')
                .update({
                    status: input.newStatus,
                })
                .eq('id', input.studentId);
            
            if (error) throw error;
        } catch (err) {
            console.error('Lỗi changeStudentStatus (Supabase):', err);
        }
    } else {
        await updateDoc(studentRef, {
            statusV3: input.newStatus,
            statusNote: input.note,
            statusDate: new Date().toISOString(),
            statusExpectedReturn: input.expectedReturn || null,
            statusHistory: arrayUnion(historyEntry),
            // Update legacy field for backward compat
            status: input.newStatus === 'active' ? 'Đang học' :
                input.newStatus === 'temporary_leave' ? 'Đang học' :
                    'Nghỉ học',
        });
    }

    // 6. Cập nhật sĩ số thực tế của lớp
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

    if (isSupabase) {
        try {
            const { data, error } = await supabase
                .from('student_classes')
                .select('students(status)')
                .eq('class_id', classId)
                .eq('is_active', true);
            
            if (!error && data) {
                count = (data as any[]).filter((d: any) => 
                    COUNTED_STATUSES.includes(d.students?.status as StudentStatus)
                ).length;
            }

            // Cập nhật record lớp
            await supabase
                .from('classes')
                .update({ actual_student_count: count })
                .eq('id', classId);
        } catch (err) {
            console.error('Lỗi recalculateActualCount (Supabase):', err);
        }
    } else {
        const fullYearPath = `${BASE_PATH}/${yearPath}`;
        const studentsRef = collection(db, `${fullYearPath}/students`);
        const q = query(studentsRef, where('classId', '==', classId));
        const snap = await getDocs(q);

        snap.docs.forEach(d => {
            const student = d.data() as Student;
            if (isStudentCounted(student)) count++;
        });

        // Update class document
        const classRef = doc(db, `${fullYearPath}/classes`, classId);
        await updateDoc(classRef, { actualStudentCount: count });
    }

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
    if (isSupabase) {
        const { data, error } = await supabase
            .from('student_classes')
            .select('students(*)')
            .eq('class_id', classId)
            .eq('is_active', true);
        
        if (error) return [];

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

    const fullYearPath = `${BASE_PATH}/${yearPath}`;
    const studentsRef = collection(db, `${fullYearPath}/students`);
    const q = query(studentsRef, where('classId', '==', classId));
    const snap = await getDocs(q);

    return snap.docs
        .map(d => ({ ...d.data(), id: d.id }) as Student)
        .filter(s => status === 'all' || getEffectiveStatus(s) === status)
        .sort((a, b) => a.order - b.order);
}

/** Đếm nhanh sĩ số thực tế (không update DB) */
export async function getActualStudentCount(
    classId: string,
    yearPath: string = `years/${DEFAULT_YEAR}`
): Promise<{ actual: number; total: number }> {
    if (isSupabase) {
        const { data, error } = await supabase
            .from('student_classes')
            .select('students(status)')
            .eq('class_id', classId)
            .eq('is_active', true);
        
        if (error || !data) return { actual: 0, total: 0 };

        let actual = 0;
        data.forEach((d: any) => {
            if (d.students && d.students.status && COUNTED_STATUSES.includes(d.students.status as StudentStatus)) actual++;
        });

        return { actual, total: data.length };
    }

    const fullYearPath = `${BASE_PATH}/${yearPath}`;
    const studentsRef = collection(db, `${fullYearPath}/students`);
    const q = query(studentsRef, where('classId', '==', classId));
    const snap = await getDocs(q);

    let actual = 0;
    snap.docs.forEach(d => {
        const student = d.data() as Student;
        if (isStudentCounted(student)) actual++;
    });

    return { actual, total: snap.size };
}

/**
 * Lấy sĩ số chuẩn của lớp dựa trên cấu hình hệ thống
 */
export function getClassSize(cls: Class, settings?: AppSettings | null): number {
    if (settings?.classSizeMethod === 'manual') {
        return cls.manualStudentCount || cls.totalStudents || cls.actualStudentCount || 0;
    }
    return cls.actualStudentCount || cls.totalStudents || cls.manualStudentCount || 0;
}
