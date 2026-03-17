'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    getRedirectResult,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { AppUser } from '@/types/models';

// ============================================
// Context Types
// ============================================

interface AuthContextType {
    /** Firebase Auth user (null = chưa login) */
    firebaseUser: FirebaseUser | null;
    /** App user profile from Firestore (null = chưa load hoặc chưa có profile) */
    appUser: AppUser | null;
    /** Báo hiệu Firebase Auth thành công nhưng chưa có profile (cần nhập Role Code) */
    needsRoleCode: boolean;
    /** Tài khoản đã đăng ký nhưng chưa được admin duyệt (isActive = false) */
    isPending: boolean;
    /** Đang kiểm tra auth state */
    loading: boolean;
    /** Lỗi auth nếu có */
    error: string | null;
    /** Đăng nhập bằng email/password hoặc mã HS/password */
    signIn: (emailOrCode: string, password: string) => Promise<void>;
    /** Đăng nhập Google Popup */
    signInWithGoogle: () => Promise<void>;
    /** Đăng xuất */
    signOut: () => Promise<void>;
    /** Kiểm tra quyền truy cập lớp */
    canAccessClass: (classId: string) => boolean;
    /** Kiểm tra có phải role nhất định */
    hasRole: (...roles: AppUser['role'][]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// Helper: Convert mã HS → email format
// ============================================
function studentCodeToEmail(code: string): string {
    return `${code.toLowerCase()}@student.local`;
}

function isStudentCode(input: string): boolean {
    return !input.includes('@');
}

// ============================================
// Provider
// ============================================

// Suppress Unhandled Runtime Error from Firebase Auth background tasks
if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason;
        if (error && error.code === 'auth/network-request-failed') {
            console.warn('Firebase Auth: Đã chặn lỗi mất kết nối mạng chạy ngầm của tiến trình background.');
            event.preventDefault(); // Chặn văng Error Boundaries trong React do Unhandled Promise Rejection
        }
    });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [needsRoleCode, setNeedsRoleCode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load AppUser profile
    const loadUserProfile = useCallback(async (user: FirebaseUser) => {
        try {
            const getDocPromise = getDoc(doc(db, 'users', user.uid));
            const timeoutPromise = new Promise<any>((_, reject) =>
                setTimeout(() => reject(new Error('Firebase Network Timeout')), 10000)
            );

            const userDoc = await Promise.race([getDocPromise, timeoutPromise]);
            if (userDoc.exists()) {
                const data = userDoc.data() as AppUser;
                setAppUser(data);
                setNeedsRoleCode(false);

                // Cập nhật lastLoginAt
                await updateDoc(doc(db, 'users', user.uid), {
                    lastLoginAt: new Date().toISOString(),
                }).catch(() => { /* ignore */ });
            } else {
                // Đã login Google nhưng chưa có Profile -> yêu cầu nhập mã Role
                setAppUser(null);
                setNeedsRoleCode(true);
            }
        } catch (err) {
            console.error('Lỗi tải thông tin người dùng:', err);
            setError('Không thể tải thông tin người dùng.');
            setAppUser(null);
        }
    }, []);

    // Listen Firebase Auth state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setFirebaseUser(user);
            setError(null);

            if (user) {
                await loadUserProfile(user);
            } else {
                setAppUser(null);
                setNeedsRoleCode(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [loadUserProfile]);

    // Xử lý kết quả Google Redirect khi quay về trang
    useEffect(() => {
        getRedirectResult(auth).then((result) => {
            if (result?.user) {
                // onAuthStateChanged đã xử lý rồi, chỉ cần tắt loading
                setLoading(false);
            }
        }).catch((err) => {
            const firebaseError = err as { code?: string; message?: string };
            if (firebaseError.code !== 'auth/popup-closed-by-user') {
                console.error('Google redirect error:', firebaseError);
                setError('Lỗi đăng nhập Google: ' + (firebaseError.message || ''));
            }
            setLoading(false);
        });
    }, []);

    // Sign in
    const signIn = useCallback(async (emailOrCode: string, password: string) => {
        setError(null);
        setLoading(true);
        try {
            let email = emailOrCode;
            const normalizedInput = emailOrCode.toLowerCase().trim();

            // Hỗ trợ đăng nhập nhanh cho các tài khoản admin
            if (['admin', 'admintbc'].includes(normalizedInput)) {
                email = `${normalizedInput}@diemdanh.kgvh.io.vn`;
            }
            // Nếu là mã HS (không có @), convert sang email format
            else if (isStudentCode(emailOrCode)) {
                email = studentCodeToEmail(emailOrCode);
            }

            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged sẽ tự động load profile
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };
            switch (firebaseError.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    setError('Email/mã HS hoặc mật khẩu không đúng.');
                    break;
                case 'auth/too-many-requests':
                    setError('Đăng nhập thất bại quá nhiều lần. Vui lòng thử lại sau.');
                    break;
                case 'auth/user-disabled':
                    setError('Tài khoản đã bị vô hiệu hoá. Liên hệ Admin.');
                    break;
                default:
                    setError('Lỗi đăng nhập: ' + (firebaseError.message || 'Không xác định'));
            }
            setLoading(false);
            throw err;
        }
    }, []);

    // Sign in with Google (Redirect - không hiện popup Firebase domain)
    const signInWithGoogle = useCallback(async () => {
        setError(null);
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({
                prompt: 'select_account',
            });

            // Dùng Popup thay vì Redirect để tránh các vấn đề về chặn cookie/redirect ở trình duyệt hiện đại
            await signInWithPopup(auth, provider);
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };
            if (firebaseError.code !== 'auth/popup-closed-by-user') {
                console.error('Lỗi đăng nhập Google:', firebaseError);
                setError('Lỗi đăng nhập Google: ' + (firebaseError.message || 'Không xác định'));
            }
            setLoading(false);
            throw err;
        }
    }, []);

    // Sign out
    const signOut = useCallback(async () => {
        try {
            await firebaseSignOut(auth);
            setAppUser(null);
            setFirebaseUser(null);
            setNeedsRoleCode(false);
            setError(null);

            // Xóa triệt để các trạng thái có thể bị lưu tạm ở trình duyệt (ngăn chặn dính cache tài khoản)
            if (typeof window !== 'undefined') {
                window.localStorage.clear();
                window.sessionStorage.clear();
                // Ép trình duyệt tải lại hoàn toàn (hard reload) để rũ bỏ toàn bộ memory / context cũ
                window.location.href = '/login';
            }
        } catch (err) {
            console.error('Lỗi khi đăng xuất:', err);
        }
    }, []);

    // Check class access (scope check)
    const canAccessClass = useCallback((classId: string): boolean => {
        if (!appUser) return false;
        if (appUser.permissions.canViewAllClasses) return true; // admin, principal
        return appUser.assignedClassIds.includes(classId);
    }, [appUser]);

    // Check role
    const hasRole = useCallback((...roles: AppUser['role'][]): boolean => {
        if (!appUser) return false;
        return roles.includes(appUser.role);
    }, [appUser]);

    const isPending = !!(appUser && !appUser.isActive);

    const value: AuthContextType = {
        firebaseUser,
        appUser,
        needsRoleCode,
        isPending,
        loading,
        error,
        signIn,
        signInWithGoogle,
        signOut,
        canAccessClass,
        hasRole,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ============================================
// Hook
// ============================================

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth phải được sử dụng trong AuthProvider');
    }
    return context;
}

// Export helper cho user-service
export { studentCodeToEmail, isStudentCode };
