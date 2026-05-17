"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, LayoutDashboard, AlertTriangle, TrendingUp, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const navItems = [
        { href: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard },
        { href: "/admin/dashboard/warnings", label: "Cảnh báo sớm", icon: AlertTriangle },
        { href: "/admin/dashboard/trends", label: "Phân tích xu hướng", icon: TrendingUp },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center space-x-4">
                            <Link href="/" className="text-slate-500 hover:text-slate-700 transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <h1 className="text-xl font-bold text-slate-800">
                                Trung tâm Điều hành Dữ liệu
                            </h1>
                        </div>
                        <div className="flex items-center space-x-3">
                            <span className="hidden md:inline-block text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                                Phân hệ Ban Giám Hiệu
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sub-navigation */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-6 overflow-x-auto no-scrollbar">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center space-x-2 py-3 border-b-2 text-sm font-semibold transition-colors whitespace-nowrap",
                                        isActive 
                                            ? "border-blue-600 text-blue-600" 
                                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </div>
    );
}
