/**
 * Auth Guard – Middleware bảo mật cho service layer
 *
 * 3 hàm kiểm tra bắt buộc:
 *   checkClassAccess()   – Scope check: user có quyền truy cập lớp này?
 *   checkEditWindow()    – Time check: record còn trong thời gian cho phép sửa?
 *   checkStudentActive() – Status check: HS có đang học? (chặn ghi điểm danh HS đã nghỉ)
 */

import { AppUser, StudentStatus } from '@/types/models';

// ============================================
// 1. Scope Check – Kiểm tra quyền truy cập lớp
// ============================================

export class AccessDeniedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AccessDeniedError';
    }
}

/**
 * Kiểm tra user có quyền truy cập classId hay không.
 * Throw AccessDeniedError nếu không có quyền.
 *
 * Rules:
 * - admin, principal: canViewAllClasses = true → luôn pass
 * - supervisor, teacher, class_monitor: classId phải nằm trong assignedClassIds
 */
export function checkClassAccess(user: AppUser, classId: string): void {
    // Ưu tiên 1: Chấp nhận nếu có quyền canViewAllClasses (Admin, Principal, Supervisor)
    if (user.permissions?.canViewAllClasses) return;

    // Ưu tiên 2: Chấp nhận nếu classId nằm trong assignedClassIds
    if (user.assignedClassIds && user.assignedClassIds.includes(classId)) return;

    // Trường hợp còn lại: Chặn
    throw new AccessDeniedError(
        `Bạn không có quyền truy cập lớp học này. Liên hệ Admin để được phân công.`
    );
}

/**
 * Kiểm tra user có quyền CHỈNH SỬA data của classId hay không.
 * Strict hơn checkClassAccess – yêu cầu canEditAttendance = true.
 */
export function checkClassEditAccess(user: AppUser, classId: string): void {
    checkClassAccess(user, classId);
    if (!user.permissions.canEditAttendance) {
        throw new AccessDeniedError(
            `Vai trò "${user.role}" không có quyền chỉnh sửa điểm danh.`
        );
    }
}

// ============================================
// 2. Edit Window Check – Kiểm tra thời gian cho phép sửa
// ============================================

/**
 * Kiểm tra record còn trong thời gian cho phép sửa hay không.
 * Throw AccessDeniedError nếu đã quá edit window.
 *
 * Rules:
 * - editWindowMinutes = -1 → vô hạn (admin, principal)
 * - editWindowMinutes = 1440 → trong cùng ngày (teacher, supervisor)
 * - editWindowMinutes = 30 → 30 phút (class_monitor)
 */
export function checkEditWindow(user: AppUser, recordTimestamp: string | Date): void {
    if (user.editWindowMinutes === -1) return; // Vô hạn

    const recordTime = typeof recordTimestamp === 'string'
        ? new Date(recordTimestamp)
        : recordTimestamp;

    const now = new Date();
    const minutesAgo = (now.getTime() - recordTime.getTime()) / (1000 * 60);

    if (minutesAgo > user.editWindowMinutes) {
        const windowDesc = user.editWindowMinutes >= 1440
            ? 'trong cùng ngày'
            : `trong ${user.editWindowMinutes} phút`;

        throw new AccessDeniedError(
            `Đã quá thời gian cho phép sửa (${windowDesc}). Liên hệ Giáo viên hoặc Admin.`
        );
    }
}

/**
 * Kiểm tra class_monitor có được XOÁ record hay không.
 * Class monitor KHÔNG được xoá record, chỉ tạo mới hoặc sửa trong window.
 */
export function checkDeletePermission(user: AppUser): void {
    if (user.role === 'class_monitor') {
        throw new AccessDeniedError(
            'Ban Cán Sự không có quyền xoá bản ghi. Liên hệ Giáo viên.'
        );
    }
}

// ============================================
// 3. Student Status Check – Chặn ghi data cho HS không active
// ============================================

const ATTENDANCE_ALLOWED_STATUSES: StudentStatus[] = ['active'];

/**
 * Kiểm tra HS có đang trong trạng thái được phép điểm danh hay không.
 * Throw AccessDeniedError nếu HS đã nghỉ/đình chỉ/tốt nghiệp.
 *
 * Chỉ HS có status = 'active' mới được tạo attendance record.
 * temporary_leave hiển thị mờ nhưng KHÔNG cho điểm danh.
 */
export function checkStudentActive(studentStatus: StudentStatus, studentName?: string): void {
    if (!ATTENDANCE_ALLOWED_STATUSES.includes(studentStatus)) {
        const name = studentName ? ` (${studentName})` : '';
        throw new AccessDeniedError(
            `Không thể điểm danh cho học sinh${name} vì trạng thái hiện tại: "${studentStatus}".`
        );
    }
}

// ============================================
// 4. Role-based Status Change Check
// ============================================

type StatusTransition = `${StudentStatus}->${StudentStatus}`;

const ALLOWED_TRANSITIONS: Record<string, StatusTransition[]> = {
    teacher: [
        'active->temporary_leave',
        'temporary_leave->active',
    ],
    principal: [
        'active->temporary_leave',
        'temporary_leave->active',
        'active->dropped_out',
        'active->suspended',
        'suspended->active',
    ],
    supervisor: [
        'active->temporary_leave',
        'temporary_leave->active',
        'active->dropped_out',
        'active->suspended',
        'suspended->active',
    ],
    admin: [
        'active->temporary_leave',
        'temporary_leave->active',
        'active->dropped_out',
        'active->suspended',
        'suspended->active',
        'active->graduated',
    ],
};

/**
 * Kiểm tra user có quyền đổi status HS từ A → B hay không.
 */
export function checkStatusChangePermission(
    user: AppUser,
    fromStatus: StudentStatus,
    toStatus: StudentStatus
): void {
    if (!user.permissions.canEditStudentStatus) {
        throw new AccessDeniedError(
            `Vai trò "${user.role}" không có quyền thay đổi trạng thái học sinh.`
        );
    }

    const transition: StatusTransition = `${fromStatus}->${toStatus}`;
    const allowed = ALLOWED_TRANSITIONS[user.role] || [];

    if (!allowed.includes(transition)) {
        throw new AccessDeniedError(
            `Vai trò "${user.role}" không được phép chuyển trạng thái từ "${fromStatus}" sang "${toStatus}".`
        );
    }
}
