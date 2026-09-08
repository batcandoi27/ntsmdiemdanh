'use client';

import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Clock,
    Sun,
    Moon,
    Sparkles,
    Printer,
    MapPin,
    User,
    LayoutGrid,
    List,
    Layers
} from 'lucide-react';
import { ClassTimetable, DayTimetable, TimetablePeriod, getSubjectBadgeStyle } from '@/types/homework';
import { HomeworkService } from '@/services/homework-service';
import { cn } from '@/lib/utils';

interface ParentTimetableTabProps {
    classId: string;
    className: string;
    studentName: string;
}

const DAYS_HEADER = [
    { dayOfWeek: 2, label: 'Thứ Hai', short: 'T2' },
    { dayOfWeek: 3, label: 'Thứ Ba', short: 'T3' },
    { dayOfWeek: 4, label: 'Thứ Tư', short: 'T4' },
    { dayOfWeek: 5, label: 'Thứ Năm', short: 'T5' },
    { dayOfWeek: 6, label: 'Thứ Sáu', short: 'T6' },
    { dayOfWeek: 7, label: 'Thứ Bảy', short: 'T7' }
];

export function ParentTimetableTab({ classId, className, studentName }: ParentTimetableTabProps) {
    const [timetable, setTimetable] = useState<ClassTimetable | null>(null);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'cards'>('grid');
    const todayDayOfWeek = new Date().getDay() === 0 ? 7 : new Date().getDay() + 1; // 2..7

    useEffect(() => {
        if (classId) {
            loadTimetable();
        }
    }, [classId]);

    const loadTimetable = async () => {
        setLoading(true);
        try {
            const data = await HomeworkService.getClassTimetable(classId, className);
            setTimetable(data);
        } catch (err) {
            console.error('Error loading timetable:', err);
        } finally {
            setLoading(false);
        }
    };

    // Helper to get period data for a specific day and session
    const getPeriod = (dayOfWeek: number, session: 'morning' | 'afternoon', periodNum: number): TimetablePeriod | undefined => {
        if (!timetable) return undefined;
        const day = timetable.days.find(d => d.day_of_week === dayOfWeek);
        if (!day) return undefined;
        const list = session === 'morning' ? day.morning : day.afternoon;
        return list.find(p => p.period === periodNum);
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-200">
            {/* Header (Light Theme) */}
            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center font-bold text-lg shadow-2xs">
                            📅
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                Thời Khóa Biểu Tuần • Lớp {className}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Học sinh: <span className="font-bold text-slate-800">{studentName}</span> • 6 Ngày học trong tuần
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Switcher: Grid vs Cards */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all",
                                    viewMode === 'grid'
                                        ? "bg-white text-indigo-600 shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900"
                                )}
                                title="Xem dạng bảng lưới (Ma trận)"
                            >
                                <LayoutGrid size={13} />
                                <span>Lưới Grid</span>
                            </button>
                            <button
                                onClick={() => setViewMode('cards')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all",
                                    viewMode === 'cards'
                                        ? "bg-white text-indigo-600 shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900"
                                )}
                                title="Xem dạng thẻ từng ngày"
                            >
                                <List size={13} />
                                <span>Thẻ Ngày</span>
                            </button>
                        </div>

                        <button
                            onClick={() => window.print()}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all shadow-2xs w-fit"
                        >
                            <Printer size={13} />
                            <span>In TKB</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Weekly Timetable Content */}
            {loading ? (
                <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                    <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-bold text-slate-500">Đang tải thời khóa biểu của lớp...</p>
                </div>
            ) : !timetable || timetable.days.length === 0 ? (
                <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                    <p className="text-3xl">📅</p>
                    <h4 className="text-sm font-extrabold text-slate-800">Chưa có dữ liệu thời khóa biểu</h4>
                    <p className="text-xs text-slate-500">Giáo viên chủ nhiệm chưa cập nhật thời khóa biểu cho lớp {className}.</p>
                </div>
            ) : viewMode === 'grid' ? (
                /* ========================================================================= */
                /* MODE 1: TRADITIONAL GRID MATRIX TABLE (BẢNG LƯỚI MA TRẬN CHUẨN TRƯỜNG HỌC) */
                /* ========================================================================= */
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                            {/* Table Header: Days of Week */}
                            <thead>
                                <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px]">
                                    <th className="py-3.5 px-3 w-28 text-center border-r border-slate-200 bg-slate-200/60">
                                        Buổi / Tiết
                                    </th>
                                    {DAYS_HEADER.map(d => {
                                        const isToday = d.dayOfWeek === todayDayOfWeek;
                                        return (
                                            <th
                                                key={d.dayOfWeek}
                                                className={cn(
                                                    "py-3.5 px-3 text-center border-r border-slate-200 last:border-r-0 transition-colors",
                                                    isToday ? "bg-blue-600 text-white shadow-xs" : "text-slate-800"
                                                )}
                                            >
                                                <div className="flex flex-col items-center justify-center gap-0.5">
                                                    <span className="font-black text-xs">{d.label}</span>
                                                    {isToday && (
                                                        <span className="px-1.5 py-0.2 bg-white/20 rounded-md text-[9px] font-bold tracking-wider uppercase">
                                                            Hôm nay
                                                        </span>
                                                    )}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {/* ================= BUỔI SÁNG HEADER ================= */}
                                <tr className="bg-amber-50/70 border-y border-amber-200/80">
                                    <td colSpan={7} className="py-2 px-4 font-extrabold text-amber-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                        <Sun size={14} className="text-amber-600" />
                                        <span>☀️ Buổi Sáng (5 Tiết)</span>
                                    </td>
                                </tr>

                                {/* 5 Morning Periods */}
                                {[1, 2, 3, 4, 5].map(periodNum => (
                                    <tr key={`morning_${periodNum}`} className="hover:bg-slate-50/60 transition-colors">
                                        {/* Period Label */}
                                        <td className="py-2.5 px-2 text-center border-r border-slate-200 font-bold bg-slate-50/80 text-slate-700">
                                            <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 inline-flex items-center justify-center text-xs font-black shadow-2xs">
                                                {periodNum}
                                            </span>
                                            <span className="block text-[10px] text-slate-400 font-medium mt-0.5">Tiết {periodNum}</span>
                                        </td>

                                        {/* 6 Day Columns */}
                                        {DAYS_HEADER.map(d => {
                                            const p = getPeriod(d.dayOfWeek, 'morning', periodNum);
                                            const isToday = d.dayOfWeek === todayDayOfWeek;
                                            const badge = p?.subject_name ? getSubjectBadgeStyle(p.subject_name) : null;

                                            return (
                                                <td
                                                    key={`${d.dayOfWeek}_${periodNum}`}
                                                    className={cn(
                                                        "py-2 px-2.5 border-r border-slate-200/80 last:border-r-0 align-top transition-colors",
                                                        isToday ? "bg-blue-50/30" : ""
                                                    )}
                                                >
                                                    {p?.subject_name ? (
                                                        <div className="space-y-1">
                                                            <div className={cn(
                                                                "px-2 py-1 rounded-xl font-bold text-xs border flex items-center gap-1.5 shadow-2xs",
                                                                badge?.bg, badge?.text, badge?.border
                                                            )}>
                                                                <span>{badge?.icon}</span>
                                                                <span className="truncate">{p.subject_name}</span>
                                                            </div>
                                                            {(p.room_name || p.teacher_name) && (
                                                                <div className="text-[10px] text-slate-500 font-medium pl-1 flex items-center justify-between gap-1">
                                                                    {p.room_name && <span>P.{p.room_name}</span>}
                                                                    {p.teacher_name && <span className="truncate text-slate-400">({p.teacher_name})</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="h-9 flex items-center justify-center text-slate-300 font-mono text-xs">
                                                            —
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}

                                {/* ================= BUỔI CHIỀU HEADER ================= */}
                                <tr className="bg-indigo-50/70 border-y border-indigo-200/80">
                                    <td colSpan={7} className="py-2 px-4 font-extrabold text-indigo-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                        <Moon size={14} className="text-indigo-600" />
                                        <span>🌙 Buổi Chiều (5 Tiết)</span>
                                    </td>
                                </tr>

                                {/* 5 Afternoon Periods */}
                                {[1, 2, 3, 4, 5].map(periodNum => (
                                    <tr key={`afternoon_${periodNum}`} className="hover:bg-slate-50/60 transition-colors">
                                        {/* Period Label */}
                                        <td className="py-2.5 px-2 text-center border-r border-slate-200 font-bold bg-slate-50/80 text-slate-700">
                                            <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 inline-flex items-center justify-center text-xs font-black shadow-2xs">
                                                {periodNum}
                                            </span>
                                            <span className="block text-[10px] text-slate-400 font-medium mt-0.5">Tiết {periodNum}</span>
                                        </td>

                                        {/* 6 Day Columns */}
                                        {DAYS_HEADER.map(d => {
                                            const p = getPeriod(d.dayOfWeek, 'afternoon', periodNum);
                                            const isToday = d.dayOfWeek === todayDayOfWeek;
                                            const badge = p?.subject_name ? getSubjectBadgeStyle(p.subject_name) : null;

                                            return (
                                                <td
                                                    key={`afternoon_${d.dayOfWeek}_${periodNum}`}
                                                    className={cn(
                                                        "py-2 px-2.5 border-r border-slate-200/80 last:border-r-0 align-top transition-colors",
                                                        isToday ? "bg-blue-50/30" : ""
                                                    )}
                                                >
                                                    {p?.subject_name ? (
                                                        <div className="space-y-1">
                                                            <div className={cn(
                                                                "px-2 py-1 rounded-xl font-bold text-xs border flex items-center gap-1.5 shadow-2xs",
                                                                badge?.bg, badge?.text, badge?.border
                                                            )}>
                                                                <span>{badge?.icon}</span>
                                                                <span className="truncate">{p.subject_name}</span>
                                                            </div>
                                                            {(p.room_name || p.teacher_name) && (
                                                                <div className="text-[10px] text-slate-500 font-medium pl-1 flex items-center justify-between gap-1">
                                                                    {p.room_name && <span>P.{p.room_name}</span>}
                                                                    {p.teacher_name && <span className="truncate text-slate-400">({p.teacher_name})</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="h-9 flex items-center justify-center text-slate-300 font-mono text-xs">
                                                            —
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* ========================================================================= */
                /* MODE 2: CARD VIEW PER DAY (DẠNG THẺ TỪNG NGÀY CHO MÀN HÌNH NHỎ) */
                /* ========================================================================= */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {timetable.days.map((day) => {
                        const isCurrentDay = day.day_of_week === todayDayOfWeek;

                        return (
                            <div
                                key={day.day_of_week}
                                className={cn(
                                    "bg-white border rounded-3xl p-5 shadow-xs space-y-3.5 transition-all",
                                    isCurrentDay
                                        ? "border-blue-300 ring-2 ring-blue-400/30 bg-blue-50/20"
                                        : "border-slate-200 hover:shadow-md"
                                )}
                            >
                                {/* Day Header */}
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center border",
                                            isCurrentDay
                                                ? "bg-blue-600 text-white border-blue-700 shadow-2xs"
                                                : "bg-slate-100 text-slate-700 border-slate-200"
                                        )}>
                                            T{day.day_of_week}
                                        </span>
                                        <h4 className="text-sm font-black text-slate-900">{day.day_label}</h4>
                                    </div>

                                    {isCurrentDay && (
                                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase">
                                            Hôm nay
                                        </span>
                                    )}
                                </div>

                                {/* Morning Sessions (5 Periods) */}
                                <div className="space-y-1.5">
                                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                                        <Sun size={12} className="text-amber-500" />
                                        <span>Buổi Sáng (5 Tiết):</span>
                                    </div>

                                    {day.morning.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic pl-3">Không có tiết</p>
                                    ) : (
                                        <div className="space-y-1">
                                            {day.morning.map((p) => {
                                                const badge = getSubjectBadgeStyle(p.subject_name);
                                                return (
                                                    <div
                                                        key={p.period}
                                                        className="flex items-center justify-between p-1.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-5 h-5 rounded-md bg-white border border-slate-200 font-bold text-[11px] text-slate-600 flex items-center justify-center">
                                                                {p.period}
                                                            </span>
                                                            <span className={cn(
                                                                "px-2 py-0.5 rounded-lg font-bold text-xs border flex items-center gap-1",
                                                                badge.bg, badge.text, badge.border
                                                            )}>
                                                                <span>{badge.icon}</span>
                                                                <span>{p.subject_name}</span>
                                                            </span>
                                                        </div>

                                                        <div className="text-[11px] text-slate-500 font-medium">
                                                            {p.room_name && <span className="mr-1">P.{p.room_name}</span>}
                                                            {p.teacher_name && <span>({p.teacher_name})</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Afternoon Sessions */}
                                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                                        <Moon size={12} className="text-indigo-500" />
                                        <span>Buổi Chiều (5 Tiết):</span>
                                    </div>

                                    {!day.afternoon || day.afternoon.length === 0 ? (
                                        <div className="p-2 rounded-xl bg-slate-50/60 border border-dashed border-slate-200 text-center">
                                            <p className="text-[11px] text-slate-400 font-medium italic">Nghỉ học / Không có tiết chiều</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {day.afternoon.map((p) => {
                                                const badge = getSubjectBadgeStyle(p.subject_name);
                                                return (
                                                    <div
                                                        key={p.period}
                                                        className="flex items-center justify-between p-1.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-5 h-5 rounded-md bg-white border border-slate-200 font-bold text-[11px] text-slate-600 flex items-center justify-center">
                                                                {p.period}
                                                            </span>
                                                            <span className={cn(
                                                                "px-2 py-0.5 rounded-lg font-bold text-xs border flex items-center gap-1",
                                                                badge.bg, badge.text, badge.border
                                                            )}>
                                                                <span>{badge.icon}</span>
                                                                <span>{p.subject_name}</span>
                                                            </span>
                                                        </div>

                                                        <div className="text-[11px] text-slate-500 font-medium">
                                                            {p.room_name && <span className="mr-1">P.{p.room_name}</span>}
                                                            {p.teacher_name && <span>({p.teacher_name})</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
