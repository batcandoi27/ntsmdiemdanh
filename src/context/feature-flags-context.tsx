'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getFeatureFlags, saveFeatureFlags } from '@/app/actions/settings';

export type FeatureFlags = {
    quickAttendance: boolean;
    reports: boolean;
    import: boolean;
    timetables: boolean;
    monitor: boolean;
    curriculumVitae: boolean;
    parentPortal: boolean;
    studentPortal: boolean;
    homeroomAssistant: boolean;
    printCenter: boolean;
    adminDashboard: boolean;
    privacyDemoMode?: boolean;
    [key: string]: boolean | undefined;
};

export const defaultFlags: FeatureFlags = {
    quickAttendance: true,
    reports: true,
    import: true,
    timetables: true,
    monitor: true,
    curriculumVitae: true,
    parentPortal: true,
    studentPortal: true,
    homeroomAssistant: true,
    printCenter: true,
    adminDashboard: true,
    privacyDemoMode: false,
};

const STORAGE_KEY = 'tbk_feature_flags_cache';

interface FeatureFlagsContextType {
    flags: FeatureFlags;
    loading: boolean;
    updateFlag: (key: string, enabled: boolean, userRole?: string) => Promise<{ success: boolean; message?: string }>;
    setAllFlags: (newFlags: FeatureFlags, userRole?: string) => Promise<{ success: boolean; message?: string }>;
    resetDefaults: (userRole?: string) => Promise<{ success: boolean; message?: string }>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType>({
    flags: defaultFlags,
    loading: true,
    updateFlag: async () => ({ success: false, message: 'Context not initialized' }),
    setAllFlags: async () => ({ success: false, message: 'Context not initialized' }),
    resetDefaults: async () => ({ success: false, message: 'Context not initialized' }),
});

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
    const [flags, setFlags] = useState<FeatureFlags>(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem(STORAGE_KEY);
                if (cached) {
                    return { ...defaultFlags, ...JSON.parse(cached) };
                }
            } catch (_) {}
        }
        return defaultFlags;
    });
    const [loading, setLoading] = useState(true);

    const persistLocal = (newFlags: FeatureFlags) => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newFlags));
                window.dispatchEvent(new Event('featureFlagsUpdated'));
            } catch (_) {}
        }
    };

    useEffect(() => {
        let channel: any;

        const init = async () => {
            try {
                // 1. Fetch via Server Action (Bypasses Supabase Client RLS securely)
                const res = await getFeatureFlags();
                if (res.success && res.flags) {
                    const merged = { ...defaultFlags, ...res.flags };
                    setFlags(merged);
                    persistLocal(merged);
                }
            } catch (err) {
                console.warn('[FeatureFlagsProvider] Fetch error, using cached/default:', err);
            } finally {
                setLoading(false);
            }

            // 2. Realtime updates via Supabase Channel
            try {
                const { supabase } = await import('@/lib/supabase');
                const channelId = `feature_flags_${Math.random().toString(36).substring(2, 9)}`;
                channel = supabase.channel(channelId)
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'settings',
                        filter: 'key=eq.feature_flags'
                    }, (payload) => {
                        if (payload.new && (payload.new as any).value) {
                            const updated = { ...defaultFlags, ...(payload.new as any).value } as FeatureFlags;
                            setFlags(updated);
                            persistLocal(updated);
                        }
                    })
                    .subscribe();
            } catch (err) {
                console.warn('[FeatureFlagsProvider] Realtime subscribe error:', err);
            }
        };

        init();

        const handleLocalSync = () => {
            try {
                const cached = localStorage.getItem(STORAGE_KEY);
                if (cached) {
                    setFlags({ ...defaultFlags, ...JSON.parse(cached) });
                }
            } catch (_) {}
        };
        window.addEventListener('storage', handleLocalSync);
        window.addEventListener('featureFlagsUpdated', handleLocalSync);

        return () => {
            window.removeEventListener('storage', handleLocalSync);
            window.removeEventListener('featureFlagsUpdated', handleLocalSync);
            if (channel) {
                import('@/lib/supabase').then(({ supabase }) => {
                    supabase.removeChannel(channel);
                });
            }
        };
    }, []);

    // Optimistic Update Function with Server Action persistence
    const updateFlag = useCallback(async (key: string, enabled: boolean, userRole: string = 'admin') => {
        const previousFlags = { ...flags };
        const newFlags = { ...flags, [key]: enabled };

        // 1. Optimistic local update
        setFlags(newFlags);
        persistLocal(newFlags);

        // 2. Server Action Persistence (Runs with Supabase Admin / Service Role)
        try {
            const res = await saveFeatureFlags(newFlags, userRole);
            if (!res.success) {
                // Revert on failure
                setFlags(previousFlags);
                persistLocal(previousFlags);
                return { success: false, message: res.message || 'Lỗi lưu cấu hình trên máy chủ' };
            }
            return { success: true, message: `Đã ${enabled ? 'bật' : 'tắt'} tính năng thành công.` };
        } catch (error: any) {
            // Revert on failure
            setFlags(previousFlags);
            persistLocal(previousFlags);
            return { success: false, message: error.message || 'Lỗi mạng khi lưu tính năng.' };
        }
    }, [flags]);

    const setAllFlags = useCallback(async (newFlags: FeatureFlags, userRole: string = 'admin') => {
        const previousFlags = { ...flags };
        setFlags(newFlags);
        persistLocal(newFlags);

        try {
            const res = await saveFeatureFlags(newFlags, userRole);
            if (!res.success) {
                setFlags(previousFlags);
                persistLocal(previousFlags);
                return { success: false, message: res.message };
            }
            return { success: true, message: 'Đã cập nhật toàn bộ tính năng.' };
        } catch (error: any) {
            setFlags(previousFlags);
            persistLocal(previousFlags);
            return { success: false, message: error.message };
        }
    }, [flags]);

    const resetDefaults = useCallback(async (userRole: string = 'admin') => {
        return setAllFlags(defaultFlags, userRole);
    }, [setAllFlags]);

    return (
        <FeatureFlagsContext.Provider value={{ flags, loading, updateFlag, setAllFlags, resetDefaults }}>
            {children}
        </FeatureFlagsContext.Provider>
    );
}

export function useFeatureFlags() {
    return useContext(FeatureFlagsContext);
}
