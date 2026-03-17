/**
 * Cấu hình tập trung cho ứng dụng
 * 
 * Tất cả các giá trị cố định (SCHOOL_ID, năm học mặc định) 
 * được quản lý tại đây thay vì hardcode trong từng file.
 * 
 * Năm học thực tế được lấy từ Firestore qua year-service.ts (getActiveYear).
 * Giá trị DEFAULT_YEAR chỉ là fallback khi chưa kết nối được DB.
 */

// Mã trường - hiện tại chỉ hỗ trợ 1 trường
export const SCHOOL_ID = process.env.NEXT_PUBLIC_SCHOOL_ID || 'default';

// Năm học mặc định (fallback) - chỉ dùng khi getActiveYear() chưa trả kết quả
export const DEFAULT_YEAR = process.env.NEXT_PUBLIC_DEFAULT_YEAR || '2025-2026';

// Đường dẫn Firestore gốc
export function getSchoolPath() {
    return `schools/${SCHOOL_ID}`;
}

export function getYearPath(year: string = DEFAULT_YEAR) {
    return `years/${year}`;
}

export function getAttendancePath(year: string, date: string) {
    return `${getSchoolPath()}/${getYearPath(year)}/attendance/${date}/records`;
}
