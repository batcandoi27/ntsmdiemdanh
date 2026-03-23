import { Student, StudentStatus } from "@/types/models";

/**
 * Transforms UI student data to Supabase-compatible JSON payload for RPC
 */
export const transformStudentToDb = (student: Student) => {
    return {
        full_name: student.fullName,
        student_code: student.code,
        gender: student.gender === 'Nam' ? 'male' : student.gender === 'Nữ' ? 'female' : 'other',
        birthday: student.birthday, // YYYY-MM-DD
        gov_id: student.govId || null,
        ethnicity: student.ethnicity || 'Kinh',
        status: student.statusV3 || 'active',
        order_index: student.order || 0
    };
};

/**
 * Transforms Database row to UI Student model
 */
export const transformDbToStudent = (dbRow: any): Student => {
    return {
        id: dbRow.id,
        code: dbRow.student_code,
        fullName: dbRow.full_name,
        gender: dbRow.gender === 'male' ? 'Nam' : dbRow.gender === 'female' ? 'Nữ' : 'Khác',
        birthday: dbRow.birthday,
        statusV3: dbRow.status as StudentStatus,
        status: dbRow.status === 'active' ? 'Đang học' : 'Nghỉ học', // Legacy compat
        govId: dbRow.gov_id,
        ethnicity: dbRow.ethnicity,
        order: dbRow.order || 0,
        classId: dbRow.class_id,
        is_deleted: dbRow.is_deleted || false,
        firstName: dbRow.full_name.split(' ').pop() || '',
        lastName: dbRow.full_name.split(' ').slice(0, -1).join(' ') || ''
    } as Student;
};
