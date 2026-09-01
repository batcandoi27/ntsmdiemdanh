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
import { ClassTimetable, DayTimetable, TimetablePeriod, COMMON_SUBJECT_PRESETS } from '@/types/homework';
import { HomeworkService } from '@/services/homework-service';

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
    const [saveSuccess, setSaveSuccess] = useState(false);

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

    const handleSave = async () => {
        if (!timetable) return;
        setIsSaving(true);
        const res = await HomeworkService.saveClassTimetable(timetable);
        setIsSaving(false);
        if (res.ok) {
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col text-slate-100">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-5 bg-slate-900/95 backdrop-blur border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                            <Calendar size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                Quản Lý Thời Khóa Biểu Lớp {className}
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    Zero-Touch 1-Chạm
                                </span>
                            </h3>
                            <p className="text-xs text-slate-400">
                                Thiết lập thời khóa biểu Sáng & Chiều để tự động đồng bộ sang Sổ Báo Bài & Zalo Bot
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Day Selector (Thứ 2 -> Thứ 7) */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {timetable.days.map(d => {
                            const isActive = d.day_of_week === activeDay;
                            return (
                                <button
                                    key={d.day_of_week}
                                    onClick={() => setActiveDay(d.day_of_week)}
                                    className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 shrink-0 ${
                                        isActive
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500'
                                            : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/50'
                                    }`}
                                >
                                    <span>{d.day_label}</span>
                                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-slate-600'}`} />
                                </button>
                            );
                        })}
                    </div>

                    {/* Session Selector (Buổi Sáng / Buổi Chiều) */}
                    <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded-xl border border-slate-800 w-fit">
                        <button
                            onClick={() => setActiveSession('MORNING')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                                activeSession === 'MORNING'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Sun size={15} /> Buổi Sáng (5 Tiết)
                        </button>
                        <button
                            onClick={() => setActiveSession('AFTERNOON')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                                activeSession === 'AFTERNOON'
                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Moon size={15} /> Buổi Chiều (5 Tiết)
                        </button>
                    </div>

                    {/* Quick Subject Tag Palettes (1-Click Insertion) */}
                    <div className="p-4 bg-slate-800/40 border border-slate-700/40 rounded-xl space-y-2">
                        <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                            <Sparkles size={14} className="text-indigo-400" />
                            Chọn Nhanh Môn Học (Bấm vào tiết tương ứng bên dưới rồi bấm môn học):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {COMMON_SUBJECT_PRESETS.map(preset => (
                                <button
                                    key={preset.subject}
                                    style={{ borderColor: preset.default_color }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900/80 hover:bg-slate-800 text-slate-200 border transition-all hover:scale-105 active:scale-95"
                                >
                                    {preset.subject}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 5 Periods Grid */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-200">
                            Danh Sách Tiết Học — {currentDayData?.day_label} ({activeSession === 'MORNING' ? 'Buổi Sáng' : 'Buổi Chiều'})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            {[0, 1, 2, 3, 4].map(idx => {
                                const periodData = currentPeriods[idx];
                                const subjectName = periodData?.subject_name || '';

                                return (
                                    <div
                                        key={idx}
                                        className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2 focus-within:border-indigo-500 transition-colors"
                                    >
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span className="font-bold text-indigo-400">Tiết {idx + 1}</span>
                                            <Clock size={12} />
                                        </div>

                                        <div>
                                            <label className="text-[11px] text-slate-400 block mb-1">Môn học</label>
                                            <input
                                                type="text"
                                                value={subjectName}
                                                onChange={e => handleSubjectChange(idx, e.target.value)}
                                                placeholder="VD: Toán, Văn..."
                                                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[11px] text-slate-400 block mb-1">Phòng học (tùy chọn)</label>
                                            <input
                                                type="text"
                                                value={periodData?.room_name || ''}
                                                onChange={e => {
                                                    if (!timetable) return;
                                                    const newDays = timetable.days.map(d => {
                                                        if (d.day_of_week !== activeDay) return d;
                                                        const targetList = activeSession === 'MORNING' ? [...d.morning] : [...d.afternoon];
                                                        if (targetList[idx]) {
                                                            targetList[idx] = { ...targetList[idx], room_name: e.target.value };
                                                        }
                                                        return {
                                                            ...d,
                                                            [activeSession === 'MORNING' ? 'morning' : 'afternoon']: targetList
                                                        };
                                                    });
                                                    setTimetable({ ...timetable, days: newDays });
                                                }}
                                                placeholder="VD: P.201, Tin 1"
                                                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 z-10 flex items-center justify-between p-4 bg-slate-900/95 backdrop-blur border-t border-slate-800">
                    <div className="flex items-center gap-2">
                        {saveSuccess && (
                            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 animate-in fade-in">
                                <Check size={14} /> Đã lưu Thời khóa biểu thành công!
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-xs transition-colors"
                        >
                            Đóng
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/30"
                        >
                            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                            Lưu Thời Khóa Biểu Lớp {className}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
