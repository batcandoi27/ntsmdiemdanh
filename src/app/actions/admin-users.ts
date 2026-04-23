'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

import { UserRole, AppUser, DEFAULT_PERMISSIONS, DEFAULT_EDIT_WINDOW } from '@/types/models';

/**
 * Xoá tài khoản người dùng cả ở DB và Auth
 * CHỈ dành cho Admin
 */
export async function deleteUserAccount(targetUid: string) {
    try {
        if (!targetUid) {
            return { success: false, message: 'ID người dùng không hợp lệ.' };
        }

        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetUid);
        if (authError && (authError as any).status !== 404) {
             return { success: false, message: 'Lỗi khi xoá tài khoản xác thực Supabase: ' + authError.message };
        }
        
        await supabaseAdmin.from('profiles').delete().eq('id', targetUid);

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

export async function adminCreateUser(input: any) {
    try {
        let uid = '';
        const email = input.email || (input.studentCode ? `${input.studentCode.toLowerCase()}@thcstbc.com` : '');
        if (!email) return { success: false, message: 'Thiếu email hoặc mã học sinh' };

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: input.password,
            email_confirm: true,
        });
        if (error) return { success: false, message: 'Lỗi Supabase Auth: ' + error.message };
        uid = data.user.id;

        const { error: dbError } = await supabaseAdmin.from('profiles').insert({
            id: uid,
            email,
            full_name: input.displayName,
            role: input.role,
            student_code: input.studentCode || null,
            is_active: true
        });
        if (dbError) return { success: false, message: 'Lỗi tạo profile Supabase: ' + dbError.message };

        if (input.assignedClassIds && input.assignedClassIds.length > 0) {
            const assignments = input.assignedClassIds.map((cid: string) => ({
                teacher_id: uid,
                class_id: cid,
                is_homeroom: false
            }));
            await supabaseAdmin.from('teacher_classes').insert(assignments);
        }

        revalidatePath('/settings');
        return { success: true, uid };
    } catch (e: any) {
        console.error('Error adminCreateUser:', e);
        return { success: false, message: 'Lỗi máy chủ: ' + e.message };
    }
}

