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
    AppUser,
    UserRole,
    DEFAULT_PERMISSIONS,
    DEFAULT_EDIT_WINDOW,
} from '@/types/models';
import { studentCodeToEmail } from '@/context/auth-context';

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
    if (input.assignedGrade) appUser.assignedGrade = input.assignedGrade;

    await setDoc(doc(db, 'users', uid), appUser);

    return appUser;
}

// ============================================
// Read Users
// ============================================

export async function getUser(uid: string): Promise<AppUser | null> {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as AppUser) : null;
}

export async function getUsersByRole(role: UserRole): Promise<AppUser[]> {
    const q = query(collection(db, 'users'), where('role', '==', role));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as AppUser);
}

export async function getAllUsers(): Promise<AppUser[]> {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => d.data() as AppUser);
}

export async function getUsersPaginated(pageSize: number = 20, lastDocUid?: string): Promise<{ users: AppUser[], hasMore: boolean }> {
    let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(pageSize + 1));

    if (lastDocUid) {
        // Cần get Doc của lastDocUid trước
        const lastDocSnap = await getDoc(doc(db, 'users', lastDocUid));
        if (lastDocSnap.exists()) {
            q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), startAfter(lastDocSnap), limit(pageSize + 1));
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
        collection(db, 'users'),
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

    await updateDoc(doc(db, 'users', uid), updateData);
}

export async function assignClassesToUser(uid: string, classIds: string[]): Promise<void> {
    await updateDoc(doc(db, 'users', uid), {
        assignedClassIds: classIds,
    });
}

export async function deactivateUser(uid: string): Promise<void> {
    await updateDoc(doc(db, 'users', uid), {
        isActive: false,
    });
}

export async function activateUser(uid: string): Promise<void> {
    await updateDoc(doc(db, 'users', uid), {
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
    await deleteDoc(doc(db, 'users', uid));
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
