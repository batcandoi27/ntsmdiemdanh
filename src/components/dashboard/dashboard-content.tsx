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
                    icon={<BarChart3 className={cn("w-10 h-10 sm:w-12 sm:h-12 text-white")} />}
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
                icon={<School className={cn("w-10 h-10 sm:w-12 sm:h-12 text-white")} />}
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
                icon={<Zap className={cn("w-10 h-10 sm:w-12 sm:h-12 text-white")} />}
                title="Điểm Danh HS"
                description="Chọn lớp & Điểm danh"
                color="bg-yellow-500"
                hoverColor="group-hover:text-yellow-700"
                borderColor="border-b-yellow-600"
                compact={isMobile}
            />

            {/* 4. Quản Lý Lớp (Tất cả) */}
            <DashboardCard
                href="/classes"
                icon={<School className={cn("w-10 h-10 sm:w-12 sm:h-12 text-white")} />}
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
                icon={<BarChart3 className={cn("w-10 h-10 sm:w-12 sm:h-12 text-white")} />}
                title="Báo Cáo HS"
                description="Thống kê Tình hình Nề nếp"
                color="bg-emerald-500"
                hoverColor="group-hover:text-emerald-700"
                borderColor="border-b-emerald-600"
                compact={isMobile}
            />

            {/* 5. Hồ Sơ Giáo Viên (Chỉ Admin/BGH) */}
            {isAdmin && (
                <DashboardCard
                    href="/admin/teachers"
                    icon={<UserCheck className={cn("w-10 h-10 sm:w-12 sm:h-12 text-white")} />}
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
                icon={<BookOpen className={cn("w-10 h-10 sm:w-12 sm:h-12 text-white")} />}
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
                icon={<Settings className={cn("w-10 h-10 sm:w-12 sm:h-12 text-white")} />}
                title="Cài Đặt"
                description="Công cụ quản trị & Test"
                color="bg-slate-500"
                hoverColor="group-hover:text-slate-700"
                borderColor="border-b-slate-600"
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
                "group relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all duration-200 flex items-center border-2 border-transparent active:scale-[0.98] active:translate-y-1",
                compact ? "p-4 space-x-4" : "p-6 space-x-5",
                // 3D Bottom Border Effect
                "border-b-[6px]",
                borderColor || "border-b-gray-200"
            )}
        >
            <div className={cn(
                "rounded-xl shadow-inner transition-transform group-hover:scale-110 flex-shrink-0 flex items-center justify-center",
                color,
                compact ? "w-14 h-14" : "w-20 h-20"
            )}>
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <h3 className={cn(
                    "font-black text-gray-800 mb-1 transition-colors truncate tracking-tight",
                    hoverColor,
                    compact ? "text-xl" : "text-3xl"
                )}>
                    {title}
                </h3>
                <p className={cn(
                    "text-gray-500 truncate font-medium",
                    compact ? "text-sm" : "text-base"
                )}>
                    {description}
                </p>
            </div>
        </Link>
    );
}
