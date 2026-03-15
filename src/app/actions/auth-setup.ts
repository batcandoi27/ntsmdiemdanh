'use server';

import { adminDb as db, adminAuth as auth } from '@/lib/firebase-admin';
import { AppUser, UserRole, DEFAULT_PERMISSIONS, DEFAULT_EDIT_WINDOW } from '@/types/models';
import { supabaseAdmin } from '@/lib/supabase-admin';

const isSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';

export async function setupRoleWithoutCode(
    uid: string,
    email: string,
    displayName: string,
    requestedRole: UserRole,
    assignedClassIds: string[] = [],       // Tất cả lớp (CN + BM cho GVCN, hoặc BM cho GVBM)
    homeroomClassId: string | null = null  // Lớp chủ nhiệm (chỉ GVCN)
) {
    try {
        // Sử dụng db và auth đã được khởi tạo từ @/lib/firebase-admin

        // 1. Verify user exists to prevent unauthorized calls
        if (isSupabase) {
            const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.getUserById(uid);
            if (authError || !user) {
                return { success: false, message: 'Người dùng Supabase không hợp lệ hoặc chưa đăng nhập.' };
            }
        } else {
            try {
                await auth.getUser(uid);
            } catch (error) {
                return { success: false, message: 'Người dùng Firebase không hợp lệ hoặc chưa đăng nhập.' };
            }
        }

        // 2. Validate valid roles meant for registration
        const validRoles: UserRole[] = ['principal', 'supervisor', 'teacher', 'gvbm', 'class_monitor'];
        if (!validRoles.includes(requestedRole)) {
            return { success: false, message: 'Vai trò chọn không hợp lệ.' };
        }

        // 3. Create AppUser Profile in Firestore with isActive = FALSE (Pending)
        const newUserProfile: AppUser = {
            uid,
            email,
            displayName,
            role: requestedRole,
            assignedClassIds: assignedClassIds,   // Lưu lớp đã chọn (Admin có thể chỉnh sau)
            permissions: DEFAULT_PERMISSIONS[requestedRole],
            editWindowMinutes: DEFAULT_EDIT_WINDOW[requestedRole],
            isActive: false, // BẮT BUỘC PENDING
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            // Lưu thêm lớp chủ nhiệm nếu là GVCN (Admin xác nhận sau)
            ...(homeroomClassId ? { homeroomClassId } : {}),
        };

        if (isSupabase) {
            // Kiểm tra xem profile đã tồn tại và đã active chưa
            const { data: existingProfile } = await supabaseAdmin
                .from('profiles')
                .select('is_active, role')
                .eq('email', email)
                .single();

            const shouldBeActive = existingProfile?.is_active || requestedRole === 'admin' || requestedRole === 'principal';

            // Update Supabase profiles table
            const { error: dbError } = await supabaseAdmin
                .from('profiles')
                .upsert({
                    id: uid,
                    email,
                    full_name: displayName,
                    role: requestedRole,
                    is_active: shouldBeActive // Giữ nguyên active nếu đã có hoặc là sếp
                }, { onConflict: 'email' });
            
            if (dbError) throw dbError;
        } else {
            // Update Firebase Firestore
            await db.doc(`users/${uid}`).set(newUserProfile);
        }

        return {
            success: true,
            message: `Đăng ký thành công! Tài khoản đang chờ Quản trị viên phê duyệt.`,
            role: requestedRole
        };

    } catch (error: any) {
        console.error('Error in setupRoleWithoutCode:', error);
        return { success: false, message: 'Đã xảy ra lỗi máy chủ khi thiết lập tài khoản. ' + error.message };
    }
}
