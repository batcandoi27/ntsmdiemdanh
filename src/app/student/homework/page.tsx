'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    BookOpen,
    Calendar,
    Sparkles,
    Send,
    Edit3,
    AlertCircle,
    CheckCircle2,
    Clock,
    Share2,
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    Table as TableIcon,
    Filter,
    Printer,
    Check,
    AlertTriangle,
    Zap,
    Users
} from 'lucide-react';
import Link from 'next/link';
import { DailyHomeworkReport, getSubjectBadgeStyle } from '@/types/homework';
import { HomeworkService } from '@/services/homework-service';
import { DailyHomeworkModal } from '@/components/student/daily-homework-modal';
import { usePrivacy } from '@/context/privacy-context';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function StudentHomeworkPage() {
    const { maskSchoolName } = usePrivacy();
    const todayStr = new Date().toISOString().slice(0, 10);
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);
    const [report, setReport] = useState<DailyHomeworkReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table'); // Default Table on Desktop
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
    const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

    const sampleClassId = 'f83a9057-3bc2-4c6c-bbe2-d32ff42daf32';
    const sampleClassName = '9A1';

    useEffect(() => {
        loadReport(selectedDate);
        loadLocalCompletedStatus(selectedDate);
    }, [selectedDate]);

    const loadLocalCompletedStatus = (dateStr: string) => {
        try {
            const saved = localStorage.getItem(`tbc_student_hw_done_${dateStr}`);
            if (saved) setCompletedTasks(JSON.parse(saved));
            else setCompletedTasks({});
        } catch {
            setCompletedTasks({});
        }
    };

    const toggleTaskDone = (key: string) => {
        setCompletedTasks(prev => {
            const updated = { ...prev, [key]: !prev[key] };
            localStorage.setItem(`tbc_student_hw_done_${selectedDate}`, JSON.stringify(updated));
            if (!prev[key]) {
                toast.success('🎉 Tuyệt vời! Bạn đã hoàn thành bài tập môn này!');
            }
            return updated;
        });
    };

    const loadReport = async (dateStr: string) => {
        setLoading(true);
        try {
            const data = await HomeworkService.getDailyHomeworkReport(sampleClassId, dateStr, sampleClassName);
            setReport(data);
        } catch (err) {
            console.error('Error loading homework:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleShiftDate = (days: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().slice(0, 10));
    };

    const dateFormatted = new Date(selectedDate).toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    const isToday = selectedDate === todayStr;

    // Filtered entries
    const entries = useMemo(() => {
        if (!report?.entries) return [];
        if (selectedSubjectFilter === 'ALL') return report.entries;
        return report.entries.filter(e => e.subject_name.toLowerCase() === selectedSubjectFilter.toLowerCase());
    }, [report, selectedSubjectFilter]);

    const completedCount = useMemo(() => {
        if (!report?.entries) return 0;
        return report.entries.filter((_, idx) => completedTasks[`task_${idx}`]).length;
    }, [report, completedTasks]);

    const testsCount = useMemo(() => {
        if (!report?.entries) return 0;
        return report.entries.filter(e => e.is_test_scheduled).length;
    }, [report]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
            {/* Header Navbar */}
            <div className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/student"
                            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center gap-1.5 text-xs font-bold"
                        >
                            <ArrowLeft size={16} />
                            <span className="hidden sm:inline">Cổng Học Sinh</span>
                        </Link>
                        <span className="h-4 w-px bg-slate-200" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                📖
                            </div>
                            <div>
                                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                                    Sổ Báo Bài & Dặn Dò
                                </h1>
                                <p className="text-[11px] text-slate-500 font-medium">
                                    Lớp {sampleClassName} • {maskSchoolName('THCS Trần Bội Cơ')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.print()}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all"
                            title="In bảng báo bài hôm nay"
                        >
                            <Printer size={14} /> In Báo Bài
                        </button>

                        <button
                            onClick={() => setIsEditorOpen(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition-all"
                        >
                            <Edit3 size={15} />
                            <span>＋ Ghi Báo Bài (BCS)</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
                
                {/* HERO KPI & DATE NAVIGATOR (LIGHT THEME) */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
                    
                    {/* Top Row: Segmented Date Bar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleShiftDate(-1)}
                                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition active:scale-95"
                                title="Hôm trước"
                            >
                                <ChevronLeft size={18} />
                            </button>

                            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
                                <button
                                    onClick={() => {
                                        const d = new Date();
                                        d.setDate(d.getDate() - 1);
                                        setSelectedDate(d.toISOString().slice(0, 10));
                                    }}
                                    className={cn(
                                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                                        selectedDate === new Date(Date.now() - 86400000).toISOString().slice(0, 10)
                                            ? "bg-white text-blue-700 shadow-xs"
                                            : "text-slate-600 hover:text-slate-900"
                                    )}
                                >
                                    Hôm qua
                                </button>
                                <button
                                    onClick={() => setSelectedDate(todayStr)}
                                    className={cn(
                                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                                        isToday
                                            ? "bg-white text-blue-700 shadow-xs"
                                            : "text-slate-600 hover:text-slate-900"
                                    )}
                                >
                                    Hôm nay
                                </button>
                                <button
                                    onClick={() => {
                                        const d = new Date();
                                        d.setDate(d.getDate() + 1);
                                        setSelectedDate(d.toISOString().slice(0, 10));
                                    }}
                                    className={cn(
                                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                                        selectedDate === new Date(Date.now() + 86400000).toISOString().slice(0, 10)
                                            ? "bg-white text-blue-700 shadow-xs"
                                            : "text-slate-600 hover:text-slate-900"
                                    )}
                                >
                                    Ngày mai
                                </button>
                            </div>

                            <button
                                onClick={() => handleShiftDate(1)}
                                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition active:scale-95"
                                title="Hôm sau"
                            >
                                <ChevronRight size={18} />
                            </button>

                            <div className="relative pl-1">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Current Date Display */}
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-sm sm:text-base font-black text-slate-900 capitalize">
                                {dateFormatted}
                            </span>
                            {isToday && (
                                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-black uppercase">
                                    Đang học
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats Banner */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-xs">
                                📚
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-blue-900">Tổng Số Môn</p>
                                <p className="text-lg font-black text-blue-700">{report?.entries?.length || 0} môn</p>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-xs">
                                ✅
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-emerald-900">Đã Hoàn Thành</p>
                                <p className="text-lg font-black text-emerald-700">
                                    {completedCount}/{report?.entries?.length || 0} bài
                                </p>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-xs">
                                ⚠️
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-amber-900">Kiểm Tra 15P</p>
                                <p className="text-lg font-black text-amber-700">{testsCount} môn</p>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-xs">
                                ✍️
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-purple-900">Người Ghi Bài</p>
                                <p className="text-xs font-black text-purple-800 truncate">
                                    {report?.created_by_name || 'Lớp Phó Học Tập'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* General Announcement from Teacher / Reporter */}
                    {report?.general_announcement && (
                        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-amber-900 flex items-start gap-3">
                            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-0.5 text-xs sm:text-sm">
                                <p className="font-bold text-amber-950 uppercase tracking-tight text-[11px]">
                                    📢 Dặn Dò Chung Của Lớp & GVCN:
                                </p>
                                <p className="text-amber-900 leading-relaxed font-medium">
                                    {report.general_announcement}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* CONTROLS BAR: FILTERS & VIEW MODE (TABLE VS CARDS) */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-500 pl-1 flex items-center gap-1">
                            <Filter size={13} /> Lọc môn:
                        </span>
                        <button
                            onClick={() => setSelectedSubjectFilter('ALL')}
                            className={cn(
                                "px-3 py-1 rounded-xl text-xs font-bold transition-all",
                                selectedSubjectFilter === 'ALL'
                                    ? "bg-slate-900 text-white shadow-xs"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            )}
                        >
                            Tất cả ({report?.entries?.length || 0})
                        </button>
                        {Array.from(new Set(report?.entries?.map(e => e.subject_name) || [])).map(sub => {
                            const badge = getSubjectBadgeStyle(sub);
                            const isSelected = selectedSubjectFilter.toLowerCase() === sub.toLowerCase();
                            return (
                                <button
                                    key={sub}
                                    onClick={() => setSelectedSubjectFilter(sub)}
                                    className={cn(
                                        "px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border",
                                        isSelected
                                            ? `${badge.bg} ${badge.text} ${badge.border} ring-2 ring-blue-400 font-extrabold`
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    <span>{badge.icon}</span>
                                    <span>{sub}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* View Switcher (Desktop PC Priority) */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                            onClick={() => setViewMode('table')}
                            className={cn(
                                "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                                viewMode === 'table'
                                    ? "bg-white text-blue-700 shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                            )}
                            title="Chế độ Bảng Tổng Hợp Chi Tiết (Tối ưu PC)"
                        >
                            <TableIcon size={14} />
                            <span className="hidden sm:inline">Bảng Tổng Hợp (PC)</span>
                        </button>
                        <button
                            onClick={() => setViewMode('cards')}
                            className={cn(
                                "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                                viewMode === 'cards'
                                    ? "bg-white text-blue-700 shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                            )}
                            title="Chế độ Thẻ Danh Sách"
                        >
                            <LayoutGrid size={14} />
                            <span className="hidden sm:inline">Thẻ Danh Sách</span>
                        </button>
                    </div>
                </div>

                {/* MAIN CONTENT AREA */}
                {loading ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-xs font-bold text-slate-500">Đang tải sổ báo bài của lớp...</p>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                        <div className="text-4xl">🏖️</div>
                        <h3 className="text-base font-extrabold text-slate-800">Không có bài tập trong ngày này</h3>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Lớp không có bài tập hoặc Ban Cán Sự chưa cập nhật báo bài cho ngày {dateFormatted}.
                        </p>
                        <button
                            onClick={() => setIsEditorOpen(true)}
                            className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-blue-700"
                        >
                            ＋ Ghi Báo Bài Ngay
                        </button>
                    </div>
                ) : viewMode === 'table' ? (
                    /* 1. PC STRUCTURED TABLE VIEW (ENTERPRISE GRADE) */
                    <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs sm:text-sm">
                                <thead>
                                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px] tracking-wider">
                                        <th className="py-3.5 px-4 w-16 text-center">Tiết</th>
                                        <th className="py-3.5 px-4 w-44">Môn Học</th>
                                        <th className="py-3.5 px-5">Nội Dung Bài Tập Về Nhà</th>
                                        <th className="py-3.5 px-4 w-60">Dụng Cụ & Chuẩn Bị</th>
                                        <th className="py-3.5 px-4 w-36 text-center">Kiểm Tra</th>
                                        <th className="py-3.5 px-4 w-28 text-center">Hoàn Tất</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {entries.map((entry, idx) => {
                                        const badge = getSubjectBadgeStyle(entry.subject_name);
                                        const isDone = completedTasks[`task_${idx}`];

                                        return (
                                            <tr
                                                key={idx}
                                                className={cn(
                                                    "transition-colors hover:bg-slate-50/80 group",
                                                    isDone ? "bg-emerald-50/30 opacity-75" : ""
                                                )}
                                            >
                                                {/* Tiết */}
                                                <td className="py-4 px-4 text-center font-black text-slate-500">
                                                    <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 inline-flex items-center justify-center font-bold text-xs border border-slate-200">
                                                        {entry.period || idx + 1}
                                                    </span>
                                                </td>

                                                {/* Môn Học */}
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            "px-2.5 py-1 rounded-xl text-xs font-extrabold border flex items-center gap-1.5 shadow-2xs",
                                                            badge.bg, badge.text, badge.border
                                                        )}>
                                                            <span>{badge.icon}</span>
                                                            <span>{entry.subject_name}</span>
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Nội dung bài tập */}
                                                <td className="py-4 px-5 font-medium text-slate-800 leading-relaxed">
                                                    <p className={cn(isDone ? "line-through text-slate-400" : "text-slate-800")}>
                                                        {entry.homework_tasks || 'Không có bài tập'}
                                                    </p>
                                                </td>

                                                {/* Dụng cụ & chuẩn bị */}
                                                <td className="py-4 px-4 text-xs text-slate-600">
                                                    {entry.notes_and_tools ? (
                                                        <div className="flex items-start gap-1.5 text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200/60">
                                                            <span className="shrink-0 text-slate-400">🧰</span>
                                                            <span className="leading-snug">{entry.notes_and_tools}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic">—</span>
                                                    )}
                                                </td>

                                                {/* Cảnh báo kiểm tra */}
                                                <td className="py-4 px-4 text-center">
                                                    {entry.is_test_scheduled ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[11px] border border-amber-300 shadow-2xs animate-pulse">
                                                            <AlertTriangle size={12} className="text-amber-600" />
                                                            <span>Có Kiểm Tra</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 font-mono">—</span>
                                                    )}
                                                </td>

                                                {/* Checkbox hoàn tất */}
                                                <td className="py-4 px-4 text-center">
                                                    <button
                                                        onClick={() => toggleTaskDone(`task_${idx}`)}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 mx-auto border active:scale-90",
                                                            isDone
                                                                ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                                                                : "bg-white text-slate-600 border-slate-300 hover:border-emerald-500 hover:text-emerald-700"
                                                        )}
                                                    >
                                                        <Check size={13} className={isDone ? "stroke-3" : "opacity-40"} />
                                                        <span>{isDone ? "Xong" : "Làm"}</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* 2. CARD GRID VIEW (RESPONSIVE FOR MOBILE / TABLET) */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {entries.map((entry, idx) => {
                            const badge = getSubjectBadgeStyle(entry.subject_name);
                            const isDone = completedTasks[`task_${idx}`];

                            return (
                                <div
                                    key={idx}
                                    className={cn(
                                        "bg-white border rounded-3xl p-5 shadow-xs transition-all space-y-3.5 relative overflow-hidden",
                                        isDone ? "border-emerald-300 bg-emerald-50/20" : "border-slate-200 hover:shadow-md"
                                    )}
                                >
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center border border-slate-200">
                                                {entry.period || idx + 1}
                                            </span>
                                            <span className={cn(
                                                "px-2.5 py-0.5 rounded-lg text-xs font-extrabold border flex items-center gap-1",
                                                badge.bg, badge.text, badge.border
                                            )}>
                                                <span>{badge.icon}</span>
                                                <span>{entry.subject_name}</span>
                                            </span>
                                        </div>

                                        {entry.is_test_scheduled && (
                                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] border border-amber-300 flex items-center gap-1">
                                                <AlertTriangle size={10} /> Kiểm tra 15p
                                            </span>
                                        )}
                                    </div>

                                    {/* Task content */}
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Bài tập về nhà:
                                        </p>
                                        <p className={cn(
                                            "text-sm font-semibold leading-relaxed",
                                            isDone ? "line-through text-slate-400" : "text-slate-800"
                                        )}>
                                            {entry.homework_tasks || 'Không có bài tập'}
                                        </p>
                                    </div>

                                    {/* Tools & Notes */}
                                    {entry.notes_and_tools && (
                                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 flex items-start gap-1.5">
                                            <span className="shrink-0">🧰</span>
                                            <span>{entry.notes_and_tools}</span>
                                        </div>
                                    )}

                                    {/* Card Footer: Done toggle */}
                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-[11px] text-slate-400 font-medium">
                                            {isDone ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
                                        </span>
                                        <button
                                            onClick={() => toggleTaskDone(`task_${idx}`)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border active:scale-95",
                                                isDone
                                                    ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                                                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                                            )}
                                        >
                                            <Check size={14} className={isDone ? "stroke-3" : ""} />
                                            <span>{isDone ? "Đã xong" : "Tích đã làm"}</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* MODAL GHI BÁO BÀI ZERO-TOUCH CHO BCS & GVCN */}
            <DailyHomeworkModal
                isOpen={isEditorOpen}
                onClose={() => {
                    setIsEditorOpen(false);
                    loadReport(selectedDate);
                }}
                classId={sampleClassId}
                className={sampleClassName}
                studentName="Lớp Phó Học Tập"
                isReporterOrTeacher={true}
            />
        </div>
    );
}
