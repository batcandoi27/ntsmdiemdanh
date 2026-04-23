import { SYSTEM_MODE } from '@/config/system';
import { AppUser } from '@/types/models';

type PermissionAction = 
    | 'VIEW_ALL_CLASSES'
    | 'EXPORT_DATA'
    | 'EDIT_ATTENDANCE'
    | 'EDIT_STUDENT_STATUS'
    | 'CREATE_ACCOUNTS'
    | 'MANAGE_TIMETABLE';

/**
 * Kiểm tra quyền hạn của user tập trung.
 * Nếu SYSTEM_MODE = 'OPEN', các quyền xem/xuất dữ liệu hoặc sửa điểm danh sẽ tự động pass.
 */
export function checkPermission(user: AppUser | null, action: PermissionAction): boolean {
    if (!user) return false;

    // Compatibility mode: Bypass RBAC cho một số hành động quan trọng để giữ flow làm việc
    if (SYSTEM_MODE === 'OPEN') {
        if (['VIEW_ALL_CLASSES', 'EXPORT_DATA', 'EDIT_ATTENDANCE'].includes(action)) {
            return true;
        }
    }

    if (!user.permissions) return false;

    switch (action) {
        case 'VIEW_ALL_CLASSES':
            return !!user.permissions.canViewAllClasses;
        case 'EXPORT_DATA':
            return !!user.permissions.canExportData;
        case 'EDIT_ATTENDANCE':
            return !!user.permissions.canEditAttendance;
        case 'EDIT_STUDENT_STATUS':
            return !!user.permissions.canEditStudentStatus;
        case 'CREATE_ACCOUNTS':
            return !!user.permissions.canCreateAccounts;
        case 'MANAGE_TIMETABLE':
            return !!user.permissions.canManageTimetable;
        default:
            return false;
    }
}
