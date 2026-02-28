'use server';

import { db } from '@/services/db';
import { batchMarkAttendance } from '@/services/attendance-v3-service';
import { SessionType } from '@/types/timetable';
import { AttendanceStatusV3 } from '@/types/attendance-v3';
import { AppUser } from '@/types/models';
import { getEffectiveStatus } from '@/services/student-status-service';

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

            const result = await batchMarkAttendance(
                mockAdminUser,
                {
                    classId: record.classId,
                    session: record.session,
                    period: null, // Default cả buổi
                    marks: record.studentsToUpdate
                },
                allStudentIds,
                new Date(record.date)
            );

            totalWritten += result.written;
            totalDeleted += result.deleted;
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
