"use client";

import Link from 'next/link';
import { useAuth } from '@/context/auth-context';

export function SiteFooter() {
    const { appUser, firebaseUser, loading } = useAuth();

    let userInfo = 'Đang tải...';
    if (!loading) {
        if (appUser) {
            userInfo = `${appUser.displayName || appUser.email || appUser.studentCode || 'User'} - ${appUser.role}`;
        } else if (firebaseUser) {
            userInfo = `${firebaseUser.email || 'User'} - Chờ cập nhật Profile`;
        } else {
            userInfo = 'Khách (Chưa đăng nhập)';
        }
    }

    return (
        <footer className="sticky bottom-0 z-50 w-full bg-slate-50/95 backdrop-blur-sm border-t border-slate-200 py-3 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)] mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs sm:text-sm text-slate-500">
                    <div className="whitespace-nowrap font-medium">
                        &copy; 2026 THCS Trần Bội Cơ
                    </div>
                    
                    <div className="flex items-center gap-3 sm:gap-4 font-medium">
                        <div className="flex items-center gap-1.5 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-green-700">Online</span>
                        </div>
                        <span className="text-slate-200">|</span>
                        <span>Phiên bản v03/26</span>
                        <span className="text-slate-200">|</span>
                        <div className="flex gap-4">
                            <Link href="#" className="hover:text-primary transition-colors">Website</Link>
                            <Link href="#" className="hover:text-primary transition-colors">Hỗ trợ</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
