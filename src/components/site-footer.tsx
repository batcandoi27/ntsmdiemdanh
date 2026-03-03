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
        <footer className="sticky bottom-0 z-50 w-full bg-slate-50/95 backdrop-blur-sm border-t border-slate-200 py-2 sm:py-3 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)] mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Dòng 1: Thông tin & Liên kết */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 text-xs sm:text-sm">
                    <div className="text-slate-600 truncate pr-2">
                        <span className="font-bold text-slate-800 tracking-wide uppercase">
                            {userInfo}
                        </span>
                        <span className="hidden md:inline-block mx-2 text-slate-300">|</span>
                        <span className="hidden md:inline text-slate-500">Hệ thống quản lý điểm danh và nề nếp</span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 text-slate-500 font-medium whitespace-nowrap">
                        <Link href="#" className="hover:text-primary transition-colors">Website</Link>
                        <Link href="#" className="hover:text-primary transition-colors hidden sm:inline">Cổng TTĐT</Link>
                        <Link href="#" className="hover:text-primary transition-colors">Hỗ trợ</Link>
                    </div>
                </div>

                {/* Dòng 2: Meta, Status & Copyright */}
                <div className="flex justify-between items-center pt-2 text-[10px] sm:text-xs text-slate-500">
                    <div className="whitespace-nowrap">
                        &copy; 2026 <span className="hidden sm:inline">THCS Trần Bội Cơ. All rights reserved.</span><span className="inline sm:hidden">THCS TBC.</span>
                    </div>
                    <div className="flex items-center justify-end gap-2 sm:gap-4 whitespace-nowrap overflow-hidden">
                        <div className="flex shrink-0 items-center justify-center gap-1.5 bg-green-50 px-2 py-0.5 sm:py-1 rounded-full border border-green-100 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-green-700 font-medium">Online</span>
                        </div>
                        <span className="hidden sm:inline text-slate-200">|</span>
                        <span className="truncate">Phiên bản v2.0 (Mar 2026) <span className="hidden lg:inline">(Antigravity AI)</span></span>
                        <span className="hidden md:inline text-slate-200">|</span>
                        <div className="hidden md:flex gap-4 font-medium">
                            <Link href="#" className="hover:text-slate-800 transition-colors">Privacy</Link>
                            <Link href="#" className="hover:text-slate-800 transition-colors">Terms</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
