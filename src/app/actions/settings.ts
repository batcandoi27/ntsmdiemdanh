'use server';

import { db } from '@/services/db';
import { revalidatePath } from 'next/cache';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase-admin';

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

export async function getRoleCodes() {
    try {
        initAdmin();
        const adminDb = getFirestore();
        const docSnap = await adminDb.doc('settings/app_config').get();
        if (docSnap.exists) {
            return { success: true, roleCodes: docSnap.data()?.roleCodes || {} };
        }
        return { success: true, roleCodes: {} };
    } catch (error) {
        console.error('Error fetching role codes:', error);
        return { success: false, roleCodes: {} };
    }
}

export async function saveRoleCodes(roleCodes: Record<string, string>, updaterRole: string) {
    if (updaterRole !== 'admin') {
        return { success: false, message: 'Chỉ Admin mới có quyền cập nhật mã phân quyền.' };
    }
    try {
        initAdmin();
        const adminDb = getFirestore();
        await adminDb.doc('settings/app_config').set({ roleCodes }, { merge: true });
        return { success: true, message: 'Đã lưu cấu hình Mã Phân Quyền thành công.' };
    } catch (error) {
        console.error('Error saving role codes:', error);
        return { success: false, message: 'Lỗi khi lưu mã phân quyền. Vui lòng thử lại.' };
    }
}

import { getUsersPaginated } from '@/services/user-service';

export async function loadUsersPaginated(pageSize: number, lastUid?: string) {
    try {
        const result = await getUsersPaginated(pageSize, lastUid);
        return { success: true, ...result };
    } catch (error) {
        console.error('Error loading users:', error);
        return { success: false, users: [], hasMore: false, message: 'Lỗi tải danh sách người dùng.' };
    }
}
