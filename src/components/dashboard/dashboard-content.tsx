"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { BookOpen, UserCheck, BarChart3, Settings, Zap, School } from "lucide-react";
import { useViewMode } from "@/context/view-mode-context";
import { useAuth } from "@/context/auth-context";

export default function DashboardContent() {
    const { viewDevice } = useViewMode();
    const { appUser } = useAuth();

    const isMobile = viewDevice === 'mobile';
    const isAdmin = appUser?.role === 'admin' || appUser?.role === 'principal';

    return (
        <div className={cn(
            "grid gap-4 sm:gap-6 w-full max-w-4xl transition-all",
            isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
        )}>
            {/* 1. Quản Trị và Điều Hành (Chỉ Admin/BGH) */}
            {isAdmin && (
                <DashboardCard
                    href="/admin/dashboard"
                    icon={<BarChart3 className={cn("w-8 h-8 sm:w-10 sm:h-10 text-white")} />}
                    title="Quản Trị và Điều Hành"
                    description="Dashboard Phân tích & Cảnh báo"
                    color="bg-sky-500"
                    hoverColor="group-hover:text-sky-700"
                    borderColor="border-b-sky-600"
                    compact={isMobile}
                />
            )}

            {/* 2. Giáo Viên Chủ Nhiệm (Phân hệ GVCN) */}
            <DashboardCard
                href="/homeroom"
                icon={<School className={cn("w-8 h-8 sm:w-10 sm:h-10 text-white")} />}
                title="Giáo Viên Chủ Nhiệm"
                description="Trợ lý Lớp, Nề nếp & In ấn"
                color="bg-indigo-600"
                hoverColor="group-hover:text-indigo-700"
                borderColor="border-b-indigo-700"
                compact={isMobile}
            />

            {/* 3. Điểm Danh HS (Tất cả) */}
            <DashboardCard
                href="/quick-attendance"
                icon={<Zap className={cn("w-8 h-8 sm:w-10 sm:h-10 text-white")} />}
                title="Điểm Danh HS"
                description="Chọn lớp & Điểm danh"
                color="bg-amber-500"
                hoverColor="group-hover:text-amber-700"
                borderColor="border-b-amber-600"
                compact={isMobile}
            />

            {/* 4. Quản Lý Lớp (Tất cả) */}
            <DashboardCard
                href="/classes"
                icon={<School className={cn("w-8 h-8 sm:w-10 sm:h-10 text-white")} />}
                title="Quản Lý Lớp"
                description="DS Lớp & Import Dữ Liệu"
                color="bg-blue-600"
                hoverColor="group-hover:text-blue-700"
                borderColor="border-b-blue-700"
                compact={isMobile}
            />

            {/* 4. Báo Cáo HS (Tất cả) */}
            <DashboardCard
                href="/reports"
                icon={<BarChart3 className={cn("w-8 h-8 sm:w-10 sm:h-10 text-white")} />}
                title="Báo Cáo HS"
                description="Thống kê Tình hình Nề nếp"
                color="bg-emerald-600"
                hoverColor="group-hover:text-emerald-700"
                borderColor="border-b-emerald-700"
                compact={isMobile}
            />

            {/* 5. Hồ Sơ Giáo Viên (Chỉ Admin/BGH) */}
            {isAdmin && (
                <DashboardCard
                    href="/admin/teachers"
                    icon={<UserCheck className={cn("w-8 h-8 sm:w-10 sm:h-10 text-white")} />}
                    title="Hồ Sơ Giáo Viên"
                    description="Import & Quản lý Nhóm GV"
                    color="bg-purple-600"
                    hoverColor="group-hover:text-purple-700"
                    borderColor="border-b-purple-700"
                    compact={isMobile}
                />
            )}

            {/* 6. Hội Họp / Sự Kiện (Tất cả) */}
            <DashboardCard
                href={isAdmin ? "/admin/events" : "/teacher/dashboard"}
                icon={<BookOpen className={cn("w-8 h-8 sm:w-10 sm:h-10 text-white")} />}
                title="Hội Họp / Sự Kiện"
                description={isAdmin ? "Quản lý & Tạo mã QR" : "Lịch họp & Điểm danh QR"}
                color="bg-orange-500"
                hoverColor="group-hover:text-orange-700"
                borderColor="border-b-orange-600"
                compact={isMobile}
            />

            {/* 7. Cài Đặt (Tất cả) */}
            <DashboardCard
                href="/settings"
                icon={<Settings className={cn("w-8 h-8 sm:w-10 sm:h-10 text-white")} />}
                title="Cài Đặt"
                description="Công cụ quản trị & Cấu hình"
                color="bg-slate-600"
                hoverColor="group-hover:text-slate-800"
                borderColor="border-b-slate-700"
                compact={isMobile}
            />
        </div>
    );
}

function DashboardCard({
    href,
    icon,
    title,
    description,
    color,
    hoverColor,
    borderColor,
    compact
}: {
    href: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
    hoverColor?: string;
    borderColor?: string;
    compact?: boolean;
}) {
    return (
        <Link
            href={href}
            className={cn(
                "group relative overflow-hidden rounded-2xl bg-surface-card shadow-card hover:shadow-cardHover transition-all duration-200 flex items-center border border-border-subtle hover:border-border-strong active:scale-[0.98] select-none",
                compact ? "p-4 space-x-4" : "p-6 space-x-5",
                "border-b-[5px]",
                borderColor || "border-b-border-default"
            )}
        >
            <div className={cn(
                "rounded-xl shadow-xs transition-transform group-hover:scale-105 shrink-0 flex items-center justify-center border border-white/20",
                color,
                compact ? "w-14 h-14" : "w-18 h-18 sm:w-20 sm:h-20"
            )}>
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <h3 className={cn(
                    "font-black text-text-primary mb-1 transition-colors truncate tracking-tight",
                    hoverColor,
                    compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
                )}>
                    {title}
                </h3>
                <p className={cn(
                    "text-text-secondary truncate font-semibold",
                    compact ? "text-xs" : "text-xs sm:text-sm"
                )}>
                    {description}
                </p>
            </div>
        </Link>
    );
}
