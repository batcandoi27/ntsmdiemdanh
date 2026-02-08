'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { School, BookOpen, BarChart3, Upload, Menu, X, Home, Smartphone, Tablet, Monitor } from 'lucide-react'; // Added icons
import { useState } from 'react';
import { useViewMode } from '@/context/view-mode-context'; // Import context

const navItems = [
    { href: '/', label: 'Trang Chủ', icon: Home },
    { href: '/classes', label: 'Lớp Học', icon: School },
    { href: '/reports', label: 'Báo Cáo', icon: BarChart3 },
    { href: '/import', label: 'Nhập Liệu', icon: Upload },
];

export function SiteHeader() {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { viewDevice, setViewDevice } = useViewMode(); // Use global context

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">

                    {/* Logo Area */}
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="bg-primary/10 text-primary p-2 rounded-xl group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                <School size={28} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-bold text-gray-900 tracking-tight leading-none group-hover:text-primary transition-colors">
                                    THCS TRẦN BỘI CƠ
                                </span>
                                <span className="text-xs text-gray-500 font-medium tracking-widest uppercase mt-0.5">
                                    Hệ Thống Điểm Danh
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* View Mode Toggles - Centered (Hidden on mobile originally, but let's keep it visible or responsive) */}
                    <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-inner">
                            <button
                                onClick={() => setViewDevice('mobile')}
                                className={cn(
                                    "p-1.5 rounded-md transition-all duration-200",
                                    viewDevice === 'mobile' ? "bg-white text-blue-600 shadow-sm ring-1 ring-gray-200" : "text-gray-400 hover:text-gray-600 hover:bg-gray-200/50"
                                )}
                                title="Giao diện điện thoại"
                            >
                                <Smartphone size={18} />
                            </button>
                            <button
                                onClick={() => setViewDevice('tablet')}
                                className={cn(
                                    "p-1.5 rounded-md transition-all duration-200",
                                    viewDevice === 'tablet' ? "bg-white text-blue-600 shadow-sm ring-1 ring-gray-200" : "text-gray-400 hover:text-gray-600 hover:bg-gray-200/50"
                                )}
                                title="Giao diện máy tính bảng"
                            >
                                <Tablet size={18} />
                            </button>
                            <button
                                onClick={() => setViewDevice('desktop')}
                                className={cn(
                                    "p-1.5 rounded-md transition-all duration-200",
                                    viewDevice === 'desktop' ? "bg-white text-blue-600 shadow-sm ring-1 ring-gray-200" : "text-gray-400 hover:text-gray-600 hover:bg-gray-200/50"
                                )}
                                title="Giao diện máy tính"
                            >
                                <Monitor size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <item.icon size={18} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Mobile Menu Button */}
                    <div className="flex items-center md:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            {isMenuOpen && (
                <div className="md:hidden border-t border-gray-100 bg-white absolute w-full shadow-lg animate-in slide-in-from-top-2">
                    <div className="px-4 pt-2 pb-4 space-y-1">
                        {/* Mobile view toggles also? Maybe not needed as mobile users are on mobile, but could be useful for testing on mobile device */}
                        <div className="flex gap-2 justify-center p-2 mb-2 bg-gray-50 rounded-lg">
                            <button onClick={() => setViewDevice('mobile')} className={cn("p-2 rounded", viewDevice === 'mobile' ? "bg-white shadow text-blue-600" : "text-gray-400")}><Smartphone size={20} /></button>
                            <button onClick={() => setViewDevice('tablet')} className={cn("p-2 rounded", viewDevice === 'tablet' ? "bg-white shadow text-blue-600" : "text-gray-400")}><Tablet size={20} /></button>
                            <button onClick={() => setViewDevice('desktop')} className={cn("p-2 rounded", viewDevice === 'desktop' ? "bg-white shadow text-blue-600" : "text-gray-400")}><Monitor size={20} /></button>
                        </div>
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={cn(
                                        "block px-4 py-3 rounded-lg text-base font-medium flex items-center gap-3 transition-colors",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <item.icon size={20} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </header>
    );
}
