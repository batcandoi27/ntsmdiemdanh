'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { Class, AttendanceStatus } from '@/types/models';
import { getAllClasses } from '@/app/actions/common';
import { getGradeAttendanceSummary, getClassesAttendanceSummary, BlockAttendanceItem } from '@/app/actions/quick-attendance';
import { getLocalCache, setLocalCache } from '@/services/client-cache-service';
import { SessionType } from '@/types/timetable';
import { AttendanceSheet } from '@/components/attendance-sheet';
import { StudentSelectorDialog } from '@/components/quick-attendance/student-selector-dialog';
import { Monitor, Smartphone, Tablet, Ban, CheckCircle, ChevronRight, ChevronLeft, UserCheck, ArrowLeft, Loader2, Zap, List, LayoutGrid, BookOpen, Star, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { MobileAttendanceList } from '@/components/quick-attendance/mobile-attendance-list';
import { MobileClassDetail } from '@/components/quick-attendance/mobile-class-detail';
import { ImportAttendanceDialog } from '@/components/quick-attendance/import-attendance-dialog';
import { useViewMode } from '@/context/view-mode-context';
import { useAppSettings } from '@/hooks/use-settings';
import { Settings, ToggleLeft, ToggleRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useFeatureFlags } from '@/context/feature-flags-context';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function QuickAttendancePage() {
    const { flags, loading: flagsLoading } = useFeatureFlags();
    const [classes, setClasses] = useState<Class[]>([]);

    // Modes: 'CLASS' (default) vs 'BLOCK' (new)
    const [mode, setMode] = useState<'CLASS' | 'BLOCK'>('BLOCK');
    // Date & Session State
    const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [session, setSession] = useState<SessionType>('morning');

    // Shared State
    const [grade, setGrade] = useState<number>(6); // 6, 7, 8, 9, or -1 for My Classes
    const [myClassIds, setMyClassIds] = useState<string[]>([]);
    const { viewDevice } = useViewMode();
    const { settings, toggleDefaultColumn, loaded: settingsLoaded } = useAppSettings();

    const { appUser } = useAuth();

    useEffect(() => {
        if (!appUser) return;
        const saved = localStorage.getItem(`myClasses_${appUser.uid}`);
        if (saved) {
            try {
                const ids = JSON.parse(saved);
                setMyClassIds(ids);
                // Optional: Auto-switch to My Classes if available? No, stick to default Grade 6 for now.
            } catch (e) {
                console.error("Failed to parse myClasses", e);
            }
        } else if (appUser.assignedClassIds && appUser.assignedClassIds.length > 0) {
            setMyClassIds(appUser.assignedClassIds);
        }
    }, [appUser]);

    // Class Mode State
    const [quickClassId, setQuickClassId] = useState<string>('');
    const [showSheet, setShowSheet] = useState(false);

    // Block Mode State
    const [blockData, setBlockData] = useState<BlockAttendanceItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState<string | null>(null); // Changed to store classId string
    const [targetStatus, setTargetStatus] = useState<AttendanceStatus>('P');

    useEffect(() => {
        // Tải từ cache trước để hiển thị tức thì
        const cached = getLocalCache<Class[]>('classes_list');
        if (cached) setClasses(cached);

        // Luôn fetch mới để cập nhật dữ liệu ngầm
        getAllClasses().then(data => {
            setClasses(data);
            setLocalCache('classes_list', data);
        });
    }, []);

    const filteredClasses = classes.filter(c => {
        if (grade === -1) return myClassIds.includes(c.id);
        return c.grade === grade;
    }).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    // Auto-select first class when filtered list changes
    useEffect(() => {
        if (filteredClasses.length > 0 && !quickClassId) {
            setQuickClassId(filteredClasses[0].id);
        }
    }, [filteredClasses, quickClassId]);

    const fetchBlockData = useCallback(async () => {
        setLoading(true);
        // Use selected date
        let data: BlockAttendanceItem[] = [];
        if (grade === -1) {
            data = await getClassesAttendanceSummary(myClassIds, date, session);
        } else {
            data = await getGradeAttendanceSummary(grade, date, session);
        }
        setBlockData(data || []);
        setLoading(false);
    }, [grade, date, myClassIds, session]);

    // Reset Class Mode logic when Grade/Date/Session changes
    useEffect(() => {
        if (mode === 'BLOCK') {
            fetchBlockData();
        }
    }, [fetchBlockData, mode]);

    // Helper: Grade Color Theme
    const getGradeTheme = (g: number) => {
        switch (g) {
            case 6: return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
            case 7: return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
            case 8: return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' };
            case 9: return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' };
            case -1: return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
        }
    };

    const handleGradeChange = (newGrade: number) => {
        setGrade(newGrade);
        // fetchBlockData will be called by the useEffect when grade changes
    };

    const handleCellClick = (classId: string, status: AttendanceStatus) => {
        setSelectedClass(classId);
        setTargetStatus(status);
        setDialogOpen(true);
    };

    if (flagsLoading) {
        return <div className="p-8 text-center text-gray-500 flex justify-center items-center h-[50vh]"><Loader2 className="animate-spin mr-2" /> Đang tải...</div>;
    }

    if (!flags.quickAttendance) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4 ring-8 ring-amber-50/50">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Tính năng đang được phát triển</h2>
                <p className="text-gray-500 max-w-md">Chức năng Điểm danh nhanh hiện đang được cập nhật hoặc tạm thời vô hiệu hóa bởi Quản trị viên. Vui lòng thử lại sau.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50/50 space-y-6">
            <header className="mb-6 flex flex-col gap-4">
                {/* Dòng 1: Tiêu đề và Các icon chức năng */}
                <div className="flex flex-row items-center justify-between w-full">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Zap className="text-yellow-500 fill-yellow-500" size={24} />
                            Điểm Danh
                        </h1>
                        <p className="text-gray-500 text-sm hidden sm:block">Quản lý chuyên cần theo Khối / Lớp</p>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        <button
                            onClick={() => setImportDialogOpen(true)}
                            className="flex items-center justify-center min-w-[40px] min-h-[40px] px-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 font-bold rounded-xl border border-indigo-200 shadow-sm transition-colors text-sm"
                        >
                            <UploadCloud size={18} />
                            <span className="hidden sm:inline line-clamp-1 ml-2">Import JSON</span>
                        </button>

                        <Dialog>
                            <DialogTrigger asChild>
                                <button className="flex items-center justify-center min-w-[40px] min-h-[40px] p-2 bg-white text-gray-400 hover:text-gray-700 rounded-xl border border-gray-100 shadow-sm transition-colors">
                                    <Settings size={20} />
                                </button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Cài đặt hiển thị</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <h4 className="text-sm font-medium text-gray-500 uppercase">Cột mặc định</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-xs">P</span>
                                                <Label>Có phép</Label>
                                            </div>
                                            <Switch
                                                checked={settings.visibleDefaultColumns.P}
                                                onCheckedChange={() => toggleDefaultColumn('P')}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">K</span>
                                                <Label>Không phép</Label>
                                            </div>
                                            <Switch
                                                checked={settings.visibleDefaultColumns.K}
                                                onCheckedChange={() => toggleDefaultColumn('K')}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">T</span>
                                                <Label>Đi trễ</Label>
                                            </div>
                                            <Switch
                                                checked={settings.visibleDefaultColumns.T}
                                                onCheckedChange={() => toggleDefaultColumn('T')}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">VP</span>
                                                <Label>Vi phạm</Label>
                                            </div>
                                            <Switch
                                                checked={settings.visibleDefaultColumns.VP}
                                                onCheckedChange={() => toggleDefaultColumn('VP')}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">KH</span>
                                                <Label>Khen thưởng</Label>
                                            </div>
                                            <Switch
                                                checked={settings.visibleDefaultColumns.KH}
                                                onCheckedChange={() => toggleDefaultColumn('KH')}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Thanh chọn ngày (Dòng 2) */}
                <div className="flex flex-wrap items-center gap-3 bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-[fit-content]">
                    <div className="flex items-center gap-1 bg-gray-50/80 rounded-lg p-1">
                        <button
                            onClick={() => {
                                const d = new Date(date);
                                d.setDate(d.getDate() - 1);
                                setDate(d.toISOString().slice(0, 10));
                                setSession('morning');
                            }}
                            className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="relative flex min-w-[130px] items-center justify-center">
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => {
                                    setDate(e.target.value);
                                    setSession('morning');
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                title="Đổi ngày điểm danh"
                            />
                            <span className="text-sm font-bold text-gray-700 pointer-events-none select-none tracking-wide">
                                {(() => {
                                    const d = new Date(date);
                                    if (isNaN(d.getTime())) return date;
                                    const days = ['CN', 'T.Hai', 'T.Ba', 'T.Tư', 'T.Năm', 'T.Sáu', 'T.Bảy'];
                                    const day = days[d.getDay()];
                                    const dd = String(d.getDate()).padStart(2, '0');
                                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                                    const yyyy = d.getFullYear();
                                    return `${day}/${dd}/${mm}/${yyyy}`;
                                })()}
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                const d = new Date(date);
                                d.setDate(d.getDate() + 1);
                                setDate(d.toISOString().slice(0, 10));
                                setSession('morning');
                            }}
                            className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block"></div>
                    <button
                        onClick={() => setSession(session === 'morning' ? 'afternoon' : 'morning')}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-bold transition-all border shadow-sm",
                            session === 'morning'
                                ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                        )}
                        title="Bấm để đổi buổi"
                    >
                        {session === 'morning' ? '☀️ Buổi Sáng' : '🌙 Buổi Chiều'}
                    </button>
                    <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block"></div>
                    <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto mt-2 sm:mt-0">
                        <button
                            onClick={() => setMode('BLOCK')}
                            className={cn(
                                "flex-1 sm:flex-none px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex justify-center items-center gap-2",
                                mode === 'BLOCK' ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <LayoutGrid size={16} />
                            <span className="hidden sm:inline">Theo Khối</span>
                        </button>
                        <button
                            onClick={() => {
                                setMode('CLASS');
                                setQuickClassId('');
                                setShowSheet(false);
                            }}
                            className={cn(
                                "flex-1 sm:flex-none px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex justify-center items-center gap-2",
                                mode === 'CLASS' ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <List size={16} />
                            <span className="hidden sm:inline">Từng Lớp</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Grade Selection */}
            {
                mode === 'BLOCK' && (
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        <button
                            onClick={() => handleGradeChange(-1)}
                            className={cn(
                                "px-4 py-2 rounded-xl font-bold text-sm md:text-base shadow-sm transition-all flex-shrink-0 border border-transparent flex items-center gap-2",
                                grade === -1 ? 'bg-yellow-500 text-white shadow-yellow-200' : 'bg-white text-yellow-600 hover:bg-yellow-50'
                            )}
                        >
                            <BookOpen size={18} />
                            LỚP CỦA TÔI
                        </button>
                        {[6, 7, 8, 9].map(g => {
                            const active = grade === g;
                            // Dynamic colors for buttons
                            const colors = {
                                6: active ? 'bg-green-600 text-white shadow-green-200' : 'bg-white text-green-700 hover:bg-green-50',
                                7: active ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-blue-700 hover:bg-blue-50',
                                8: active ? 'bg-orange-600 text-white shadow-orange-200' : 'bg-white text-orange-700 hover:bg-orange-50',
                                9: active ? 'bg-purple-600 text-white shadow-purple-200' : 'bg-white text-purple-700 hover:bg-purple-50',
                            }[g];

                            return (
                                <button
                                    key={g}
                                    onClick={() => handleGradeChange(g)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl font-bold text-sm md:text-base shadow-sm transition-all flex-shrink-0 border border-transparent",
                                        colors
                                    )}
                                >
                                    KHỐI {g}
                                </button>
                            );
                        })}

                    </div>
                )
            }

            {/* Selector Panel (CLASS Mode) */}
            {
                mode === 'CLASS' && (
                    <div className="bg-gradient-to-br from-blue-700 to-indigo-800 rounded-3xl shadow-2xl p-6 md:p-8 text-white mb-8 relative overflow-hidden border-4 border-blue-900/10">
                        <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-12 -translate-y-8">
                            <Zap size={200} />
                        </div>

                        <div className="flex flex-col lg:flex-row gap-6 relative z-10 items-end">
                            {/* Step 1: Grade (Always visible) */}
                            <div className="flex-1 w-full">
                                <label className="text-sm font-black text-blue-200 uppercase mb-3 flex items-center gap-2">
                                    <span className="bg-blue-500/30 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                    Chọn Khối
                                </label>
                                <div className="flex bg-black/20 rounded-xl p-1.5 backdrop-blur-sm gap-2 overflow-x-auto">
                                    <button
                                        onClick={() => setGrade(-1)}
                                        className={cn(
                                            "flex-1 py-4 px-2 rounded-lg font-black text-lg transition-all transform flex flex-col items-center justify-center gap-1 min-w-[80px]",
                                            grade === -1 ? 'bg-white text-yellow-600 shadow-lg scale-105' : 'text-yellow-100 hover:bg-yellow-700/30 scale-100'
                                        )}
                                    >
                                        <BookOpen size={24} />
                                        <span className="text-xs md:text-sm whitespace-nowrap">LỚP CỦA TÔI</span>
                                    </button>
                                    {[6, 7, 8, 9].map(g => {
                                        const isSelected = grade === g;
                                        let colorClass = '';

                                        // Colors based on Reports page consistency
                                        if (g === 6) colorClass = isSelected ? 'bg-white text-green-700 shadow-lg' : 'text-green-100 hover:bg-green-700/30';
                                        if (g === 7) colorClass = isSelected ? 'bg-white text-blue-700 shadow-lg' : 'text-blue-100 hover:bg-blue-700/30';
                                        if (g === 8) colorClass = isSelected ? 'bg-white text-orange-700 shadow-lg' : 'text-orange-100 hover:bg-orange-700/30';
                                        if (g === 9) colorClass = isSelected ? 'bg-white text-purple-700 shadow-lg' : 'text-purple-100 hover:bg-purple-700/30';

                                        return (
                                            <button
                                                key={g}
                                                onClick={() => setGrade(g)}
                                                className={`flex-1 py-4 rounded-lg font-black text-lg transition-all transform ${isSelected ? 'scale-105' : 'scale-100'} ${colorClass}`}
                                            >
                                                Khối {g}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Step 2: Class (Only in CLASS Mode) */}
                            <div className="flex-1 w-full animate-in fade-in slide-in-from-right-4 duration-300">
                                <label className="text-sm font-black text-blue-200 uppercase mb-3 flex items-center gap-2">
                                    <span className="bg-blue-500/30 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                    Chọn Lớp
                                </label>
                                <div className="relative group">
                                    <select
                                        value={quickClassId}
                                        onChange={(e) => { setQuickClassId(e.target.value); setShowSheet(false); }}
                                        className="w-full bg-white text-blue-700 text-xl font-bold py-4 pl-6 pr-12 rounded-xl appearance-none cursor-pointer focus:ring-4 focus:ring-yellow-400 outline-none shadow-lg group-hover:bg-blue-50 transition-colors"
                                    >
                                        {filteredClasses.map(c => (
                                            <option key={c.id} value={c.id}>
                                                Lớp {c.name} - GV: {c.teacherName || 'Chưa cập nhật'}
                                            </option>
                                        ))}
                                        {filteredClasses.length === 0 && <option value="">Không có dữ liệu lớp</option>}
                                    </select>
                                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={24} />
                                </div>
                            </div>

                            {/* Step 3: Go */}
                            <div className="w-full lg:w-auto">
                                <button
                                    onClick={() => setShowSheet(true)}
                                    disabled={!quickClassId}
                                    className="w-full bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-black py-4 px-10 rounded-xl shadow-[0_8px_0_rgb(202,138,4)] hover:shadow-[0_4px_0_rgb(202,138,4)] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none text-lg"
                                >
                                    <UserCheck size={28} />
                                    BẮT ĐẦU
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Content Area */}

            {/* 1. Class Mode Sheet */}
            {
                mode === 'CLASS' && showSheet && quickClassId && (
                    <div className="animate-in slide-in-from-bottom-8 fade-in duration-500">
                        <AttendanceSheet classId={quickClassId} session={session} dateStr={date} />
                    </div>
                )
            }

            {/* Block Attendance Table (Desktop Only) */}
            {
                mode === 'BLOCK' && viewDevice === 'desktop' && Array.isArray(blockData) && blockData.length > 0 && (
                    <div className="animate-in slide-in-from-bottom-8 fade-in duration-500 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="overflow-x-auto max-h-[70vh] relative scrollbar-thin scrollbar-thumb-gray-200">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead className="sticky top-0 z-30">
                                    <tr className="text-sm text-gray-500 bg-white">
                                        <th className="py-3 px-2 font-bold min-w-[80px] sticky left-0 top-0 z-40 bg-white border-b border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">TÊN LỚP</th>
                                        <th className="py-3 px-2 font-bold text-center w-16 sticky top-0 bg-white border-b border-gray-100">SỈ SỐ</th>
                                        <th className="py-3 px-2 font-bold text-center w-16 sticky top-0 bg-red-50 text-red-600 border-b border-gray-100">VẮNG</th>
                                        <th className="py-3 px-2 font-bold text-center min-w-[100px] sticky top-0 bg-green-50 text-green-700 border-b border-gray-100">HIỆN DIỆN</th>
                                        {settings.visibleDefaultColumns.P && <th className="py-3 px-2 font-bold text-center min-w-[120px] sticky top-0 bg-yellow-50 text-yellow-700 border-b border-gray-100">PHÉP (P)</th>}
                                        {settings.visibleDefaultColumns.K && <th className="py-3 px-2 font-bold text-center min-w-[120px] sticky top-0 bg-red-50 text-red-700 border-b border-gray-100">KHÔNG (K)</th>}
                                        {settings.visibleDefaultColumns.T && <th className="py-3 px-2 font-bold text-center min-w-[120px] sticky top-0 bg-blue-50 text-blue-700 border-b border-gray-100">TRỄ (T)</th>}
                                        {settings.visibleDefaultColumns.VP && <th className="py-3 px-2 font-bold text-center min-w-[120px] sticky top-0 bg-purple-50 text-purple-700 border-b border-gray-100">VI PHẠM (VP)</th>}
                                        {settings.visibleDefaultColumns.KH && <th className="py-3 px-2 font-bold text-center min-w-[120px] sticky top-0 bg-orange-50 text-orange-700 border-b border-gray-100">KHEN THƯỞNG (KH)</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {blockData.map(item => {
                                        const theme = getGradeTheme(grade);
                                        // Specific calculation for "Vắng" = P + K as requested
                                        const totalAbsentPK = item.attendanceCount.P + item.attendanceCount.K;

                                        return (
                                            <tr key={item.classId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                                                <td className="py-4 px-2 align-top sticky left-0 z-10 bg-white group-hover:bg-gray-50 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                    <div className="block cursor-default">
                                                        <div className={cn(
                                                            "px-3 py-2 rounded-lg border font-black text-center shadow-sm text-lg",
                                                            theme.bg, theme.border, theme.text
                                                        )}>
                                                            {item.className}
                                                        </div>
                                                        {item.teacherName && (
                                                            <div className="text-[10px] text-gray-400 mt-1 font-medium text-center truncate px-1" title={item.teacherName}>
                                                                GV: {item.teacherName}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className={cn(
                                                    "py-4 px-2 text-center font-black align-top pt-5",
                                                    theme.text
                                                )}>
                                                    {item.totalStudents}
                                                </td>

                                                {/* Total Vắng (P + K) */}
                                                <td className="py-4 px-2 text-center font-bold text-red-600 align-top pt-5 bg-red-50/30">
                                                    {totalAbsentPK > 0 ? totalAbsentPK : '-'}
                                                </td>

                                                <td className="py-4 px-2 text-center align-top pt-5 bg-green-50/30">
                                                    <span className="font-black text-xl text-green-600">
                                                        {item.attendanceCount.Present}
                                                    </span>
                                                </td>

                                                {/* P - Phép */}
                                                {settings.visibleDefaultColumns.P && (
                                                    <td
                                                        onClick={() => handleCellClick(item.classId, 'P')}
                                                        className="py-2 px-2 align-top cursor-pointer hover:bg-yellow-50 transition-colors border-l border-dashed border-gray-100"
                                                    >
                                                        <div className="flex flex-col gap-1 h-full min-h-[60px]">
                                                            {item.attendanceCount.P > 0 && (
                                                                <div className="text-center font-black text-xl text-yellow-500 leading-none mb-1">{item.attendanceCount.P}</div>
                                                            )}
                                                            {item.studentLists.P.length > 0 && (
                                                                <div className="text-[11px] font-medium text-gray-700 leading-snug break-words">
                                                                    {item.studentLists.P.map(s => {
                                                                        const shortName = s.name.split(' ').slice(-2).join(' ');
                                                                        return (
                                                                            <span key={s.stt || s.name} className="text-yellow-600">
                                                                                {s.note ? `${shortName} (${s.note})` : shortName}
                                                                            </span>
                                                                        );
                                                                    }).reduce((prev, curr) => [prev, ', ', curr] as any)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}

                                                {/* K - Không Phép */}
                                                {settings.visibleDefaultColumns.K && (
                                                    <td
                                                        onClick={() => handleCellClick(item.classId, 'K')}
                                                        className="py-2 px-2 align-top cursor-pointer hover:bg-red-50 transition-colors border-l border-dashed border-gray-100"
                                                    >
                                                        <div className="flex flex-col gap-1 h-full min-h-[60px]">
                                                            {item.attendanceCount.K > 0 && (
                                                                <div className="text-center font-black text-xl text-red-500 leading-none mb-1">{item.attendanceCount.K}</div>
                                                            )}
                                                            {item.studentLists.K.length > 0 && (
                                                                <div className="text-[11px] font-medium text-gray-700 leading-snug break-words">
                                                                    {item.studentLists.K.map(s => {
                                                                        const shortName = s.name.split(' ').slice(-2).join(' ');
                                                                        return (
                                                                            <span key={s.stt || s.name} className="text-red-600">
                                                                                {s.note ? `${shortName} (${s.note})` : shortName}
                                                                            </span>
                                                                        );
                                                                    }).reduce((prev, curr) => [prev, ', ', curr] as any)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}

                                                {/* T - Trễ */}
                                                {settings.visibleDefaultColumns.T && (
                                                    <td
                                                        onClick={() => handleCellClick(item.classId, 'T')}
                                                        className="py-2 px-2 align-top cursor-pointer hover:bg-blue-50 transition-colors border-l border-dashed border-gray-100"
                                                    >
                                                        <div className="flex flex-col gap-1 h-full min-h-[60px]">
                                                            {item.attendanceCount.T > 0 && (
                                                                <div className="text-center font-black text-xl text-blue-500 leading-none mb-1">{item.attendanceCount.T}</div>
                                                            )}
                                                            {item.studentLists.T.length > 0 && (
                                                                <div className="text-[11px] font-medium text-gray-700 leading-snug break-words">
                                                                    {item.studentLists.T.map(s => {
                                                                        const shortName = s.name.split(' ').slice(-2).join(' ');
                                                                        return (
                                                                            <span key={s.stt || s.name} className="text-blue-600">
                                                                                {s.note ? `${shortName} (${s.note})` : shortName}
                                                                            </span>
                                                                        );
                                                                    }).reduce((prev, curr) => [prev, ', ', curr] as any)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}

                                                {/* VP - Vi Phạm */}
                                                {settings.visibleDefaultColumns.VP && (
                                                    <td
                                                        onClick={() => handleCellClick(item.classId, 'VP')}
                                                        className="py-2 px-2 align-top cursor-pointer hover:bg-purple-50 transition-colors border-l border-dashed border-gray-100"
                                                    >
                                                        <div className="flex flex-col gap-1 h-full min-h-[60px]">
                                                            {item.attendanceCount.VP > 0 && (
                                                                <div className="text-center font-black text-xl text-purple-500 leading-none mb-1">{item.attendanceCount.VP}</div>
                                                            )}
                                                            {item.studentLists.VP.length > 0 && (
                                                                <div className="text-[11px] font-medium text-gray-700 leading-snug break-words">
                                                                    {item.studentLists.VP.map(s => {
                                                                        const shortName = s.name.split(' ').slice(-2).join(' ');
                                                                        return (
                                                                            <span key={s.stt || s.name} className="text-purple-600">
                                                                                {s.note ? `${shortName} (${s.note})` : shortName}
                                                                            </span>
                                                                        );
                                                                    }).reduce((prev, curr) => [prev, ', ', curr] as any)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}

                                                {/* KH - Khen Thưởng */}
                                                {settings.visibleDefaultColumns.KH && (
                                                    <td
                                                        onClick={() => handleCellClick(item.classId, 'KH')}
                                                        className="py-2 px-2 align-top cursor-pointer hover:bg-orange-50 transition-colors border-l border-dashed border-gray-100"
                                                    >
                                                        <div className="flex flex-col gap-1 h-full min-h-[60px]">
                                                            {item.attendanceCount.KH > 0 && (
                                                                <div className="text-center font-black text-xl text-orange-500 leading-none mb-1">{item.attendanceCount.KH}</div>
                                                            )}
                                                            {item.studentLists.KH.length > 0 && (
                                                                <div className="text-[11px] font-medium text-gray-700 leading-snug break-words">
                                                                    {item.studentLists.KH.map(s => {
                                                                        const shortName = s.name.split(' ').slice(-2).join(' ');
                                                                        return (
                                                                            <span key={s.stt || s.name} className="text-orange-600">
                                                                                {s.note ? `${shortName} (${s.note})` : shortName}
                                                                            </span>
                                                                        );
                                                                    }).reduce((prev, curr) => [prev, ', ', curr] as any)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-100/80 font-black text-gray-800 border-t-2 border-gray-300">
                                        <td className="py-4 px-2 text-center sticky left-0 z-10 bg-gray-100 border-r border-gray-200">
                                            TỔNG CỘNG
                                        </td>
                                        <td className="py-4 px-2 text-center text-lg">{blockData.reduce((acc, curr) => acc + curr.totalStudents, 0)}</td>
                                        <td className="py-4 px-2 text-center text-lg text-red-600 bg-red-50/50">{blockData.reduce((acc, curr) => acc + curr.attendanceCount.P + curr.attendanceCount.K, 0)}</td>
                                        <td className="py-4 px-2 text-center text-xl text-green-600 bg-green-50/50">{blockData.reduce((acc, curr) => acc + curr.attendanceCount.Present, 0)}</td>
                                        {settings.visibleDefaultColumns.P && <td className="py-4 px-2 text-center text-lg text-yellow-600 bg-yellow-50/30">{blockData.reduce((acc, item) => acc + item.attendanceCount.P, 0)}</td>}
                                        {settings.visibleDefaultColumns.K && <td className="py-4 px-2 text-center text-lg text-red-600 bg-red-50/30">{blockData.reduce((acc, item) => acc + item.attendanceCount.K, 0)}</td>}
                                        {settings.visibleDefaultColumns.T && <td className="py-4 px-2 text-center text-lg text-blue-600 bg-blue-50/30">{blockData.reduce((acc, item) => acc + item.attendanceCount.T, 0)}</td>}
                                        {settings.visibleDefaultColumns.VP && <td className="py-4 px-2 text-center text-lg text-purple-600 bg-purple-50/30">{blockData.reduce((acc, item) => acc + item.attendanceCount.VP, 0)}</td>}
                                        {settings.visibleDefaultColumns.KH && <td className="py-4 px-2 text-center text-lg text-orange-600 bg-orange-50/30">{blockData.reduce((acc, item) => acc + item.attendanceCount.KH, 0)}</td>}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Empty State */}
            {
                mode === 'BLOCK' && blockData.length === 0 && !loading && (
                    <div className="text-center py-20 opacity-50">
                        <Zap size={64} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-xl font-bold text-gray-400">
                            Nhấn "Điểm Danh Khối" để xem danh sách
                        </p>
                    </div>
                )
            }
            {
                mode === 'CLASS' && !showSheet && (!quickClassId || classes.length === 0) && (
                    <div className="text-center py-20 opacity-50">
                        <Zap size={64} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-xl font-bold text-gray-400">
                            Sẵn sàng điểm danh!
                        </p>
                    </div>
                )
            }

            {/* Interaction Dialog */}
            {
                selectedClass && (
                    <StudentSelectorDialog
                        open={!!selectedClass}
                        onOpenChange={(open) => !open && setSelectedClass(null)}
                        classId={selectedClass}
                        className={blockData.find(c => c.classId === selectedClass)?.className || ''}
                        targetStatus={targetStatus}
                        date={date}
                        session={session}
                        onDateChange={setDate}
                        onSessionChange={setSession}
                        onSaved={fetchBlockData}
                    />
                )
            }

            {/* Import Dialog */}
            <ImportAttendanceDialog
                open={importDialogOpen}
                onOpenChange={setImportDialogOpen}
                onSuccess={() => {
                    if (mode === 'BLOCK') fetchBlockData();
                }}
            />

            {/* Mobile View Integration */}
            {
                mode === 'BLOCK' && (
                    <MobileAttendanceList
                        data={blockData}
                        grade={grade}
                        onItemClick={(classId) => {
                            setQuickClassId(classId);
                            setMode('CLASS');
                            setShowSheet(true);
                        }}
                    />
                )
            }

            {/* Mobile Class Detail View */}
            {
                mode === 'CLASS' && viewDevice !== 'desktop' && quickClassId && showSheet && (
                    <div className="fixed inset-0 z-50 bg-white animate-in slide-in-from-right duration-300 overflow-y-auto">
                        <MobileClassDetail
                            classId={quickClassId}
                            className={classes.find(c => c.id === quickClassId)?.name || 'Lớp'}
                            date={date}
                            session={session}
                            onDateChange={setDate}
                            onBack={() => {
                                setShowSheet(false);
                                fetchBlockData(); // Refresh data on back
                            }}
                        />
                    </div>
                )
            }
        </div >
    );
}
