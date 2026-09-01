'use client';

import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Save,
    Clock,
    Sparkles,
    Check,
    X,
    Sun,
    Moon,
    Plus,
    Trash2,
    RefreshCw
} from 'lucide-react';
import {
    ClassTimetable,
    DayTimetable,
    TimetablePeriod,
    COMMON_SUBJECT_PRESETS,
    getSubjectBadgeStyle
} from '@/types/homework';
import { HomeworkService } from '@/services/homework-service';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface TimetableEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    classId: string;
    className: string;
}

export function TimetableEditorModal({
    isOpen,
    onClose,
    classId,
    className
}: TimetableEditorModalProps) {
    const [timetable, setTimetable] = useState<ClassTimetable | null>(null);
    const [activeDay, setActiveDay] = useState<number>(2); // 2: Thứ Hai -> 7: Thứ Bảy
    const [activeSession, setActiveSession] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && classId) {
            loadTimetable();
        }
    }, [isOpen, classId]);

    const loadTimetable = async () => {
        const data = await HomeworkService.getClassTimetable(classId, className);
        setTimetable(data);
    };

    if (!isOpen || !timetable) return null;

    const currentDayData = timetable.days.find(d => d.day_of_week === activeDay);
    const currentPeriods = activeSession === 'MORNING' ? currentDayData?.morning || [] : currentDayData?.afternoon || [];

    const handleSubjectChange = (periodIndex: number, newSubject: string) => {
        if (!timetable) return;
        const newDays = timetable.days.map(d => {
            if (d.day_of_week !== activeDay) return d;
            const targetList = activeSession === 'MORNING' ? [...d.morning] : [...d.afternoon];

            if (targetList[periodIndex]) {
                targetList[periodIndex] = { ...targetList[periodIndex], subject_name: newSubject };
            } else {
                targetList.push({ period: periodIndex + 1, subject_name: newSubject });
            }

            return {
                ...d,
                [activeSession === 'MORNING' ? 'morning' : 'afternoon']: targetList
            };
        });

        setTimetable({ ...timetable, days: newDays });
    };

    const handlePeriodDetailChange = (periodIndex: number, field: 'teacher_name' | 'room_name', val: string) => {
        if (!timetable) return;
        const newDays = timetable.days.map(d => {
            if (d.day_of_week !== activeDay) return d;
            const targetList = activeSession === 'MORNING' ? [...d.morning] : [...d.afternoon];

            if (targetList[periodIndex]) {
                targetList[periodIndex] = { ...targetList[periodIndex], [field]: val };
            }

            return {
                ...d,
                [activeSession === 'MORNING' ? 'morning' : 'afternoon']: targetList
            };
        });

        setTimetable({ ...timetable, days: newDays });
    };

    const handleSave = async (closeAfterSave = false) => {
        if (!timetable) return;
        setIsSaving(true);
        try {
            const res = await HomeworkService.saveClassTimetable(timetable);
            if (res.ok) {
                toast.success('✅ Đã lưu thời khóa biểu thành công!');
                if (closeAfterSave) onClose();
            } else {
                toast.error('❌ Lỗi khi lưu: ' + res.error);
            }
        } catch (err: any) {
            toast.error('❌ Lỗi kết nối: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col text-slate-900 font-sans">
                
                {/* Header (Light Theme) */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-5 bg-white/95 backdrop-blur border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-2xl">
                            <Calendar size={22} />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                                Quản Lý Thời Khóa Biểu • Lớp {className}
                                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                                    Zero-Touch 1-Chạm
                                </span>
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Thiết lập lịch học 5 tiết sáng / chiều • Tự động hiển thị trên Cổng Học Sinh & Phụ Huynh
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    
                    {/* Day Tabs (Thứ 2 -> Thứ 7) */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                            {[2, 3, 4, 5, 6, 7].map(dayNum => {
                                const dayObj = timetable.days.find(d => d.day_of_week === dayNum);
                                const isSelected = activeDay === dayNum;
                                return (
                                    <button
                                        key={dayNum}
                                        onClick={() => setActiveDay(dayNum)}
                                        className={cn(
                                            "px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all",
                                            isSelected
                                                ? "bg-white text-indigo-700 shadow-2xs"
                                                : "text-slate-600 hover:text-slate-900"
                                        )}
                                    >
                                        {dayObj?.day_label || `Thứ ${dayNum}`}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Session Switcher (Morning / Afternoon) */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                            <button
                                onClick={() => setActiveSession('MORNING')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                    activeSession === 'MORNING'
                                        ? "bg-white text-amber-800 shadow-2xs font-extrabold"
                                        : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                <Sun size={13} className="text-amber-600" />
                                <span>Buổi Sáng (5 Tiết)</span>
                            </button>
                            <button
                                onClick={() => setActiveSession('AFTERNOON')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                    activeSession === 'AFTERNOON'
                                        ? "bg-white text-indigo-800 shadow-2xs font-extrabold"
                                        : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                <Moon size={13} className="text-indigo-600" />
                                <span>Buổi Chiều</span>
                            </button>
                        </div>
                    </div>

                    {/* Quick Subject Presets Palette */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Sparkles size={14} className="text-indigo-600" />
                            Gợi Ý Môn Học Nhanh:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {COMMON_SUBJECT_PRESETS.map(preset => {
                                const badge = getSubjectBadgeStyle(preset.subject);
                                return (
                                    <span
                                        key={preset.subject}
                                        className={cn(
                                            "px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1 shadow-2xs",
                                            badge.bg, badge.text, badge.border
                                        )}
                                    >
                                        <span>{badge.icon}</span>
                                        <span>{preset.subject}</span>
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Periods Grid (1 -> 5) */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-extrabold text-slate-900">
                            Danh Sách Tiết Học Trong Buổi ({activeSession === 'MORNING' ? 'Sáng' : 'Chiều'})
                        </h4>

                        <div className="grid grid-cols-1 gap-3">
                            {[0, 1, 2, 3, 4].map(idx => {
                                const period = currentPeriods[idx] || {
                                    period: idx + 1,
                                    subject_name: '',
                                    teacher_name: '',
                                    room_name: ''
                                };
                                const badge = getSubjectBadgeStyle(period.subject_name);

                                return (
                                    <div
                                        key={idx}
                                        className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-black text-xs border border-slate-200 shrink-0">
                                                T{idx + 1}
                                            </span>
                                            <div>
                                                <p className="text-xs font-bold text-slate-800">
                                                    Tiết {idx + 1} • {idx === 0 ? '07:15 - 08:00' : idx === 1 ? '08:05 - 08:50' : idx === 2 ? '09:05 - 09:50' : idx === 3 ? '09:55 - 10:40' : '10:45 - 11:30'}
                                                </p>
                                                {period.subject_name && (
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-lg text-[11px] font-extrabold border inline-flex items-center gap-1 mt-0.5",
                                                        badge.bg, badge.text, badge.border
                                                    )}>
                                                        <span>{badge.icon}</span>
                                                        <span>{period.subject_name}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 max-w-xl">
                                            <div>
                                                <input
                                                    type="text"
                                                    value={period.subject_name}
                                                    onChange={e => handleSubjectChange(idx, e.target.value)}
                                                    placeholder="Tên Môn (Toán, Văn, Anh...)"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    type="text"
                                                    value={period.teacher_name || ''}
                                                    onChange={e => handlePeriodDetailChange(idx, 'teacher_name', e.target.value)}
                                                    placeholder="Tên GV (Thầy Hưng, Cô Mai...)"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    type="text"
                                                    value={period.room_name || ''}
                                                    onChange={e => handlePeriodDetailChange(idx, 'room_name', e.target.value)}
                                                    placeholder="Phòng (P.201, Lab...)"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="sticky bottom-0 z-10 flex items-center justify-between p-5 bg-slate-50 border-t border-slate-200 rounded-b-3xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors"
                    >
                        Đóng
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleSave(false)}
                            disabled={isSaving}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl font-bold text-xs transition-all"
                        >
                            <span>Lưu Lịch Học</span>
                        </button>

                        <button
                            onClick={() => handleSave(true)}
                            disabled={isSaving}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                        >
                            <Save size={15} />
                            <span>{isSaving ? 'Đang lưu...' : 'Hoàn Tất & Đóng'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
