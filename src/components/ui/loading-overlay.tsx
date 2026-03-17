'use client';

import React from 'react';
import { useLoading } from '@/context/loading-context';
import { Loader2 } from 'lucide-react';

/**
 * LoadingOverlay v1.0
 * Hiển thị lớp phủ mờ toàn bộ màn hình khi ứng dụng đang xử lý dữ liệu.
 */
export function LoadingOverlay() {
    const { isLoading, message } = useLoading();

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-100 flex flex-col items-center gap-4 scale-110 animate-in zoom-in duration-300">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-100 rounded-full" />
                    <Loader2 
                        size={48} 
                        className="text-blue-600 animate-spin absolute inset-0" 
                    />
                </div>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-900 font-bold text-lg">{message}</span>
                    <span className="text-gray-400 text-xs animate-pulse">Vui lòng không tắt trình duyệt...</span>
                </div>
            </div>
        </div>
    );
}
