'use server';

const isSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Xoá tài khoản người dùng cả ở DB và Auth
 * CHỈ dành cho Admin
 */
export async function deleteUserAccount(targetUid: string) {
    try {
        // 1. Kiểm tra tham số
        if (!targetUid) {
            return { success: false, message: 'ID người dùng không hợp lệ.' };
        }

        if (isSupabase) {
            // 2. Thực hiện xoá ở Supabase Auth
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetUid);
            if (authError && (authError as any).status !== 404) {
                 return { success: false, message: 'Lỗi khi xoá tài khoản xác thực Supabase: ' + authError.message };
            }
            // 3. Thực hiện xoá ở profiles (RLS hoặc cascade sẽ lo, nhưng ta làm tường minh)
            await supabaseAdmin.from('profiles').delete().eq('id', targetUid);
        } else {
            // 2. Thực hiện xoá ở Firebase Auth
            try {
                await auth.deleteUser(targetUid);
            } catch (error: any) {
                if (error.code !== 'auth/user-not-found') {
                    console.error('Lỗi khi xoá User Auth:', error);
                    return { success: false, message: 'Lỗi khi xoá tài khoản xác thực: ' + error.message };
                }
            }
            // 3. Thực hiện xoá ở Firestore
            await adminDb.doc(`schools/default/users/${targetUid}`).delete();
        }

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
