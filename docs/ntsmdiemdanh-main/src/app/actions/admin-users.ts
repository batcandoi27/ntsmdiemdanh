'use server';

import { adminDb as db, adminAuth as auth } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

/**
 * Xoá tài khoản người dùng cả ở Firestore và Firebase Auth
 * CHỈ dành cho Admin
 */
export async function deleteUserAccount(targetUid: string) {
    try {
        // 1. Kiểm tra tham số
        if (!targetUid) {
            return { success: false, message: 'ID người dùng không hợp lệ.' };
        }

        // 2. Thực hiện xoá ở Firebase Auth
        try {
            await auth.deleteUser(targetUid);
        } catch (error: any) {
            // Nếu không tìm thấy user ở Auth thì vẫn tiếp tục xoá ở Firestore
            if (error.code !== 'auth/user-not-found') {
                console.error('Lỗi khi xoá User Auth:', error);
                return { success: false, message: 'Lỗi khi xoá tài khoản xác thực: ' + error.message };
            }
        }

        // 3. Thực hiện xoá ở Firestore (users/{uid})
        await db.doc(`users/${targetUid}`).delete();

        // 4. Làm mới cache trang settings
        revalidatePath('/settings');

        return {
            success: true,
            message: 'Tài khoản đã được xoá hoàn toàn khỏi hệ thống.'
        };

    } catch (error: any) {
        console.error('Lỗi trong deleteUserAccount:', error);
        return { success: false, message: 'Đã xảy ra lỗi máy chủ khi xoá tài khoản: ' + error.message };
    }
}
