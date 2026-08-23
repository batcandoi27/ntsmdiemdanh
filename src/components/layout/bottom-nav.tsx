'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, BarChart3, Settings, UserCircle, BookOpen } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

export function BottomNav() {
    const pathname = usePathname();
    const { appUser } = useAuth();

    if (!appUser) return null;

    const navItems = [
        {
            name: 'Cài Đặt',
            href: '/settings',
            icon: Settings,
            show: ['admin', 'principal'].includes(appUser.role),
        },
        {
            name: 'Quản Lý Lớp',
            href: '/classes',
            icon: Users,
            show: ['admin', 'principal', 'supervisor', 'teacher'].includes(appUser.role),
        },
        {
            name: 'Điểm Danh',
            href: '/quick-attendance',
            icon: Home,
            show: true,
        },
        {
            name: 'Sổ Theo Dõi',
            href: '/monitor',
            icon: BookOpen,
            show: ['admin', 'principal', 'supervisor', 'teacher'].includes(appUser.role),
        },
        {
            name: 'Báo Cáo',
            href: '/reports',
            icon: BarChart3,
            show: ['admin', 'principal', 'supervisor', 'teacher'].includes(appUser.role),
        },
    ];

    const visibleItems = navItems.filter((item) => item.show);

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-card/95 backdrop-blur-md border-t border-border-subtle z-50 pb-safe pb-2 px-3 shadow-dropdown">
            <nav className="flex justify-around items-center h-16 max-w-md mx-auto">
                {visibleItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 rounded-2xl transition-all duration-150 active:scale-95 select-none",
                                isActive ? "text-primary" : "text-text-tertiary hover:text-text-primary"
                            )}
                        >
                            <div
                                className={cn(
                                    "p-1.5 rounded-xl transition-all duration-150",
                                    isActive
                                        ? "bg-primary-soft text-primary shadow-xs border border-primary/20"
                                        : "bg-transparent"
                                )}
                            >
                                <Icon size={20} className={cn(isActive && "stroke-[2.5]")} />
                            </div>
                            <span
                                className={cn(
                                    "text-[10px] tracking-tight transition-colors leading-tight",
                                    isActive ? "font-bold text-primary" : "font-semibold text-text-secondary"
                                )}
                            >
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
