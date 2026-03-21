'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged as onFirebaseAuthStateChange, User as FirebaseUser, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { AppUser, DEFAULT_PERMISSIONS, DEFAULT_EDIT_WINDOW, UserRole } from '@/types/models';
import { getUserProfileByEmail, studentCodeToEmail } from '@/services/user-service';
import { supabase } from '@/lib/supabase';
import { supabaseAuth } from '@/services/supabase-auth-service';

export { studentCodeToEmail };

interface AuthContextType {
    firebaseUser: FirebaseUser | null;
    appUser: AppUser | null;
    isSupabase: boolean;
    loading: boolean;
    error: string | null;
    needsRoleCode: boolean;
    isPending: boolean;
    signIn: (email: string, pass: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    setNeedsRoleCode: (val: boolean) => void;
    setError: (msg: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [needsRoleCode, setNeedsRoleCode] = useState(false);
    
    const isSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    const loadingProfile = useRef<string | null>(null);

    // Derived states
    const isPending = !!appUser && !appUser.isActive;

    // Load AppUser profile (Supabase)
    const loadSupabaseProfile = useCallback(async (userId: string, email?: string) => {
        if (loadingProfile.current === userId) return;
        loadingProfile.current = userId;

        console.log('[AuthContext] Bắt đầu tải profile cho:', { userId, email });
        try {
            const profile = await supabaseAuth.getProfileOnly(userId, email);
            console.log('[AuthContext] Kết quả từ supabaseAuth.getProfileOnly:', profile ? { id: profile.id, email: profile.email, name: profile.display_name } : 'Null');
            
            if (profile) {
                const profileData = profile as any;
                console.log('[AuthContext] Mapping profile data:', profile.email);
                setAppUser({
                    uid: profileData.id || userId,
                    email: email || '',
                    displayName: profileData.full_name || 'Người dùng mới',
                    role: profileData.role || 'teacher',
                    isActive: profileData.is_active ?? false,
                    assignedClassIds: profileData.assignedClassIds || [],
                    permissions: DEFAULT_PERMISSIONS[profileData.role as UserRole] || DEFAULT_PERMISSIONS.teacher,
                    editWindowMinutes: DEFAULT_EDIT_WINDOW[profileData.role as UserRole] || 1440,
                    createdAt: new Date().toISOString(),
                    lastLoginAt: new Date().toISOString(),
                });
                setNeedsRoleCode(false);
            } else {
                setAppUser(null);
                setNeedsRoleCode(true);
            }
        } catch (err) {
            console.error('Lỗi load profile Supabase:', err);
            setError('Không thể tải hồ sơ người dùng.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Load AppUser profile (Firebase)
    const loadFirebaseProfile = useCallback(async (email: string, uid: string) => {
        try {
            const profile = await getUserProfileByEmail(email);
            if (profile) {
                setAppUser(profile);
                setNeedsRoleCode(false);
            } else {
                setAppUser(null);
                setNeedsRoleCode(true);
            }
        } catch (err) {
            console.error('Lỗi load profile Firebase:', err);
            setError('Không thể tải hồ sơ người dùng.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let unsubscribe: () => void;

        if (isSupabase) {
            // SUPABASE AUTH FLOW
            const initSupabaseAuth = async () => {
                // 1. Check existing session
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setFirebaseUser(session.user as any);
                    await loadSupabaseProfile(session.user.id, session.user.email);
                } else {
                    setLoading(false);
                }

                // 2. Listen for changes
                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                    if (session?.user) {
                        setFirebaseUser(session.user as any);
                        await loadSupabaseProfile(session.user.id, session.user.email);
                    } else {
                        setFirebaseUser(null);
                        setAppUser(null);
                        setNeedsRoleCode(false);
                        setLoading(false);
                    }
                });
                return () => subscription.unsubscribe();
            };
            initSupabaseAuth();
        } else {
            // FIREBASE AUTH FLOW
            if (!auth) {
                setLoading(false);
                return;
            }
            unsubscribe = onFirebaseAuthStateChange(auth, async (user) => {
                setFirebaseUser(user);
                if (user?.email) {
                    await loadFirebaseProfile(user.email, user.uid);
                } else {
                    setAppUser(null);
                    setNeedsRoleCode(false);
                    setLoading(false);
                }
            });
            return () => unsubscribe();
        }
    }, [isSupabase, loadSupabaseProfile, loadFirebaseProfile]);

    const signIn = async (email: string, pass: string) => {
        setError(null);
        setLoading(true);
        try {
            if (isSupabase) {
                const { error } = await supabaseAuth.signIn(email, pass);
                if (error) throw error;
            } else {
                // Firebase logic (nếu cần)
            }
        } catch (err: any) {
            setError(err.message || 'Lỗi đăng nhập');
            setLoading(false);
            throw err;
        }
    };

    const signInWithGoogle = useCallback(async () => {
        setError(null);
        setLoading(true);
        try {
            if (isSupabase) {
                const redirectUrl = typeof window !== 'undefined' ? window.location.origin : '';
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: redirectUrl,
                        queryParams: {
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
                setError('Lỗi đăng nhập Google: ' + (err.message || 'Không xác định'));
            }
            setLoading(false);
            throw err;
        }
    }, [isSupabase]);

    const signOut = async () => {
        setLoading(true);
        try {
            if (isSupabase) {
                await supabaseAuth.signOut();
            } else {
                if (auth) await firebaseSignOut(auth);
            }
            setFirebaseUser(null);
            setAppUser(null);
            setNeedsRoleCode(false);
        } catch (err: any) {
            setError('Lỗi đăng xuất: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            firebaseUser,
            appUser,
            isSupabase,
            loading,
            error,
            needsRoleCode,
            isPending,
            signIn,
            signInWithGoogle,
            signOut,
            setNeedsRoleCode,
            setError
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
