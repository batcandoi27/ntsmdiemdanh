'use client';

import React from 'react';
import { usePrivacy } from '@/context/privacy-context';
import { EyeOff, ShieldCheck, X } from 'lucide-react';

export function PrivacyDemoBadge() {
    const { isPrivacyMode, togglePrivacyMode } = usePrivacy();

    if (!isPrivacyMode) return null;

    return (
        <div className="fixed bottom-20 md:bottom-5 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 select-none">
            <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl shadow-xl border border-amber-500/40 flex items-center gap-2.5 text-xs font-bold ring-2 ring-amber-400/30">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <div className="flex items-center gap-1.5">
                    <EyeOff className="w-4 h-4 text-amber-300" />
                    <span>CHẾ ĐỘ QUAY PHIM DEMO: <strong className="text-amber-300">ĐÃ ẨN DANH 100%</strong></span>
                </div>
                <button
                    onClick={togglePrivacyMode}
                    className="ml-2 px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 hover:text-white transition-colors text-[11px] font-bold border border-amber-400/40"
                    title="Nhấp để tắt chế độ ẩn danh quay phim"
                >
                    Tắt
                </button>
            </div>
        </div>
    );
}
