'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { Class, AttendanceStatus } from '@/types/models';
import { getAllClasses } from '@/app/actions/common';
import { getGradeAttendanceSummary, BlockAttendanceItem } from '@/app/actions/quick-attendance';
import { AttendanceSheet } from '@/components/attendance-sheet';
import { StudentSelectorDialog } from '@/components/quick-attendance/student-selector-dialog';
import { Monitor, Smartphone, Tablet, Ban, CheckCircle, ChevronRight, UserCheck, ArrowLeft, Loader2, Zap, List, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { MobileAttendanceList } from '@/components/quick-attendance/mobile-attendance-list';
import { MobileClassDetail } from '@/components/quick-attendance/mobile-class-detail';
import { useViewMode } from '@/context/view-mode-context';

export default function QuickAttendancePage() {
    const [classes, setClasses] = useState<Class[]>([]);

    // Modes: 'CLASS' (default) vs 'BLOCK' (new)
    const [mode, setMode] = useState<'CLASS' | 'BLOCK'>('BLOCK');
    // Date State
    const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

    // Shared State
    const [grade, setGrade] = useState<number>(6);
    const { viewDevice } = useViewMode();

    // Class Mode State
    const [quickClassId, setQuickClassId] = useState<string>('');
    const [showSheet, setShowSheet] = useState(false);

    // Block Mode State
    const [blockData, setBlockData] = useState<BlockAttendanceItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState<string | null>(null); // Changed to store classId string
    const [targetStatus, setTargetStatus] = useState<AttendanceStatus>('P');

    useEffect(() => {
        getAllClasses().then(setClasses);
    }, []);

    const filteredClasses = classes.filter(c => c.grade === grade)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    // Reset Class Mode logic when Grade changes
    useEffect(() => {
        if (mode === 'BLOCK') {
            fetchBlockData();
        }
    }, [grade, date, mode]);



    // Helper: Grade Color Theme
    const getGradeTheme = (g: number) => {
        switch (g) {
            case 6: return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
            case 7: return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
            case 8: return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' };
            case 9: return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
        }
    };

    const fetchBlockData = useCallback(async () => {
        setLoading(true);
        // Use selected date
        const data = await getGradeAttendanceSummary(grade, date);
        setBlockData(data);
        setLoading(false);
    }, [grade, date]);

    const handleGradeChange = (newGrade: number) => {
        setGrade(newGrade);
        // fetchBlockData will be called by the useEffect when grade changes
    };

    const handleCellClick = (classId: string, status: AttendanceStatus) => {
        setSelectedClass(classId);
        setTargetStatus(status);
        setDialogOpen(true);
    };

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50/50 space-y-6">
            <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Zap className="text-yellow-500 fill-yellow-500" size={24} />
                        Điểm Danh
                    </h1>
                    <p className="text-gray-500 text-sm">Quản lý chuyên cần theo Khối / Lớp</p>
                </div>



                <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="border-none bg-transparent text-sm font-bold text-gray-700 outline-none px-2 cursor-pointer hover:text-primary transition-colors"
                        title="Dổi ngày điểm danh"
                    />
                    <div className="h-4 w-px bg-gray-200 mx-1"></div>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setMode('BLOCK')}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
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
                                "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
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
            {mode === 'BLOCK' && (
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
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
            )}

            {/* Selector Panel (CLASS Mode) */}
            {mode === 'CLASS' && (
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
                            <div className="flex bg-black/20 rounded-xl p-1.5 backdrop-blur-sm gap-2">
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
                                    className="w-full bg-white text-gray-900 text-xl font-bold py-4 pl-6 pr-12 rounded-xl appearance-none cursor-pointer focus:ring-4 focus:ring-yellow-400 outline-none shadow-lg group-hover:bg-blue-50 transition-colors"
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
            )}

            {/* Content Area */}

            {/* 1. Class Mode Sheet */}
            {mode === 'CLASS' && showSheet && quickClassId && (
                <div className="animate-in slide-in-from-bottom-8 fade-in duration-500">
                    <AttendanceSheet classId={quickClassId} />
                </div>
            )}

            {/* Block Attendance Table (Desktop Only) */}
            {mode === 'BLOCK' && viewDevice === 'desktop' && blockData.length > 0 && (
                <div className="animate-in slide-in-from-bottom-8 fade-in duration-500 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-sm text-gray-500 border-b border-gray-100">
                                    <th className="py-3 px-2 font-bold min-w-[80px] sticky left-0 z-20 bg-white border-b border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">TÊN LỚP</th>
                                    <th className="py-3 px-2 font-bold text-center w-16">SỈ SỐ</th>
                                    <th className="py-3 px-2 font-bold text-center w-16 bg-red-50 text-red-600">VẮNG</th>
                                    <th className="py-3 px-2 font-bold text-center min-w-[100px] bg-green-50 text-green-700">HIỆN DIỆN</th>
                                    <th className="py-3 px-2 font-bold text-center min-w-[120px] bg-yellow-50 text-yellow-700">PHÉP (P)</th>
                                    <th className="py-3 px-2 font-bold text-center min-w-[120px] bg-red-50 text-red-700">KHÔNG (K)</th>
                                    <th className="py-3 px-2 font-bold text-center min-w-[120px] bg-blue-50 text-blue-700">TRỄ (T)</th>
                                    <th className="py-3 px-2 font-bold text-center min-w-[120px] bg-purple-50 text-purple-700">VI PHẠM (VP)</th>
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
                                                <div className={cn(
                                                    "px-3 py-2 rounded-lg border font-black text-center shadow-sm text-lg",
                                                    theme.bg, theme.border, theme.text
                                                )}>
                                                    {item.className}
                                                </div>
                                            </td>
                                            <td className="py-4 px-2 text-center font-bold text-gray-600 align-top pt-5">
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
                                                                return s.note ? `${shortName} (${s.note})` : shortName;
                                                            }).join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* K - Không Phép */}
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
                                                                return s.note ? `${shortName} (${s.note})` : shortName;
                                                            }).join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* T - Trễ */}
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
                                                                return s.note ? `${shortName} (${s.note})` : shortName;
                                                            }).join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* VP - Vi Phạm */}
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
                                                                return s.note ? `${shortName} (${s.note})` : shortName;
                                                            }).join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {mode === 'BLOCK' && blockData.length === 0 && !loading && (
                <div className="text-center py-20 opacity-50">
                    <Zap size={64} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-xl font-bold text-gray-400">
                        Nhấn "Điểm Danh Khối" để xem danh sách
                    </p>
                </div>
            )}
            {mode === 'CLASS' && !showSheet && (!quickClassId || classes.length === 0) && (
                <div className="text-center py-20 opacity-50">
                    <Zap size={64} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-xl font-bold text-gray-400">
                        Sẵn sàng điểm danh!
                    </p>
                </div>
            )}

            {/* Interaction Dialog */}
            {selectedClass && (
                <StudentSelectorDialog
                    open={!!selectedClass}
                    onOpenChange={(open) => !open && setSelectedClass(null)}
                    classId={selectedClass}
                    className={blockData.find(c => c.classId === selectedClass)?.className || ''}
                    targetStatus={targetStatus}
                    date={date}
                    onDateChange={setDate}
                    onSaved={fetchBlockData}
                />
            )}

            {/* Mobile View Integration */}
            {mode === 'BLOCK' && (
                <MobileAttendanceList
                    data={blockData}
                    grade={grade}
                    onItemClick={(classId) => {
                        setQuickClassId(classId);
                        setMode('CLASS');
                        setShowSheet(true);
                    }}
                />
            )}

            {/* Mobile Class Detail View */}
            {mode === 'CLASS' && viewDevice !== 'desktop' && quickClassId && showSheet && (
                <div className="fixed inset-0 z-50 bg-white animate-in slide-in-from-right duration-300 overflow-y-auto">
                    <MobileClassDetail
                        classId={quickClassId}
                        className={classes.find(c => c.id === quickClassId)?.name || 'Lớp'}
                        date={date}
                        onDateChange={setDate}
                        onBack={() => {
                            setShowSheet(false);
                            fetchBlockData(); // Refresh data on back
                        }}
                    />
                </div>
            )}
        </div>
    );
}
