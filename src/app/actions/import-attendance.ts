'use server';

import { adminDb } from '@/lib/firebase-admin';
import { SessionType } from '@/types/timetable';
import { AttendanceStatusV3, AttendanceRecordV3, buildRecordId, getAttendancePath, formatDateKey } from '@/types/attendance-v3';
import { AppUser, Student } from '@/types/models';
import { getEffectiveStatus } from '@/services/student-status-service';
import { db } from '@/services/db';
import { DEFAULT_YEAR } from '@/config/constants';
import { supabaseAdmin } from '@/lib/supabase-admin';

const isSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';

export interface ImportAttendanceRecord {
    date: string;
    session: SessionType;
    classId: string;
    studentsToUpdate: {
        studentId: string;
        studentName: string;
        status: AttendanceStatusV3;
        note: string;
        missedPeriods?: number[];
    }[];
}

// Mock admin user for server actions until full auth is implemented
const mockAdminUser: AppUser = {
    uid: 'admin-import',
    displayName: 'Import System',
    role: 'admin',
    assignedClassIds: [],
    permissions: {
        canEditAttendance: true,
        canEditStudentStatus: true,
        canCreateAccounts: true,
        canViewAllClasses: true,
        canExportData: true,
        canManageTimetable: true,
        canAccessAPI: true,
    },
    editWindowMinutes: -1,
    isActive: true,
    createdAt: new Date().toISOString()
};

function parseVietnameseDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    if (dateStr.includes('-')) return new Date(dateStr);
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            let year = parseInt(parts[2], 10);
            // Handle 2-digit years just in case
            if (year < 100) year += 2000;
            return new Date(year, month, day);
        }
    }
    return new Date(dateStr);
}

export async function processImportedAttendance(records: ImportAttendanceRecord[]) {
    try {
        let totalWritten = 0;
        let totalDeleted = 0;

        for (const record of records) {
            let allStudentIds: string[] = [];
            
            if (isSupabase) {
                // Supabase flow
                const classStudents = await db.getStudentsByClass(record.classId);
                const activeStudents = classStudents.filter(s => getEffectiveStatus(s) !== 'dropped_out' && getEffectiveStatus(s) !== 'suspended');
                allStudentIds = activeStudents.map(s => s.code);
            } else {
                // Firebase flow
                const studentsSnap = await adminDb.collection(`schools/default/years/${DEFAULT_YEAR}/classes/${record.classId}/students`).get();
                const classStudents = studentsSnap.docs.map(d => d.data() as Student);
                const activeStudents = classStudents.filter(s => getEffectiveStatus(s) !== 'dropped_out' && getEffectiveStatus(s) !== 'suspended');
                allStudentIds = activeStudents.map(s => s.code);
            }

            const attendanceDateKey = formatDateKey(parseVietnameseDate(record.date));
            const path = getAttendancePath(DEFAULT_YEAR, attendanceDateKey);
            
            if (isSupabase) {
                // Supabase Logic: Fetch necessary IDs first
                const { data: students } = await supabaseAdmin.from('student_classes').select('student_id, students(student_code)').eq('class_id', record.classId);
                const codeToIdMap = new Map<string, string>();
                students?.forEach((s: any) => { if (s.students?.student_code) codeToIdMap.set(s.students.student_code, s.student_id); });

                const { data: typeData } = await supabaseAdmin.from('attendance_types').select('id').limit(1).single();
                const { data: statuses } = await supabaseAdmin.from('attendance_statuses').select('id, code');
                const statusCodeToIdMap = new Map<string, string>();
                statuses?.forEach(s => statusCodeToIdMap.set(s.code, s.id));

                const markedIds = new Set(record.studentsToUpdate.map(m => m.studentId));

                // Clear old records for this session/day
                await supabaseAdmin.from('attendance').delete().eq('class_id', record.classId).eq('date', attendanceDateKey).eq('session', record.session);

                const inserts = record.studentsToUpdate.flatMap(mark => {
                    const sId = codeToIdMap.get(mark.studentId);
                    
                    // Nếu không có missedPeriods, mặc định là null (cả buổi)
                    const periods = (mark.missedPeriods && mark.missedPeriods.length > 0) 
                        ? mark.missedPeriods 
                        : [null];

                    return periods.map(p => {
                        let statusCode = mark.status as string;
                        if (statusCode === 'absent' || statusCode === 'K') statusCode = 'K';
                        else if (statusCode === 'excused' || statusCode === 'P') statusCode = 'P';
                        else if (statusCode === 'late' || statusCode === 'T') statusCode = 'T';
                        
                        const stId = statusCodeToIdMap.get(statusCode);
                        if (sId && stId) {
                            return {
                                student_id: sId,
                                class_id: record.classId,
                                type_id: typeData?.id,
                                status_id: stId,
                                date: attendanceDateKey,
                                session: record.session,
                                period: p,
                                note: mark.note || '',
                                marked_by: mockAdminUser.uid
                            };
                        }
                        return null;
                    });
                }).filter(i => i !== null);
                
                console.log(`[processImportedAttendance] Lớp ${record.classId}: Chuẩn bị lưu ${inserts.length} dòng dữ liệu tiết lẻ.`, inserts);

                if (inserts.length > 0) {
                    const { error } = await supabaseAdmin.from('attendance').insert(inserts);
                    if (error) throw error;
                    totalWritten += inserts.length;
                }
            } else {
                // Legacy Firebase Logic
                const batch = adminDb.batch();
                const markedIds = new Set(record.studentsToUpdate.map(m => m.studentId));

                for (const mark of record.studentsToUpdate) {
                    const recordId = buildRecordId(record.classId, record.session, null, mark.studentId);
                    const recordData: AttendanceRecordV3 = {
                        id: recordId,
                        classId: record.classId,
                        studentId: mark.studentId,
                        studentName: mark.studentName,
                        session: record.session,
                        period: null,
                        status: mark.status,
                        note: mark.note || '',
                        markedBy: mockAdminUser.uid,
                        markedByName: mockAdminUser.displayName,
                        markedByRole: mockAdminUser.role,
                        timestamp: new Date().toISOString(),
                    };
                    const docRef = adminDb.collection(path).doc(recordId);
                    batch.set(docRef, recordData);
                    totalWritten++;
                }

                for (const studentId of allStudentIds) {
                    if (!markedIds.has(studentId)) {
                        const recordId = buildRecordId(record.classId, record.session, null, studentId);
                        const docRef = adminDb.collection(path).doc(recordId);
                        batch.delete(docRef);
                        totalDeleted++;
                    }
                }
                await batch.commit();
            }
        }

        return {
            success: true,
            message: `Import thành công. Đã ghi ${totalWritten} bản ghi.`,
            stats: { written: totalWritten, deleted: totalDeleted }
        };
    } catch (error: any) {
        console.error('Import attendance error:', error);
        return { success: false, message: error.message || 'Lỗi server khi lưu dữ liệu import.' };
    }
}

export async function getStudentsForClasses(classIds: string[]) {
    try {
        const result: Record<string, any[]> = {};
        for (const classId of classIds) {
            const classStudents = await db.getStudentsByClass(classId);
            const activeStudents = classStudents.filter(s => getEffectiveStatus(s) !== 'dropped_out' && getEffectiveStatus(s) !== 'suspended');
            result[classId] = activeStudents;
        }
        return { success: true, data: result };
    } catch (error: any) {
        console.error('getStudentsForClasses error:', error);
        return { success: false, message: error.message };
    }
}
