/**
 * Default Fixed Columns Configuration
 * Các cột cố định trong hệ thống - không thể xóa, chỉ chỉnh sửa suggestions
 */

import { Column } from '@/types/models';

// ID cố định cho các fixed columns
export const FIXED_COLUMN_IDS = {
    ATTENDANCE: 'fixed_attendance',
    VIOLATION: 'fixed_violation',
    REWARD: 'fixed_reward',
} as const;

// Tên hiển thị
export const FIXED_COLUMN_NAMES = {
    [FIXED_COLUMN_IDS.ATTENDANCE]: 'Điểm danh',
    [FIXED_COLUMN_IDS.VIOLATION]: 'Vi phạm',
    [FIXED_COLUMN_IDS.REWARD]: 'Khen thưởng',
} as const;

// Gợi ý mặc định cho cột Vi phạm
export const DEFAULT_VIOLATION_SUGGESTIONS = [
    'Đi học muộn',
    'Đồng phục không đúng quy định',
    'Không thuộc bài',
    'Nói chuyện riêng',
    'Sử dụng điện thoại',
    'Không làm bài tập',
    'Gây mất trật tự',
    'Vệ sinh lớp học',
];

// Gợi ý mặc định cho cột Khen thưởng
export const DEFAULT_REWARD_SUGGESTIONS = [
    'Phát biểu xây dựng bài',
    'Giúp đỡ bạn bè',
    'Điểm cao bài kiểm tra',
    'Hoạt động nhóm tích cực',
    'Giữ gìn vệ sinh lớp',
    'Đạt thành tích thi đua',
    'Tiến bộ trong học tập',
    'Tham gia hoạt động ngoại khóa',
];

// Gợi ý mặc định cho cột Điểm danh (status đã có sẵn trong AttendanceStatus)
export const DEFAULT_ATTENDANCE_SUGGESTIONS = [
    'Có mặt',
    'Vắng có phép',
    'Vắng không phép',
    'Đi muộn',
];

/**
 * Tạo template cho fixed columns của một lớp
 */
export function createFixedColumnsForClass(classId: string): Omit<Column, 'createdAt' | 'updatedAt'>[] {
    const now = new Date().toISOString();

    return [
        {
            id: `${classId}_${FIXED_COLUMN_IDS.ATTENDANCE}`,
            classId,
            name: FIXED_COLUMN_NAMES[FIXED_COLUMN_IDS.ATTENDANCE],
            scope: 'fixed',
            frequency: 'daily',
            suggestions: DEFAULT_ATTENDANCE_SUGGESTIONS,
            allowFreeText: false,
            archived: false,
            order: 0,
        },
        {
            id: `${classId}_${FIXED_COLUMN_IDS.VIOLATION}`,
            classId,
            name: FIXED_COLUMN_NAMES[FIXED_COLUMN_IDS.VIOLATION],
            scope: 'fixed',
            frequency: 'daily',
            suggestions: DEFAULT_VIOLATION_SUGGESTIONS,
            allowFreeText: true,
            archived: false,
            order: 1,
        },
        {
            id: `${classId}_${FIXED_COLUMN_IDS.REWARD}`,
            classId,
            name: FIXED_COLUMN_NAMES[FIXED_COLUMN_IDS.REWARD],
            scope: 'fixed',
            frequency: 'daily',
            suggestions: DEFAULT_REWARD_SUGGESTIONS,
            allowFreeText: true,
            archived: false,
            order: 2,
        },
    ];
}

/**
 * Kiểm tra xem column có phải fixed không
 */
export function isFixedColumn(columnId: string): boolean {
    return Object.values(FIXED_COLUMN_IDS).some(fixedId => columnId.endsWith(fixedId));
}

/**
 * Lấy loại fixed column từ ID
 */
export function getFixedColumnType(columnId: string): keyof typeof FIXED_COLUMN_IDS | null {
    for (const [key, value] of Object.entries(FIXED_COLUMN_IDS)) {
        if (columnId.endsWith(value)) {
            return key as keyof typeof FIXED_COLUMN_IDS;
        }
    }
    return null;
}
