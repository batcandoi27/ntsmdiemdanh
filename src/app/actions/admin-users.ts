'use server';

const isSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

import { UserRole, AppUser, DEFAULT_PERMISSIONS, DEFAULT_EDIT_WINDOW } from '@/types/models';

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
                await adminAuth.deleteUser(targetUid);
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

export async function adminCreateUser(input: any) {
    try {
        let uid = '';
        const email = input.email || (input.studentCode ? `${input.studentCode.toLowerCase()}@thcstbc.com` : '');
        if (!email) return { success: false, message: 'Thiếu email hoặc mã học sinh' };

        if (isSupabase) {
            // 1. Tạo auth user
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email,
                password: input.password,
                email_confirm: true,
            });
            if (error) return { success: false, message: 'Lỗi Supabase Auth: ' + error.message };
            uid = data.user.id;

            // 2. Tạo profile
            const { error: dbError } = await supabaseAdmin.from('profiles').insert({
                id: uid,
                email,
                full_name: input.displayName,
                role: input.role,
                student_code: input.studentCode || null,
                is_active: true
            });
            if (dbError) return { success: false, message: 'Lỗi tạo profile Supabase: ' + dbError.message };

            // 3. Gán lớp
            if (input.assignedClassIds && input.assignedClassIds.length > 0) {
                const assignments = input.assignedClassIds.map((cid: string) => ({
                    teacher_id: uid,
                    class_id: cid,
                    is_homeroom: false
                }));
                await supabaseAdmin.from('teacher_classes').insert(assignments);
            }
        } else {
            // Tạo bằng Firebase Admin
            try {
                const userRecord = await adminAuth.createUser({
                    email,
                    password: input.password,
                    displayName: input.displayName,
                });
                uid = userRecord.uid;
            } catch (err: any) {
                return { success: false, message: 'Lỗi Firebase Auth: ' + err.message };
            }

            const appUser: AppUser = {
                uid,
                displayName: input.displayName,
                role: input.role,
                assignedClassIds: input.assignedClassIds || [],
                permissions: { ...DEFAULT_PERMISSIONS[input.role as UserRole] },
                editWindowMinutes: DEFAULT_EDIT_WINDOW[input.role as UserRole],
                isActive: true,
                createdBy: input.createdBy,
                createdAt: new Date().toISOString(),
                email: input.email,
                studentCode: input.studentCode,
                assignedGrade: input.assignedGrade
            };

            await adminDb.doc(`schools/default/users/${uid}`).set(appUser);
        }

        revalidatePath('/settings');
        return { success: true, uid };
    } catch (e: any) {
        console.error('Error adminCreateUser:', e);
        return { success: false, message: 'Lỗi máy chủ: ' + e.message };
    }
}
