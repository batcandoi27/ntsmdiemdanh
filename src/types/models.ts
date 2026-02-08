export type Role = 'gvcn' | 'giamthi' | 'bgh';

export interface User {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    role: Role;
    classId?: string; // Nếu là GVCN
}

export interface Class {
    id: string; // VD: "6A1"
    name: string;
    grade: number; // 6, 7, 8, 9
    teacherId: string; // User ID của GVCN
    teacherName: string;
    totalStudents: number;
    femaleCount?: number;
    maleCount?: number;
    classType?: string; // BT, TCH...
}

export interface Student {
    code: string; // VD: "6A1_1" hoặc "HS001"
    classId: string;
    order: number; // STT
    fullName: string;
    firstName: string;
    lastName: string;
    gender: 'Nam' | 'Nữ';
    birthday: string; // DD/MM/YYYY
    status: 'Đang học' | 'Nghỉ học' | 'Chuyển trường';
    ethnicity?: string; // Dân tộc
    govId?: string; // Mã định danh bộ
}

// Status codes: 
// '' | 'C': Present
// 'P': Excused Absence (Phép)
// 'K': Unexcused Absence (Không phép)
// 'V': Absent Unknown (Vắng - chưa rõ P/K)
// 'T': Late (Trễ)
// 'VP': Violation (Vi Phạm)
export type AttendanceStatus = 'P' | 'K' | '' | 'C' | 'V' | 'T' | 'VP';

export interface AttendanceRecord {
    id: string; // composite: classId_date
    date: string; // YYYY-MM-DD
    classId: string;
    absences: Record<string, AttendanceStatus>; // Map studentCode -> status (P, K, V, T, VP)
    notes?: Record<string, string>; // Map studentCode -> violation details (e.g. "Đồng phục")
    updatedBy: string;
    updatedAt: string; // ISO string
    syncStatus: 'synced' | 'pending' | 'failed';
}
