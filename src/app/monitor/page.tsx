'use client';

import { useState, useEffect, useCallback } from 'react';
import { Class } from '@/types/models';
import { getAllClasses } from '@/app/actions/common';
import { getGradeAttendanceSummary, getClassesAttendanceSummary, BlockAttendanceItem } from '@/app/actions/quick-attendance';
import { Monitor, BookOpen, LayoutGrid, Zap, ArrowRight, ClipboardList, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useViewMode } from '@/context/view-mode-context';
import { useAuth } from '@/context/auth-context';
import { useFeatureFlags } from '@/context/feature-flags-context';

export default function MonitorDashboardPage() {
    const { appUser } = useAuth();
    const { flags, loading: flagsLoading } = useFeatureFlags();
    const isTeacher = appUser?.role === 'teacher';
    const [classes, setClasses] = useState<Class[]>([]);

    // Date State - Default to today
    const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

    // Shared State
    const [grade, setGrade] = useState<number>(-1); // Default to My Classes to prevent unauthorized viewing briefly
    const [myClassIds, setMyClassIds] = useState<string[]>([]);
    const { viewDevice } = useViewMode();

    const [blockData, setBlockData] = useState<BlockAttendanceItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!appUser) return;
        const saved = localStorage.getItem(`myClasses_${appUser.uid}`) || localStorage.getItem('my-classes');
        if (saved) {
            try {
                const ids = JSON.parse(saved);
                setMyClassIds(ids);
            } catch (e) {
                console.error("Failed to parse my-classes", e);
            }
        } else if (appUser.assignedClassIds && appUser.assignedClassIds.length > 0) {
            setMyClassIds(appUser.assignedClassIds);
        }

        // Setup initial default grade tab
        if (appUser.role !== 'teacher') {
            setGrade(6); // Admins/Supervisors see Grade 6 initially by default if they prefer
        }

        getAllClasses().then(setClasses);
    }, [appUser]);

    const fetchBlockData = useCallback(async () => {
        setLoading(true);
        let data: BlockAttendanceItem[] = [];
        if (grade === -1) {
            data = await getClassesAttendanceSummary(myClassIds, date);
        } else {
            data = await getGradeAttendanceSummary(grade, date);
        }
        setBlockData(data);
        setLoading(false);
    }, [grade, date, myClassIds]);

    useEffect(() => {
        fetchBlockData();
    }, [grade, date, myClassIds, fetchBlockData]);

    const handleGradeChange = (newGrade: number) => {
        setGrade(newGrade);
    };

    // Helper: Grade Color Theme
    const getGradeTheme = (g: number) => {
        switch (g) {
            case 6: return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', shadow: 'shadow-green-100' };
            case 7: return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', shadow: 'shadow-blue-100' };
            case 8: return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', shadow: 'shadow-orange-100' };
            case 9: return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', shadow: 'shadow-purple-100' };
            case -1: return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', shadow: 'shadow-yellow-100' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', shadow: 'shadow-gray-100' };
        }
    };

    if (flagsLoading) {
        return <div className="p-8 text-center text-gray-500 flex justify-center items-center h-[50vh]"><Loader2 className="animate-spin mr-2" /> Đang tải...</div>;
    }

    if (!flags.monitor) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4 ring-8 ring-amber-50/50">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Tính năng đang bảo trì</h2>
                <p className="text-gray-500 max-w-md">Chức năng Sổ Theo Dõi tạm thời bị vô hiệu hoá bởi Quản trị viên. Vui lòng quay lại sau.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50/50 space-y-6">
            <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <BookOpen className="text-blue-600 fill-blue-100" size={24} />
                        Sổ Theo Dõi
                    </h1>
                    <p className="text-gray-500 text-sm">Quản lý chi tiết và các cột tùy chỉnh theo Lớp</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="border-none bg-transparent text-sm font-bold text-gray-700 outline-none px-2 cursor-pointer hover:text-blue-600 transition-colors"
                        title="Dổi ngày xem"
                    />
                </div>
            </header>

            {/* Grade Selection */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button
                    onClick={() => handleGradeChange(-1)}
                    className={cn(
                        "px-4 py-2 rounded-xl font-bold text-sm md:text-base shadow-sm transition-all flex-shrink-0 border border-transparent flex items-center gap-2",
                        grade === -1 ? 'bg-yellow-500 text-white shadow-yellow-200' : 'bg-white text-yellow-600 hover:bg-yellow-50'
                    )}
                >
                    <BookOpen size={18} />
                    LỚP CỦA TÔI {isTeacher && "(CHỈ ĐỊNH)"}
                </button>

                {!isTeacher && [6, 7, 8, 9].map(g => {
                    const active = grade === g;
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

            {/* Class Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : blockData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {blockData.map(item => {
                        const theme = getGradeTheme(grade);
                        return (
                            <Link
                                key={item.classId}
                                href={`/classes/${item.classId}/monitor`}
                                className={cn(
                                    "group bg-white rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden",
                                    theme.border,
                                    theme.shadow
                                )}
                            >
                                <div className={cn("absolute top-0 right-0 p-4 opacity-10 transition-transform group-hover:scale-110", theme.text)}>
                                    <ClipboardList size={80} />
                                </div>

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={cn(
                                            "text-2xl font-black px-4 py-2 rounded-xl border shadow-sm",
                                            theme.bg, theme.border, theme.text
                                        )}>
                                            {item.className}
                                        </div>
                                        <div className="bg-gray-50 px-3 py-1 rounded-lg text-xs font-bold text-gray-500 flex flex-col items-center">
                                            <span>SỈ SỐ</span>
                                            <span className="text-lg text-gray-800">{item.totalStudents}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500 font-medium">Hiện diện:</span>
                                            <span className="font-bold text-green-600">{item.attendanceCount.Present}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-text-secondary font-medium">Vắng:</span>
                                            <span className={cn("font-bold", item.attendanceCount.TotalAbsent > 0 ? "text-danger" : "text-text-tertiary")}>
                                                {item.attendanceCount.TotalAbsent}
                                            </span>
                                        </div>

                                        <div className="pt-4 mt-2 border-t border-gray-100 flex items-center justify-between text-blue-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                                            <span>Mở Sổ Theo Dõi</span>
                                            <ArrowRight size={16} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-20 opacity-50">
                    <BookOpen size={64} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-xl font-bold text-gray-400">
                        Chưa có dữ liệu lớp học
                    </p>
                </div>
            )}
        </div>
    );
}
