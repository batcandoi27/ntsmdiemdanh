/**
 * User Service – CRUD user accounts trong Supabase
 *
 * Quản lý tạo/sửa/xoá tài khoản cho 5 roles.
 * Ban Cán Sự Lớp dùng mã HS làm username (converted → email pattern).
 */

import {
    DEFAULT_PERMISSIONS,
    DEFAULT_EDIT_WINDOW,
    UserRole,
    AppUser,
    BankInfo,
} from '@/types/models';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Ưu tiên dùng Admin Client trên server để bypass RLS
const dbClient = (typeof window === 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;

// ============================================
// Helpers
// ============================================

export function studentCodeToEmail(studentCode: string): string {
    if (!studentCode) return '';
    // Giả định pattern cũ: mã hs + @thcstbc.com
    return `${studentCode.toLowerCase()}@thcstbc.com`;
}

// ============================================
// Create User
// ============================================

interface CreateUserInput {
    email?: string;                 // GV dùng email
    studentCode?: string;           // BCS dùng mã HS
    password: string;
    displayName: string;
    role: UserRole;
    assignedClassIds: string[];
    assignedGrade?: string;
    createdBy: string;              // UID admin/principal
}

/**
 * Tạo tài khoản mới (Supabase Auth + profiles table)
 *
 * Sử dụng Supabase Admin Client để tạo user phía server.
 */
export async function createUser(input: CreateUserInput): Promise<AppUser> {
    const email = input.email || studentCodeToEmail(input.studentCode || '');

    if (!email) {
        throw new Error('Phải có email hoặc mã học sinh.');
    }

    let uid = '';

    // Tạo account qua Admin API nếu là server, nếu không lỗi sẽ xảy ra do signUp auto login
    if (typeof window === 'undefined' && supabaseAdmin) {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: input.password,
            email_confirm: true
        });
        if (error) throw error;
        uid = data.user.id;
    } else {
        throw new Error("Không thể tạo user từ client. Vui lòng gọi qua Server Action.");
    }

    // Cập nhật profile (vì trigger ở DB có thể đã tạo profile trống từ auth.user)
    const { error: profileError } = await dbClient
        .from('profiles')
        .upsert({
            id: uid,
            full_name: input.displayName,
            role: input.role,
            is_active: true,
            student_code: input.studentCode || null,
            email: input.email || null
        }, { onConflict: 'id' });
    
    if (profileError) throw profileError;

    if (input.assignedClassIds && input.assignedClassIds.length > 0) {
        const newAssignments = input.assignedClassIds.map(classId => ({
            teacher_id: uid,
            class_id: classId,
            is_homeroom: false
        }));
        await dbClient.from('teacher_classes').upsert(newAssignments);
    }

    return {
        uid,
        email: email,
        displayName: input.displayName,
        role: input.role,
        assignedClassIds: input.assignedClassIds,
        permissions: { ...DEFAULT_PERMISSIONS[input.role] },
        editWindowMinutes: DEFAULT_EDIT_WINDOW[input.role],
        isActive: true,
        createdBy: input.createdBy,
        createdAt: new Date().toISOString(),
    };
}

// ============================================
// Read Users
// ============================================

export async function getUser(uid: string): Promise<AppUser | null> {
    const { data, error } = await dbClient
        .from('profiles')
        .select('*, teacher_classes(class_id)')
        .eq('id', uid)
        .single();
    if (error || !data) return null;
    return {
        uid: data.id,
        displayName: data.full_name,
        role: data.role,
        assignedClassIds: (data.teacher_classes || []).map((tc: any) => tc.class_id),
        permissions: DEFAULT_PERMISSIONS[data.role as UserRole] || DEFAULT_PERMISSIONS.teacher,
        isActive: data.is_active,
        studentCode: data.student_code
    } as AppUser;
}

export async function getUserProfileByEmail(email: string): Promise<AppUser | null> {
    const { data, error } = await dbClient
        .from('profiles')
        .select('*, teacher_classes(class_id)')
        .eq('email', email)
        .maybeSingle();
    if (error || !data) return null;
    return {
        uid: data.id,
        displayName: data.full_name || data.email || 'Người dùng mới',
        email: data.email,
        role: data.role,
        isActive: data.is_active,
        studentCode: data.student_code,
        assignedClassIds: (data.teacher_classes || []).map((tc: any) => tc.class_id),
        permissions: DEFAULT_PERMISSIONS[data.role as UserRole] || DEFAULT_PERMISSIONS.teacher
    } as AppUser;
}

export async function getUsersByRole(role: UserRole): Promise<AppUser[]> {
    const { data, error } = await dbClient.from('profiles').select('*').eq('role', role);
    if (error) return [];
    return data.map(d => ({
        uid: d.id,
        displayName: d.full_name,
        role: d.role,
        isActive: d.is_active,
        studentCode: d.student_code
    } as AppUser));
}

export async function getAllUsers(): Promise<AppUser[]> {
    const { data, error } = await dbClient.from('profiles').select('*');
    if (error) return [];
    return data.map(d => ({
        uid: d.id,
        displayName: d.full_name,
        role: d.role,
        isActive: d.is_active,
        studentCode: d.student_code
    } as AppUser));
}

export async function getUsersPaginated(pageSize: number = 20, lastDocUid?: string): Promise<{ users: AppUser[], hasMore: boolean }> {
    let query = dbClient
        .from('profiles')
        .select('*, teacher_classes(class_id)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(pageSize + 1);

    if (lastDocUid) {
        const { data: lastUser } = await dbClient.from('profiles').select('created_at').eq('id', lastDocUid).single();
        if (lastUser) {
            query = query.lt('created_at', lastUser.created_at);
        }
    }

    const { data, error } = await query;
    if (error) throw error;

    const users = (data || []).map(d => ({
        uid: d.id,
        displayName: d.full_name || d.email || d.student_code || 'Người dùng mới',
        email: d.email,
        studentCode: d.student_code,
        role: d.role,
        assignedClassIds: (d.teacher_classes || []).map((tc: any) => tc.class_id),
        permissions: DEFAULT_PERMISSIONS[d.role as UserRole] || DEFAULT_PERMISSIONS.teacher,
        isActive: d.is_active,
        createdAt: d.created_at
    } as AppUser));

    const hasMore = users.length > pageSize;
    if (hasMore) users.pop();

    return { users, hasMore };
}

export async function getUsersForClass(classId: string): Promise<AppUser[]> {
    const { data, error } = await dbClient
        .from('teacher_classes')
        .select('profiles(*)')
        .eq('class_id', classId);
    if (error || !data) return [];
    
    return data.map((d: any) => ({
        uid: d.profiles.id,
        displayName: d.profiles.full_name,
        role: d.profiles.role,
        isActive: d.profiles.is_active,
        studentCode: d.profiles.student_code
    } as AppUser));
}

// ============================================
// Update User
// ============================================

export async function updateUser(uid: string, data: Partial<AppUser>): Promise<void> {
    // Không cho phép thay đổi uid
    const { uid: _uid, ...updateData } = data;

    // Fix bug Phân quyền: Nếu role bị thay đổi, lập tức cập nhật lại bộ Quyền hạn (permissions) tương ứng.
    if (updateData.role) {
        if (!updateData.permissions) {
            updateData.permissions = { ...DEFAULT_PERMISSIONS[updateData.role] };
        }
        if (updateData.editWindowMinutes === undefined) {
            updateData.editWindowMinutes = DEFAULT_EDIT_WINDOW[updateData.role];
        }
    }

    console.log('[UserService] updateUser:', { uid, updateData });
    
    // 1. Cập nhật thông tin profile
    const updatePayload: Record<string, any> = {
        full_name: updateData.displayName,
        role: updateData.role,
        is_active: updateData.isActive,
        student_code: updateData.studentCode
    };

    if (updateData.bankInfo !== undefined) {
        updatePayload.bank_info = updateData.bankInfo;
    }

    const { error: profileError } = await dbClient
        .from('profiles')
        .update(updatePayload)
        .eq('id', uid);
    
    if (profileError) throw profileError;

    // 2. Cập nhật phân công lớp học (teacher_classes) nếu có gửi lên
    if (updateData.assignedClassIds !== undefined) {
        // Xóa phân công cũ
        const { error: deleteError } = await dbClient
            .from('teacher_classes')
            .delete()
            .eq('teacher_id', uid);
        
        if (deleteError) throw deleteError;

        // Thêm phân công mới
        if (updateData.assignedClassIds.length > 0) {
            const newAssignments = updateData.assignedClassIds.map(classId => ({
                teacher_id: uid,
                class_id: classId,
                is_homeroom: false // Cần logic xác định lớp chủ nhiệm nếu cần chi tiết hơn
            }));

            const { error: insertError } = await dbClient
                .from('teacher_classes')
                .insert(newAssignments);
            
            if (insertError) throw insertError;
        }
    }
}

export async function assignClassesToUser(uid: string, classIds: string[]): Promise<void> {
    await dbClient.from('teacher_classes').delete().eq('teacher_id', uid);
    if (classIds.length > 0) {
        const newAssignments = classIds.map(classId => ({
            teacher_id: uid,
            class_id: classId,
            is_homeroom: false
        }));
        await dbClient.from('teacher_classes').insert(newAssignments);
    }
}

export async function deactivateUser(uid: string): Promise<void> {
    console.log('[UserService] Đang vô hiệu hoá user:', uid);
    const { data, error, status } = await dbClient.from('profiles').update({ is_active: false }).eq('id', uid).select();
    console.log('[UserService] Kết quả Supabase Deactivate:', { data, error, status });
    if (error) throw error;
}

export async function activateUser(uid: string): Promise<void> {
    console.log('[UserService] Đang kích hoạt user:', uid);
    const { data, error, status } = await dbClient.from('profiles').update({ is_active: true }).eq('id', uid).select();
    console.log('[UserService] Kết quả Supabase Activate:', { data, error, status });
    if (error) throw error;
}

// ============================================
// Reset Password (Admin resets for user)
// ============================================

/**
 * Reset password cho user đang log in.
 */
export async function resetUserPassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
}

// ============================================
// Delete User (soft delete)
// ============================================

export async function deleteUser(uid: string): Promise<void> {
    // Soft delete: chỉ deactivate
    await deactivateUser(uid);
}

// Hard delete (admin only, hiếm dùng)
export async function hardDeleteUser(uid: string): Promise<void> {
    await dbClient.from('profiles').delete().eq('id', uid);
    if (typeof window === 'undefined' && supabaseAdmin) {
       await supabaseAdmin.auth.admin.deleteUser(uid);
    }
}

// ============================================
// Auto Generate Accounts (Batch Operations)
// ============================================

export async function batchCreateAccounts(
    classes: { id: string, name: string, grade: number }[],
    adminUid: string,
    onProgress: (msg: string) => void
): Promise<void> {
    const defaultPassword = 'password123';

    // Validate if classes exist
    if (!classes || classes.length === 0) {
        throw new Error("Không có dữ liệu lớp học để tạo tài khoản.");
    }

    onProgress(`Bắt đầu tạo tài khoản cho ${classes.length} lớp...`);

    // 1. Create Supervisors (Giám thị) per grade
    const grades = Array.from(new Set(classes.map(c => c.grade)));
    for (const grade of grades) {
        const email = `giamthi${grade}@school.edu`.toLowerCase();
        try {
            await createUser({
                email,
                password: defaultPassword,
                displayName: `Giám Thị Khối ${grade}`,
                role: 'supervisor',
                assignedClassIds: [],
                assignedGrade: grade.toString(), // They monitor the whole grade
                createdBy: adminUid
            });
            onProgress(`✅ Đã tạo Giám thị khối ${grade} (${email})`);
        } catch (error: any) {
            // Check Supabase error or duplicate
            if (error?.message?.toLowerCase().includes('already') || error?.status === 422) {
                onProgress(`⚠️ Giám thị khối ${grade} có thể đã tồn tại, bỏ qua.`);
            } else {
                onProgress(`❌ Lỗi tạo Giám thị khối ${grade}: ${error.message || 'Unknown'}`);
            }
        }
    }

    // 2. Create Teachers & Class Monitors per class
    for (const cls of classes) {
        // Teacher
        const teacherEmail = `gv${cls.name.toLowerCase()}@school.edu`;
        try {
            await createUser({
                email: teacherEmail,
                password: defaultPassword,
                displayName: `GVCN Lớp ${cls.name}`,
                role: 'teacher',
                assignedClassIds: [cls.id],
                createdBy: adminUid
            });
            onProgress(`✅ Đã tạo GVCN lớp ${cls.name} (${teacherEmail})`);
        } catch (error: any) {
            if (error?.message?.toLowerCase().includes('already') || error?.status === 422) {
                onProgress(`⚠️ GVCN lớp ${cls.name} có thể đã tồn tại, bỏ qua.`);
            } else {
                onProgress(`❌ Lỗi tạo GVCN lớp ${cls.name}: ${error.message || 'Unknown'}`);
            }
        }

        // Class Monitor (Lớp trưởng)
        const monitorCode = `${cls.id}_1`; // Assuming STT 1 is the monitor
        try {
            await createUser({
                studentCode: monitorCode,
                password: defaultPassword,
                displayName: `Lớp Trưởng ${cls.name}`,
                role: 'class_monitor',
                assignedClassIds: [cls.id],
                createdBy: adminUid
            });
            onProgress(`✅ Đã tạo Cán sự lớp ${cls.name} (${monitorCode})`);
        } catch (error: any) {
            if (error?.message?.toLowerCase().includes('already') || error?.status === 422) {
                onProgress(`⚠️ Cán sự lớp ${cls.name} có thể đã tồn tại, bỏ qua.`);
            } else {
                onProgress(`❌ Lỗi tạo Cán sự lớp ${cls.name}: ${error.message || 'Unknown'}`);
            }
        }
    }

    onProgress("Hoàn tất quá trình tạo tài khoản hàng loạt.");
}

// ============================================
// Bank Information Management (STK Ngân Hàng)
// ============================================

/**
 * Lấy cấu hình STK nhận tiền cá nhân/quỹ lớp của giáo viên
 */
export async function getUserBankInfo(uid: string): Promise<BankInfo | null> {
    const { data, error } = await dbClient
        .from('profiles')
        .select('bank_info')
        .eq('id', uid)
        .maybeSingle();

    if (error || !data || !data.bank_info) return null;
    return data.bank_info as BankInfo;
}

/**
 * Cập nhật cấu hình STK nhận tiền cá nhân/quỹ lớp của giáo viên
 */
export async function updateUserBankInfo(uid: string, bankInfo: BankInfo): Promise<void> {
    const { error } = await dbClient
        .from('profiles')
        .update({ bank_info: bankInfo })
        .eq('id', uid);

    if (error) {
        console.error('Error updating user bank info:', error);
        throw error;
    }
}

/**
 * Lấy cấu hình STK Chung Toàn Trường (Admin Setting)
 */
export async function getSchoolBankInfo(): Promise<BankInfo | null> {
    const { data, error } = await dbClient
        .from('settings')
        .select('value')
        .eq('key', 'school_bank_account')
        .maybeSingle();

    if (error || !data || !data.value) return null;
    return data.value as BankInfo;
}

/**
 * Cập nhật cấu hình STK Chung Toàn Trường (Admin Setting)
 */
export async function saveSchoolBankInfo(bankInfo: BankInfo): Promise<void> {
    const { error } = await dbClient
        .from('settings')
        .upsert({
            key: 'school_bank_account',
            value: bankInfo,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

    if (error) {
        console.error('Error saving school bank info:', error);
        throw error;
    }
}
