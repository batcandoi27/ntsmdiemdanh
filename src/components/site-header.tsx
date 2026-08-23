'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { School, BookOpen, BarChart3, Upload, Menu, X, Home, Smartphone, Tablet, Monitor, Settings, Zap, LogOut, User, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { ROLE_DISPLAY, UserRole } from '@/types/models';
import { useState } from 'react';
import { useViewMode } from '@/context/view-mode-context';
import { useChat } from '@/context/chat-context';

const allNavItems = [
    { href: '/', label: 'Trang Chủ', icon: Home, roles: ['admin', 'principal', 'supervisor', 'teacher', 'class_monitor'] as UserRole[] },
    { href: '/quick-attendance', label: 'Điểm Danh', icon: Zap, roles: ['admin', 'supervisor', 'teacher', 'class_monitor'] as UserRole[] },
    { href: '/monitor', label: 'Sổ Theo Dõi', icon: BookOpen, roles: ['admin', 'principal', 'supervisor', 'teacher'] as UserRole[] },
    { href: '/classes', label: 'Lớp Học', icon: School, roles: ['admin', 'principal', 'supervisor', 'teacher'] as UserRole[] },
    { href: '/reports', label: 'Báo Cáo', icon: BarChart3, roles: ['admin', 'principal', 'supervisor', 'teacher'] as UserRole[] },
    { href: '/admin/inbox', label: 'Hộp Thư', icon: MessageCircle, roles: ['admin', 'principal'] as UserRole[] },
    { href: '/settings', label: 'Cài Đặt', icon: Settings, roles: ['admin', 'principal'] as UserRole[] },
];

export function SiteHeader() {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { viewDevice, setViewDevice } = useViewMode();
    const { appUser, signOut } = useAuth();
    const { systemUnreadCount } = useChat();

    // Lọc nav theo role
    const navItems = appUser
        ? allNavItems.filter(item => item.roles.includes(appUser.role))
        : allNavItems;

    const roleInfo = appUser ? ROLE_DISPLAY[appUser.role] : null;

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">

                    {/* Logo Area */}
                    <div className="flex items-center shrink-0">
                        <Link href="/" className="flex items-center gap-3 group shrink-0">
                            <div className="bg-primary/10 text-primary p-2 rounded-xl group-hover:bg-primary group-hover:text-white transition-all duration-300 shrink-0">
                                <School size={28} />
                            </div>
                            <div className="flex flex-col whitespace-nowrap shrink-0">
                                <span className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-tight group-hover:text-primary transition-colors whitespace-nowrap">
                                    THCS TRẦN BỘI CƠ
                                </span>
                                <span className="text-[11px] text-gray-500 font-medium tracking-wider uppercase mt-0.5 whitespace-nowrap">
                                    Hệ Thống Điểm Danh
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center space-x-1 flex-1 px-4">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 whitespace-nowrap",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <item.icon size={18} />
                                    {item.label}
                                    {item.href === '/admin/inbox' && systemUnreadCount > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center font-bold">
                                            {systemUnreadCount}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right Side: View Mode + User Info + Mobile Menu */}
                    <div className="flex items-center gap-2 ml-auto">

                        {/* View Mode Toggles - Desktop / Tablet Right Side */}
                        <div className="hidden lg:flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200/60 shadow-inner mr-2">
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

                        {/* User Info (Desktop) */}
                        {appUser && (
                            <div className="hidden lg:flex items-center gap-2">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="text-base">{roleInfo?.badge}</span>
                                    <div className="flex flex-col leading-none">
                                        <span className="text-xs font-semibold text-gray-700 truncate max-w-[120px]">
                                            {appUser.displayName}
                                        </span>
                                        <span className={cn('text-[10px] font-medium', roleInfo?.color)}>
                                            {roleInfo?.label}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={signOut}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Đăng xuất"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
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
                                    <span className="flex-1">{item.label}</span>
                                    {item.href === '/admin/inbox' && systemUnreadCount > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                            {systemUnreadCount}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}

                        {/* Mobile: User Info + Logout */}
                        {appUser && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                                <div className="flex items-center justify-between px-4 py-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">{roleInfo?.badge}</span>
                                        <div className="flex flex-col leading-none">
                                            <span className="text-sm font-semibold text-gray-700">{appUser.displayName}</span>
                                            <span className={cn('text-xs font-medium', roleInfo?.color)}>{roleInfo?.label}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={signOut}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Đăng xuất
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
