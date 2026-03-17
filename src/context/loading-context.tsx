'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface LoadingContextType {
    isLoading: boolean;
    message: string;
    showLoading: (msg?: string) => void;
    hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
    const [loadingCount, setLoadingCount] = useState(0);
    const [message, setMessage] = useState('Đang tải...');

    const showLoading = (msg?: string) => {
        if (msg) setMessage(msg);
        setLoadingCount(prev => prev + 1);
    };

    const hideLoading = () => {
        setLoadingCount(prev => Math.max(0, prev - 1));
    };

    // Lắng nghe sự kiện toàn cục để các service có thể kích hoạt loading
    useEffect(() => {
        const handleStart = (e: any) => showLoading(e.detail?.message);
        const handleEnd = () => hideLoading();

        window.addEventListener('app:loading:start', handleStart);
        window.addEventListener('app:loading:end', handleEnd);

        return () => {
            window.removeEventListener('app:loading:start', handleStart);
            window.removeEventListener('app:loading:end', handleEnd);
        };
    }, []);

    const isLoading = loadingCount > 0;

    return (
        <LoadingContext.Provider value={{ isLoading, message, showLoading, hideLoading }}>
            {children}
        </LoadingContext.Provider>
    );
}

export const useLoading = () => {
    const context = useContext(LoadingContext);
    if (context === undefined) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
};
