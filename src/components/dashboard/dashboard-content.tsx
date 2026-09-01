"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { BookOpen, UserCheck, BarChart3, Settings, Zap, School, HeartHandshake, Gamepad2, Users } from "lucide-react";
import { useViewMode } from "@/context/view-mode-context";
import { useAuth } from "@/context/auth-context";

export default function DashboardContent() {
    const { viewDevice } = useViewMode();
    const { appUser } = useAuth();

    const isMobile = viewDevice === 'mobile';
    const isAdmin = appUser?.role === 'admin' || appUser?.role === 'principal';

    let cardCounter = 1;

    return (
        <div className={cn(
            "grid gap-4 sm:gap-6 w-full max-w-4xl transition-all",
            isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
        )}>
            {/* 1. Quản Trị và Điều Hành (Chỉ Admin/BGH) */}
            {isAdmin && (
                <DashboardCard
                    orderNumber={cardCounter++}
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

            {/* 2. Cổng Phụ Huynh Trực Tuyến */}
            <DashboardCard
                orderNumber={cardCounter++}
                href="/portal"
                icon={<HeartHandshake className={cn("w-8 h-8 sm:w-10 sm:h-10 text-white")} />}
                title="Cổng Phụ Huynh"
                description="Tra cứu điểm danh, Đơn nghỉ & Sơ Yếu Lý Lịch"
                color="bg-indigo-600"
                hoverColor="group-hover:text-indigo-700"
                borderColor="border-b-indigo-700"
                compact={isMobile}
            />

            {/* 3. Cổng Học Sinh & Metaverse */}
            <DashboardCard
                orderNumber={cardCounter++}
                href="/student"
                icon={<Gamepad2 className={cn("w-8 h-8 sm:w-10 sm:h-10 text-white")} />}
                title="Cổng Học Sinh"
                description="Bản đồ học tập, Thú cưng ảo & Nhiệm vụ"
                color="bg-emerald-600"
                hoverColor="group-hover:text-emerald-700"
                borderColor="border-b-emerald-700"
                compact={isMobile}
            />

            {/* 4. Giáo Viên Chủ Nhiệm (Phân hệ GVCN & SYLL) */}
            <DashboardCard
                orderNumber={cardCounter++}
                href="/homeroom"
                icon={<Users className={cn("w-8 h-8 sm:w-10 sm:h-10 text-white")} />}
                title="Giáo Viên Chủ Nhiệm"
                description="Hồ sơ SYLL, Sơ đồ lớp & In ấn 86 trang"
                color="bg-blue-600"
                hoverColor="group-hover:text-blue-700"
                borderColor="border-b-blue-700"
                compact={isMobile}
            />

            {/* 5. Điểm Danh HS (Tất cả) */}
            <DashboardCard
                orderNumber={cardCounter++}
                href="/quick-attendance"
                icon={<Zap className={cn("w-8 h-8 sm:w-10 sm:h-10 text-white")} />}
                title="Điểm Danh HS"
                description="Chọn lớp & Điểm danh"
                color="bg-amber-500"
                hoverColor="group-hover:text-amber-700"
                borderColor="border-b-amber-600"
                compact={isMobile}
            />

            {/* 6. Quản Lý Lớp (Tất cả) */}
            <DashboardCard
                orderNumber={cardCounter++}
                href="/classes"
                icon={<School className={cn("w-8 h-8 sm:w-10 sm:h-10 text-white")} />}
                title="Quản Lý Lớp"
                description="DS Lớp & Import Dữ Liệu"
                color="bg-blue-600"
                hoverColor="group-hover:text-blue-700"
                borderColor="border-b-blue-700"
                compact={isMobile}
            />

            {/* 7. Báo Cáo HS (Tất cả) */}
            <DashboardCard
                orderNumber={cardCounter++}
                href="/reports"
                icon={<BarChart3 className={cn("w-8 h-8 sm:w-10 sm:h-10 text-white")} />}
                title="Báo Cáo HS"
                description="Thống kê Tình hình Nề nếp"
                color="bg-emerald-600"
                hoverColor="group-hover:text-emerald-700"
                borderColor="border-b-emerald-700"
                compact={isMobile}
            />

            {/* 8. Hồ Sơ Giáo Viên (Chỉ Admin/BGH) */}
            {isAdmin && (
                <DashboardCard
                    orderNumber={cardCounter++}
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

            {/* 9. Hội Họp / Sự Kiện (Tất cả) */}
            <DashboardCard
                orderNumber={cardCounter++}
                href={isAdmin ? "/admin/events" : "/teacher/dashboard"}
                icon={<BookOpen className={cn("w-8 h-8 sm:w-10 sm:h-10 text-white")} />}
                title="Hội Họp / Sự Kiện"
                description={isAdmin ? "Quản lý & Tạo mã QR" : "Lịch họp & Điểm danh QR"}
                color="bg-orange-500"
                hoverColor="group-hover:text-orange-700"
                borderColor="border-b-orange-600"
                compact={isMobile}
            />

            {/* 10. Cài Đặt (Tất cả) */}
            <DashboardCard
                orderNumber={cardCounter++}
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
    orderNumber,
    href,
    icon,
    title,
    description,
    color,
    hoverColor,
    borderColor,
    compact
}: {
    orderNumber?: number;
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
            {/* ICON SỐ THỨ TỰ TRONG VÒNG TRÒN GÓC TRÊN BÊN PHẢI (MỖI VÒNG 1 MÀU TƯƠNG ỨNG VỚI MÀU SHADOW/THẺ) */}
            {orderNumber !== undefined && (
                <div className={cn(
                    "absolute top-3.5 right-3.5 w-7 h-7 rounded-full font-black text-xs flex items-center justify-center text-white border-2 border-white/40 shadow-md transition-all duration-200 group-hover:scale-110 group-hover:rotate-6 z-10",
                    color === 'bg-sky-500' && "bg-sky-500 shadow-sky-500/40",
                    color === 'bg-indigo-600' && "bg-indigo-600 shadow-indigo-600/40",
                    color === 'bg-emerald-600' && "bg-emerald-600 shadow-emerald-600/40",
                    color === 'bg-blue-600' && "bg-blue-600 shadow-blue-600/40",
                    color === 'bg-amber-500' && "bg-amber-500 shadow-amber-500/40",
                    color === 'bg-purple-600' && "bg-purple-600 shadow-purple-600/40",
                    color === 'bg-orange-500' && "bg-orange-500 shadow-orange-500/40",
                    color === 'bg-slate-600' && "bg-slate-600 shadow-slate-600/40"
                )}>
                    {orderNumber}
                </div>
            )}

            <div className={cn(
                "rounded-xl shadow-xs transition-transform group-hover:scale-105 shrink-0 flex items-center justify-center border border-white/20",
                color,
                compact ? "w-14 h-14" : "w-18 h-18 sm:w-20 sm:h-20"
            )}>
                {icon}
            </div>
            <div className="min-w-0 flex-1 pr-6">
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
