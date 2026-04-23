'use server';

import { db } from '@/services/db';
import { AttendanceRecord, AttendanceStatus, PeriodRecord, AppUser } from '@/types/models';
import { getCustomColumns } from '@/services/column-service';
import { getAllRecordsForColumn, getOneTimeRecords } from '@/services/record-service';
import { TermReportData } from '@/lib/export-utils';
import { markAttendance, markPresent } from '@/services/attendance-v3-service';
import { normalizeAttendanceRecord } from '@/services/attendance-v3-utils';
import { revalidatePath } from 'next/cache';
import { fetchAppSettings } from './settings';
import { getActiveStudents, getReportStudents } from '@/services/student-service';
import { getClassSize } from '@/services/student-status-service';
import { getCurrentUser, getAppUser } from '@/lib/supabase-server';
import { checkPermission } from '@/services/permission-service';
import { SYSTEM_MODE } from '@/config/system';

const compareVietnameseNames = (nameA: string, nameB: string) => {
    const a = (nameA || '').trim();
    const b = (nameB || '').trim();
    const partsA = a.split(' ');
    const partsB = b.split(' ');
    const lastNameA = partsA.pop() || '';
    const lastNameB = partsB.pop() || '';
    const cmp = lastNameA.localeCompare(lastNameB, 'vi', { sensitivity: 'base' });
    if (cmp !== 0) return cmp;
    return a.localeCompare(b, 'vi', { sensitivity: 'base' });
};

// User will be dynamically fetched via SSR Auth

export interface ExportData {
    className: string;
    students: {
        code: string;
        name: string;
        absences: Record<string, string>; // date (YYYY-MM-DD) -> status
    }[];
    year: number;
    month: number;
    startDate?: string;
    endDate?: string;
    totalStudents?: number;
}

export interface ReportCriteria {
    startDate: string;
    endDate: string;
    classIds?: string[];
    grade?: number; // Optional filter by grade
}

export interface AbsenceDetail {
    id: string; // unique key
    studentName: string;
    studentCode: string;
    className: string;
    classId: string;
    stt: number; // Student's index in class
    date: string;
    status: AttendanceStatus;
    notes?: string;
}

// --- Production Utils ---
const statusOrder = ['K', 'P', 'VP', 'T', 'KH'];

function resolveDailyStatus(rawItems: any[]) {
    if (!rawItems || rawItems.length === 0) return { labels: [], notes: '', stats: {} };

    // Grouping by base status for cross-session/period merging
    const grouped: Record<string, {
        periods: Set<number>;
        sessionPeriods: { S: Set<number>, C: Set<number> };
        notes: Record<number, string>;
    }> = {};

    const explodeNotes = (notes?: Record<number, string>, fallback?: string, p?: number | null) => {
        const res: Record<number, string> = { ...notes };
        if (res[0]) {
            const n = res[0];
            [1,2,3,4,5].forEach(i => { if (!res[i]) res[i] = n; });
            delete res[0];
        }
        if (Object.keys(res).length === 0 && fallback) {
            if (p) res[p] = fallback;
            else [1,2,3,4,5].forEach(i => { res[i] = fallback; });
        }
        return res;
    };

    rawItems.forEach(item => {
        let type = item.base as AttendanceStatus;
        
        // AUTO-MAP: Dữ liệu cũ (K + bổ sung phép) -> P để hiển thị đúng trong báo cáo
        const hasBổSungPhép = (item.note && item.note.includes('Có bổ sung Phép')) || 
                              (item.statusNotes && Object.values(item.statusNotes).some((v: any) => v && v.includes('Có bổ sung Phép')));

        if (type === 'K' && hasBổSungPhép) {
            type = 'P';
        }

        if (!grouped[type]) {
            grouped[type] = {
                periods: new Set(),
                sessionPeriods: { S: new Set(), C: new Set() },
                notes: {}
            };
        }
        const g = grouped[type];
        const sess = item.session === 'both' ? ['S', 'C'] : [item.session];
        const periods = item.periods || [1, 2, 3, 4, 5];
        
        periods.forEach((p: number) => {
            g.periods.add(p);
            sess.forEach(s => (g.sessionPeriods as any)[s].add(p));
        });

        // Merge notes
        const decoded = explodeNotes(item.statusNotes || item.violationNotes || item.rewardNotes, item.note, item.periods?.length === 1 ? item.periods[0] : null);
        Object.entries(decoded).forEach(([p, v]) => {
            const pk = Number(p);
            g.notes[pk] = g.notes[pk] && g.notes[pk] !== v ? `${g.notes[pk]}, ${v}` : v;
            // ĐỒNG BỘ: Nếu notes chứa tiết mà periods chưa có → bổ sung vào periods
            // Xử lý dữ liệu cũ (1 row DB chứa notes nhiều tiết nhưng period chỉ có 1 giá trị)
            if (pk >= 1 && pk <= 10 && v) {
                g.periods.add(pk);
                sess.forEach(s => (g.sessionPeriods as any)[s].add(pk));
            }
        });
    });

    const labels: string[] = [];
    const stats: Record<string, number> = {};

    // Helper: Build VPc1-5 style short codes
    const getShortCode = (type: string, g: any) => {
        const periods = Array.from(g.periods).sort((a: any, b: any) => a - b);
        const sPs = Array.from(g.sessionPeriods['S']).sort() as number[];
        const cPs = Array.from(g.sessionPeriods['C']).sort() as number[];
        
        let result = type;
        
        if (sPs.length > 0) {
            result += ' Sáng';
            if (sPs.length < 5) result += sPs.join('');
        }
        
        if (cPs.length > 0) {
            if (sPs.length > 0) result += ', Chiều';
            else result += ' Chiều';
            if (cPs.length < 5) result += cPs.join('');
        }

        // Nếu vắng cả ngày (10 tiết) thì chỉ hiện Mã (ví dụ "P", "K")
        if (periods.length >= 10) return type;

        return result;
    };

    // Helper: Build full Sáng T1: ... notes for Tooltip & Message
    const formatFullNotes = (notesMap: Record<number, string>, sessionPeriods: { S: Set<number>, C: Set<number> }) => {
        const notePs: Record<string, number[]> = {};
        Object.entries(notesMap).forEach(([p, v]) => {
            if (!v) return;
            if (!notePs[v]) notePs[v] = [];
            notePs[v].push(Number(p));
        });
        
        // Xác định buổi cho mỗi period
        const getSessionLabel = (period: number): string => {
            const inS = sessionPeriods.S.has(period);
            const inC = sessionPeriods.C.has(period);
            if (inS && !inC) return 'Sáng ';
            if (inC && !inS) return 'Chiều ';
            if (inS && inC) return ''; // Cả 2 buổi → bỏ prefix
            return '';
        };
        
        const parts: string[] = [];
        Object.entries(notePs).forEach(([noteText, periods]) => {
            const sorted = Array.from(new Set(periods)).sort((a,b) => a - b);
            if (sorted.length >= 5 && sorted.includes(1) && sorted.includes(5)) {
                // Vắng cả buổi → chỉ ghi note, thêm prefix buổi nếu rõ
                const sessionLabel = getSessionLabel(sorted[0]);
                parts.push(sessionLabel ? `${sessionLabel.trim()}: ${noteText}` : noteText);
            } else {
                const ranges: string[] = [];
                let start = sorted[0], prev = sorted[0];
                for (let i = 1; i <= sorted.length; i++) {
                    if (i < sorted.length && sorted[i] === prev + 1) prev = sorted[i];
                    else {
                        if (start === prev) ranges.push(`${start}`); else ranges.push(`${start}-${prev}`);
                        if (i < sorted.length) { start = sorted[i]; prev = sorted[i]; }
                    }
                }
                const sessionLabel = getSessionLabel(sorted[0]);
                parts.push(`${sessionLabel}T${ranges.join(',')}: ${noteText}`);
            }
        });
        return parts.join(", ");
    };

    statusOrder.forEach(type => {
        const g = grouped[type];
        if (!g) return;

        stats[type] = 1;
        const code = getShortCode(type, g);
        const detail = formatFullNotes(g.notes, g.sessionPeriods);
        const label = detail ? `${code} [${detail}]` : code;
        labels.push(label);
    });

    // DEBUG: Log kết quả gộp cho từng học sinh
    console.log(`[resolveDailyStatus] Result for student:`, { labels, stats });

    return {
        labels,
        notes: Array.from(new Set(rawItems.map(i => i.note).filter(Boolean))).join('; '),
        stats
    };
}

export interface ReportResult {
    totalP: number;
    totalK: number;
    totalV: number;
    totalT: number;
    totalVP: number;
    totalKH: number;
    absences: AbsenceDetail[];
    classSizes?: Record<string, number>;
}

// filterActiveStudentsForReport removed - logic moved to DB RPC getReportStudents

export async function getReports(criteria: ReportCriteria, userRole: string = 'teacher'): Promise<ReportResult> {
    console.log('=== GET REPORT CALLED ===', criteria, { userRole });
    console.time('getReports_Timer');
    const authUser = await getCurrentUser();
    if (!authUser) {
        console.error('[AUTH] No authUser found in getReports. Cookies:', { 
            count: require('next/headers').cookies().getAll().length,
            names: require('next/headers').cookies().getAll().map((c: any) => c.name)
        });
        throw new Error('Unauthorized: Vui lòng đăng nhập lại để tiếp tục.');
    }
    
    const appUser = await getAppUser(authUser.id, authUser.email);
    if (!appUser) {
        console.error('[AUTH] No appUser found for UID:', authUser.id);
        throw new Error('User profile not found: Không tìm thấy hồ sơ người dùng.');
    }
    console.log('[AUTH] Success', { userId: authUser.id, role: appUser.role });
    console.timeEnd('getReports_Timer');

    const canViewAll = checkPermission(appUser, 'VIEW_ALL_CLASSES');
    
    // VALIDATION: Quota Optimization
    const start = new Date(criteria.startDate);
    const end = new Date(criteria.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 31) {
        throw new Error(`Khoảng thời gian báo cáo quá dài (${diffDays} ngày). Vui lòng chọn tối đa 31 ngày để bảo vệ hệ thống.`);
    }

    const classCount = criteria.classIds?.length || 0;
    if (!canViewAll && classCount > 10) {
        throw new Error(`Bạn chỉ được phép chọn tối đa 10 lớp mỗi lần báo cáo. Bạn đã chọn ${classCount} lớp.`);
    }

    console.log(`[getReports] Validation passed: ${diffDays} days, ${classCount} classes.`);

    // 0. Get Settings
    const settingsRes = await fetchAppSettings();
    const appSettings = settingsRes.success ? settingsRes.settings : null;

    // 1. Get raw attendance records
    const records = await db.getReportData(criteria.startDate, criteria.endDate, criteria.classIds);
    console.log('[DEBUG_RECORDS] Raw records from DB:', JSON.stringify(records, null, 2));
    if (records.length > 0) {
        console.log('Sample record:', records[0]);
    }

    // 2. Fetch Class Info if needed (to map Class ID -> Name)
    // Optimization: Fetch all classes once and cache map
    const classes = await db.getClasses();
    const classMap = new Map(classes.map(c => [c.id, c.name]));

    // 3. Process Data
    const absences: AbsenceDetail[] = [];
    let totalP = 0, totalK = 0, totalV = 0, totalT = 0, totalVP = 0, totalKH = 0;
    const classSizes: Record<string, number> = {};

    // Map: classId -> studentCode -> date -> { items: [] }
    const mergedMap: Record<string, Record<string, Record<string, { items: any[] }>>> = {};

    // Phase 1: Group all raw status items by class -> student -> date
    // 1.1: Xây dựng Universal Mapping (ID -> Code) cho từng lớp
    const universalMap: Record<string, Record<string, string>> = {}; // classId -> { id -> code, name -> code }
    const studentInfoMap: Record<string, any> = {}; // code -> { name, stt }

    for (const classId of criteria.classIds || []) {
        if (!universalMap[classId]) universalMap[classId] = {};
        const studentsInClass = await db.getStudentsByClass(classId);
        studentsInClass.forEach((s, idx) => {
            if (s.code) {
                if (s.id) universalMap[classId][s.id] = s.code;
                universalMap[classId][s.code] = s.code; // code -> code
                studentInfoMap[s.code] = { name: s.fullName, stt: idx + 1 };
            }
        });
    }
    console.log('[DEBUG_MAPPING] Universal Map:', JSON.stringify(universalMap, null, 2));

    for (const rawRecord of records) {
        const record = rawRecord as any;
        const normRecord = normalizeAttendanceRecord(record);
        const classId = normRecord.classId || record.classId;
        const dateKey = normRecord.date || record.date || (record.timestamp ? record.timestamp.split('T')[0] : '');
        
        let rawSKey = normRecord.studentId || record.studentId || record.code;
        
        // BƯỚC QUAN TRỌNG: Dịch UUID/ID bất kỳ sang StudentCode (8A13_X)
        let studentKey = rawSKey;
        if (classId && rawSKey && universalMap[classId]?.[rawSKey]) {
            studentKey = universalMap[classId][rawSKey];
        }

        if (!classId || !dateKey || !studentKey) continue;

        if (!mergedMap[classId]) mergedMap[classId] = {};
        if (!mergedMap[classId][studentKey]) mergedMap[classId][studentKey] = {};
        if (!mergedMap[classId][studentKey][dateKey]) mergedMap[classId][studentKey][dateKey] = { items: [] };

        const targetItems = mergedMap[classId][studentKey][dateKey].items;

        if (record.absences) {
            // V1 logic
            Object.entries(record.absences).forEach(([code, status]) => {
                if (status && (status as any) !== 'C') {
                    targetItems.push({
                        base: (status as string).trim().toUpperCase(),
                        session: 'both',
                        periods: [1, 2, 3, 4, 5],
                        note: record.notes?.[code] || ''
                    });
                }
            });
        } else if (record.status || normRecord.status) {
            // V3 logic
            let s = normRecord.status as any;
            if (s === 'absent') s = 'K';
            else if (s === 'excused') s = 'P';
            else if (s === 'late') s = 'T';

            const session = normRecord.session === 'morning' ? 'S' : 'C';
            const periods = normRecord.missedPeriods && normRecord.missedPeriods.length > 0 
                ? normRecord.missedPeriods 
                : [1, 2, 3, 4, 5];

            if (s !== 'present' && s !== 'C' && s && s !== 'violation' && s !== 'reward') {
                targetItems.push({
                    base: s,
                    session,
                    periods,
                    note: normRecord.note || '',
                    statusNotes: normRecord.statusNotes || undefined,
                });
            }

            if (normRecord.violation) {
                targetItems.push({
                    base: 'VP',
                    session,
                    periods: normRecord.violationPeriods || periods,
                    note: normRecord.violationNote || normRecord.note || '',
                    violationNotes: normRecord.violationNotes || undefined,
                });
            }
            if (normRecord.reward) {
                targetItems.push({
                    base: 'KH',
                    session,
                    periods: normRecord.rewardPeriods || periods,
                    note: normRecord.rewardNote || normRecord.note || '',
                    rewardNotes: normRecord.rewardNotes || undefined,
                });
            }
        }
    }

    // Phase 2: Process each student/day to generate final AbsenceDetail
    for (const [classId, studentDates] of Object.entries(mergedMap)) {
        const className = classMap.get(classId) || classId;
        const classObj = classes.find(c => c.id === classId);
        
        // Cập nhật sỹ số
        classSizes[classId] = classObj ? getClassSize(classObj, appSettings) : 0;

        for (const [code, dates] of Object.entries(studentDates)) {
            // Lấy thông tin từ studentInfoMap đã gộp ở Phase 1
            const info = studentInfoMap[code] || { name: code, stt: 0 };
            
            for (const [date, data] of Object.entries(dates)) {
                const rawItems = data.items;
                if (!rawItems || rawItems.length === 0) continue;

                const resolved = resolveDailyStatus(rawItems);
                
                // Update overall stats
                Object.keys(resolved.stats).forEach(type => {
                    if (type === 'P') totalP++;
                    else if (type === 'K') totalK++;
                    else if (type === 'T') totalT++;
                    else if (type === 'VP') totalVP++;
                    else if (type === 'KH') totalKH++;
                });

                absences.push({
                    id: `${date}_${code}`,
                    date,
                    classId,
                    className,
                    studentCode: code,
                    studentName: info.name,
                    stt: info.stt,
                    status: resolved.labels.join('; ') as any,
                    notes: resolved.notes
                });
            }
        }
    }

    // Sort by Student Name A-Z (Tên -> Họ)
    absences.sort((a, b) => compareVietnameseNames(a.studentName, b.studentName));

    console.log(`[getReports] Processed ${absences.length} merged records. Totals: P=${totalP}, K=${totalK}, T=${totalT}, VP=${totalVP}, KH=${totalKH}`);
    console.timeEnd('getReports_Timer');

    return {
        totalP, totalK, totalV, totalT, totalVP, totalKH,
        absences,
        classSizes
    };
}

export async function getExcelExportData(
    startDate: string,
    endDate: string,
    classIds: string[],
    isCompact: boolean = false,
    userRole: string = 'teacher'
): Promise<ExportData[]> {
    console.log('=== GET EXCEL EXPORT CALLED ===', { startDate, endDate, classCount: classIds.length, userRole });
    
    const authUser = await getCurrentUser();
    if (!authUser) throw new Error('Unauthorized');
    const appUser = await getAppUser(authUser.id, authUser.email);
    if (!appUser) throw new Error('User profile not found');
    console.log('[AUTH]', { userId: authUser.id, role: appUser.role, systemMode: SYSTEM_MODE });

    const canExport = checkPermission(appUser, 'EXPORT_DATA');
    if (!canExport) {
        throw new Error('Access Denied: Bạn không có quyền xuất dữ liệu.');
    }
    const canViewAll = checkPermission(appUser, 'VIEW_ALL_CLASSES');
    
    // VALIDATION: Quota Optimization
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 31) {
        throw new Error(`Khoảng thời gian xuất báo cáo quá dài (${diffDays} ngày). Vui lòng chọn tối đa 31 ngày.`);
    }

    if (!canViewAll && classIds.length > 10) {
        throw new Error(`Bạn chỉ được phép xuất tối đa 10 lớp mỗi lần. Bạn đã chọn ${classIds.length} lớp.`);
    }
    // 0. Get Settings
    const settingsRes = await fetchAppSettings();
    const appSettings = settingsRes.success ? settingsRes.settings : null;

    // 1. Get raw attendance records
    const records = await db.getReportData(startDate, endDate, classIds);
    console.log(`[Excel] Records fetched: ${records.length}`);

    // 2. Fetch target classes
    const classesInfo = await db.getClasses();
    const targetClasses = classIds.length > 0
        ? classesInfo.filter(c => classIds.includes(c.id))
        : classesInfo;
    console.log(`[Excel] Target classes: ${targetClasses.length}`);

    const startD = new Date(startDate);
    const exportYear = startD.getFullYear();
    const exportMonth = startD.getMonth() + 1; // 1-12

    const result: ExportData[] = [];

    // Group records by class
    const recordsByClass: Record<string, any[]> = {};
    records.forEach(r => {
        if (!recordsByClass[r.classId]) recordsByClass[r.classId] = [];
        recordsByClass[r.classId].push(r);
    });

    for (const cls of targetClasses) {
        const students = await getReportStudents(cls.id, startDate, endDate);
        console.log(`[Excel] Class ${cls.name}: Students count: ${students.length}`);

        const classRecords = recordsByClass[cls.id] || [];
        const studentRawMap: Record<string, Record<string, any[]>> = {};

        // Phase 1: Collect raw records for this class
        classRecords.forEach((r: any) => {
            const dateStr = r.date || (r.timestamp ? r.timestamp.split('T')[0] : '');
            if (!dateStr) return;

            const processRecord = (code: string, rawItem: any) => {
                if (!studentRawMap[code]) studentRawMap[code] = {};
                if (!studentRawMap[code][dateStr]) studentRawMap[code][dateStr] = [];
                studentRawMap[code][dateStr].push(rawItem);
            };

            if (r.absences) {
                Object.entries(r.absences).forEach(([code, status]) => {
                    const st = (status as string).trim().toUpperCase();
                    if (st && st !== 'C' && st !== 'PRESENT') {
                        processRecord(code, { base: st, session: 'both', periods: [1,2,3,4,5], note: r.notes?.[code] || '' });
                    }
                });
            } else if (r.studentId && r.status) {
                const normRecord = normalizeAttendanceRecord(r);
                const code = normRecord.studentId;
                const session = normRecord.session === 'morning' ? 'S' : 'C';
                const periods = normRecord.missedPeriods && normRecord.missedPeriods.length > 0 ? normRecord.missedPeriods : [1,2,3,4,5];
                
                let s = normRecord.status as any;
                if (s === 'absent') s = 'K';
                else if (s === 'excused') s = 'P';
                else if (s === 'late') s = 'T';

                if (s !== 'present' && s !== 'C' && s && s !== 'violation' && s !== 'reward' && s !== 'VP' && s !== 'KH') {
                    processRecord(code, { base: s, session, periods, note: normRecord.note || '', statusNotes: normRecord.statusNotes || undefined });
                }
                if (normRecord.violation) {
                    processRecord(code, { base: 'VP', session, periods: normRecord.violationPeriods || periods, note: normRecord.violationNote || normRecord.note || '', violationNotes: normRecord.violationNotes || undefined });
                }
                if (normRecord.reward) {
                    processRecord(code, { base: 'KH', session, periods: normRecord.rewardPeriods || periods, note: normRecord.rewardNote || normRecord.note || '', rewardNotes: normRecord.rewardNotes || undefined });
                }
            }
        });

        // Phase 2: Resolve and Map
        const mappedStudents: { code: string; name: string; absences: Record<string, string> }[] = [];

        students.forEach((student: any) => {
            const absences: Record<string, string> = {};
            let hasPrimaryAbsence = false; // Only P or K count for "isCompact" filter
            const rawByDate = studentRawMap[student.code] || studentRawMap[student.id] || {};

            Object.keys(rawByDate).forEach(dateKey => {
                const resolved = resolveDailyStatus(rawByDate[dateKey]);
                absences[dateKey] = resolved.labels.join('; ');
                
                if (resolved.stats['P'] || resolved.stats['K']) {
                    hasPrimaryAbsence = true;
                }
            });

            if (!isCompact || (isCompact && hasPrimaryAbsence)) {
                mappedStudents.push({
                    code: student.code || student.student_code || student.id,
                    name: (student.fullName || student.name || student.full_name || student.studentName || student.code || "Học sinh").trim(),
                    absences
                });
            }
        });

        if (mappedStudents.length > 0) {
            result.push({
                className: cls.name,
                year: exportYear,
                month: exportMonth,
                startDate: startDate,
                endDate: endDate,
                totalStudents: getClassSize(cls, appSettings),
                students: mappedStudents.sort((a, b) => compareVietnameseNames(a.name, b.name))
            });
        }
    }

    // Sort by class name naturally (e.g. 6A1, 6A2, 6A10)
    result.sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));
    return result;
}

export async function getMonthlyReportData(classId: string, month: number, year: number) {
    // 0. Get Settings
    const settingsRes = await fetchAppSettings();
    const appSettings = settingsRes.success ? settingsRes.settings : null;

    // 1. Get Class Info
    const classes = await db.getClasses();
    const cls = classes.find(c => c.id === classId);
    if (!cls) throw new Error('Class not found');

    // 2. Get Students
    const reportStartDate = new Date(year, month - 1, 1).toISOString();
    // End of month
    const reportEndDate = new Date(year, month, 0).toISOString();
    const students = await getReportStudents(classId, reportStartDate, reportEndDate);

    // 3. Get Attendance Records for Month
    const records = await db.getMonthlyAttendance(classId, month, year);

    // 4. Map to Export Format
    // Format: date "YYYY-MM-DD" -> status
    // Phase 1: Collect raw records
    const studentRawMap: Record<string, Record<string, any[]>> = {};
    records.forEach((r: any) => {
        const dateStr = r.date || (r.timestamp ? r.timestamp.split('T')[0] : '');
        if (!dateStr) return;

        const processRecord = (code: string, rawItem: any) => {
            if (!studentRawMap[code]) studentRawMap[code] = {};
            if (!studentRawMap[code][dateStr]) studentRawMap[code][dateStr] = [];
            studentRawMap[code][dateStr].push(rawItem);
        };

        if (r.absences) {
            // V1
            Object.entries(r.absences).forEach(([code, status]) => {
                const st = (status as string).trim().toUpperCase();
                if (st && st !== 'C' && st !== 'PRESENT') {
                    processRecord(code, { base: st, session: 'both', periods: [1,2,3,4,5], note: r.notes?.[code] || '' });
                }
            });
        } else if (r.studentId && r.status) {
            // V3
            const normRecord = normalizeAttendanceRecord(r);
            const code = normRecord.studentId;
            const session = normRecord.session === 'morning' ? 'S' : 'C';
            const periods = normRecord.missedPeriods && normRecord.missedPeriods.length > 0 ? normRecord.missedPeriods : [1,2,3,4,5];
            
            let s = normRecord.status as any;
            if (s === 'absent') s = 'K';
            else if (s === 'excused') s = 'P';
            else if (s === 'late') s = 'T';

            if (s !== 'present' && s !== 'C' && s && s !== 'violation' && s !== 'reward' && s !== 'VP' && s !== 'KH') {
                processRecord(code, { base: s, session, periods, note: normRecord.note || '', statusNotes: normRecord.statusNotes || undefined });
            }
            if (normRecord.violation) {
                processRecord(code, { base: 'VP', session, periods: normRecord.violationPeriods || periods, note: normRecord.violationNote || normRecord.note || '', violationNotes: normRecord.violationNotes || undefined });
            }
            if (normRecord.reward) {
                processRecord(code, { base: 'KH', session, periods: normRecord.rewardPeriods || periods, note: normRecord.rewardNote || normRecord.note || '', rewardNotes: normRecord.rewardNotes || undefined });
            }
        }
    });

    // Phase 2: Resolve and Map students
    const studentData = students.map((s, idx) => {
        const absences: Record<string, string> = {};
        const rawByDate = studentRawMap[s.id] || {};
        
        Object.keys(rawByDate).forEach(dateKey => {
            const resolved = resolveDailyStatus(rawByDate[dateKey]);
            absences[dateKey] = resolved.labels.join(' | ');
        });

        return {
            stt: idx + 1,
            code: s.code,
            name: s.fullName,
            absences
        };
    });

    return {
        className: cls.name,
        year,
        month,
        totalStudents: getClassSize(cls, appSettings),
        students: studentData
    };
}


export async function getAdvancedReportData(
    startDate: string, 
    endDate: string, 
    classIds: string[], 
    userId?: string,
    userRole: string = 'teacher'
): Promise<TermReportData[]> {
    console.log('=== GET ADVANCED REPORT CALLED ===', { startDate, endDate, classCount: classIds.length, userRole });

    const authUser = await getCurrentUser();
    if (!authUser) throw new Error('Unauthorized');
    const appUser = await getAppUser(authUser.id, authUser.email);
    if (!appUser) throw new Error('User profile not found');
    console.log('[AUTH]', { userId: authUser.id, role: appUser.role, systemMode: SYSTEM_MODE });

    const canViewAll = checkPermission(appUser, 'VIEW_ALL_CLASSES');

    // VALIDATION: Quota Optimization
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 31) {
        throw new Error(`Khoảng thời gian báo cáo học kỳ quá dài (${diffDays} ngày). Vui lòng chọn tối đa 31 ngày.`);
    }

    if (!canViewAll && classIds.length > 10) {
        throw new Error(`Bạn chỉ được phép báo cáo học kỳ tối đa 10 lớp mỗi lần.`);
    }
    // 1. Get Classes
    const allClasses = await db.getClasses();
    const targetClasses = classIds.length > 0
        ? allClasses.filter(c => classIds.includes(c.id))
        : allClasses;

    const reports: TermReportData[] = [];

    for (const cls of targetClasses) {
        // 2. Get Students
        const students = await getReportStudents(cls.id, startDate, endDate);

        // 3. Get Custom Columns (Filtered by userId)
        const columns = await getCustomColumns(cls.id, userId);
        const reportColumns = columns.filter(c => !c.archived && (c.frequency === 'period' || c.frequency === 'one_time'))
            .map(c => ({
                id: c.id,
                name: c.name,
                frequency: c.frequency,
                subPeriods: c.subPeriods?.map(sp => sp.label)
            }));

        // 4. Get Data
        const data: Record<string, { stats: Record<string, number>; custom: Record<string, string> }> = {};
        students.forEach(s => {
            data[s.id] = { stats: {}, custom: {} };
        });

        const attendanceRecords = await db.getReportData(startDate, endDate, [cls.id]);
        const studentRawMap: Record<string, Record<string, any[]>> = {};

        attendanceRecords.forEach((r: any) => {
            const dateStr = r.date || (r.timestamp ? r.timestamp.split('T')[0] : '');
            if (!dateStr) return;
            
            const processRecord = (code: string, rawItem: any) => {
                if (!studentRawMap[code]) studentRawMap[code] = {};
                if (!studentRawMap[code][dateStr]) studentRawMap[code][dateStr] = [];
                studentRawMap[code][dateStr].push(rawItem);
            };

            if (r.absences) {
                Object.entries(r.absences).forEach(([code, status]) => {
                    const st = (status as string).trim().toUpperCase();
                    if (st && st !== 'C' && st !== 'PRESENT') {
                        processRecord(code, { base: st, session: 'both', periods: [1,2,3,4,5], note: r.notes?.[code] || '' });
                    }
                });
            } else if (r.studentId && r.status) {
                const normRecord = normalizeAttendanceRecord(r);
                const code = normRecord.studentId;
                const session = normRecord.session === 'morning' ? 'S' : 'C';
                const periods = normRecord.missedPeriods && normRecord.missedPeriods.length > 0 ? normRecord.missedPeriods : [1,2,3,4,5];
                
                let s = normRecord.status as any;
                if (s === 'absent') s = 'K';
                else if (s === 'excused') s = 'P';
                else if (s === 'late') s = 'T';

                if (s !== 'present' && s !== 'C' && s && s !== 'violation' && s !== 'reward' && s !== 'VP' && s !== 'KH') {
                    processRecord(code, { base: s, session, periods, note: normRecord.note || '', statusNotes: normRecord.statusNotes || undefined });
                }
                if (normRecord.violation) {
                    processRecord(code, { base: 'VP', session, periods: normRecord.violationPeriods || periods, note: normRecord.violationNote || normRecord.note || '', violationNotes: normRecord.violationNotes || undefined });
                }
                if (normRecord.reward) {
                    processRecord(code, { base: 'KH', session, periods: normRecord.rewardPeriods || periods, note: normRecord.rewardNote || normRecord.note || '', rewardNotes: normRecord.rewardNotes || undefined });
                }
            }
        });

        // 4.1 Process raw records with resolveDailyStatus
        students.forEach(s => {
            const rawByDate = studentRawMap[s.id] || {};
            const stats: Record<string, number> = { 'P': 0, 'K': 0, 'T': 0, 'VP': 0, 'KH': 0 };
            
            Object.keys(rawByDate).forEach(dateKey => {
                const resolved = resolveDailyStatus(rawByDate[dateKey]);
                // Increment stats based on resolved types
                Object.keys(resolved.stats).forEach(type => {
                    stats[type] = (stats[type] || 0) + 1;
                });
            });
            
            data[s.id].stats = stats;
        });

        // 4b. Get Custom Records
        for (const col of columns) {
            if (col.archived) continue;

            if (col.frequency === 'period') {
                const allR = await getAllRecordsForColumn(col.id, { startDate, endDate });
                const records = allR as PeriodRecord[];
                records.forEach(r => {
                    const student = students.find(s => s.code === r.studentCode); // periods use Code
                    if (student) {
                        // For Multi-Period, we might want to allow formatting
                        // But for Excel single cell, maybe join them? 
                        // Or if spreadsheet expects multiple columns?
                        // capture: "Sub1: Val, Sub2: Val"
                        const existing = data[student.id].custom[col.id] || '';
                        // Helper to append?
                        // Actually, let's just store Last Value or specialized formatter
                        // For simplicity in this version:
                        // If subPeriods exist, format as "Label: Value\nLabel2: Value"
                        // Or just "Value" if single.

                        let val = String(r.value);
                        if (col.subPeriods && col.subPeriods.length > 0) {
                            const sub = col.subPeriods.find(sp => sp.id === r.periodKey);
                            if (sub) {
                                val = `${sub.label}: ${val}`;
                                // Append if multiple
                                if (existing) val = `${existing}\n${val}`;
                            }
                        }

                        data[student.id].custom[col.id] = val;
                    }
                });
            } else if (col.frequency === 'one_time') {
                const records = await getOneTimeRecords(col.id);
                records.forEach(r => {
                    const student = students.find(s => s.code === r.studentCode);
                    if (student) {
                        const recStatus = r.status === 'done' ? 'Hoàn thành' : '';
                        data[student.id].custom[col.id] = recStatus;
                    }
                });
            }
        }

        reports.push({
            className: cls.name,
            students: students.map((s: any) => ({ 
                id: s.id, 
                code: s.code || s.student_code || s.id, 
                name: (s.fullName || s.name || s.full_name || s.studentName || s.code || "Học sinh").trim() 
            })),
            columns: reportColumns,
            data,
            timeRange: `${startDate} - ${endDate}`
        });
    }

    return reports;
}

// ===================================
// Phase 6: Quick Report Edit Actions
// ===================================

export async function updateReportAttendance(
    user: AppUser | null,
    classId: string,
    studentCode: string,
    studentName: string,
    dateStr: string,
    newStatus: AttendanceStatus | 'DELETE' | string
) {
    try {
        if (!user) return { success: false, message: "Vui lòng đăng nhập để thực hiện" };

        const dateObj = new Date(dateStr);

        if (newStatus === 'DELETE' || newStatus === 'C' || !newStatus) {
            // Remove exception record => fallback to default (Present)
            await markPresent(user, classId, studentCode, 'morning', null, dateObj);
        } else {
            // Map models AttendanceStatus to AttendanceStatusV3
            let v3Status = 'present';
            if (newStatus === 'K' || newStatus === 'absent') v3Status = 'absent';
            else if (newStatus === 'P' || newStatus === 'excused') v3Status = 'excused';
            else if (newStatus === 'T' || newStatus === 'late') v3Status = 'late';
            else if (newStatus === 'VP' || newStatus === 'violation') v3Status = 'violation';
            else if (newStatus === 'KH' || newStatus === 'praise') v3Status = 'praise';
            else v3Status = newStatus;

            // Update to a new exception status
            await markAttendance(user, {
                classId,
                studentId: studentCode,
                studentName,
                session: 'morning',
                period: null, // Full day Period
                status: v3Status as any // Map models AttendanceStatus to AttendanceStatusV3
            }, dateObj);
        }

        return { success: true };
    } catch (error: any) {
        console.error("updateReportAttendance Error:", error);
        return { success: false, message: error.message || "Lỗi khi cập nhật điểm danh." };
    }
}

export async function addReportAttendance(
    user: AppUser | null,
    classId: string,
    studentCode: string,
    studentName: string,
    dateStr: string,
    status: AttendanceStatus
) {
    // Add is practically the same logic as Update in V3
    return await updateReportAttendance(user, classId, studentCode, studentName, dateStr, status);
}
