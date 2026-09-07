/**
 * School Matrix Timetable Parser
 * Engine phân tích cú pháp thời khóa biểu ma trận trường học (TKB Lớp) từ file Excel (.xlsx).
 * Hỗ trợ 2 Sheet Sáng/Chiều, 50+ lớp học, tự động trích xuất metadata và chuẩn hóa môn học.
 */

import * as XLSX from 'xlsx';
import { DayOfWeek, PeriodSlot, SessionType, WeekSchedule, createEmptyWeekSchedule } from '@/types/timetable';

export const DAY_KEYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Từ điển chuẩn hóa tên môn học thông minh */
export const SUBJECT_ALIASES: Record<string, { standardized: string; category: string }> = {
    'toán': { standardized: 'Toán', category: 'math' },
    'toan': { standardized: 'Toán', category: 'math' },
    'văn học': { standardized: 'Ngữ văn', category: 'literature' },
    'van hoc': { standardized: 'Ngữ văn', category: 'literature' },
    'văn': { standardized: 'Ngữ văn', category: 'literature' },
    'ngữ văn': { standardized: 'Ngữ văn', category: 'literature' },
    'tiếng anh': { standardized: 'Tiếng Anh', category: 'foreign_language' },
    'tieng anh': { standardized: 'Tiếng Anh', category: 'foreign_language' },
    'anh': { standardized: 'Tiếng Anh', category: 'foreign_language' },
    'av bản ngữ': { standardized: 'Tiếng Anh bản ngữ', category: 'foreign_language' },
    'tc anh': { standardized: 'Tiếng Anh tăng cường', category: 'foreign_language' },
    'tiếng trung': { standardized: 'Tiếng Trung', category: 'foreign_language' },
    'khtn': { standardized: 'Khoa học tự nhiên', category: 'science' },
    'stem': { standardized: 'STEM', category: 'science' },
    'vật lý': { standardized: 'Vật lý', category: 'science' },
    'hóa học': { standardized: 'Hóa học', category: 'science' },
    'sinh vật': { standardized: 'Sinh học', category: 'science' },
    'ls&đl': { standardized: 'Lịch sử và Địa lý', category: 'social' },
    'lịch sử': { standardized: 'Lịch sử', category: 'social' },
    'địa lý': { standardized: 'Địa lý', category: 'social' },
    'gdcd': { standardized: 'Giáo dục công dân', category: 'social' },
    'gd thể chất': { standardized: 'Giáo dục thể chất', category: 'physical' },
    'thể dục': { standardized: 'Giáo dục thể chất', category: 'physical' },
    'tin học': { standardized: 'Tin học', category: 'technology' },
    'tin qt': { standardized: 'Tin học quốc tế', category: 'technology' },
    'công nghệ': { standardized: 'Công nghệ', category: 'technology' },
    'mĩ thuật': { standardized: 'Mĩ thuật', category: 'arts' },
    'nhạc': { standardized: 'Âm nhạc', category: 'arts' },
    'âm nhạc': { standardized: 'Âm nhạc', category: 'arts' },
    'hđtn 1 (shdc)': { standardized: 'HĐTN (Chào cờ)', category: 'activity' },
    'hđtn 2': { standardized: 'HĐTN (Sinh hoạt lớp)', category: 'activity' },
    'hđtn 3': { standardized: 'Hoạt động trải nghiệm', category: 'activity' },
    'kỹ năng sống': { standardized: 'Kỹ năng sống', category: 'activity' },
    'gd địa phương': { standardized: 'Giáo dục địa phương', category: 'activity' },
    'hdhb': { standardized: 'Hoạt động hướng nghiệp', category: 'activity' },
};

export interface SchoolMatrixMetadata {
    schoolName?: string;
    semester?: string;
    academicYear?: string;
    effectiveDate?: string;
}

export interface ParsedClassTimetable {
    className: string;
    grade: number;
    effectiveDate: string;
    schedule: WeekSchedule;
    totalMorningSlots: number;
    totalAfternoonSlots: number;
    totalSlots: number;
    subjects: string[];
}

export interface MatrixParseResult {
    success: boolean;
    formatType: 'matrix_school' | 'flat_list';
    metadata: SchoolMatrixMetadata;
    classes: ParsedClassTimetable[];
    totalClasses: number;
    totalSlots: number;
    uniqueSubjects: string[];
    errors: string[];
    warnings: string[];
}

/** Trích xuất khối lớp từ tên lớp (VD: '6A1' -> 6, '10A2' -> 10) */
export function extractGradeFromClassName(className: string): number {
    const match = className.match(/^(\d+)/);
    if (match) {
        const g = parseInt(match[1], 10);
        if (!isNaN(g) && g >= 1 && g <= 12) return g;
    }
    return 6;
}

/** Chuyển đổi định dạng ngày dd/mm/yyyy sang ISO yyyy-mm-dd */
export function normalizeDateStringToIso(dateStr: string): string {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const clean = dateStr.trim();
    // Khớp dd/mm/yyyy
    const parts = clean.split(/[/.-]/);
    if (parts.length === 3) {
        if (parts[2].length === 4) {
            // dd/mm/yyyy
            const d = parts[0].padStart(2, '0');
            const m = parts[1].padStart(2, '0');
            const y = parts[2];
            return `${y}-${m}-${d}`;
        } else if (parts[0].length === 4) {
            // yyyy/mm/dd
            const y = parts[0];
            const m = parts[1].padStart(2, '0');
            const d = parts[2].padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
    }
    return clean;
}

/**
 * Phân tích cú pháp toàn bộ Workbook Excel
 */
export function parseSchoolMatrixWorkbook(workbook: XLSX.WorkBook): MatrixParseResult {
    const metadata: SchoolMatrixMetadata = {
        schoolName: '',
        semester: '1',
        academicYear: '2026-2027',
        effectiveDate: new Date().toISOString().split('T')[0],
    };

    const classMap = new Map<string, ParsedClassTimetable>();
    const allSubjects = new Set<string>();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Kiểm tra xem có sheet SÁNG/CHIỀU hay không
    const sheetNames = workbook.SheetNames;
    const isMatrix = sheetNames.some(name => {
        const u = name.toUpperCase();
        return u.includes('SÁNG') || u.includes('SANG') || u.includes('CHIỀU') || u.includes('CHIEU') || u.includes('TKB');
    });

    if (!isMatrix && sheetNames.length > 0) {
        // Có thể là dạng Flat list, thử parse dạng Flat
        return parseFlatListWorkbook(workbook);
    }

    for (const sheetName of sheetNames) {
        const upperSheet = sheetName.toUpperCase();
        const sessionKey: SessionType =
            upperSheet.includes('CHIỀU') || upperSheet.includes('CHIEU')
                ? 'afternoon'
                : 'morning';

        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: true }) as any[][];
        if (!data || data.length === 0) continue;

        let currentClassName: string | null = null;
        let currentEffectiveDate: string | null = null;

        for (let r = 0; r < data.length; r++) {
            const row = data[r] || [];

            // 1. Quét thông tin trường, học kỳ, năm học
            if (row[0] && String(row[0]).trim().toLowerCase() === 'trường' && row[1]) {
                metadata.schoolName = String(row[1]).trim();
            }
            if (row[0] && String(row[0]).trim().toLowerCase() === 'học kỳ' && row[1]) {
                metadata.semester = String(row[1]).trim();
            }
            if (row[0] && String(row[0]).trim().toLowerCase() === 'năm học' && row[1]) {
                metadata.academicYear = String(row[1]).trim();
            }

            // 2. Quét tên lớp: [null, null, null, 'Lớp', '6A1'] hoặc ['Lớp', '6A1']
            const lopIdx = row.findIndex(c => c != null && String(c).trim().toLowerCase() === 'lớp');
            if (lopIdx !== -1 && row[lopIdx + 1] != null) {
                const rawName = String(row[lopIdx + 1]).trim();
                if (rawName && !rawName.toLowerCase().includes('tiết')) {
                    currentClassName = rawName;
                    currentEffectiveDate = null;
                }
            }

            // 3. Quét ngày có hiệu lực: 'Có tác dụng từ ngày'
            const dateIdx = row.findIndex(c => c != null && String(c).includes('Có tác dụng từ ngày'));
            if (dateIdx !== -1) {
                const foundDate = row.slice(dateIdx + 1).find(c => c != null && String(c).trim().length > 0);
                if (foundDate) {
                    currentEffectiveDate = normalizeDateStringToIso(String(foundDate).trim());
                    if (!metadata.effectiveDate) {
                        metadata.effectiveDate = currentEffectiveDate;
                    }
                }
            }

            // 4. Quét các hàng tiết học (Ô đầu tiên là số 1..5)
            const firstCell = row[0];
            const periodNum = typeof firstCell === 'number' ? firstCell : parseInt(String(firstCell || '').trim(), 10);

            if (currentClassName && !isNaN(periodNum) && periodNum >= 1 && periodNum <= 6) {
                if (!classMap.has(currentClassName)) {
                    classMap.set(currentClassName, {
                        className: currentClassName,
                        grade: extractGradeFromClassName(currentClassName),
                        effectiveDate: currentEffectiveDate || metadata.effectiveDate || new Date().toISOString().split('T')[0],
                        schedule: createEmptyWeekSchedule(),
                        totalMorningSlots: 0,
                        totalAfternoonSlots: 0,
                        totalSlots: 0,
                        subjects: [],
                    });
                }

                const classItem = classMap.get(currentClassName)!;
                if (currentEffectiveDate) {
                    classItem.effectiveDate = currentEffectiveDate;
                }

                // Cột 1 đến 6 tương ứng Thứ 2 đến Thứ 7
                for (let dayIdx = 0; dayIdx < 6; dayIdx++) {
                    const colIdx = dayIdx + 1;
                    const rawVal = row[colIdx];
                    if (rawVal != null && String(rawVal).trim().length > 0) {
                        const subjectName = String(rawVal).trim();
                        const dayKey = DAY_KEYS[dayIdx];

                        // Chuẩn hóa môn học nếu có alias
                        const lowerSub = subjectName.toLowerCase();
                        const aliasInfo = SUBJECT_ALIASES[lowerSub];
                        const standardizedName = aliasInfo ? aliasInfo.standardized : subjectName;

                        const slot: PeriodSlot = {
                            period: periodNum,
                            subject: standardizedName,
                        };

                        classItem.schedule[dayKey][sessionKey].push(slot);
                        if (sessionKey === 'morning') {
                            classItem.totalMorningSlots++;
                        } else {
                            classItem.totalAfternoonSlots++;
                        }
                        classItem.totalSlots++;

                        if (!classItem.subjects.includes(standardizedName)) {
                            classItem.subjects.push(standardizedName);
                        }
                        allSubjects.add(standardizedName);
                    }
                }
            }
        }
    }

    // Sắp xếp các tiết học theo thứ tự period 1..5
    classMap.forEach(item => {
        for (const day of DAY_KEYS) {
            item.schedule[day].morning.sort((a, b) => a.period - b.period);
            item.schedule[day].afternoon.sort((a, b) => a.period - b.period);
        }
    });

    // Sắp xếp lớp theo tên tự nhiên: 6A1, 6A2... 7A1...
    const sortedClasses = Array.from(classMap.values()).sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade;
        return a.className.localeCompare(b.className, 'vi', { numeric: true });
    });

    let totalSlots = 0;
    for (const c of sortedClasses) {
        totalSlots += c.totalSlots;
    }

    return {
        success: sortedClasses.length > 0,
        formatType: 'matrix_school',
        metadata,
        classes: sortedClasses,
        totalClasses: sortedClasses.length,
        totalSlots,
        uniqueSubjects: Array.from(allSubjects).sort(),
        errors,
        warnings,
    };
}

/**
 * Phân tích cú pháp dạng danh sách phẳng (Flat List Fallback)
 */
function parseFlatListWorkbook(workbook: XLSX.WorkBook): MatrixParseResult {
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

    const classMap = new Map<string, ParsedClassTimetable>();
    const allSubjects = new Set<string>();
    const errors: string[] = [];

    const DAY_MAP: Record<string, DayOfWeek> = {
        '2': 'monday', 'thứ 2': 'monday', 'thu 2': 'monday', 'monday': 'monday',
        '3': 'tuesday', 'thứ 3': 'tuesday', 'thu 3': 'tuesday', 'tuesday': 'tuesday',
        '4': 'wednesday', 'thứ 4': 'wednesday', 'thu 4': 'wednesday', 'wednesday': 'wednesday',
        '5': 'thursday', 'thứ 5': 'thursday', 'thu 5': 'thursday', 'thursday': 'thursday',
        '6': 'friday', 'thứ 6': 'friday', 'thu 6': 'friday', 'friday': 'friday',
        '7': 'saturday', 'thứ 7': 'saturday', 'thu 7': 'saturday', 'saturday': 'saturday',
    };

    const SESSION_MAP: Record<string, SessionType> = {
        'sáng': 'morning', 'sang': 'morning', 'morning': 'morning', 's': 'morning',
        'chiều': 'afternoon', 'chieu': 'afternoon', 'afternoon': 'afternoon', 'c': 'afternoon',
    };

    rows.forEach((row) => {
        const className = (row['Lớp'] || row['lớp'] || row['Class'] || '').toString().trim();
        const dayRaw = (row['Thứ'] || row['thứ'] || row['Day'] || '').toString().trim().toLowerCase();
        const sessionRaw = (row['Buổi'] || row['buổi'] || row['Session'] || '').toString().trim().toLowerCase();
        const periodRaw = parseInt(row['Tiết'] || row['tiết'] || row['Period'] || '0', 10);
        const subject = (row['Môn'] || row['môn'] || row['Subject'] || '').toString().trim();

        if (!className || !subject || !dayRaw || !sessionRaw || isNaN(periodRaw)) return;

        const day = DAY_MAP[dayRaw];
        const session = SESSION_MAP[sessionRaw];
        if (!day || !session || periodRaw < 1 || periodRaw > 6) return;

        if (!classMap.has(className)) {
            classMap.set(className, {
                className,
                grade: extractGradeFromClassName(className),
                effectiveDate: new Date().toISOString().split('T')[0],
                schedule: createEmptyWeekSchedule(),
                totalMorningSlots: 0,
                totalAfternoonSlots: 0,
                totalSlots: 0,
                subjects: [],
            });
        }

        const classItem = classMap.get(className)!;
        classItem.schedule[day][session].push({
            period: periodRaw,
            subject,
            teacherName: (row['GV'] || row['gv'] || '').toString().trim() || undefined,
            room: (row['Phòng'] || row['phòng'] || '').toString().trim() || undefined,
        });

        if (session === 'morning') classItem.totalMorningSlots++;
        else classItem.totalAfternoonSlots++;
        classItem.totalSlots++;

        if (!classItem.subjects.includes(subject)) classItem.subjects.push(subject);
        allSubjects.add(subject);
    });

    const sortedClasses = Array.from(classMap.values()).sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade;
        return a.className.localeCompare(b.className, 'vi', { numeric: true });
    });

    let totalSlots = 0;
    for (const c of sortedClasses) totalSlots += c.totalSlots;

    return {
        success: sortedClasses.length > 0,
        formatType: 'flat_list',
        metadata: {
            schoolName: '',
            semester: '1',
            academicYear: '2026-2027',
            effectiveDate: new Date().toISOString().split('T')[0],
        },
        classes: sortedClasses,
        totalClasses: sortedClasses.length,
        totalSlots,
        uniqueSubjects: Array.from(allSubjects).sort(),
        errors,
        warnings: [],
    };
}
