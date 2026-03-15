'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
        const isSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
        if (isSupabase || !db) {
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, 'sys_config', 'features'),
            (docSnap) => {
                if (docSnap.exists()) {
                    setFlags({ ...defaultFlags, ...docSnap.data() } as FeatureFlags);
                } else {
                    setFlags(defaultFlags);
                }
                setLoading(false);
            },
            (error) => {
                console.error("Lỗi khi tải Feature Flags:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
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
