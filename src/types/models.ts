// ============================================
// RBAC v3.0 – 5 Roles System
// ============================================

/**
 * UserRole – 6 cấp quyền
 *   admin:         IT toàn quyền
 *   principal:     Hiệu trưởng / Phó HT
 *   supervisor:    Giám thị (điểm danh + xem khối)
 *   teacher:       GVCN (quản lý lớp mình)
 *   gvbm:          Giáo viên bộ môn (quản lý môn, không sửa status)
 *   class_monitor: Ban Cán Sự Lớp (điểm danh lớp mình, sửa 30 phút)
 */
export type UserRole = 'admin' | 'principal' | 'supervisor' | 'teacher' | 'gvbm' | 'class_monitor';

/**
 * Flexible permissions per user
 */
export interface UserPermissions {
    canEditAttendance: boolean;
    canEditStudentStatus: boolean;
    canCreateAccounts: boolean;
    canViewAllClasses: boolean;
    canExportData: boolean;
    canManageTimetable: boolean;
    canAccessAPI: boolean;
}

export interface BankInfo {
    bankId: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    qrTemplate?: 'compact' | 'compact2' | 'qr_only' | 'print';
}

/**
 * AppUser – Supabase table: profiles
 */
export interface AppUser {
    uid: string;                    // Supabase Auth UUID
    email?: string;                 // GV dùng email
    studentCode?: string;           // Ban Cán Sự dùng mã HS (VD: hs8a13_01)
    displayName: string;            // 'Cô Lan', 'Nguyễn Văn A (LT 8A13)'
    role: UserRole;
    assignedClassIds: string[];     // [Legacy] Nên dùng bảng teacher_classes trên Supabase
    homeroomClassId?: string;       // [Legacy] Nên dùng bảng teacher_classes trên Supabase
    assignedGrade?: string;         // Supervisor: 'grade_8' | 'all'
    permissions: UserPermissions;
    editWindowMinutes: number;      // class_monitor: 30, teacher: 1440, admin: -1
    isActive: boolean;
    bankInfo?: BankInfo;            // Cấu hình STK nhận tiền cá nhân/quỹ lớp
    createdBy?: string;             // UID người tạo
    createdAt: string;              // ISO
    lastLoginAt?: string;           // ISO
}

/**
 * Default permissions cho mỗi role
 */
export const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
    admin: {
        canEditAttendance: true,
        canEditStudentStatus: true,
        canCreateAccounts: true,
        canViewAllClasses: true,
        canExportData: true,
        canManageTimetable: true,
        canAccessAPI: true,
    },
    principal: {
        canEditAttendance: true,
        canEditStudentStatus: true,
        canCreateAccounts: true,
        canViewAllClasses: true,
        canExportData: true,
        canManageTimetable: true,
        canAccessAPI: true,
    },
    supervisor: {
        canEditAttendance: true,
        canEditStudentStatus: true,
        canCreateAccounts: false,
        canViewAllClasses: true,
        canExportData: true,
        canManageTimetable: false,
        canAccessAPI: true,
    },
    teacher: {
        canEditAttendance: true,
        canEditStudentStatus: true, // limited: active ↔ temp_leave only
        canCreateAccounts: false,
        canViewAllClasses: false,
        canExportData: true,
        canManageTimetable: false,
        canAccessAPI: false,
    },
    gvbm: {
        canEditAttendance: true,
        canEditStudentStatus: false,
        canCreateAccounts: false,
        canViewAllClasses: false,
        canExportData: true,
        canManageTimetable: false,
        canAccessAPI: false,
    },
    class_monitor: {
        canEditAttendance: true,
        canEditStudentStatus: false,
        canCreateAccounts: false,
        canViewAllClasses: false,
        canExportData: false,
        canManageTimetable: false,
        canAccessAPI: false,
    },
};

/**
 * Default edit window (phút) cho mỗi role
 */
export const DEFAULT_EDIT_WINDOW: Record<UserRole, number> = {
    admin: -1,          // Vô hạn
    principal: -1,
    supervisor: 1440,   // 1 ngày
    teacher: 1440,
    gvbm: 1440,
    class_monitor: 30,  // 30 phút
};

/**
 * Role display info (badge, color, label)
 */
export const ROLE_DISPLAY: Record<UserRole, { label: string; badge: string; color: string }> = {
    admin: { label: 'Admin', badge: '👑', color: 'text-amber-600' },
    principal: { label: 'Hiệu trưởng', badge: '⭐', color: 'text-blue-800' },
    supervisor: { label: 'Giám thị', badge: '👁️', color: 'text-blue-500' },
    teacher: { label: 'Giáo viên CN', badge: '👨‍🏫', color: 'text-green-600' },
    gvbm: { label: 'Giáo viên BM', badge: '📘', color: 'text-teal-600' },
    class_monitor: { label: 'Ban Cán Sự', badge: '📋', color: 'text-purple-600' },
};

/**
 * AppSettings – Supabase table: settings (key='app_settings')
 */
export interface AppSettings {
    activeYear: string;             // '2025-2026'
    schoolName: string;             // 'THCS Nguyễn Trãi'
    schoolCode?: string;            // 'THCS_NT'
    periodsPerSession: number;      // 5
    classSizeMethod?: 'real' | 'manual'; // [v3] Phương thức tính sĩ số
    subjectConfig?: {
        primary: string;
        secondary: string;
        high: string;
    };
    createdAt: string;
    updatedAt: string;
}

// ============================================
// STUDENT STATUS v3.0
// ============================================

export type StudentStatus = 'active' | 'temporary_leave' | 'dropped_out' | 'suspended' | 'graduated';

export interface StatusChange {
    status: StudentStatus;
    date: string;                   // ISO
    note: string;
    changedBy: string;              // UID
    changedByName: string;
    changedByRole: UserRole;
    decisionNumber?: string;        // Số QĐ (cho dropped_out/suspended)
}

export const STUDENT_STATUS_DISPLAY: Record<StudentStatus, { label: string; icon: string; color: string }> = {
    active: { label: 'Đang học', icon: '✅', color: 'text-green-600' },
    temporary_leave: { label: 'Nghỉ tạm thời', icon: '🏥', color: 'text-yellow-600' },
    dropped_out: { label: 'Thôi học', icon: '⚠️', color: 'text-red-600' },
    suspended: { label: 'Đình chỉ', icon: '🚫', color: 'text-red-800' },
    graduated: { label: 'Tốt nghiệp', icon: '🎓', color: 'text-blue-600' },
};

// ============================================
// LEGACY TYPES (v2.0 – giữ để backward compat)
// ============================================

/** @deprecated Use UserRole instead */
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
    actualStudentCount?: number;    // [v3] Sĩ số thực tế = active + temp_leave
    manualStudentCount?: number;    // [v3] Sĩ số tự nhập (legacy)
    adjustmentCount?: number;       // [v3] Biến động (+/-)
    sessions?: ('morning' | 'afternoon')[]; // [v3] ['morning'] hoặc ['morning','afternoon']
    academicYear?: string;          // [v3] Tên năm học (VD: 2024-2025)
    isPersonal?: boolean; // Đánh dấu lớp do người dùng tự tạo
    ownerId?: string;     // ID người dùng tạo lớp cá nhân
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
    /** @deprecated Dùng statusV3 thay thế */
    status: 'Đang học' | 'Nghỉ học' | 'Chuyển trường';
    ethnicity?: string; // Dân tộc
    govId?: string; // Mã định danh bộ
    // === v3 Status Fields ===
    statusV3?: StudentStatus;          // 'active' | 'temporary_leave' | ...
    statusNote?: string;               // Lý do
    statusDate?: string;               // ISO – ngày bắt đầu status hiện tại
    statusExpectedReturn?: string;     // ISO – dự kiến quay lại (temp_leave)
    statusHistory?: StatusChange[];    // Lịch sử thay đổi
    is_deleted?: boolean;             // [v3] Đánh dấu đã xóa mềm
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

export interface ColumnPaymentConfig {
    enabled: boolean;
    recipientType: 'school' | 'teacher' | 'custom';
    defaultAmount?: number;
    unit?: string;
    customBankInfo?: BankInfo;
    notePrefix?: string;
}

export interface PaymentTransaction {
    id: string;
    transactionId?: string;
    orderCode?: string;
    classId: string;
    studentCode: string;
    columnId: string;
    periodKey?: string;
    amount: number;
    content?: string;
    paymentMethod?: string;
    status: 'success' | 'pending' | 'failed';
    rawWebhookData?: Record<string, any>;
    createdAt: string;
}

/**
 * Column - Định nghĩa một cột theo dõi
 */
export interface Column {
    id: string;
    classId: string;
    userId: string; // [New] Sổ theo dõi tách biệt cho từng giáo viên (người tạo)
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

    // Parent Portal & Payment Configuration
    isSharedWithParents?: boolean; // Tùy chọn chia sẻ cho HS/PH xem ở /portal (Mặc định: false)
    paymentConfig?: ColumnPaymentConfig; // Cấu hình thu tiền & sinh mã VietQR

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
// ============================================
// CHAT SYSTEM v3.0
// ============================================

export interface ChatThread {
    id: string;
    userId: string;
    subject?: string;
    status: 'open' | 'closed';
    createdAt: string;
}

export interface ChatMessage {
    id: string;
    threadId: string;
    senderId: string;
    content: string;
    isRead: boolean;
    createdAt: string;
}
