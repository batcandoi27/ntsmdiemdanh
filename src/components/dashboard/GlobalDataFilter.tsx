"use client";

import React from 'react';
import { Calendar as CalendarIcon, Filter, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, subWeeks, addMonths, subMonths, parseISO, format } from "date-fns";

interface FilterOption {
    value: string;
    label: string;
}

interface GlobalDataFilterProps {
    dateRange: { start: string; end: string };
    setDateRange: (range: { start: string; end: string }) => void;
    filterMode: 'WEEK' | 'MONTH' | 'CUSTOM';
    setFilterMode: (mode: 'WEEK' | 'MONTH' | 'CUSTOM') => void;
    
    gradeOptions?: FilterOption[];
    selectedGrade?: string;
    setSelectedGrade?: (val: string) => void;

    classOptions?: FilterOption[];
    selectedClass?: string;
    setSelectedClass?: (val: string) => void;

    compareMode?: boolean;
    setCompareMode?: (val: boolean) => void;
}

export function GlobalDataFilter({
    dateRange,
    setDateRange,
    filterMode,
    setFilterMode,
    gradeOptions,
    selectedGrade,
    setSelectedGrade,
    classOptions,
    selectedClass,
    setSelectedClass,
    compareMode,
    setCompareMode
}: GlobalDataFilterProps) {
    
    const [pendingDateRange, setPendingDateRange] = React.useState(dateRange);
    const [pendingFilterMode, setPendingFilterMode] = React.useState(filterMode);
    const dateInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        setPendingDateRange(dateRange);
        setPendingFilterMode(filterMode);
    }, [dateRange, filterMode]);

    const setMode = (mode: 'WEEK' | 'MONTH' | 'CUSTOM') => {
        setPendingFilterMode(mode);
        const now = new Date();
        if (mode === 'WEEK') {
            setPendingDateRange({
                start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
            });
        } else if (mode === 'MONTH') {
            setPendingDateRange({
                start: format(startOfMonth(now), 'yyyy-MM-dd'),
                end: format(endOfMonth(now), 'yyyy-MM-dd')
            });
        }
    };

    const navigate = (direction: -1 | 1) => {
        const start = parseISO(pendingDateRange.start);

        if (pendingFilterMode === 'WEEK') {
            const fn = direction === 1 ? addWeeks : subWeeks;
            const newStart = fn(start, 1);
            setPendingDateRange({
                start: format(startOfWeek(newStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                end: format(endOfWeek(newStart, { weekStartsOn: 1 }), 'yyyy-MM-dd')
            });
        } else if (pendingFilterMode === 'MONTH') {
            const fn = direction === 1 ? addMonths : subMonths;
            const newStart = fn(start, 1);
            setPendingDateRange({
                start: format(startOfMonth(newStart), 'yyyy-MM-dd'),
                end: format(endOfMonth(newStart), 'yyyy-MM-dd')
            });
        }
    };

    const applyFilter = () => {
        setFilterMode(pendingFilterMode);
        setDateRange(pendingDateRange);
    };

    const isDirty = pendingDateRange.start !== dateRange.start || pendingDateRange.end !== dateRange.end || pendingFilterMode !== filterMode;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Period Navigation */}
            <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 w-full md:w-auto">
                <div className="flex bg-white p-1 rounded border border-slate-200 shadow-sm w-full sm:w-auto">
                    <button
                        onClick={() => setMode('WEEK')}
                        className={cn("flex-1 px-4 py-1.5 text-xs font-bold rounded transition-colors uppercase tracking-wide", pendingFilterMode === 'WEEK' ? "bg-blue-100 text-blue-800 border border-blue-200" : "text-slate-600 hover:bg-slate-100")}
                    >
                        Tuần
                    </button>
                    <button
                        onClick={() => setMode('MONTH')}
                        className={cn("flex-1 px-4 py-1.5 text-xs font-bold rounded transition-colors uppercase tracking-wide", pendingFilterMode === 'MONTH' ? "bg-blue-100 text-blue-800 border border-blue-200" : "text-slate-600 hover:bg-slate-100")}
                    >
                        Tháng
                    </button>
                </div>

                <div className="flex items-center gap-1 w-full sm:w-auto justify-between sm:justify-center">
                    <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-600 transition-colors border border-transparent hover:border-slate-300 shrink-0">
                        <ChevronLeft size={18} strokeWidth={2.5} />
                    </button>

                    <div 
                        className="relative flex items-center gap-2 px-2 py-1 text-sm font-black text-slate-800 sm:min-w-[130px] justify-center text-center cursor-pointer hover:bg-slate-200 rounded transition-colors group"
                        onClick={() => {
                            if (dateInputRef.current && typeof dateInputRef.current.showPicker === 'function') {
                                dateInputRef.current.showPicker();
                            }
                        }}
                    >
                        {pendingFilterMode === 'WEEK' && <span>T.02-{format(parseISO(pendingDateRange.start), "dd/MM")}</span>}
                        {pendingFilterMode === 'MONTH' && <span>Th.{format(parseISO(pendingDateRange.start), 'MM/yyyy')}</span>}
                        {pendingFilterMode === 'CUSTOM' && <span>Tùy Chọn</span>}
                        
                        {(pendingFilterMode === 'WEEK' || pendingFilterMode === 'MONTH') && (
                            <input 
                                ref={dateInputRef}
                                type={pendingFilterMode === 'WEEK' ? 'date' : 'month'}
                                className="absolute w-0 h-0 opacity-0 pointer-events-none"
                                value={pendingFilterMode === 'WEEK' ? pendingDateRange.start : pendingDateRange.start.substring(0, 7)}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        const d = new Date(e.target.value);
                                        if (pendingFilterMode === 'WEEK') {
                                            setPendingDateRange({ start: format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'), end: format(endOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd') });
                                        } else {
                                            setPendingDateRange({ start: format(startOfMonth(d), 'yyyy-MM-dd'), end: format(endOfMonth(d), 'yyyy-MM-dd') });
                                        }
                                    }
                                }}
                            />
                        )}
                        {(pendingFilterMode === 'WEEK' || pendingFilterMode === 'MONTH') && (
                            <CalendarIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 opacity-50" />
                        )}
                    </div>

                    <button onClick={() => navigate(1)} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-600 transition-colors border border-transparent hover:border-slate-300 shrink-0">
                        <ChevronRight size={18} strokeWidth={2.5} />
                    </button>
                </div>

                <button 
                    onClick={applyFilter}
                    className={cn(
                        "px-4 py-1.5 text-sm font-bold rounded shadow-sm transition-all flex items-center gap-1.5",
                        isDirty 
                            ? "bg-blue-600 text-white hover:bg-blue-700 animate-pulse ring-2 ring-blue-300" 
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                    )}
                >
                    {isDirty ? '🔄 Xem' : '✓ Đã áp dụng'}
                </button>
            </div>

            {/* Compare Toggle */}
            {setCompareMode && (
                <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
                    <button
                        onClick={() => setCompareMode(false)}
                        className={cn("px-4 py-1.5 text-xs font-bold rounded transition-colors", !compareMode ? "bg-white text-slate-800 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700")}
                    >
                        Số liệu hiện tại
                    </button>
                    <button
                        onClick={() => setCompareMode(true)}
                        className={cn("px-4 py-1.5 text-xs font-bold rounded transition-colors", compareMode ? "bg-white text-slate-800 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700")}
                    >
                        So với tuần trước
                    </button>
                </div>
            )}

            {/* Selectors */}
            <div className="flex items-center gap-3">
                {gradeOptions && setSelectedGrade && (
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        <Filter className="w-4 h-4 text-slate-400 mr-2" />
                        <select 
                            value={selectedGrade || ''} 
                            onChange={(e) => setSelectedGrade(e.target.value)}
                            className="bg-transparent text-sm font-medium text-slate-700 outline-none w-full min-w-[100px]"
                        >
                            <option value="">Tất cả khối</option>
                            {gradeOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                )}

                {classOptions && setSelectedClass && (
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        <Users className="w-4 h-4 text-slate-400 mr-2" />
                        <select 
                            value={selectedClass || ''} 
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="bg-transparent text-sm font-medium text-slate-700 outline-none w-full min-w-[100px]"
                        >
                            <option value="">Tất cả lớp</option>
                            {classOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
            
        </div>
    );
}
