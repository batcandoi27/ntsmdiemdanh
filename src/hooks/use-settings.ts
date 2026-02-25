import { useState, useEffect } from 'react';
import { ColumnFrequency } from '@/types/models';

export interface AppSettings {
    visibleDefaultColumns: {
        P: boolean;
        K: boolean;
        T: boolean;
        VP: boolean;
        KH: boolean;
    };
}

const DEFAULT_SETTINGS: AppSettings = {
    visibleDefaultColumns: {
        P: true,
        K: true,
        T: true,
        VP: true,
        KH: true,
    }
};

export function useAppSettings() {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('app_settings');
        if (saved) {
            try {
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
            } catch (e) {
                console.error('Failed to parse settings', e);
            }
        }
        setLoaded(true);
    }, []);

    const updateSettings = (updates: Partial<AppSettings>) => {
        setSettings(prev => {
            const next = { ...prev, ...updates };
            localStorage.setItem('app_settings', JSON.stringify(next));
            return next;
        });
    };

    const toggleDefaultColumn = (key: keyof AppSettings['visibleDefaultColumns']) => {
        setSettings(prev => {
            const next = {
                ...prev,
                visibleDefaultColumns: {
                    ...prev.visibleDefaultColumns,
                    [key]: !prev.visibleDefaultColumns[key]
                }
            };
            localStorage.setItem('app_settings', JSON.stringify(next));
            return next;
        });
    };

    return { settings, updateSettings, toggleDefaultColumn, loaded };
}
