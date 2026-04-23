'use server';

import { db } from '@/services/db';
import { AttendanceRecord, AttendanceStatus } from '@/types/models';
import { revalidatePath } from 'next/cache';

export async function submitAttendance(
    classId: string,
    date: string,
    absences: Record<string, AttendanceStatus>,
    notes?: Record<string, string>
) {
    try {
        const record: AttendanceRecord = {
            id: `${classId}_${date}`,
            classId,
            date,
            absences,
            notes,
            updatedBy: 'local-user', // Tạm thời
            updatedAt: new Date().toISOString(),
            syncStatus: 'synced'
        };

        await db.saveAttendance(record);

        revalidatePath(`/classes/${classId}`);
        revalidatePath('/reports');

        return { success: true, message: 'Đã lưu điểm danh!' };
    } catch (error) {
        console.error('Save attendance error:', error);
        return { success: false, message: 'Lỗi lưu dữ liệu' };
    }
}

export async function getAttendanceData(classId: string, date: string) {
    return await db.getAttendance(classId, date);
}
