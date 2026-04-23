'use server';

import { AppUser, UserRole, DEFAULT_PERMISSIONS, DEFAULT_EDIT_WINDOW } from '@/types/models';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function setupRoleWithoutCode(
    uid: string,
    email: string,
    displayName: string,
    requestedRole: UserRole,
    assignedClassIds: string[] = [],       // Tất cả lớp (CN + BM cho GVCN, hoặc BM cho GVBM)
    homeroomClassId: string | null = null  // Lớp chủ nhiệm (chỉ GVCN)
) {
    try {
        const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (authError || !user) {
            return { success: false, message: 'Người dùng Supabase không hợp lệ hoặc chưa đăng nhập.' };
        }

        // Validate valid roles meant for registration
        const validRoles: UserRole[] = ['principal', 'supervisor', 'teacher', 'gvbm', 'class_monitor'];
        if (!validRoles.includes(requestedRole)) {
            return { success: false, message: 'Vai trò chọn không hợp lệ.' };
        }

        // 1. Kiểm tra profile hiện tại
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, is_active, role')
            .eq('email', email)
            .maybeSingle();

        const shouldBeActive = existingProfile?.is_active || requestedRole === 'admin' || requestedRole === 'principal';
        
        // 2. Upsert profile
        const { error: dbError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: uid,
                email,
                full_name: displayName,
                role: requestedRole,
                is_active: shouldBeActive
            }, { onConflict: 'id' });
        
        if (dbError) throw dbError;

        // 3. Tự động gán lớp (Logic mới)
        let classesToAssign = assignedClassIds;
        
        // Nếu là Giám thị -> Tự động lấy TẤT CẢ các lớp lẻ
        if (requestedRole === 'supervisor') {
            const { data: allClasses } = await supabaseAdmin.from('classes').select('id');
            if (allClasses) {
                classesToAssign = allClasses.map(c => c.id);
            }
        }

        // Gán vào bảng teacher_classes
        if (classesToAssign.length > 0) {
            // Xóa cũ (nếu có - trường hợp đăng ký lại)
            await supabaseAdmin.from('teacher_classes').delete().eq('teacher_id', uid);

            const assignments = classesToAssign.map(cid => ({
                teacher_id: uid,
                class_id: cid,
                is_homeroom: false // Mặc định là bộ môn, Admin sẽ chỉnh Homeroom sau nếu là GVCN
            }));

            const { error: assignError } = await supabaseAdmin
                .from('teacher_classes')
                .insert(assignments);
            
            if (assignError) console.error('[auth-setup] Lỗi gán lớp tự động:', assignError);
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
