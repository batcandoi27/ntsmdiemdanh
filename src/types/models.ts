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
    id: string; // Document ID
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
export type AttendanceStatus = 'P' | 'K' | '' | 'C' | 'V' | 'T' | 'VP' | 'KH';

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

// ============================================
// CUSTOM COLUMNS SYSTEM (v2.0)
// ============================================

/**
 * Column Scope:
 * - fixed: Cột cố định (Điểm danh, Vi phạm, Khen thưởng) - không xóa được
 * - custom: Cột tùy chỉnh do giáo viên tạo
 */
export type ColumnScope = 'fixed' | 'custom';

/**
 * Column Frequency (Vòng đời dữ liệu):
 * - daily: Theo ngày (VD: Điểm danh, Vi phạm)
 * - period: Theo giai đoạn (VD: Học phí tháng, Đóng tiền học kỳ)
 * - one_time: Một lần (VD: Nộp hồ sơ, Đóng BHYT)
 */
export type ColumnFrequency = 'daily' | 'period' | 'one_time';

/**
 * Period Config - Cấu hình cho cột period
 */
export interface PeriodConfig {
    type: 'month' | 'semester' | 'custom';
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
}

export interface SubPeriod {
    id: string; // e.g. "T09", "HK1"
    label: string; // e.g. "Tháng 9", "Học kỳ 1"
    startDate?: string;
    endDate?: string;
}

/**
 * Column - Định nghĩa một cột theo dõi
 */
export interface Column {
    id: string;
    classId: string;
    name: string;
    scope: ColumnScope;
    frequency: ColumnFrequency;
    periodConfig?: PeriodConfig; // Required if frequency = 'period'
    subPeriods?: SubPeriod[]; // For Multi-Period columns (e.g. Monthly Tuition)

    // Suggestion & Input Logic
    suggestions: string[]; // Danh sách gợi ý mặc định
    allowFreeText: boolean; // Cho phép nhập tự do

    // Student Assignments (P9)
    applicableScope?: 'all' | 'subset';
    applicableStudentIds?: string[]; // If subset, only these students

    // Visibility & Lifecycle
    archived: boolean; // Đã hoàn thành/hết hạn
    defaultVisibility?: boolean; // Default show/hide in Attendance

    order: number; // Thứ tự hiển thị
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
}

/**
 * DailyRecord - Dữ liệu cho cột daily (theo ngày)
 */
export interface DailyRecord {
    id: string; // columnId_classId_date_studentCode
    columnId: string;
    classId: string;
    studentCode: string;
    date: string; // YYYY-MM-DD
    selectedSuggestions: string[]; // Các gợi ý đã chọn
    note?: string; // Ghi chú thêm
    updatedAt: string;
}

/**
 * PeriodRecord - Dữ liệu cho cột period (theo giai đoạn)
 */
export interface PeriodRecord {
    id: string; // columnId_classId_periodKey_studentCode
    columnId: string;
    classId: string;
    studentCode: string;
    periodKey: string; // VD: "2025-HK1", "2026-01"
    value: string | number | boolean; // Giá trị (tiền, trạng thái...)
    note?: string;
    updatedAt: string;
}

/**
 * OneTimeRecord - Dữ liệu cho cột one_time (một lần)
 */
export interface OneTimeRecord {
    id: string; // columnId_classId_studentCode
    columnId: string;
    classId: string;
    studentCode: string;
    status: 'done' | 'pending';
    completedAt?: string; // Ngày hoàn thành
    note?: string;
    updatedAt: string;
}

/**
 * Union type cho tất cả loại record
 */
export type ColumnRecord = DailyRecord | PeriodRecord | OneTimeRecord;

/**
 * ReportPreset - Cấu hình bộ lọc báo cáo đã lưu
 */
export interface ReportPreset {
    id: string;
    classId: string;
    name: string; // VD: "Báo cáo nề nếp", "Tình hình đóng phí"
    visibleColumnIds: string[]; // Các cột hiển thị
    frequencyFilters: ColumnFrequency[]; // Lọc theo frequency
    showArchived: boolean; // Hiển thị cột đã archive
    createdAt: string;
    updatedAt: string;
}

/**
 * ColumnVisibilityPreset - Cấu hình hiển thị cột trong Attendance
 */
export interface ColumnVisibilityPreset {
    classId: string;
    hiddenColumnIds: string[]; // Các cột bị ẩn
    updatedAt: string;
}
