'use server';

import { db } from '@/services/db';
import { revalidatePath } from 'next/cache';

export async function generateMockData(startDate: string, endDate: string, classIds: string[]) {
    try {
        await db.mockGenerateAttendance(startDate, endDate, classIds);
        revalidatePath('/reports');
        return { success: true, message: 'Đã tạo dữ liệu giả lập thành công!' };
    } catch (error) {
        console.error(error);
        return { success: false, message: 'Lỗi khi tạo dữ liệu giả lập.' };
    }
}

export async function clearAttendance(startDate?: string, endDate?: string, classIds?: string[]) {
    try {
        await db.clearAttendanceData(startDate, endDate, classIds);
        revalidatePath('/reports');
        revalidatePath('/attendance');
        return { success: true, message: 'Đã xóa dữ liệu điểm danh thành công!' };
    } catch (error) {
        console.error(error);
        return { success: false, message: 'Lỗi khi xóa dữ liệu.' };
    }
}
