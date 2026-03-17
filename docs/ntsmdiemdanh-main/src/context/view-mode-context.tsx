'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type ViewDevice = 'mobile' | 'tablet' | 'desktop';

interface ViewModeContextType {
    viewDevice: ViewDevice;
    setViewDevice: (mode: ViewDevice) => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
    const [viewDevice, setViewDevice] = useState<ViewDevice>('desktop');

    // Init on mount (Restore from storage OR detect)
    useEffect(() => {
        const saved = localStorage.getItem('app_viewDevice') as ViewDevice;
        if (saved) {
            setViewDevice(saved);
        } else {
            const width = window.innerWidth;
            if (width < 768) setViewDevice('mobile');
            else if (width < 1024) setViewDevice('tablet');
            else setViewDevice('desktop');
        }
    }, []);

    // Persist preference
    useEffect(() => {
        localStorage.setItem('app_viewDevice', viewDevice);
    }, [viewDevice]);

    return (
        <ViewModeContext.Provider value={{ viewDevice, setViewDevice }}>
            {children}
        </ViewModeContext.Provider>
    );
}

export function useViewMode() {
    const context = useContext(ViewModeContext);
    if (context === undefined) {
        throw new Error('useViewMode must be used within a ViewModeProvider');
    }
    return context;
}

export const getContainerWidthClass = (device: ViewDevice) => {
    switch (device) {
        case 'mobile': return 'max-w-[420px] mx-auto transition-all duration-300';
        case 'tablet': return 'max-w-[768px] mx-auto transition-all duration-300';
        default: return 'w-full transition-all duration-300';
    }
};
