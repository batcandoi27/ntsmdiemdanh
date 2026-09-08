'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
    Printer,
    Sun,
    Moon
} from 'lucide-react';
import { DailyHomeworkReport, ClassTimetable, HomeworkSubjectEntry, getSubjectBadgeStyle } from '@/types/homework';
import { HomeworkService } from '@/services/homework-service';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ParentHomeworkTabProps {
    classId: string;
    className: string;
    studentName: string;
}

interface PeriodHomeworkItem {
    period: number;
    subjectName: string;
    homeworkTasks: string;
    notesAndTools: string;
    isTestScheduled: boolean;
    hasSubject: boolean;
}

export function ParentHomeworkTab({ classId, className, studentName }: ParentHomeworkTabProps) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);
    const [report, setReport] = useState<DailyHomeworkReport | null>(null);
    const [timetable, setTimetable] = useState<ClassTimetable | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (classId) {
            loadData(selectedDate);
        }
    }, [classId, selectedDate]);

    const loadData = async (dateStr: string) => {
        setLoading(true);
        try {
            const [reportData, timetableData] = await Promise.all([
                HomeworkService.getDailyHomeworkReport(classId, dateStr, className),
                HomeworkService.getClassTimetable(classId, className)
            ]);
            setReport(reportData);
            setTimetable(timetableData);
        } catch (err) {
            console.error('Error loading homework data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleShiftDate = (days: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().slice(0, 10));
    };

    const dateObj = new Date(selectedDate);
    const dayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay() + 1; // 2..7

    const dateFormatted = dateObj.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    const isToday = selectedDate === todayStr;

    // Build structured 5 morning + 5 afternoon periods
    const { morningPeriods, afternoonPeriods } = useMemo(() => {
        const dayTkb = timetable?.days.find(d => d.day_of_week === dayOfWeek);
        const entries = report?.entries || [];

        // Build Morning (1..5)
        const morning: PeriodHomeworkItem[] = [1, 2, 3, 4, 5].map(pNum => {
            const tkbSubject = dayTkb?.morning.find(p => p.period === pNum);
            const entry = entries.find(e => e.period === pNum || (e.subject_name && tkbSubject?.subject_name && e.subject_name.toLowerCase() === tkbSubject.subject_name.toLowerCase()));

            const subjectName = entry?.subject_name || tkbSubject?.subject_name || '';
            const hasSubject = Boolean(subjectName && subjectName !== 'Nghỉ' && subjectName !== '-');

            return {
                period: pNum,
                subjectName,
                homeworkTasks: entry?.homework_tasks || (hasSubject ? 'Không có bài tập' : '—'),
                notesAndTools: entry?.notes_and_tools || (hasSubject ? '' : '—'),
                isTestScheduled: Boolean(entry?.is_test_scheduled),
                hasSubject
            };
        });

        // Build Afternoon (1..5)
        const afternoon: PeriodHomeworkItem[] = [1, 2, 3, 4, 5].map(pNum => {
            const tkbSubject = dayTkb?.afternoon.find(p => p.period === pNum);
            const entry = entries.find(e => (e.period === pNum + 5 || e.period === pNum) && e.subject_name && tkbSubject?.subject_name && e.subject_name.toLowerCase() === tkbSubject.subject_name.toLowerCase());

            const subjectName = entry?.subject_name || tkbSubject?.subject_name || '';
            const hasSubject = Boolean(subjectName && subjectName !== 'Nghỉ' && subjectName !== '-');

            return {
                period: pNum,
                subjectName,
                homeworkTasks: entry?.homework_tasks || (hasSubject ? 'Không có bài tập' : '—'),
                notesAndTools: entry?.notes_and_tools || (hasSubject ? '' : '—'),
                isTestScheduled: Boolean(entry?.is_test_scheduled),
                hasSubject
            };
        });

        return { morningPeriods: morning, afternoonPeriods: afternoon };
    }, [timetable, report, dayOfWeek]);

    const handleCopyReport = () => {
        if (!report) return;
        const text = HomeworkService.formatHomeworkReportForZalo(report);
        navigator.clipboard.writeText(text);
        toast.success('📋 Đã sao chép nội dung báo bài vào bộ nhớ tạm!');
    };

    const renderPeriodTable = (title: string, icon: React.ReactNode, periods: PeriodHomeworkItem[], sessionColor: 'amber' | 'indigo') => {
        const hasAnySubject = periods.some(p => p.hasSubject);

        return (
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm space-y-0">
                {/* Session Sub-Header */}
                <div className={cn(
                    "px-5 py-3 border-b flex items-center justify-between",
                    sessionColor === 'amber' ? "bg-amber-50/80 border-amber-200/70 text-amber-900" : "bg-indigo-50/80 border-indigo-200/70 text-indigo-900"
                )}>
                    <div className="flex items-center gap-2">
                        {icon}
                        <h4 className="font-extrabold text-xs uppercase tracking-wider">{title}</h4>
                    </div>
                    {!hasAnySubject && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/60 border text-slate-500">
                            Nghỉ học / Không có tiết
                        </span>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                            <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px]">
                                <th className="py-3 px-4 w-16 text-center">Tiết</th>
                                <th className="py-3 px-4 w-44">Môn Học</th>
                                <th className="py-3 px-5">Bài Tập Về Nhà</th>
                                <th className="py-3 px-4 w-52">Dụng Cụ Cần Mang</th>
                                <th className="py-3 px-4 w-32 text-center">Kiểm Tra</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {periods.map((p) => {
                                const badge = p.hasSubject ? getSubjectBadgeStyle(p.subjectName) : null;
                                return (
                                    <tr key={p.period} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3.5 px-4 text-center font-bold text-slate-600">
                                            <span className={cn(
                                                "w-6 h-6 rounded-lg inline-flex items-center justify-center text-xs font-black",
                                                p.hasSubject ? "bg-slate-100 text-slate-800" : "bg-slate-50 text-slate-400"
                                            )}>
                                                {p.period}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            {p.hasSubject ? (
                                                <span className={cn(
                                                    "px-2.5 py-0.5 rounded-lg text-xs font-extrabold border inline-flex items-center gap-1 shadow-2xs",
                                                    badge?.bg, badge?.text, badge?.border
                                                )}>
                                                    <span>{badge?.icon}</span>
                                                    <span>{p.subjectName}</span>
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">
                                                    — (Không có tiết)
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-5 font-medium text-slate-800 leading-relaxed">
                                            {p.hasSubject ? (
                                                p.homeworkTasks === 'Không có bài tập' ? (
                                                    <span className="text-slate-500 font-normal">{p.homeworkTasks}</span>
                                                ) : (
                                                    <span className="font-semibold text-slate-900">{p.homeworkTasks}</span>
                                                )
                                            ) : (
                                                <span className="text-slate-300 font-mono">—</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-xs text-slate-600">
                                            {p.hasSubject && p.notesAndTools ? (
                                                <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/60 font-medium text-slate-700">
                                                    <span>🧰</span>
                                                    <span>{p.notesAndTools}</span>
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 font-mono">—</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            {p.isTestScheduled ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] border border-amber-300 animate-pulse">
                                                    <AlertTriangle size={11} className="text-amber-600" />
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
        );
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
                                Học sinh: <span className="font-bold text-slate-800">{studentName}</span> • Trọn gói 10 tiết Sáng & Chiều
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
                        <button
                            onClick={() => window.print()}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all shadow-2xs"
                        >
                            <Printer size={13} />
                            <span>In Báo Bài</span>
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

            {/* Content: Both Morning and Afternoon Tables */}
            {loading ? (
                <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                    <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-bold text-slate-500">Đang tải sổ báo bài của con...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* 1. BUỔI SÁNG (5 TIẾT) */}
                    {renderPeriodTable(
                        "☀️ Buổi Sáng (5 Tiết)",
                        <Sun size={15} className="text-amber-600" />,
                        morningPeriods,
                        'amber'
                    )}

                    {/* 2. BUỔI CHIỀU (5 TIẾT) */}
                    {renderPeriodTable(
                        "🌙 Buổi Chiều (5 Tiết)",
                        <Moon size={15} className="text-indigo-600" />,
                        afternoonPeriods,
                        'indigo'
                    )}
                </div>
            )}
        </div>
    );
}
