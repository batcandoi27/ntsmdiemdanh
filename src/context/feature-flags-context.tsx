'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type FeatureFlags = {
    quickAttendance: boolean;
    reports: boolean;
    import: boolean;
    timetables: boolean;
    monitor: boolean;
    [key: string]: boolean;
};

const defaultFlags: FeatureFlags = {
    quickAttendance: true,
    reports: true,
    import: true,
    timetables: true,
    monitor: true,
};

interface FeatureFlagsContextType {
    flags: FeatureFlags;
    loading: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType>({
    flags: defaultFlags,
    loading: true,
});

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
    const [flags, setFlags] = useState<FeatureFlags>(defaultFlags);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let channel: any;

        const init = async () => {
            const { supabase } = await import('@/lib/supabase');
            
            // 1. Initial fetch
            const { data, error } = await supabase.from('settings').select('value').eq('key', 'feature_flags').maybeSingle();
            
            if (!error && data?.value) {
                setFlags({ ...defaultFlags, ...data.value } as FeatureFlags);
            }
            setLoading(false);

            // 2. Realtime updates - Dùng unique ID để tránh lỗi "cannot add callbacks after subscribe" khi React Strict Mode mount 2 lần
            const channelId = `feature_flags_${Math.random().toString(36).substring(2, 9)}`;
            channel = supabase.channel(channelId)
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'settings',
                    filter: 'key=eq.feature_flags'
                }, (payload) => {
                    if (payload.new && (payload.new as any).value) {
                        setFlags({ ...defaultFlags, ...(payload.new as any).value } as FeatureFlags);
                    }
                })
                .subscribe();
        };
        
        init();

        return () => {
            if (channel) {
                import('@/lib/supabase').then(({ supabase }) => {
                    supabase.removeChannel(channel);
                });
            }
        };
    }, []);

    return (
        <FeatureFlagsContext.Provider value={{ flags, loading }}>
            {children}
        </FeatureFlagsContext.Provider>
    );
}

export function useFeatureFlags() {
    return useContext(FeatureFlagsContext);
}
