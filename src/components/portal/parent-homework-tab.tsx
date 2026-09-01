'use client';

import React, { useState, useEffect } from 'react';
import {
    BookOpen,
    Calendar,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Sparkles,
    CheckCircle2,
    Share2,
    Clock,
    Printer
} from 'lucide-react';
import { DailyHomeworkReport, getSubjectBadgeStyle } from '@/types/homework';
import { HomeworkService } from '@/services/homework-service';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ParentHomeworkTabProps {
    classId: string;
    className: string;
    studentName: string;
}

export function ParentHomeworkTab({ classId, className, studentName }: ParentHomeworkTabProps) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);
    const [report, setReport] = useState<DailyHomeworkReport | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (classId) {
            loadReport(selectedDate);
        }
    }, [classId, selectedDate]);

    const loadReport = async (dateStr: string) => {
        setLoading(true);
        try {
            const data = await HomeworkService.getDailyHomeworkReport(classId, dateStr, className);
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

    const handleCopyReport = () => {
        if (!report) return;
        const text = HomeworkService.formatHomeworkReportForZalo(report);
        navigator.clipboard.writeText(text);
        toast.success('📋 Đã sao chép nội dung báo bài vào bộ nhớ tạm!');
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-200">
            
            {/* Header & Date Controls (Light Theme) */}
            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold text-lg shadow-2xs">
                            📖
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                Sổ Báo Bài & Dặn Dò • Lớp {className}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Học sinh: <span className="font-bold text-slate-800">{studentName}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopyReport}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all shadow-2xs"
                        >
                            <Share2 size={13} />
                            <span>Sao chép Zalo</span>
                        </button>
                    </div>
                </div>

                {/* Date Navigation Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleShiftDate(-1)}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition active:scale-95"
                            title="Hôm trước"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
                            <button
                                onClick={() => {
                                    const d = new Date();
                                    d.setDate(d.getDate() - 1);
                                    setSelectedDate(d.toISOString().slice(0, 10));
                                }}
                                className={cn(
                                    "px-3 py-1 rounded-xl text-xs font-bold transition-all",
                                    selectedDate === new Date(Date.now() - 86400000).toISOString().slice(0, 10)
                                        ? "bg-white text-blue-700 shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                Hôm qua
                            </button>
                            <button
                                onClick={() => setSelectedDate(todayStr)}
                                className={cn(
                                    "px-3 py-1 rounded-xl text-xs font-bold transition-all",
                                    isToday
                                        ? "bg-white text-blue-700 shadow-2xs"
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
                                    "px-3 py-1 rounded-xl text-xs font-bold transition-all",
                                    selectedDate === new Date(Date.now() + 86400000).toISOString().slice(0, 10)
                                        ? "bg-white text-blue-700 shadow-2xs"
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
                            <ChevronRight size={16} />
                        </button>

                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                    </div>

                    <div className="text-xs font-black text-slate-800 capitalize flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{dateFormatted}</span>
                    </div>
                </div>

                {/* Announcement if any */}
                {report?.general_announcement && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold uppercase tracking-tight block text-[11px] text-amber-950">
                                📢 Dặn dò của Giáo viên chủ nhiệm & Lớp trưởng:
                            </span>
                            <span className="leading-relaxed font-medium">{report.general_announcement}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* List of Subjects & Homework */}
            {loading ? (
                <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                    <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-bold text-slate-500">Đang tải sổ báo bài của con...</p>
                </div>
            ) : !report?.entries || report.entries.length === 0 ? (
                <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                    <p className="text-3xl">🏖️</p>
                    <h4 className="text-sm font-extrabold text-slate-800">Không có bài tập trong ngày này</h4>
                    <p className="text-xs text-slate-500">Hôm nay lớp không có bài tập về nhà hoặc chưa cập nhật báo bài.</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs sm:text-sm">
                            <thead>
                                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px]">
                                    <th className="py-3 px-4 w-14 text-center">Tiết</th>
                                    <th className="py-3 px-4 w-40">Môn Học</th>
                                    <th className="py-3 px-5">Bài Tập Về Nhà</th>
                                    <th className="py-3 px-4 w-52">Dụng Cụ Cần Mang</th>
                                    <th className="py-3 px-4 w-32 text-center">Kiểm Tra</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {report.entries.map((entry, idx) => {
                                    const badge = getSubjectBadgeStyle(entry.subject_name);
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3.5 px-4 text-center font-bold text-slate-600">
                                                <span className="w-6 h-6 rounded-lg bg-slate-100 inline-flex items-center justify-center text-xs font-black">
                                                    {entry.period || idx + 1}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={cn(
                                                    "px-2.5 py-0.5 rounded-lg text-xs font-extrabold border inline-flex items-center gap-1",
                                                    badge.bg, badge.text, badge.border
                                                )}>
                                                    <span>{badge.icon}</span>
                                                    <span>{entry.subject_name}</span>
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-5 font-medium text-slate-800 leading-relaxed">
                                                {entry.homework_tasks || 'Không có bài tập'}
                                            </td>
                                            <td className="py-3.5 px-4 text-xs text-slate-600">
                                                {entry.notes_and_tools ? (
                                                    <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/60">
                                                        <span>🧰</span>
                                                        <span>{entry.notes_and_tools}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic">—</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                {entry.is_test_scheduled ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] border border-amber-300 animate-pulse">
                                                        <AlertTriangle size={10} className="text-amber-600" />
                                                        <span>Có Kiểm Tra</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 font-mono">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
