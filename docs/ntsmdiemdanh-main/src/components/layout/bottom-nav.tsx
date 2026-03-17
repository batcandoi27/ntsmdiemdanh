'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, BarChart3, Settings, UserCircle } from 'lucide-react';
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
            show: true // Bất kì ai đăng nhập cũng có icon này, hoặc giới hạn tuỳ permissions
        },
        {
            name: 'Quản Lý Lớp',
            href: '/classes',
            icon: Users,
            show: ['admin', 'principal', 'supervisor', 'teacher'].includes(appUser.role)
        },
        {
            // Center floating-like action for attendance
            name: 'Điểm Danh',
            href: '/quick-attendance',
            icon: Home,
            show: true
        },
        {
            name: 'Báo cáo',
            href: '/reports',
            icon: BarChart3,
            show: ['admin', 'principal', 'supervisor', 'teacher'].includes(appUser.role)
        },
        {
            name: 'Tài Khoản',
            href: '/login', // Nơi có tuỳ chọn Logout
            icon: UserCircle,
            show: true
        }
    ];

    const visibleItems = navItems.filter(item => item.show);

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe pb-2 px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            <nav className="flex justify-around items-center h-16">
                {visibleItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 rounded-xl transition-all active:scale-95",
                                isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            <div className={cn(
                                "p-1.5 rounded-full transition-colors",
                                isActive ? "bg-blue-50" : "bg-transparent"
                            )}>
                                <Icon size={20} className={cn(isActive && "fill-blue-100")} />
                            </div>
                            <span className={cn(
                                "text-[10px] font-bold tracking-tight transition-colors",
                                isActive ? "text-blue-600" : "text-gray-500"
                            )}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
