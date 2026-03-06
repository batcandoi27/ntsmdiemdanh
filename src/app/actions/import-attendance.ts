'use server';

import { adminDb } from '@/lib/firebase-admin';
import { SessionType } from '@/types/timetable';
import { AttendanceStatusV3, AttendanceRecordV3, buildRecordId, getAttendancePath, formatDateKey } from '@/types/attendance-v3';
import { AppUser } from '@/types/models';
import { getEffectiveStatus } from '@/services/student-status-service';
import { db } from '@/services/db';
import { DEFAULT_YEAR } from '@/config/constants';

export interface ImportAttendanceRecord {
    date: string;
    session: SessionType;
    classId: string;
    studentsToUpdate: {
        studentId: string;
        studentName: string;
        status: AttendanceStatusV3;
        note: string;
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

export async function processImportedAttendance(records: ImportAttendanceRecord[]) {
    try {
        let totalWritten = 0;
        let totalDeleted = 0;

        for (const record of records) {
            // Get all students for the class to support deleting records if they are now present
            const classStudents = await db.getStudentsByClass(record.classId);
            const activeStudents = classStudents.filter(s => getEffectiveStatus(s) !== 'dropped_out' && getEffectiveStatus(s) !== 'suspended');
            const allStudentIds = activeStudents.map(s => s.code);

            const attendanceDateKey = formatDateKey(new Date(record.date));
            const path = getAttendancePath(DEFAULT_YEAR, attendanceDateKey);
            const batch = adminDb.batch();

            const markedIds = new Set(record.studentsToUpdate.map(m => m.studentId));

            // 1. Write exception records
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

            // 2. Delete old records for students now marked as present
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
