'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { School, BookOpen, BarChart3, Menu, X, Home, Smartphone, Tablet, Monitor, Settings, Zap, LogOut, MessageCircle } from 'lucide-react';
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
        <header className="bg-surface-card border-b border-border-subtle sticky top-0 z-50 shadow-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">

                    {/* Logo Area */}
                    <div className="flex items-center shrink-0">
                        <Link href="/" className="flex items-center gap-3 group shrink-0">
                            <div className="bg-primary-soft text-primary p-2.5 rounded-xl group-hover:bg-primary group-hover:text-white transition-all duration-300 shrink-0 border border-primary/20 shadow-xs">
                                <School size={26} />
                            </div>
                            <div className="flex flex-col whitespace-nowrap shrink-0">
                                <span className="text-base sm:text-lg font-bold text-text-primary tracking-tight leading-tight group-hover:text-primary transition-colors whitespace-nowrap">
                                    THCS TRẦN BỘI CƠ
                                </span>
                                <span className="text-[10px] text-text-tertiary font-semibold tracking-wider uppercase mt-0.5 whitespace-nowrap">
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
                                        "px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all duration-150 whitespace-nowrap select-none",
                                        isActive
                                            ? "bg-primary-soft text-primary border border-primary/20 shadow-xs"
                                            : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                                    )}
                                >
                                    <item.icon size={18} />
                                    {item.label}
                                    {item.href === '/admin/inbox' && systemUnreadCount > 0 && (
                                        <span className="bg-danger text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center font-bold">
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
                        <div className="hidden lg:flex items-center gap-1 bg-surface-section p-1 rounded-xl border border-border-subtle shadow-xs mr-2">
                            <button
                                onClick={() => setViewDevice('mobile')}
                                className={cn(
                                    "p-1.5 rounded-lg transition-all duration-150",
                                    viewDevice === 'mobile' ? "bg-surface-card text-primary shadow-xs border border-border-subtle" : "text-text-tertiary hover:text-text-primary hover:bg-surface-card/60"
                                )}
                                title="Giao diện điện thoại"
                            >
                                <Smartphone size={18} />
                            </button>
                            <button
                                onClick={() => setViewDevice('tablet')}
                                className={cn(
                                    "p-1.5 rounded-lg transition-all duration-150",
                                    viewDevice === 'tablet' ? "bg-surface-card text-primary shadow-xs border border-border-subtle" : "text-text-tertiary hover:text-text-primary hover:bg-surface-card/60"
                                )}
                                title="Giao diện máy tính bảng"
                            >
                                <Tablet size={18} />
                            </button>
                            <button
                                onClick={() => setViewDevice('desktop')}
                                className={cn(
                                    "p-1.5 rounded-lg transition-all duration-150",
                                    viewDevice === 'desktop' ? "bg-surface-card text-primary shadow-xs border border-border-subtle" : "text-text-tertiary hover:text-text-primary hover:bg-surface-card/60"
                                )}
                                title="Giao diện máy tính"
                            >
                                <Monitor size={18} />
                            </button>
                        </div>

                        {/* User Info (Desktop) */}
                        {appUser && (
                            <div className="hidden lg:flex items-center gap-2">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-section rounded-xl border border-border-subtle shadow-xs">
                                    <span className="text-base">{roleInfo?.badge}</span>
                                    <div className="flex flex-col leading-none">
                                        <span className="text-xs font-bold text-text-primary truncate max-w-[120px]">
                                            {appUser.displayName}
                                        </span>
                                        <span className={cn('text-[10px] font-semibold mt-0.5', roleInfo?.color)}>
                                            {roleInfo?.label}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={signOut}
                                    className="p-2 text-text-tertiary hover:text-danger hover:bg-rose-50 rounded-xl transition-colors"
                                    title="Đăng xuất"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="lg:hidden p-2 rounded-xl text-text-secondary hover:bg-surface-hover transition-colors"
                        >
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            {isMenuOpen && (
                <div className="md:hidden border-t border-border-subtle bg-surface-card absolute w-full shadow-dropdown animate-in slide-in-from-top-2 z-50">
                    <div className="px-4 pt-3 pb-5 space-y-1.5">
                        <div className="flex gap-2 justify-center p-2 mb-3 bg-surface-section rounded-xl border border-border-subtle">
                            <button onClick={() => setViewDevice('mobile')} className={cn("p-2 rounded-lg transition-all", viewDevice === 'mobile' ? "bg-surface-card shadow-xs text-primary font-bold border border-border-subtle" : "text-text-tertiary")}><Smartphone size={20} /></button>
                            <button onClick={() => setViewDevice('tablet')} className={cn("p-2 rounded-lg transition-all", viewDevice === 'tablet' ? "bg-surface-card shadow-xs text-primary font-bold border border-border-subtle" : "text-text-tertiary")}><Tablet size={20} /></button>
                            <button onClick={() => setViewDevice('desktop')} className={cn("p-2 rounded-lg transition-all", viewDevice === 'desktop' ? "bg-surface-card shadow-xs text-primary font-bold border border-border-subtle" : "text-text-tertiary")}><Monitor size={20} /></button>
                        </div>
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={cn(
                                        "px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors",
                                        isActive
                                            ? "bg-primary-soft text-primary border border-primary/20 shadow-xs"
                                            : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                                    )}
                                >
                                    <item.icon size={20} />
                                    <span className="flex-1">{item.label}</span>
                                    {item.href === '/admin/inbox' && systemUnreadCount > 0 && (
                                        <span className="bg-danger text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                            {systemUnreadCount}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}

                        {/* Mobile: User Info + Logout */}
                        {appUser && (
                            <div className="mt-3 pt-3 border-t border-border-subtle">
                                <div className="flex items-center justify-between px-2 py-2 bg-surface-section rounded-xl border border-border-subtle">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">{roleInfo?.badge}</span>
                                        <div className="flex flex-col leading-none">
                                            <span className="text-sm font-bold text-text-primary">{appUser.displayName}</span>
                                            <span className={cn('text-xs font-semibold mt-0.5', roleInfo?.color)}>{roleInfo?.label}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={signOut}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-danger hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
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
