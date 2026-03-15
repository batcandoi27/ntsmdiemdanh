'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
import { supabase } from '@/lib/supabase';
import { supabaseAuth } from '@/services/supabase-auth-service';
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

const isSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [needsRoleCode, setNeedsRoleCode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Bug 1 Fix: Track user presence via ref to avoid stale closure in onAuthStateChange
    const hasUserRef = useRef(false);

    // Load AppUser profile (Legacy Firebase)
    const loadUserProfile = useCallback(async (user: FirebaseUser) => {
        if (isSupabase || !db) return; // Không chạy khi dùng Supabase
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
                setAppUser(null);
                setNeedsRoleCode(true);
            }
        } catch (err) {
            console.error('Lỗi tải thông tin người dùng từ Firebase:', err);
            setError('Không thể tải thông tin người dùng.');
            setAppUser(null);
        }
    }, []);

    const loadingProfile = useRef<string | null>(null);

    // Load AppUser profile (Supabase)
    const loadSupabaseProfile = useCallback(async (userId: string, email?: string, createdAt?: string) => {
        if (loadingProfile.current === userId) return;
        loadingProfile.current = userId;

        try {
            const profile = await supabaseAuth.getProfileOnly(userId);
            
            if (profile) {
                const profileData = profile as any;
                setAppUser({
                    uid: userId,
                    email: email || '',
                    displayName: profile.full_name || email?.split('@')[0],
                    role: profile.role || 'teacher',
                    isActive: profile.is_active ?? true,
                    assignedClassIds: profileData.assignedClassIds || [], 
                    homeroomClassId: profileData.homeroomClassId,
                    permissions: profile.role === 'admin' ? { canEditAttendance: true, canEditStudentStatus: true, canCreateAccounts: true, canViewAllClasses: true, canExportData: true, canManageTimetable: true, canAccessAPI: true } : { canEditAttendance: true, canEditStudentStatus: false, canCreateAccounts: false, canViewAllClasses: profile.role === 'supervisor' || profile.role === 'principal', canExportData: true, canManageTimetable: false, canAccessAPI: false },
                    editWindowMinutes: profile.role === 'admin' ? -1 : 1440,
                    createdAt: createdAt || new Date().toISOString()
                } as any);
                setNeedsRoleCode(false);
            } else {
                setAppUser(null);
                setNeedsRoleCode(true);
            }
        } catch (err: any) {
            console.error('Lỗi tải profile từ Supabase:', err);
            setAppUser(null);
            setNeedsRoleCode(true);
        } finally {
            loadingProfile.current = null;
        }
    }, []);

    // Listen Auth state (Hybrid)
    useEffect(() => {
        let unsubscribeFirebase: (() => void) | undefined;
        let subscriptionSupabase: any | undefined;

        if (isSupabase) {
            // Supabase: Kiểm tra session hiện tại ngay lập tức
            const checkInitialSession = async () => {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user) {
                        setFirebaseUser({
                            ...session.user,
                            uid: session.user.id
                        } as any);
                        hasUserRef.current = true;
                        await loadSupabaseProfile(session.user.id, session.user.email, session.user.created_at);
                    }
                } catch (err) {
                    console.error('Lỗi khởi tạo session:', err);
                } finally {
                    setLoading(false);
                }
            };
            checkInitialSession();

            // Supabase Listener
            const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
                // Bug 1 Fix: Chỉ log event không phải TOKEN_REFRESHED để giảm spam console
                if (event !== 'TOKEN_REFRESHED') {
                    console.log('Supabase Auth Event:', event);
                }
                
                try {
                    if (session?.user) {
                        // Bug 1 Fix: Dùng hasUserRef (ref) thay vì firebaseUser (stale closure)
                        // TOKEN_REFRESHED khi đã có user → skip hoàn toàn, không setLoading
                        if (event === 'TOKEN_REFRESHED' && hasUserRef.current) {
                            return; // Silent refresh, không cần làm gì
                        }

                        const isCriticalEvent = event === 'SIGNED_IN' || event === 'INITIAL_SESSION';
                        if (isCriticalEvent && !hasUserRef.current) {
                            setLoading(true);
                        }
                        
                        setFirebaseUser({
                            ...session.user,
                            uid: session.user.id
                        } as any);
                        hasUserRef.current = true;
                        
                        // Chỉ load profile nếu chưa có hoặc event là SIGNED_IN
                        if (isCriticalEvent || !hasUserRef.current) {
                            await loadSupabaseProfile(session.user.id, session.user.email, session.user.created_at);
                        }
                    } else {
                        hasUserRef.current = false;
                        setFirebaseUser(null);
                        setAppUser(null);
                        setNeedsRoleCode(false);
                    }
                } catch (err) {
                    console.error('Lỗi trong Auth Listener:', err);
                } finally {
                    if (event !== 'TOKEN_REFRESHED') {
                        setLoading(false);
                    }
                }
            });
            subscriptionSupabase = data.subscription;
        } else if (auth) {
            // Firebase Listener
            unsubscribeFirebase = onAuthStateChanged(auth, async (user) => {
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
        } else {
            setLoading(false);
        }

        return () => {
            if (unsubscribeFirebase) unsubscribeFirebase();
            if (subscriptionSupabase) {
                subscriptionSupabase.unsubscribe();
            }
        };
    }, [loadUserProfile, loadSupabaseProfile]);

    // Xử lý kết quả Google Redirect khi quay về trang
    useEffect(() => {
        if (!isSupabase && auth) {
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
        }
    }, []);

    // Sign in
    const signIn = useCallback(async (emailOrCode: string, password: string) => {
        setError(null);
        setLoading(true);
        try {
            if (isSupabase) {
                const { error } = await supabaseAuth.signIn(emailOrCode, password);
                if (error) throw error;
            } else {
                if (!auth) throw new Error("Firebase Auth not initialized");
                let email = emailOrCode;
                const normalizedInput = emailOrCode.toLowerCase().trim();

                if (['admin', 'admintbc'].includes(normalizedInput)) {
                    email = `${normalizedInput}@diemdanh.kgvh.io.vn`;
                }
                else if (isStudentCode(emailOrCode)) {
                    email = studentCodeToEmail(emailOrCode);
                }

                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err: any) {
            setError(err.message || 'Lỗi đăng nhập');
            setLoading(false);
            throw err;
        }
    }, []);

    // Sign in with Google (Hybrid)
    const signInWithGoogle = useCallback(async () => {
        setError(null);
        setLoading(true);
        try {
            if (isSupabase) {
                const { supabase } = await import('@/lib/supabase');
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin + '/auth/callback',
                        queryParams: {
                            access_type: 'offline',
                            prompt: 'select_account',
                        }
                    }
                });
                if (error) throw error;
            } else {
                if (!auth) return;
                const provider = new GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });
                await signInWithPopup(auth, provider);
            }
        } catch (err: any) {
            if (err.code !== 'auth/popup-closed-by-user') {
                console.error('Lỗi đăng nhập Google:', err);
                setError('Lỗi đăng nhập Google: ' + (err.message || 'Không xác định'));
            }
            setLoading(false);
            throw err;
        }
    }, [isSupabase]);

    // Sign out
    const signOut = useCallback(async () => {
        try {
            if (isSupabase) {
                await supabaseAuth.signOut();
            } else if (auth) {
                await firebaseSignOut(auth);
            }
            
            setAppUser(null);
            setFirebaseUser(null);
            setNeedsRoleCode(false);
            setError(null);

            if (typeof window !== 'undefined') {
                window.localStorage.clear();
                window.sessionStorage.clear();
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
