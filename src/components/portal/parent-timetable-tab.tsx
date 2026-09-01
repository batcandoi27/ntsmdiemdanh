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
    User
} from 'lucide-react';
import { ClassTimetable, DayTimetable, getSubjectBadgeStyle } from '@/types/homework';
import { HomeworkService } from '@/services/homework-service';
import { cn } from '@/lib/utils';

interface ParentTimetableTabProps {
    classId: string;
    className: string;
    studentName: string;
}

export function ParentTimetableTab({ classId, className, studentName }: ParentTimetableTabProps) {
    const [timetable, setTimetable] = useState<ClassTimetable | null>(null);
    const [loading, setLoading] = useState(false);
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

                    <button
                        onClick={() => window.print()}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all shadow-2xs w-fit"
                    >
                        <Printer size={13} />
                        <span>In Thời Khóa Biểu</span>
                    </button>
                </div>
            </div>

            {/* Weekly Grid */}
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
            ) : (
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

                                {/* Afternoon Sessions if any */}
                                {day.afternoon && day.afternoon.length > 0 && (
                                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                                            <Moon size={12} className="text-indigo-500" />
                                            <span>Buổi Chiều:</span>
                                        </div>

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
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
