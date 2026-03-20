/**
 * Attendance Service v3.0
 *
 * Exception-only model: chỉ write records cho HS vắng/trễ/phép.
 * HS có mặt = mặc định, KHÔNG lưu → giảm ~93% Firestore writes.
 *
 * Supports:
 * - Cả buổi (period = null) – 99% use case
 * - Theo tiết (period = 1-5) – only khi cần thiết
 * - Sáng/Chiều sessions
 */

'use server';

import {
    doc, setDoc, deleteDoc, getDocs, getDoc,
    collection, query, where, writeBatch, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    AttendanceRecordV3, AttendanceStatusV3, AttendanceSummaryV3,
    buildRecordId, getAttendancePath, formatDateKey,
} from '@/types/attendance-v3';

const isSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Ưu tiên dùng Admin Client trên server để bypass RLS
const dbClient = (typeof window === 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;

export async function getSummaryPath(year: string, date: string): Promise<string> {
    return `schools/default/years/${year}/summaries`; // Standardized path for daily summaries
}
import { SessionType } from '@/types/timetable';
import { AppUser, Student, Class } from '@/types/models';
import { checkClassEditAccess, checkEditWindow, checkStudentActive } from './auth-guard';
import { getEffectiveStatus, isStudentAttendable } from './student-status-service';

import { DEFAULT_YEAR as ACTIVE_YEAR } from '@/config/constants';

// ============================================
// Types & Inputs
// ============================================

export interface MarkInput {
    classId: string;
    studentId: string;
    studentName: string;
    session: SessionType;
    period: number | null;
    status: AttendanceStatusV3;
    subject?: string;
    note?: string;
    missedPeriods?: number[];
    violation?: boolean;
    violationNote?: string;
    praise?: boolean;
    praiseNote?: string;
    reward?: boolean;
    rewardNote?: string;
    violationPeriods?: number[];
}

export interface BatchMarkInput {
    classId: string;
    session: SessionType;
    period: number | null;
    /** Map studentId → status. Chỉ bao gồm HS vắng/trễ/phép (không cần HS có mặt) */
    marks: {
        studentId: string;
        studentName: string;
        status: AttendanceStatusV3;
        note?: string;
        missedPeriods?: number[];
        violation?: boolean;
        violationNote?: string;
        violationPeriods?: number[];
        reward?: boolean;
        rewardNote?: string;
        rewardPeriods?: number[];
        statusNotes?: Record<number, string>;
        violationNotes?: Record<number, string>;
        rewardNotes?: Record<number, string>;
    }[];
}

// ============================================
// Core Logic
// ============================================

import { normalizeAttendanceRecord as normalizeInternal } from './attendance-v3-utils';

/**
 * Server Action wrapper cho hàm chuẩn hoá
 */
export async function normalizeAttendanceRecord(record: any): Promise<AttendanceRecordV3> {
    return normalizeInternal(record);
}

// ============================================
// Write Actions
// ============================================

/**
 * Đánh dấu HS vắng/trễ/phép (1 học sinh)
 */
export async function markAttendance(
    user: AppUser,
    input: MarkInput,
    date?: Date
): Promise<void> {
    checkClassEditAccess(user, input.classId);

    const dateKey = formatDateKey(date || new Date());
    const recordId = buildRecordId(input.classId, input.session, input.period, input.studentId);
    
    // Supabase Branch
    if (isSupabase) {
        try {
            const dateStr = dateKey;

            // 1. Lấy student_id từ code
            const { data: studentData } = await dbClient
                .from('students')
                .select('id')
                .eq('student_code', input.studentId)
                .maybeSingle();

            if (!studentData) return;

            // 2. Chuẩn hoá status code cho Supabase DB
            let statusCode = input.status as string;
            if (statusCode === 'absent') statusCode = 'K';
            else if (statusCode === 'excused') statusCode = 'P';
            else if (statusCode === 'late') statusCode = 'T';
            else if (statusCode === 'violation') statusCode = 'VP';
            else if (statusCode === 'praise') statusCode = 'KH';
            else if (statusCode === 'present') statusCode = 'C';

            // Exception-only: Nếu là 'present' (C) -> Xoá record
            if (statusCode === 'C') {
                let deleteQuery = dbClient
                    .from('attendance')
                    .delete()
                    .eq('student_id', studentData.id)
                    .eq('class_id', input.classId)
                    .eq('date', dateStr);
                
                if (input.session) deleteQuery = deleteQuery.eq('session', input.session);
                if (input.period !== undefined) deleteQuery = deleteQuery.eq('period', input.period);
                
                await deleteQuery;
                return;
            }

            const { data: statusData } = await dbClient
                .from('attendance_statuses')
                .select('id, type_id')
                .eq('code', statusCode)
                .maybeSingle();

            if (!statusData) return;

            const { error: upsertError } = await dbClient
                .from('attendance')
                .upsert({
                    student_id: studentData.id,
                    class_id: input.classId,
                    type_id: statusData.type_id,
                    status_id: statusData.id,
                    date: dateStr,
                    period: input.period,
                    session: input.session || 'morning',
                    note: input.note || input.violationNote || input.rewardNote || '',
                    marked_by: user.uid || (user as any).id || 'system'
                }, { onConflict: 'student_id, class_id, date, period, session' });

                if (upsertError) {
                    console.error('Supabase Upsert Error Details:', upsertError);
                    throw new Error(`Không thể lưu điểm danh vào Supabase: ${upsertError.message}`);
                }
                return;
            } catch (err) {
                console.error('Lỗi nghiêm trọng trong markAttendance (Supabase):', err);
                throw err;
            }
        }

    // Firebase Logic
    const path = getAttendancePath(ACTIVE_YEAR, dateKey);
    const recordRef = doc(db, path, recordId);

    const record: AttendanceRecordV3 = {
        id: recordId,
        classId: input.classId,
        studentId: input.studentId,
        studentName: input.studentName,
        session: input.session,
        period: input.period,
        status: input.status,
        subject: input.subject,
        note: input.note || input.violationNote || input.rewardNote,
        missedPeriods: input.missedPeriods,
        violation: input.violation,
        violationNote: input.violationNote,
        violationPeriods: input.violationPeriods,
        reward: input.reward || input.praise,
        rewardNote: input.rewardNote || input.praiseNote,
        markedBy: user.uid || (user as any).id || 'system',
        markedByName: user.displayName || '',
        markedByRole: user.role || 'teacher',
        timestamp: new Date().toISOString(),
    };

    Object.keys(record).forEach(key => (record as any)[key] === undefined && delete (record as any)[key]);
    if (record.period === undefined) record.period = null;

    const hasException = record.status !== 'present' || record.violation || record.reward;
    if (!hasException) {
        await deleteDoc(recordRef);
    } else {
        await setDoc(recordRef, record);
    }
}

/**
 * Xoá điểm danh (Đánh dấu có mặt)
 */
export async function markPresent(
    user: AppUser,
    classId: string,
    studentId: string,
    session: SessionType,
    period: number | null,
    date?: Date
): Promise<void> {
    checkClassEditAccess(user, classId);
    const dateKey = formatDateKey(date || new Date());

    if (isSupabase) {
        try {
            const { data: studentData } = await dbClient.from('students').select('id').eq('student_code', studentId).maybeSingle();
            if (studentData) {
                // Chỉ xóa record tương ứng với session và period nếu cần
                let deleteQuery = dbClient.from('attendance')
                    .delete()
                    .eq('student_id', studentData.id)
                    .eq('class_id', classId)
                    .eq('date', dateKey);
                
                if (session) deleteQuery = deleteQuery.eq('session', session);
                // Nếu period là null (cả buổi), ta có thể muốn giữ lại các record theo tiết nếu có? 
                // Nhưng thông thường đổi trạng thái trong báo cáo là đổi cho "cả buổi".
                // Để an toàn, nếu period được truyền vào, ta xóa chính xác record đó.
                if (period !== undefined) deleteQuery = deleteQuery.eq('period', period);
                
                const { error } = await deleteQuery;
                if (error) throw error;
            }
            return;
        } catch (err) {
            console.error('Lỗi markPresent (Supabase):', err);
        }
    } else if (db) {
        const recordId = buildRecordId(classId, session, period, studentId);
        const path = getAttendancePath(ACTIVE_YEAR, dateKey);
        await deleteDoc(doc(db, path, recordId));
    }
}

/**
 * Điểm danh nhanh cả lớp
 */
export async function batchMarkAttendance(
    user: AppUser,
    input: BatchMarkInput,
    allStudentIds: string[],
    date?: Date
): Promise<{ written: number; deleted: number }> {
    checkClassEditAccess(user, input.classId);
    const dateKey = formatDateKey(date || new Date());

    if (isSupabase) {
        try {
            const { data: students } = await dbClient.from('student_classes').select('student_id, students(student_code)').eq('class_id', input.classId);
            const codeToIdMap = new Map<string, string>();
            students?.forEach((s: any) => { if (s.students?.student_code) codeToIdMap.set(s.students.student_code, s.student_id); });

            const { data: statuses } = await dbClient.from('attendance_statuses').select('id, code, type_id');
            const statusCodeMap = new Map<string, { id: string, type_id: string }>();
            statuses?.forEach(s => statusCodeMap.set(s.code, { id: s.id, type_id: s.type_id }));

            // BỎ DELETE DIỆN RỘNG: Tránh mất dữ liệu khi Upsert lỗi.
            // Chúng ta sẽ xử lý xóa có chọn lọc sau.

            // 1. CHUẨN BỊ DỮ LIỆU INSERT & DANH SÁCH CẦN XÓA
            const inserts: any[] = [];
            const studentsToResetAttendance: string[] = [];
            const studentsToResetViolation: string[] = [];
            const studentsToResetReward: string[] = [];

            const dailyTypeId = statusCodeMap.get('K')?.type_id || statusCodeMap.get('P')?.type_id || statusCodeMap.get('T')?.type_id;
            const violationTypeId = statusCodeMap.get('VP')?.type_id;
            const rewardTypeId = statusCodeMap.get('KH')?.type_id;

            input.marks.forEach(m => {
                const sId = codeToIdMap.get(m.studentId);
                if (!sId) return;

                const createLine = (p: number | null, stId: string, typeId: string, n?: string) => ({
                    student_id: sId,
                    class_id: input.classId,
                    type_id: typeId,
                    status_id: stId,
                    date: dateKey,
                    period: p,
                    session: input.session || 'morning',
                    note: n || '',
                    marked_by: user.uid || (user as any).id || 'system'
                });

                const getNoteForPeriod = (p: number | null, mainNote?: string, notesMap?: Record<number, string>) => {
                    if (notesMap && p !== null) {
                        const note = (notesMap as any)[p] || (notesMap as any)[String(p)];
                        if (note) return note;
                    }
                    if (notesMap && (notesMap[0] || (notesMap as any)["0"])) {
                        return notesMap[0] || (notesMap as any)["0"];
                    }
                    return mainNote || '';
                };

                // --- A. XỬ LÝ CHUYÊN CẦN ---
                let statusCode = m.status as string;
                if (statusCode === 'absent') statusCode = 'K';
                else if (statusCode === 'excused') statusCode = 'P';
                else if (statusCode === 'late') statusCode = 'T';
                else if (statusCode === 'present') statusCode = 'C';

                if (['C', 'present', ''].includes(statusCode)) {
                    studentsToResetAttendance.push(sId);
                } else {
                    studentsToResetAttendance.push(sId);
                    const stData = statusCodeMap.get(statusCode);
                    if (stData) {
                        const periods = (m.missedPeriods && m.missedPeriods.length > 0) ? m.missedPeriods : [null as any];
                        periods.forEach(p => {
                            inserts.push(createLine(p, stData.id, stData.type_id, getNoteForPeriod(p, m.note, m.statusNotes)));
                        });
                    }
                }

                // --- B. XỬ LÝ VI PHẠM ---
                if (m.violation) {
                    studentsToResetViolation.push(sId);
                    const vpData = statusCodeMap.get('VP');
                    if (vpData) {
                        const vpPeriods = (m.violationPeriods && m.violationPeriods.length > 0) ? m.violationPeriods : [null as any];
                        vpPeriods.forEach(p => inserts.push(createLine(p, vpData.id, vpData.type_id, getNoteForPeriod(p, m.violationNote, m.violationNotes))));
                    }
                } else {
                    studentsToResetViolation.push(sId);
                }

                // --- C. XỬ LÝ KHEN THƯỞNG ---
                if (m.reward) {
                    studentsToResetReward.push(sId);
                    const khData = statusCodeMap.get('KH');
                    if (khData) {
                        const khPeriods = (m.rewardPeriods && m.rewardPeriods.length > 0) ? m.rewardPeriods : [null as any];
                        khPeriods.forEach(p => inserts.push(createLine(p, khData.id, khData.type_id, getNoteForPeriod(p, m.rewardNote, m.rewardNotes))));
                    }
                } else {
                    studentsToResetReward.push(sId);
                }
            });

            // 2. THỰC THI XÓA (Reset danh sách cũ để ghi mới)
            if (studentsToResetAttendance.length > 0 && dailyTypeId) {
                await dbClient.from('attendance').delete()
                    .in('student_id', studentsToResetAttendance)
                    .eq('type_id', dailyTypeId)
                    .eq('date', dateKey)
                    .eq('session', input.session);
            }
            if (studentsToResetViolation.length > 0 && violationTypeId) {
                await dbClient.from('attendance').delete()
                    .in('student_id', studentsToResetViolation)
                    .eq('type_id', violationTypeId)
                    .eq('date', dateKey)
                    .eq('session', input.session);
            }
            if (studentsToResetReward.length > 0 && rewardTypeId) {
                await dbClient.from('attendance').delete()
                    .in('student_id', studentsToResetReward)
                    .eq('type_id', rewardTypeId)
                    .eq('date', dateKey)
                    .eq('session', input.session);
            }

            // 3. THỰC THI UPSERT (Thêm mới)
            if (inserts.length > 0) {
                const { error: upsertError } = await dbClient.from('attendance').upsert(inserts as any, { 
                    onConflict: 'student_id, type_id, date, period, session' 
                });
                if (upsertError) {
                    console.error('Supabase Upsert Error:', upsertError);
                    throw new Error(`Lỗi PostgreSQL: ${upsertError.message}`);
                }
            }

            return { written: inserts.length, deleted: studentsToResetAttendance.length };
        } catch (err) {
            console.error('Lỗi nghiêm trọng trong batchMarkAttendance (Supabase):', err);
            throw err;
        }
    }

    const path = getAttendancePath(ACTIVE_YEAR, dateKey);
    const batch = writeBatch(db);
    let written = 0, deleted = 0;

    for (const mark of input.marks) {
        const recordId = buildRecordId(input.classId, input.session, input.period, mark.studentId);
        const recordRef = doc(db, path, recordId);
        const hasException = (mark.status && mark.status !== 'present') || mark.violation === true || mark.reward === true || (mark.note && mark.note.trim() !== '');

        if (hasException) {
            const record: AttendanceRecordV3 = {
                id: recordId, classId: input.classId, studentId: mark.studentId, studentName: mark.studentName,
                session: input.session, period: input.period, status: mark.status, note: mark.note || mark.violationNote || mark.rewardNote,
                markedBy: user.uid || (user as any).id || 'system',
                markedByName: user.displayName || '',
                markedByRole: user.role || 'teacher',
                timestamp: new Date().toISOString()
            };
            Object.keys(record).forEach(k => (record as any)[k] === undefined && delete (record as any)[k]);
            batch.set(recordRef, record);
            written++;
        } else {
            batch.delete(recordRef);
            deleted++;
        }
    }
    await batch.commit();
    return { written, deleted };
}

// ============================================
// Query Actions
// ============================================

/**
 * Lấy attendance records cho 1 lớp 1 ngày 1 buổi
 */
export async function getClassAttendance(
    classId: string,
    date: string,
    session?: SessionType
): Promise<AttendanceRecordV3[]> {
    if (isSupabase) {
        try {
            let q = dbClient.from('attendance').select('*')
                .eq('class_id', classId)
                .eq('date', date);

            if (session) q = q.eq('session', session);

            const { data, error } = await q;
            if (error || !data) return [];

            // Fetch extra info manually to map (due to broken DB relationship)
            const { data: students } = await dbClient.from('students').select('id, student_code, full_name');
            const { data: statuses } = await dbClient.from('attendance_statuses').select('id, code');
            
            const stuMap = new Map((students || []).map(s => [s.id, s as any]));
            const stMap = new Map((statuses || []).map(s => [s.id, s.code]));

            return data.map(r => {
                const stu = stuMap.get(r.student_id);
                const statusCode = stMap.get(r.status_id);
                
                return normalizeInternal({
                    id: r.id,
                    classId: r.class_id,
                    studentId: (stu as any)?.student_code || r.student_id,
                    studentName: (stu as any)?.full_name || '',
                    status: statusCode as any,
                    date: r.date,
                    period: r.period,
                    session: r.session,
                    note: r.note,
                    timestamp: r.created_at
                });
            });
        } catch (err) {
            console.error('Lỗi getClassAttendance (Supabase):', err);
            return [];
        }
    }

    const path = getAttendancePath(ACTIVE_YEAR, date);
    const ref = collection(db, path);
    let q = session ? query(ref, where('classId', '==', classId), where('session', '==', session)) : query(ref, where('classId', '==', classId));
    const snap = await getDocs(q);
    return snap.docs.map(d => normalizeInternal(d.data()));
}

/**
 * Lấy attendance records cho nhiều lớp cùng lúc (Key for Reports)
 */
export async function getAttendanceByClasses(
    date: string,
    classIds: string[],
    session?: SessionType
): Promise<AttendanceRecordV3[]> {
    if (!classIds || classIds.length === 0) return [];

    if (isSupabase) {
        try {
            let q = dbClient.from('attendance').select('*')
                .eq('date', date)
                .in('class_id', classIds);

            if (session) q = q.eq('session', session);

            const { data, error } = await q;
            if (error || !data) return [];

            // Manual mapping
            const { data: students } = await dbClient.from('students').select('id, student_code, full_name');
            const { data: statuses } = await dbClient.from('attendance_statuses').select('id, code');
            
            const stuMap = new Map((students || []).map(s => [s.id, s as any]));
            const stMap = new Map((statuses || []).map(s => [s.id, s.code]));

            return data.map(r => {
                const stu = stuMap.get(r.student_id);
                const statusCode = stMap.get(r.status_id);
                
                return normalizeInternal({
                    id: r.id,
                    classId: r.class_id,
                    studentId: (stu as any)?.student_code || r.student_id,
                    studentName: (stu as any)?.full_name || '',
                    status: statusCode as any,
                    date: r.date,
                    period: r.period,
                    session: r.session,
                    note: r.note,
                    timestamp: r.created_at
                });
            });
        } catch (err) {
            console.error('Lỗi getAttendanceByClasses (Supabase):', err);
            return [];
        }
    }

    // Firebase Chunked Query (max 30 classes)
    const path = getAttendancePath(ACTIVE_YEAR, date);
    const ref = collection(db, path);
    const chunks: string[][] = [];
    for (let i = 0; i < classIds.length; i += 30) chunks.push(classIds.slice(i, i + 30));

    const results: AttendanceRecordV3[] = [];
    for (const chunk of chunks) {
        let q = session ? query(ref, where('classId', 'in', chunk), where('session', '==', session)) : query(ref, where('classId', 'in', chunk));
        const snap = await getDocs(q);
        results.push(...snap.docs.map(d => normalizeInternal(d.data())));
    }
    return results;
}

/**
 * Tính toán Summary chuyên cần
 */
export async function calculateSummary(
    records: AttendanceRecordV3[], 
    classData: Class,
    session: SessionType
): Promise<AttendanceSummaryV3> {
    const sessionRecords = records.filter(r => r.session === session && r.period === null);
    const uniqueStudents = new Set(sessionRecords.map(r => r.studentId));
    let absentCount = 0, lateCount = 0, excusedCount = 0, violationCount = 0, rewardCount = 0;

    uniqueStudents.forEach(sid => {
        const studentRecords = sessionRecords.filter(r => r.studentId === sid);
        const normRecords = studentRecords.map(r => normalizeInternal(r));
        
        if (normRecords.some(r => r.status === 'absent')) absentCount++;
        else if (normRecords.some(r => r.status === 'excused')) excusedCount++;
        else if (normRecords.some(r => r.status === 'late')) lateCount++;
        
        if (normRecords.some(r => r.violation)) violationCount++;
        if (normRecords.some(r => r.reward)) rewardCount++;
    });

    const totalActive = classData.actualStudentCount || classData.totalStudents || 0;
    const presentCount = Math.max(0, totalActive - (absentCount + excusedCount));

    return { 
        classId: classData.id,
        date: records[0]?.date || '',
        session: session,
        totalStudents: classData.totalStudents || 0,
        activeStudents: totalActive,
        presentCount, 
        absentCount, 
        lateCount, 
        excusedCount,
        attendanceRate: totalActive > 0 ? (presentCount / totalActive) * 100 : 0,
        isComplete: true,
        records: records
    };
}

/**
 * Cập nhật Báo cáo tổng kết (Summaries)
 */
export async function updateDailySummary(classId: string, dateKey: string, session: SessionType): Promise<void> {
    if (isSupabase) {
        // TODO: Implement daily summary in Supabase
        return;
    }
    const records = await getClassAttendance(classId, dateKey, session);
    const classSnap = await getDoc(doc(db, `schools/default/years/${ACTIVE_YEAR}/classes`, classId));
    if (!classSnap.exists()) return;
    
    const summary = await calculateSummary(records, classSnap.data() as Class, session);
    const path = await getSummaryPath(ACTIVE_YEAR, dateKey);
    await setDoc(doc(db, path, `${classId}_${session}`), { ...summary, updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * Lấy Summaries cho nhiều lớp (Key for Principal/Admin Dashboard)
 */
export async function getAttendanceSummariesByClasses(
    date: string,
    classIds: string[],
    session?: SessionType
): Promise<AttendanceSummaryV3[]> {
    if (isSupabase) {
        // RPC get_attendance_summaries hoặc query tổng hợp dữ liệu
        // Tạm thời query records và tính toán nếu chưa có RPC
        const records = await getAttendanceByClasses(date, classIds, session);
        const summaries: AttendanceSummaryV3[] = [];
        // Group & Calculate...
        return summaries; 
    }

    const path = await getSummaryPath(ACTIVE_YEAR, date);
    const ref = collection(db, path);
    const snap = await getDocs(query(ref, where('classId', 'in', classIds.slice(0, 30))));
    return snap.docs.map(d => d.data() as AttendanceSummaryV3);
}
