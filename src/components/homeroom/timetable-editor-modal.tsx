'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
    RefreshCw,
    Search,
    Copy,
    RotateCcw,
    Printer,
    Layers,
    User,
    MapPin,
    CheckCircle2,
    ChevronDown,
    SlidersHorizontal,
    ArrowRight
} from 'lucide-react';
import {
    ClassTimetable,
    DayTimetable,
    TimetablePeriod,
    COMMON_SUBJECT_PRESETS,
    getSubjectBadgeStyle,
    resolveClassSubjects,
    DEFAULT_APP_SUBJECTS
} from '@/types/homework';
import { HomeworkService } from '@/services/homework-service';
import { fetchAppSettings } from '@/app/actions/settings';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface TimetableEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    classId: string;
    className: string;
}

interface ActiveCell {
    dayOfWeek: number; // 2..7
    session: 'MORNING' | 'AFTERNOON';
    periodIndex: number; // 0..4 (Tiết 1..5)
}

const MORNING_PERIOD_TIMES = [
    { period: 1, time: '07:15 - 08:00' },
    { period: 2, time: '08:05 - 08:50' },
    { period: 3, time: '09:05 - 09:50' },
    { period: 4, time: '09:55 - 10:40' },
    { period: 5, time: '10:45 - 11:30' }
];

const AFTERNOON_PERIOD_TIMES = [
    { period: 1, time: '13:15 - 14:00' },
    { period: 2, time: '14:05 - 14:50' },
    { period: 3, time: '15:00 - 15:45' },
    { period: 4, time: '15:50 - 16:35' },
    { period: 5, time: '16:40 - 17:25' }
];

const DAYS_OF_WEEK = [
    { num: 2, label: 'Thứ Hai', shortLabel: 'Thứ 2' },
    { num: 3, label: 'Thứ Ba', shortLabel: 'Thứ 3' },
    { num: 4, label: 'Thứ Tư', shortLabel: 'Thứ 4' },
    { num: 5, label: 'Thứ Năm', shortLabel: 'Thứ 5' },
    { num: 6, label: 'Thứ Sáu', shortLabel: 'Thứ 6' },
    { num: 7, label: 'Thứ Bảy', shortLabel: 'Thứ 7' }
];

export function TimetableEditorModal({
    isOpen,
    onClose,
    classId,
    className
}: TimetableEditorModalProps) {
    const [timetable, setTimetable] = useState<ClassTimetable | null>(null);
    const [history, setHistory] = useState<ClassTimetable[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [viewSession, setViewSession] = useState<'ALL' | 'MORNING' | 'AFTERNOON'>('ALL');
    
    // Active editing cell
    const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
    const [subjectSearch, setSubjectSearch] = useState('');
    const [teacherInput, setTeacherInput] = useState('');
    const [roomInput, setRoomInput] = useState('');

    // Dynamic subjects config from Settings
    const [subjectsConfig, setSubjectsConfig] = useState<any>(null);

    // Copy day state
    const [copySourceDay, setCopySourceDay] = useState<number | null>(null);
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

    const popoverRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Today highlight
    const todayDayOfWeek = useMemo(() => {
        const d = new Date().getDay();
        return d === 0 ? 7 : d + 1; // Sunday -> 7 or 2..7
    }, []);

    // Resolve subject lists
    const { subjects, specialSubjects } = useMemo(() => {
        return resolveClassSubjects(className, subjectsConfig);
    }, [className, subjectsConfig]);

    useEffect(() => {
        if (isOpen && classId) {
            loadAll();
        }
    }, [isOpen, classId]);

    // Listen to real-time subject config update events
    useEffect(() => {
        const handleSubjectsUpdated = () => {
            try {
                const raw = localStorage.getItem('app_subjects_config');
                if (raw) setSubjectsConfig(JSON.parse(raw));
            } catch (_) {}
        };

        window.addEventListener('appSubjectsUpdated', handleSubjectsUpdated);
        window.addEventListener('storage', handleSubjectsUpdated);
        return () => {
            window.removeEventListener('appSubjectsUpdated', handleSubjectsUpdated);
            window.removeEventListener('storage', handleSubjectsUpdated);
        };
    }, []);

    // Auto focus search input when popover opens
    useEffect(() => {
        if (activeCell) {
            setSubjectSearch('');
            const currentPeriod = getPeriodData(activeCell.dayOfWeek, activeCell.session, activeCell.periodIndex);
            setTeacherInput(currentPeriod?.teacher_name || '');
            setRoomInput(currentPeriod?.room_name || '');
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        }
    }, [activeCell]);

    // Click outside to close popover
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                // Check if target is a cell button
                const targetEl = e.target as HTMLElement;
                if (!targetEl.closest('[data-cell-trigger="true"]')) {
                    setActiveCell(null);
                }
            }
        };

        if (activeCell) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeCell]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (activeCell) {
                    setActiveCell(null);
                } else if (isCopyModalOpen) {
                    setIsCopyModalOpen(false);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeCell, isCopyModalOpen]);

    const loadAll = async () => {
        setIsLoading(true);
        try {
            // Load subject settings
            try {
                const raw = localStorage.getItem('app_subjects_config');
                if (raw) {
                    setSubjectsConfig(JSON.parse(raw));
                } else {
                    const settingsRes = await fetchAppSettings();
                    if (settingsRes.success && settingsRes.settings?.subjectConfig) {
                        setSubjectsConfig(settingsRes.settings.subjectConfig);
                        localStorage.setItem('app_subjects_config', JSON.stringify(settingsRes.settings.subjectConfig));
                    }
                }
            } catch (_) {}

            // Load Timetable
            const data = await HomeworkService.getClassTimetable(classId, className);
            setTimetable(data);
            setHistory([JSON.parse(JSON.stringify(data))]);
        } catch (err) {
            console.error('Failed to load timetable:', err);
            toast.error('Không thể tải thời khóa biểu.');
        } finally {
            setIsLoading(false);
        }
    };

    const pushHistory = (newTkb: ClassTimetable) => {
        setHistory(prev => [...prev.slice(-10), JSON.parse(JSON.stringify(newTkb))]);
    };

    const handleUndo = () => {
        if (history.length > 1) {
            const prev = history[history.length - 2];
            setHistory(h => h.slice(0, -1));
            setTimetable(JSON.parse(JSON.stringify(prev)));
            toast.success('↩️ Đã hoàn tác thao tác trước!');
        } else {
            toast('Không còn thao tác nào để hoàn tác', { icon: 'ℹ️' });
        }
    };

    const getPeriodData = (dayOfWeek: number, session: 'MORNING' | 'AFTERNOON', periodIndex: number): TimetablePeriod | null => {
        if (!timetable) return null;
        const day = timetable.days.find(d => d.day_of_week === dayOfWeek);
        if (!day) return null;
        const list = session === 'MORNING' ? day.morning : day.afternoon;
        return list.find(p => p.period === periodIndex + 1) || null;
    };

    // Zero-Touch: 1-Click selects subject and updates active cell
    const handleSelectSubject = (subjectName: string) => {
        if (!timetable || !activeCell) return;
        const { dayOfWeek, session, periodIndex } = activeCell;

        pushHistory(timetable);

        const newDays = timetable.days.map(d => {
            if (d.day_of_week !== dayOfWeek) return d;
            const targetList = session === 'MORNING' ? [...d.morning] : [...d.afternoon];
            const existingIdx = targetList.findIndex(p => p.period === periodIndex + 1);

            const updatedPeriod: TimetablePeriod = {
                period: periodIndex + 1,
                subject_name: subjectName === 'Nghỉ' || subjectName === 'Trống' ? '' : subjectName,
                teacher_name: teacherInput.trim(),
                room_name: roomInput.trim()
            };

            if (existingIdx >= 0) {
                targetList[existingIdx] = updatedPeriod;
            } else {
                targetList.push(updatedPeriod);
            }

            return {
                ...d,
                [session === 'MORNING' ? 'morning' : 'afternoon']: targetList
            };
        });

        const updatedTkb = { ...timetable, days: newDays };
        setTimetable(updatedTkb);
        setActiveCell(null);
        toast.success(`✅ Đã gán "${subjectName}" cho ${DAYS_OF_WEEK.find(d => d.num === dayOfWeek)?.shortLabel} - Tiết ${periodIndex + 1}`, {
            duration: 1800
        });
    };

    const handleClearCell = (dayOfWeek: number, session: 'MORNING' | 'AFTERNOON', periodIndex: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!timetable) return;

        pushHistory(timetable);

        const newDays = timetable.days.map(d => {
            if (d.day_of_week !== dayOfWeek) return d;
            const targetList = session === 'MORNING' ? [...d.morning] : [...d.afternoon];
            const filtered = targetList.filter(p => p.period !== periodIndex + 1);

            return {
                ...d,
                [session === 'MORNING' ? 'morning' : 'afternoon']: filtered
            };
        });

        setTimetable({ ...timetable, days: newDays });
        if (activeCell?.dayOfWeek === dayOfWeek && activeCell?.session === session && activeCell?.periodIndex === periodIndex) {
            setActiveCell(null);
        }
        toast.success('Đã xóa tiết học');
    };

    const handleUpdateTeacherOrRoom = (field: 'teacher_name' | 'room_name', val: string) => {
        if (!timetable || !activeCell) return;
        const { dayOfWeek, session, periodIndex } = activeCell;

        if (field === 'teacher_name') setTeacherInput(val);
        if (field === 'room_name') setRoomInput(val);

        const newDays = timetable.days.map(d => {
            if (d.day_of_week !== dayOfWeek) return d;
            const targetList = session === 'MORNING' ? [...d.morning] : [...d.afternoon];
            const existingIdx = targetList.findIndex(p => p.period === periodIndex + 1);

            if (existingIdx >= 0) {
                targetList[existingIdx] = { ...targetList[existingIdx], [field]: val };
            } else {
                targetList.push({
                    period: periodIndex + 1,
                    subject_name: '',
                    [field]: val
                });
            }

            return {
                ...d,
                [session === 'MORNING' ? 'morning' : 'afternoon']: targetList
            };
        });

        setTimetable({ ...timetable, days: newDays });
    };

    // Delighter: Điền nhanh Chào cờ (T2 - Tiết 1) & Sinh hoạt lớp (T7 - Tiết 5)
    const handleQuickFillFlagAndClassMeeting = () => {
        if (!timetable) return;
        pushHistory(timetable);

        const newDays = timetable.days.map(d => {
            let morning = [...d.morning];
            let afternoon = [...d.afternoon];

            // Thứ 2: Tiết 1 Chào cờ
            if (d.day_of_week === 2) {
                const idx = morning.findIndex(p => p.period === 1);
                const periodData = { period: 1, subject_name: 'Chào Cờ', teacher_name: '', room_name: 'Sân Trường' };
                if (idx >= 0) morning[idx] = periodData;
                else morning.push(periodData);
            }

            // Thứ 7: Tiết 5 Sinh hoạt lớp
            if (d.day_of_week === 7) {
                const idx = morning.findIndex(p => p.period === 5);
                const periodData = { period: 5, subject_name: 'Sinh Hoạt Lớp', teacher_name: 'GVCN', room_name: '' };
                if (idx >= 0) morning[idx] = periodData;
                else morning.push(periodData);
            }

            return { ...d, morning, afternoon };
        });

        setTimetable({ ...timetable, days: newDays });
        toast.success('✨ Đã tự động điền Chào Cờ (Thứ 2 Tiết 1) & Sinh Hoạt Lớp (Thứ 7 Tiết 5)!');
    };

    // Copy toàn bộ lịch của 1 ngày sang 1 ngày khác
    const handleCopyDay = (targetDay: number) => {
        if (!timetable || copySourceDay === null || copySourceDay === targetDay) return;
        pushHistory(timetable);

        const source = timetable.days.find(d => d.day_of_week === copySourceDay);
        if (!source) return;

        const newDays = timetable.days.map(d => {
            if (d.day_of_week !== targetDay) return d;
            return {
                ...d,
                morning: JSON.parse(JSON.stringify(source.morning)),
                afternoon: JSON.parse(JSON.stringify(source.afternoon))
            };
        });

        setTimetable({ ...timetable, days: newDays });
        setIsCopyModalOpen(false);
        setCopySourceDay(null);
        toast.success(`📋 Đã sao chép lịch học từ ${DAYS_OF_WEEK.find(d => d.num === copySourceDay)?.label} sang ${DAYS_OF_WEEK.find(d => d.num === targetDay)?.label}!`);
    };

    const handleClearAll = () => {
        if (!timetable) return;
        if (window.confirm('Bác có chắc chắn muốn xóa toàn bộ môn học trong thời khóa biểu tuần này không?')) {
            pushHistory(timetable);
            const emptyDays: DayTimetable[] = timetable.days.map(d => ({
                ...d,
                morning: [],
                afternoon: []
            }));
            setTimetable({ ...timetable, days: emptyDays });
            toast.success('Đã xóa trắng thời khóa biểu.');
        }
    };

    const handleSave = async (closeAfterSave = false) => {
        if (!timetable) return;
        setIsSaving(true);
        try {
            const res = await HomeworkService.saveClassTimetable(timetable);
            if (res.ok) {
                toast.success('✅ Đã lưu thời khóa biểu cả tuần thành công!');
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

    // Filtered subjects for search
    const filteredSubjects = useMemo(() => {
        const query = subjectSearch.toLowerCase().trim();
        if (!query) return subjects;
        return subjects.filter(s => s.toLowerCase().includes(query));
    }, [subjects, subjectSearch]);

    const filteredSpecialSubjects = useMemo(() => {
        const query = subjectSearch.toLowerCase().trim();
        if (!query) return specialSubjects;
        return specialSubjects.filter(s => s.toLowerCase().includes(query));
    }, [specialSubjects, subjectSearch]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-7xl max-h-[95vh] bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col text-slate-900 font-sans overflow-hidden">
                
                {/* Header (Light Theme & VIP Glassmorphic) */}
                <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 bg-white/95 backdrop-blur border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-2xl shadow-xs">
                            <Calendar size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                                    Thời Khóa Biểu Cả Tuần • Lớp {className}
                                </h3>
                                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-2xs">
                                    Zero-Touch 1-Chạm
                                </span>
                                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Đồng bộ Môn học (/settings)
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5 hidden sm:block">
                                Nhìn toàn cảnh 6 ngày trong tuần trên 1 bảng lưới • Bấm chọn ô để đổi môn học tức thì
                            </p>
                        </div>
                    </div>

                    {/* Header Quick Tools */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Session Filter */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
                            <button
                                onClick={() => setViewSession('ALL')}
                                className={cn(
                                    "px-2.5 py-1.5 rounded-xl transition-all",
                                    viewSession === 'ALL' ? "bg-white text-indigo-700 shadow-2xs font-extrabold" : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                Cả Ngày
                            </button>
                            <button
                                onClick={() => setViewSession('MORNING')}
                                className={cn(
                                    "px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1",
                                    viewSession === 'MORNING' ? "bg-white text-amber-700 shadow-2xs font-extrabold" : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                <Sun size={12} className="text-amber-500" />
                                <span>Sáng</span>
                            </button>
                            <button
                                onClick={() => setViewSession('AFTERNOON')}
                                className={cn(
                                    "px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1",
                                    viewSession === 'AFTERNOON' ? "bg-white text-indigo-700 shadow-2xs font-extrabold" : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                <Moon size={12} className="text-indigo-500" />
                                <span>Chiều</span>
                            </button>
                        </div>

                        {/* Quick Presets Menu */}
                        <button
                            onClick={handleQuickFillFlagAndClassMeeting}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                            title="Tự động điền Chào Cờ (T2-T1) & Sinh Hoạt Lớp (T7-T5)"
                        >
                            <Sparkles size={13} className="text-amber-600" />
                            <span className="hidden md:inline">Tự Điền Chào Cờ & SHL</span>
                        </button>

                        {/* Copy Day */}
                        <button
                            onClick={() => {
                                setCopySourceDay(2);
                                setIsCopyModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                            title="Sao chép lịch học từ 1 ngày sang ngày khác"
                        >
                            <Copy size={13} />
                            <span className="hidden lg:inline">Sao Chép Ngày</span>
                        </button>

                        {/* Undo */}
                        {history.length > 1 && (
                            <button
                                onClick={handleUndo}
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
                                title="Hoàn tác thay đổi vừa thực hiện"
                            >
                                <RotateCcw size={14} />
                            </button>
                        )}

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors ml-1"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Main Content Area - Full Week Grid */}
                <div className="flex-1 overflow-y-auto overflow-x-auto p-3 sm:p-5 space-y-4 bg-slate-50/50">
                    
                    {isLoading ? (
                        <div className="p-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                            <RefreshCw className="animate-spin text-indigo-600" size={36} />
                            <p className="font-bold text-sm text-slate-600">Đang tải cấu hình thời khóa biểu và danh mục môn học...</p>
                        </div>
                    ) : !timetable ? (
                        <div className="p-12 text-center text-slate-500 font-bold">
                            Không thể tải dữ liệu thời khóa biểu.
                        </div>
                    ) : (
                        <div className="min-w-[860px] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden select-none">
                            
                            {/* WEEKLY GRID TABLE */}
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700">
                                        <th className="sticky left-0 z-20 bg-slate-100/95 backdrop-blur px-3 py-3 w-[110px] text-center text-xs font-black uppercase tracking-wider border-r border-slate-200 text-slate-600 shadow-2xs">
                                            Tiết / Giờ
                                        </th>
                                        {DAYS_OF_WEEK.map(day => {
                                            const isToday = day.num === todayDayOfWeek;
                                            return (
                                                <th
                                                    key={day.num}
                                                    className={cn(
                                                        "px-3 py-3 text-center text-xs font-black uppercase tracking-wider border-r last:border-r-0 border-slate-200",
                                                        isToday ? "bg-indigo-50/80 text-indigo-800" : "text-slate-800"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <span>{day.label}</span>
                                                        {isToday && (
                                                            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" title="Hôm nay" />
                                                        )}
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    
                                    {/* SECTION 1: BUỔI SÁNG (5 TIẾT) */}
                                    {(viewSession === 'ALL' || viewSession === 'MORNING') && (
                                        <>
                                            <tr className="bg-amber-50/70 border-y border-amber-200/60">
                                                <td
                                                    colSpan={7}
                                                    className="px-4 py-1.5 text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5"
                                                >
                                                    <Sun size={13} className="text-amber-600" />
                                                    <span>Buổi Sáng (5 Tiết Học)</span>
                                                </td>
                                            </tr>

                                            {MORNING_PERIOD_TIMES.map((pt, idx) => (
                                                <tr key={`morning_${pt.period}`} className="hover:bg-slate-50/70 transition-colors">
                                                    {/* Period Header Column */}
                                                    <td className="sticky left-0 z-10 bg-white px-2.5 py-2 text-center border-r border-slate-200 shadow-2xs">
                                                        <div className="font-black text-xs text-slate-900">
                                                            Tiết {pt.period}
                                                        </div>
                                                        <div className="text-[10px] text-slate-600 font-bold tracking-tighter">
                                                            {pt.time}
                                                        </div>
                                                    </td>

                                                    {/* 6 Day Cells */}
                                                    {DAYS_OF_WEEK.map(day => {
                                                        const periodData = getPeriodData(day.num, 'MORNING', idx);
                                                        const isCellActive = activeCell?.dayOfWeek === day.num && activeCell?.session === 'MORNING' && activeCell?.periodIndex === idx;
                                                        const badge = periodData?.subject_name ? getSubjectBadgeStyle(periodData.subject_name) : null;

                                                        return (
                                                            <td
                                                                key={`m_${day.num}_${idx}`}
                                                                className={cn(
                                                                    "p-1.5 border-r last:border-r-0 border-slate-200 align-top transition-all relative",
                                                                    day.num === todayDayOfWeek && "bg-indigo-50/15"
                                                                )}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    data-cell-trigger="true"
                                                                    onClick={() => {
                                                                        setActiveCell({
                                                                            dayOfWeek: day.num,
                                                                            session: 'MORNING',
                                                                            periodIndex: idx
                                                                        });
                                                                    }}
                                                                    className={cn(
                                                                        "w-full min-h-[58px] p-2 rounded-xl border text-left transition-all flex flex-col justify-between group relative shadow-2xs",
                                                                        isCellActive
                                                                            ? "ring-3 ring-indigo-500 border-indigo-400 bg-indigo-50/50 shadow-md scale-[1.01] z-10"
                                                                            : periodData?.subject_name
                                                                                ? `${badge?.bg} ${badge?.border} hover:shadow-xs hover:border-slate-300`
                                                                                : "bg-slate-50/60 border-dashed border-slate-200 hover:bg-slate-100 hover:border-indigo-300"
                                                                    )}
                                                                >
                                                                    {periodData?.subject_name ? (
                                                                        <>
                                                                            <div className="flex items-start justify-between gap-1">
                                                                                <span className={cn("font-black text-xs flex items-center gap-1 leading-tight", badge?.text)}>
                                                                                    <span>{badge?.icon}</span>
                                                                                    <span>{periodData.subject_name}</span>
                                                                                </span>

                                                                                {/* Clear Button on hover */}
                                                                                <span
                                                                                    onClick={(e) => handleClearCell(day.num, 'MORNING', idx, e)}
                                                                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all shrink-0"
                                                                                    title="Xóa tiết học này"
                                                                                >
                                                                                    <X size={12} />
                                                                                </span>
                                                                            </div>

                                                                            {(periodData.teacher_name || periodData.room_name) && (
                                                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium truncate mt-1 pt-1 border-t border-slate-200/50">
                                                                                    {periodData.teacher_name && (
                                                                                        <span className="truncate max-w-[85px]" title={periodData.teacher_name}>
                                                                                            {periodData.teacher_name}
                                                                                        </span>
                                                                                    )}
                                                                                    {periodData.room_name && (
                                                                                        <span className="px-1 py-0.2 rounded bg-white/70 border border-slate-200 text-[9px] font-bold text-slate-600">
                                                                                            {periodData.room_name}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <div className="h-full flex items-center justify-center text-slate-600 text-[11px] font-bold group-hover:text-indigo-600 transition-colors">
                                                                            <Plus size={12} className="mr-0.5" /> Chọn môn
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </>
                                    )}

                                    {/* SECTION 2: BUỔI CHIỀU (5 TIẾT) */}
                                    {(viewSession === 'ALL' || viewSession === 'AFTERNOON') && (
                                        <>
                                            <tr className="bg-indigo-50/70 border-y border-indigo-200/60">
                                                <td
                                                    colSpan={7}
                                                    className="px-4 py-1.5 text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5"
                                                >
                                                    <Moon size={13} className="text-indigo-600" />
                                                    <span>Buổi Chiều (5 Tiết Học)</span>
                                                </td>
                                            </tr>

                                            {AFTERNOON_PERIOD_TIMES.map((pt, idx) => (
                                                <tr key={`afternoon_${pt.period}`} className="hover:bg-slate-50/70 transition-colors">
                                                    {/* Period Header Column */}
                                                    <td className="sticky left-0 z-10 bg-white px-2.5 py-2 text-center border-r border-slate-200 shadow-2xs">
                                                        <div className="font-black text-xs text-slate-900">
                                                            Tiết {pt.period}
                                                        </div>
                                                        <div className="text-[10px] text-slate-600 font-bold tracking-tighter">
                                                            {pt.time}
                                                        </div>
                                                    </td>

                                                    {/* 6 Day Cells */}
                                                    {DAYS_OF_WEEK.map(day => {
                                                        const periodData = getPeriodData(day.num, 'AFTERNOON', idx);
                                                        const isCellActive = activeCell?.dayOfWeek === day.num && activeCell?.session === 'AFTERNOON' && activeCell?.periodIndex === idx;
                                                        const badge = periodData?.subject_name ? getSubjectBadgeStyle(periodData.subject_name) : null;

                                                        return (
                                                            <td
                                                                key={`a_${day.num}_${idx}`}
                                                                className={cn(
                                                                    "p-1.5 border-r last:border-r-0 border-slate-200 align-top transition-all relative",
                                                                    day.num === todayDayOfWeek && "bg-indigo-50/15"
                                                                )}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    data-cell-trigger="true"
                                                                    onClick={() => {
                                                                        setActiveCell({
                                                                            dayOfWeek: day.num,
                                                                            session: 'AFTERNOON',
                                                                            periodIndex: idx
                                                                        });
                                                                    }}
                                                                    className={cn(
                                                                        "w-full min-h-[58px] p-2 rounded-xl border text-left transition-all flex flex-col justify-between group relative shadow-2xs",
                                                                        isCellActive
                                                                            ? "ring-3 ring-indigo-500 border-indigo-400 bg-indigo-50/50 shadow-md scale-[1.01] z-10"
                                                                            : periodData?.subject_name
                                                                                ? `${badge?.bg} ${badge?.border} hover:shadow-xs hover:border-slate-300`
                                                                                : "bg-slate-50/60 border-dashed border-slate-200 hover:bg-slate-100 hover:border-indigo-300"
                                                                    )}
                                                                >
                                                                    {periodData?.subject_name ? (
                                                                        <>
                                                                            <div className="flex items-start justify-between gap-1">
                                                                                <span className={cn("font-black text-xs flex items-center gap-1 leading-tight", badge?.text)}>
                                                                                    <span>{badge?.icon}</span>
                                                                                    <span>{periodData.subject_name}</span>
                                                                                </span>

                                                                                {/* Clear Button on hover */}
                                                                                <span
                                                                                    onClick={(e) => handleClearCell(day.num, 'AFTERNOON', idx, e)}
                                                                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all shrink-0"
                                                                                    title="Xóa tiết học này"
                                                                                >
                                                                                    <X size={12} />
                                                                                </span>
                                                                            </div>

                                                                            {(periodData.teacher_name || periodData.room_name) && (
                                                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium truncate mt-1 pt-1 border-t border-slate-200/50">
                                                                                    {periodData.teacher_name && (
                                                                                        <span className="truncate max-w-[85px]" title={periodData.teacher_name}>
                                                                                            {periodData.teacher_name}
                                                                                        </span>
                                                                                    )}
                                                                                    {periodData.room_name && (
                                                                                        <span className="px-1 py-0.2 rounded bg-white/70 border border-slate-200 text-[9px] font-bold text-slate-600">
                                                                                            {periodData.room_name}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <div className="h-full flex items-center justify-center text-slate-600 text-[11px] font-bold group-hover:text-indigo-600 transition-colors">
                                                                            <Plus size={12} className="mr-0.5" /> Chọn môn
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </>
                                    )}

                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ZERO-TOUCH POPOVER / DROPDOWN PALETTE (FLOATING FAST SELECTOR) */}
                {activeCell && (
                    <div
                        ref={popoverRef}
                        className="fixed inset-x-4 bottom-20 sm:inset-auto sm:right-8 sm:bottom-20 z-50 w-auto sm:w-[380px] max-h-[480px] bg-white border-2 border-indigo-500 rounded-3xl shadow-2xl p-4 flex flex-col gap-3 animate-in zoom-in-95 duration-150 backdrop-blur"
                    >
                        {/* Popover Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                                    T{activeCell.periodIndex + 1}
                                </span>
                                <div>
                                    <h4 className="text-xs font-black text-slate-900">
                                        {DAYS_OF_WEEK.find(d => d.num === activeCell.dayOfWeek)?.label} • Tiết {activeCell.periodIndex + 1} ({activeCell.session === 'MORNING' ? 'Sáng' : 'Chiều'})
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-bold">Zero-Touch: Chạm 1 lần để điền môn ngay</p>
                                </div>
                            </div>

                            <button
                                onClick={() => setActiveCell(null)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={subjectSearch}
                                onChange={e => setSubjectSearch(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && filteredSubjects.length > 0) {
                                        handleSelectSubject(filteredSubjects[0]);
                                    }
                                }}
                                placeholder="Gõ tên môn hoặc bấm chọn bên dưới..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Subject Chips Palette - Synchronized from Settings */}
                        <div className="flex-1 overflow-y-auto space-y-3 max-h-[220px] pr-1">
                            {/* Standard Subjects */}
                            <div>
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1.5 block">
                                    📚 Danh Mục Môn Học (Khối Lớp {className}):
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {filteredSubjects.map(sub => {
                                        const badge = getSubjectBadgeStyle(sub);
                                        return (
                                            <button
                                                key={sub}
                                                type="button"
                                                onClick={() => handleSelectSubject(sub)}
                                                className={cn(
                                                    "px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs hover:shadow-xs",
                                                    badge.bg, badge.text, badge.border,
                                                    "hover:scale-105"
                                                )}
                                            >
                                                <span>{badge.icon}</span>
                                                <span>{sub}</span>
                                            </button>
                                        );
                                    })}
                                    {filteredSubjects.length === 0 && (
                                        <button
                                            type="button"
                                            onClick={() => handleSelectSubject(subjectSearch.trim())}
                                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white border border-indigo-700 flex items-center gap-1"
                                        >
                                            <Plus size={13} /> Thêm môn mới &quot;{subjectSearch}&quot;
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Special Activities */}
                            <div>
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1.5 block">
                                    ⭐ Nghi Lễ & Hoạt Động Đặc Thù:
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {filteredSpecialSubjects.map(sub => {
                                        const badge = getSubjectBadgeStyle(sub);
                                        return (
                                            <button
                                                key={sub}
                                                type="button"
                                                onClick={() => handleSelectSubject(sub)}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1 transition-all active:scale-95 shadow-2xs",
                                                    badge.bg, badge.text, badge.border
                                                )}
                                            >
                                                <span>{badge.icon}</span>
                                                <span>{sub}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Optional Teacher & Room Details */}
                        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <input
                                    type="text"
                                    value={teacherInput}
                                    onChange={e => handleUpdateTeacherOrRoom('teacher_name', e.target.value)}
                                    placeholder="Tên GV (Tuỳ chọn)"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    value={roomInput}
                                    onChange={e => handleUpdateTeacherOrRoom('room_name', e.target.value)}
                                    placeholder="Phòng (P.201, Lab...)"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Popover Quick Footer Actions */}
                        <div className="flex items-center justify-between pt-1 text-xs">
                            <button
                                type="button"
                                onClick={() => handleClearCell(activeCell.dayOfWeek, activeCell.session, activeCell.periodIndex)}
                                className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors"
                            >
                                <Trash2 size={12} /> Xóa ô này
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveCell(null)}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px]"
                            >
                                Xong
                            </button>
                        </div>
                    </div>
                )}

                {/* COPY DAY MODAL DIALOG */}
                {isCopyModalOpen && copySourceDay !== null && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                        <div className="bg-white rounded-3xl p-5 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                    <Copy size={16} className="text-indigo-600" />
                                    Sao Chép Lịch Học Của Ngày
                                </h4>
                                <button onClick={() => setIsCopyModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700">Sao chép từ:</label>
                                <select
                                    value={copySourceDay}
                                    onChange={e => setCopySourceDay(parseInt(e.target.value))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                                >
                                    {DAYS_OF_WEEK.map(d => (
                                        <option key={d.num} value={d.num}>{d.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">Dán sang ngày:</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {DAYS_OF_WEEK.filter(d => d.num !== copySourceDay).map(d => (
                                        <button
                                            key={d.num}
                                            onClick={() => handleCopyDay(d.num)}
                                            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition-all text-center"
                                        >
                                            {d.shortLabel}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Controls */}
                <div className="sticky bottom-0 z-30 flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 bg-slate-50 border-t border-slate-200 rounded-b-3xl">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <button
                            onClick={handleClearAll}
                            className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-colors flex items-center gap-1"
                        >
                            <Trash2 size={13} />
                            <span>Xóa Toàn Bộ TKB</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors"
                        >
                            Đóng
                        </button>

                        <button
                            onClick={() => handleSave(false)}
                            disabled={isSaving}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                        >
                            <span>Lưu Lịch Học</span>
                        </button>

                        <button
                            onClick={() => handleSave(true)}
                            disabled={isSaving}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
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
