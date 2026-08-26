import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * So sánh tự nhiên 2 mã học sinh (Natural Numerical Sort)
 * Ví dụ: 8A13_1 < 8A13_2 < ... < 8A13_9 < 8A13_10 < 8A13_43
 */
export function compareStudentCodes(codeA?: string, codeB?: string): number {
    if (!codeA && !codeB) return 0;
    if (!codeA) return 1;
    if (!codeB) return -1;
    return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Sắp xếp danh sách học sinh tăng dần theo mã học sinh
 */
export function sortStudentsByCode<T extends { code?: string; order?: number }>(students: T[]): T[] {
    return [...students].sort((a, b) => {
        if (a.code && b.code) {
            return compareStudentCodes(a.code, b.code);
        }
        return (a.order || 0) - (b.order || 0);
    });
}
