'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppUser, DEFAULT_PERMISSIONS, DEFAULT_EDIT_WINDOW, UserRole } from '@/types/models';
import { getUserProfileByEmail, studentCodeToEmail } from '@/services/user-service';
import { supabase } from '@/lib/supabase';
import { supabaseAuth } from '@/services/supabase-auth-service';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export { studentCodeToEmail };

/**
 * AuthUser: Unified user object for Supabase Auth.
 * Giữ lại .uid, .email, .displayName, .photoURL để backward compat với consumers.
 */
interface AuthUser {
    uid: string;
    id: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

/** Map Supabase User → AuthUser */
function toAuthUser(su: SupabaseUser): AuthUser {
    return {
        uid: su.id,
        id: su.id,
        email: su.email ?? null,
        displayName: su.user_metadata?.full_name ?? su.user_metadata?.name ?? su.email?.split('@')[0] ?? null,
        photoURL: su.user_metadata?.avatar_url ?? su.user_metadata?.picture ?? null,
    };
}

interface AuthContextType {
    authUser: AuthUser | null;
    appUser: AppUser | null;
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
    const [user, setUser] = useState<AuthUser | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [needsRoleCode, setNeedsRoleCode] = useState(false);

    const loadingProfile = useRef<string | null>(null);

    // Derived states
    const isPending = !!appUser && !appUser.isActive;

    // Load AppUser profile from Supabase
    const loadProfile = useCallback(async (userId: string, email?: string) => {
        if (loadingProfile.current === userId) return;
        loadingProfile.current = userId;

        console.log('[AuthContext] Bắt đầu tải profile cho:', { userId, email });
        try {
            const profile = await supabaseAuth.getProfileOnly(userId, email);
            console.log('[AuthContext] Kết quả từ supabaseAuth.getProfileOnly:', profile ? { id: (profile as Record<string, unknown>).id, email: (profile as Record<string, unknown>).email } : 'Null');

            if (profile) {
                const profileData = profile as Record<string, unknown>;
                setAppUser({
                    uid: (profileData.id as string) || userId,
                    email: email || '',
                    displayName: (profileData.full_name as string) || 'Người dùng mới',
                    role: (profileData.role as UserRole) || 'teacher',
                    isActive: (profileData.is_active as boolean) ?? false,
                    assignedClassIds: (profileData.assignedClassIds as string[]) || [],
                    permissions: DEFAULT_PERMISSIONS[(profileData.role as UserRole)] || DEFAULT_PERMISSIONS.teacher,
                    editWindowMinutes: DEFAULT_EDIT_WINDOW[(profileData.role as UserRole)] || 1440,
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

    useEffect(() => {
        const initAuth = async () => {
            // 1. Check existing session
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(toAuthUser(session.user));
                await loadProfile(session.user.id, session.user.email ?? undefined);
            } else {
                setLoading(false);
            }

            // 2. Listen for changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
                if (session?.user) {
                    setUser(toAuthUser(session.user));
                    await loadProfile(session.user.id, session.user.email ?? undefined);
                } else {
                    setUser(null);
                    setAppUser(null);
                    setNeedsRoleCode(false);
                    setLoading(false);
                }
            });
            return () => subscription.unsubscribe();
        };
        initAuth();
    }, [loadProfile]);

    const signIn = async (email: string, pass: string) => {
        setError(null);
        setLoading(true);
        try {
            const { error: authError } = await supabaseAuth.signIn(email, pass);
            if (authError) throw authError;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Lỗi đăng nhập';
            setError(message);
            setLoading(false);
            throw err;
        }
    };

    const signInWithGoogle = useCallback(async () => {
        setError(null);
        setLoading(true);
        try {
            const redirectUrl = typeof window !== 'undefined' ? window.location.origin : '';
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    queryParams: {
                        prompt: 'select_account',
                    }
                }
            });
            if (oauthError) throw oauthError;
        } catch (err: unknown) {
            const errObj = err as { code?: string; message?: string };
            if (errObj.code !== 'auth/popup-closed-by-user') {
                setError('Lỗi đăng nhập Google: ' + (errObj.message || 'Không xác định'));
            }
            setLoading(false);
            throw err;
        }
    }, []);

    const handleSignOut = async () => {
        setLoading(true);
        try {
            await supabaseAuth.signOut();
            setUser(null);
            setAppUser(null);
            setNeedsRoleCode(false);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Lỗi đăng xuất';
            setError('Lỗi đăng xuất: ' + message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            authUser: user,
            appUser,
            loading,
            error,
            needsRoleCode,
            isPending,
            signIn,
            signInWithGoogle,
            signOut: handleSignOut,
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
