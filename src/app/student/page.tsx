'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    BookOpen,
    Calendar,
    CreditCard,
    GraduationCap,
    Gamepad2,
    Lock,
    Sparkles,
    ArrowRight,
    CheckCircle2,
    ShieldAlert,
    X,
    FileText,
    UserCheck,
    Award,
    Compass
} from 'lucide-react';
import { STUDENT_PORTAL_CONFIG } from '@/config/student-portal.config';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function StudentHubPage() {
    const router = useRouter();
    const [studentInfo, setStudentInfo] = useState<{
        studentName: string;
        studentCode: string;
        className: string;
        role: string;
    }>({
        studentName: 'Nguyễn Văn An',
        studentCode: 'HS-821',
        className: '8A13',
        role: 'STUDENT'
    });

    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        // Load saved session if any
        try {
            const savedSession = localStorage.getItem('tbc_student_session');
            const savedRole = localStorage.getItem('user_role') || localStorage.getItem('tbc_user_role');
            if (savedSession) {
                const parsed = JSON.parse(savedSession);
                setStudentInfo(prev => ({
                    ...prev,
                    studentCode: parsed.studentCode || prev.studentCode,
                    className: parsed.className || prev.className,
                    studentName: parsed.studentName || prev.studentName
                }));
            }
            if (savedRole === 'admin' || savedRole === 'ADMIN') {
                setIsAdmin(true);
            }
        } catch {
            // Ignore
        }
    }, []);

    const isMetaverseEnabled = STUDENT_PORTAL_CONFIG.ENABLE_METAVERSE_FOR_STUDENTS || isAdmin;

    const handleEntertainmentClick = () => {
        if (isMetaverseEnabled) {
            router.push('/student/pet');
        } else {
            setShowMaintenanceModal(true);
        }
    };

    return (
        <div className="space-y-7 animate-in fade-in duration-300 max-w-6xl mx-auto py-2">
            
            {/* Top Banner Greeting (Light Theme) */}
            <div className="rounded-3xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-white p-6 sm:p-8 shadow-xs relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 border border-blue-200 text-blue-800 text-xs font-bold">
                            <Sparkles size={14} className="text-blue-600" />
                            <span>Cổng Học Sinh 2 Trong 1 • Năm Học 2026–2027</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            Xin Chào, {studentInfo.studentName}! 👋
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed font-medium">
                            Lớp <span className="font-bold text-slate-900">{studentInfo.className}</span> • Mã học sinh: <span className="font-mono font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-md">{studentInfo.studentCode}</span>
                            <br />
                            Hãy chọn phân hệ bạn muốn truy cập bên dưới:
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center min-w-[120px]">
                            <p className="text-[11px] text-slate-500 font-semibold">Chuyên cần</p>
                            <p className="text-xs sm:text-sm font-black text-emerald-600 mt-0.5">✓ Đã Có Mặt</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center min-w-[120px]">
                            <p className="text-[11px] text-slate-500 font-semibold">Trạng thái</p>
                            <p className="text-xs sm:text-sm font-black text-blue-600 mt-0.5">Sẵn Sàng Học</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* THE 2 PRIMARY FLASHCARDS (Light Theme) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                
                {/* ========================================================================= */}
                {/* FLASHCARD 1: KHU VỰC HỌC TẬP (STUDY HUB) */}
                {/* ========================================================================= */}
                <div className="group relative rounded-3xl border-2 border-blue-200 bg-white p-6 sm:p-8 shadow-sm transition-all duration-300 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between overflow-hidden">
                    <div className="space-y-6 relative z-10">
                        {/* Header of Card */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-3xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                                    🎓
                                </div>
                                <div>
                                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider border border-blue-200">
                                        Trọng Tâm Chính
                                    </span>
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 group-hover:text-blue-700 transition-colors">
                                        Khu Vực Học Tập
                                    </h3>
                                </div>
                            </div>

                            <span className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5 shrink-0">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Đang Mở
                            </span>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                            Không gian quản trị học tập toàn diện cho học sinh: Theo dõi bài tập dặn dò, thời khóa biểu sáng & chiều, tra cứu học phí VietQR, chuyên cần và hồ sơ cá nhân.
                        </p>

                        {/* Feature Badges List */}
                        <div className="grid grid-cols-2 gap-2.5 pt-2">
                            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-bold hover:bg-blue-50/50 transition-colors">
                                <BookOpen size={16} className="text-blue-600 shrink-0" />
                                <span className="truncate">Sổ Báo Bài & Dặn Dò</span>
                            </div>

                            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-bold hover:bg-amber-50/50 transition-colors">
                                <Calendar size={16} className="text-amber-600 shrink-0" />
                                <span className="truncate">TKB Sáng & Chiều (5 tiết)</span>
                            </div>

                            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-bold hover:bg-emerald-50/50 transition-colors">
                                <CreditCard size={16} className="text-emerald-600 shrink-0" />
                                <span className="truncate">Học Phí & VietQR Auto</span>
                            </div>

                            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-bold hover:bg-purple-50/50 transition-colors">
                                <UserCheck size={16} className="text-purple-600 shrink-0" />
                                <span className="truncate">Điểm Danh Chuyên Cần</span>
                            </div>

                            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-bold hover:bg-pink-50/50 transition-colors">
                                <Award size={16} className="text-pink-600 shrink-0" />
                                <span className="truncate">Bảng Điểm & Kết Quả</span>
                            </div>

                            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-bold hover:bg-indigo-50/50 transition-colors">
                                <FileText size={16} className="text-indigo-600 shrink-0" />
                                <span className="truncate">Sơ Yếu Lý Lịch Cá Nhân</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-6 relative z-10">
                        <Link
                            href="/student/study"
                            className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-md shadow-blue-600/20 active:scale-98 transition-all"
                        >
                            <span>Truy Cập Khu Vực Học Tập</span>
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* FLASHCARD 2: KHU VỰC GIẢI TRÍ & LÀNG THÚ CƯNG METAVERSE */}
                {/* ========================================================================= */}
                <div
                    onClick={handleEntertainmentClick}
                    className={cn(
                        "group relative rounded-3xl border-2 p-6 sm:p-8 shadow-sm transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer",
                        isMetaverseEnabled
                            ? "border-purple-200 bg-white hover:border-purple-500 hover:shadow-xl hover:-translate-y-1"
                            : "border-slate-200 bg-white hover:border-amber-400 hover:shadow-md"
                    )}
                >
                    <div className="space-y-6 relative z-10">
                        {/* Header of Card */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg transition-transform group-hover:scale-105",
                                    isMetaverseEnabled
                                        ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-purple-500/20"
                                        : "bg-purple-50 text-purple-600 border border-purple-200"
                                )}>
                                    🎮
                                </div>
                                <div>
                                    <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider border border-purple-200">
                                        Metaverse & Gamification
                                    </span>
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 group-hover:text-purple-700 transition-colors">
                                        Khu Vực Giải Trí & Thú Cưng
                                    </h3>
                                </div>
                            </div>

                            {isMetaverseEnabled ? (
                                <span className="px-3 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold flex items-center gap-1 shrink-0">
                                    <Sparkles size={13} className="text-purple-600" />
                                    Mở (Admin)
                                </span>
                            ) : (
                                <span className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5 shrink-0">
                                    <Lock size={13} className="text-amber-600" />
                                    Bảo Trì Nâng Cấp
                                </span>
                            )}
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                            Không gian nuôi thú ảo linh vật ẩn danh, tham gia nhiệm vụ rèn luyện tuần, khám phá làng học tập 2.5D Isometric và thám hiểm vũ trụ cùng bạn bè.
                        </p>

                        {/* Feature Badges List */}
                        <div className="grid grid-cols-2 gap-2.5 pt-2">
                            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-bold hover:bg-purple-50/50 transition-colors">
                                <span className="text-base">🥚</span>
                                <span className="truncate">Nuôi Thú Cưng Linh Vật</span>
                            </div>

                            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-bold hover:bg-purple-50/50 transition-colors">
                                <span className="text-base">🏡</span>
                                <span className="truncate">Làng Học Tập 2.5D</span>
                            </div>

                            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-bold hover:bg-purple-50/50 transition-colors">
                                <span className="text-base">🎯</span>
                                <span className="truncate">Nhiệm Vụ Tuần & Rèn Luyện</span>
                            </div>

                            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-bold hover:bg-purple-50/50 transition-colors">
                                <span className="text-base">🚀</span>
                                <span className="truncate">Trạm Vũ Trụ & Thám Hiểm</span>
                            </div>
                        </div>

                        {!isMetaverseEnabled && (
                            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-2.5 text-xs text-amber-900 font-medium">
                                <ShieldAlert size={16} className="text-amber-600 shrink-0" />
                                <span>Tạm thời khóa trong cấu hình hệ thống để chuẩn bị nội dung năm học 2026-2027.</span>
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    <div className="pt-6 relative z-10">
                        {isMetaverseEnabled ? (
                            <button
                                type="button"
                                className="w-full py-3.5 px-6 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-md shadow-purple-600/20 active:scale-98 transition-all"
                            >
                                <span>Vào Làng Thú Cưng & Giải Trí</span>
                                <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="w-full py-3.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition-all"
                            >
                                <Lock size={16} className="text-amber-600" />
                                <span>Tạm Khóa (Xem Chi Tiết Nâng Cấp)</span>
                            </button>
                        )}
                    </div>
                </div>

            </div>

            {/* MAINTENANCE NOTIFICATION MODAL (Light Theme) */}
            {showMaintenanceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="relative w-full max-w-lg bg-white border border-amber-300 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-slate-900">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-600 font-bold">
                                    <Lock size={22} />
                                </div>
                                <h3 className="text-base font-extrabold text-slate-900">
                                    {STUDENT_PORTAL_CONFIG.MAINTENANCE_TITLE}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowMaintenanceModal(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                            <p>
                                {STUDENT_PORTAL_CONFIG.MAINTENANCE_MESSAGE}
                            </p>
                            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 space-y-1 text-xs text-blue-900">
                                <p className="font-bold text-blue-950">💡 Lời khuyên dành cho em:</p>
                                <p>Hãy truy cập <strong>Khu Vực Học Tập</strong> để xem sổ báo bài, chuẩn bị bài tập cho ngày mai và kiểm tra thời khóa biểu lớp nhé!</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setShowMaintenanceModal(false)}
                                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
                            >
                                Đã Hiểu
                            </button>
                            <Link
                                href="/student/study"
                                onClick={() => setShowMaintenanceModal(false)}
                                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all"
                            >
                                <span>Sang Khu Vực Học Tập</span>
                                <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
