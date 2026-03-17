/**
 * User Service – CRUD user accounts trong Firestore
 *
 * Quản lý tạo/sửa/xoá tài khoản cho 5 roles.
 * Ban Cán Sự Lớp dùng mã HS làm username (converted → fake email cho Firebase Auth).
 */

import {
    createUserWithEmailAndPassword,
    updatePassword,
} from 'firebase/auth';
import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    limit,
    startAfter,
    orderBy,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import {
    DEFAULT_PERMISSIONS,
    DEFAULT_EDIT_WINDOW,
} from '@/types/models';
// import { studentCodeToEmail } from '@/context/auth-context'; // Xóa để tránh circular
import { supabase } from '@/lib/supabase';

const isSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';

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
 * Tạo tài khoản mới (Firebase Auth + Firestore profile)
 *
 * Lưu ý: Firebase Auth client SDK createUserWithEmailAndPassword
 * sẽ tự động sign in user mới → cần sign out và sign in lại user cũ.
 * Trong production nên dùng Firebase Admin SDK (server-side).
 * Ở đây ta chấp nhận limitation này cho simplicity.
 */
export async function createUser(input: CreateUserInput): Promise<AppUser> {
    const email = input.email || studentCodeToEmail(input.studentCode || '');

    if (!email) {
        throw new Error('Phải có email hoặc mã học sinh.');
    }

    // Tạo Firebase Auth account
    const userCredential = await createUserWithEmailAndPassword(auth, email, input.password);
    const uid = userCredential.user.uid;

    // Tạo Firestore profile
    const appUser: AppUser = {
        uid,
        displayName: input.displayName,
        role: input.role,
        assignedClassIds: input.assignedClassIds,
        permissions: { ...DEFAULT_PERMISSIONS[input.role] },
        editWindowMinutes: DEFAULT_EDIT_WINDOW[input.role],
        isActive: true,
        createdBy: input.createdBy,
        createdAt: new Date().toISOString(),
    };

    if (input.email) appUser.email = input.email;
    if (input.studentCode) appUser.studentCode = input.studentCode;
    if (input.studentCode) appUser.studentCode = input.studentCode;
    if (input.assignedGrade) appUser.assignedGrade = input.assignedGrade;

    await setDoc(doc(db, 'schools', 'default', 'users', uid), appUser);

    return appUser;
}

// ============================================
// Read Users
// ============================================

export async function getUser(uid: string): Promise<AppUser | null> {
    if (isSupabase) {
        const { data, error } = await supabase
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
    const snap = await getDoc(doc(db, 'schools', 'default', 'users', uid));
    return snap.exists() ? (snap.data() as AppUser) : null;
}

export async function getUserProfileByEmail(email: string): Promise<AppUser | null> {
    if (isSupabase) {
        const { data, error } = await supabase
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
    const q = query(
        collection(db, 'schools', 'default', 'users'), 
        where('email', '==', email), 
        limit(1)
    );
    const snap = await getDocs(q);
    return snap.empty ? null : (snap.docs[0].data() as AppUser);
}

export async function getUsersByRole(role: UserRole): Promise<AppUser[]> {
    const q = query(collection(db, 'schools', 'default', 'users'), where('role', '==', role));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as AppUser);
}

export async function getAllUsers(): Promise<AppUser[]> {
    const snap = await getDocs(collection(db, 'schools', 'default', 'users'));
    return snap.docs.map(d => d.data() as AppUser);
}

export async function getUsersPaginated(pageSize: number = 20, lastDocUid?: string): Promise<{ users: AppUser[], hasMore: boolean }> {
    if (isSupabase) {
        let query = supabase
            .from('profiles')
            .select('*, teacher_classes(class_id)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(pageSize + 1);

        if (lastDocUid) {
            // Trong Supabase profiles, ta dùng id thay vì uid
            const { data: lastUser } = await supabase.from('profiles').select('created_at').eq('id', lastDocUid).single();
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

    let q = query(collection(db, 'schools', 'default', 'users'), orderBy('createdAt', 'desc'), limit(pageSize + 1));

    if (lastDocUid) {
        // Cần get Doc của lastDocUid trước
        const lastDocSnap = await getDoc(doc(db, 'schools', 'default', 'users', lastDocUid));
        if (lastDocSnap.exists()) {
            q = query(collection(db, 'schools', 'default', 'users'), orderBy('createdAt', 'desc'), startAfter(lastDocSnap), limit(pageSize + 1));
        }
    }

    const snap = await getDocs(q);
    const users = snap.docs.map(d => d.data() as AppUser);

    // Kiểm tra hasMore bằng cách load dư 1 item
    const hasMore = users.length > pageSize;
    if (hasMore) {
        users.pop(); // Bỏ item dư đi
    }

    return { users, hasMore };
}

export async function getUsersForClass(classId: string): Promise<AppUser[]> {
    const q = query(
        collection(db, 'schools', 'default', 'users'),
        where('assignedClassIds', 'array-contains', classId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as AppUser);
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
    if (isSupabase) {
        // 1. Cập nhật thông tin profile (không bao gồm assigned_class_ids)
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                full_name: updateData.displayName,
                role: updateData.role,
                is_active: updateData.isActive,
                student_code: updateData.studentCode
            })
            .eq('id', uid);
        
        if (profileError) throw profileError;

        // 2. Cập nhật phân công lớp học (teacher_classes) nếu có gửi lên
        if (updateData.assignedClassIds !== undefined) {
            // Xóa phân công cũ
            const { error: deleteError } = await supabase
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

                const { error: insertError } = await supabase
                    .from('teacher_classes')
                    .insert(newAssignments);
                
                if (insertError) throw insertError;
            }
        }
        return;
    }

    await updateDoc(doc(db, 'schools', 'default', 'users', uid), updateData);
}

export async function assignClassesToUser(uid: string, classIds: string[]): Promise<void> {
    await updateDoc(doc(db, 'schools', 'default', 'users', uid), {
        assignedClassIds: classIds,
    });
}

export async function deactivateUser(uid: string): Promise<void> {
    console.log('[UserService] Đang vô hiệu hoá user:', uid);
    if (isSupabase) {
        const { data, error, status } = await supabase.from('profiles').update({ is_active: false }).eq('id', uid).select();
        console.log('[UserService] Kết quả Supabase Deactivate:', { data, error, status });
        if (error) throw error;
        return;
    }
    await updateDoc(doc(db, 'schools', 'default', 'users', uid), {
        isActive: false,
    });
}

export async function activateUser(uid: string): Promise<void> {
    console.log('[UserService] Đang kích hoạt user:', uid);
    if (isSupabase) {
        const { data, error, status } = await supabase.from('profiles').update({ is_active: true }).eq('id', uid).select();
        console.log('[UserService] Kết quả Supabase Activate:', { data, error, status });
        if (error) throw error;
        return;
    }
    await updateDoc(doc(db, 'schools', 'default', 'users', uid), {
        isActive: true,
    });
}

// ============================================
// Reset Password (Admin resets for user)
// ============================================

/**
 * Reset password cho user (admin action).
 * Lưu ý: Chỉ hoạt động nếu admin đang impersonate hoặc dùng Admin SDK.
 * Với client SDK, ta chỉ có thể đổi password cho user đang sign in.
 */
export async function resetUserPassword(newPassword: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Không có user đang đăng nhập.');
    await updatePassword(currentUser, newPassword);
}

// ============================================
// Delete User (soft delete)
// ============================================

export async function deleteUser(uid: string): Promise<void> {
    // Soft delete: chỉ deactivate, không xoá document
    await deactivateUser(uid);
}

// Hard delete (admin only, hiếm dùng)
export async function hardDeleteUser(uid: string): Promise<void> {
    await deleteDoc(doc(db, 'schools', 'default', 'users', uid));
    // Note: Không thể xoá Firebase Auth user từ client SDK
    // Cần Firebase Admin SDK hoặc Cloud Function
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
            // If email already in use, skip
            if (error.code === 'auth/email-already-in-use') {
                onProgress(`⚠️ Giám thị khối ${grade} đã tồn tại, bỏ qua.`);
            } else {
                onProgress(`❌ Lỗi tạo Giám thị khối ${grade}: ${error.message}`);
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
            if (error.code === 'auth/email-already-in-use') {
                onProgress(`⚠️ GVCN lớp ${cls.name} đã tồn tại, bỏ qua.`);
            } else {
                onProgress(`❌ Lỗi tạo GVCN lớp ${cls.name}: ${error.message}`);
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
            if (error.code === 'auth/email-already-in-use') {
                onProgress(`⚠️ Cán sự lớp ${cls.name} đã tồn tại, bỏ qua.`);
            } else {
                onProgress(`❌ Lỗi tạo Cán sự lớp ${cls.name}: ${error.message}`);
            }
        }
    }

    onProgress("Hoàn tất quá trình tạo tài khoản hàng loạt.");
}
