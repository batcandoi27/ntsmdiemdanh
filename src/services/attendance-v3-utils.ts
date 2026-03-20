import { AttendanceRecordV3 } from '@/types/attendance-v3';

/**
 * Hàm chuẩn hoá dữ liệu để tương thích ngược với format cũ
 * Hàm này ĐỒNG BỘ và có thể dùng được ở cả Client và Server.
 */
export function normalizeAttendanceRecord(record: any): AttendanceRecordV3 {
    if (!record) return record;
    const normalized = { ...record };

    // Fallback cho dữ liệu (missedPeriods)
    if (!normalized.missedPeriods) {
        if (normalized.period === null) {
            if (['absent', 'late', 'excused', 'K', 'T', 'P'].includes(normalized.status)) {
                normalized.missedPeriods = [1, 2, 3, 4, 5];
            }
        } else if (typeof normalized.period === 'number') {
            normalized.missedPeriods = [normalized.period];
        }
    }

    // Fallback cho Violation
    if (normalized.violation === true && !normalized.violationPeriods) {
        if (normalized.period === null) {
            normalized.violationPeriods = [1, 2, 3, 4, 5];
        } else if (typeof normalized.period === 'number') {
            normalized.violationPeriods = [normalized.period];
        }
    }
    
    // Fallback cho Reward
    if (normalized.reward === true && !normalized.rewardPeriods) {
        if (normalized.period === null) {
            normalized.rewardPeriods = [1, 2, 3, 4, 5];
        } else if (typeof normalized.period === 'number') {
            normalized.rewardPeriods = [normalized.period];
        }
    }

    // Map praise sang reward
    if (normalized.praise !== undefined && normalized.reward === undefined) {
        normalized.reward = normalized.praise;
        normalized.rewardNote = normalized.praiseNote;
    }

    // QUAN TRỌNG: Supabase Migration dùng status "VP" và "KH"
    if (normalized.status === 'VP' || normalized.status === 'violation') {
        normalized.violation = true;
        normalized.violationNote = normalized.note || normalized.violationNote;
        normalized.status = 'violation';
    }
    if (normalized.status === 'KH' || normalized.status === 'praise' || normalized.status === 'reward') {
        normalized.reward = true;
        normalized.rewardNote = normalized.note || normalized.rewardNote;
        normalized.status = 'reward';
    }

    // Map status code sang chuẩn UI
    const statusMap: Record<string, string> = {
        'K': 'absent',
        'P': 'excused',
        'T': 'late',
        'C': 'present'
    };
    if (normalized.status && statusMap[normalized.status]) {
        normalized.status = statusMap[normalized.status] as any;
    }

    return normalized;
}

