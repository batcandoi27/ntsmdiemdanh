"use client";

import React from 'react';
import { Calendar as CalendarIcon, Filter, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, subWeeks, addMonths, subMonths, parseISO, format } from "date-fns";
import { Card } from '@/design-system/components/Card/card';
import { Select } from '@/design-system/components/Select/select';
import { Button } from '@/design-system/components/Button/button';

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
        <Card className="mb-6 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Period Navigation */}
            <div className="flex flex-col sm:flex-row items-center gap-2 bg-surface-section p-1.5 rounded-xl border border-border-subtle w-full lg:w-auto">
                <div className="flex bg-surface-card p-1 rounded-lg border border-border-subtle shadow-xs w-full sm:w-auto">
                    <button
                        onClick={() => setMode('WEEK')}
                        className={cn(
                            "flex-1 px-3.5 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wide select-none",
                            pendingFilterMode === 'WEEK'
                                ? "bg-primary-soft text-primary border border-primary/20 shadow-xs"
                                : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                        )}
                    >
                        Tuần
                    </button>
                    <button
                        onClick={() => setMode('MONTH')}
                        className={cn(
                            "flex-1 px-3.5 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wide select-none",
                            pendingFilterMode === 'MONTH'
                                ? "bg-primary-soft text-primary border border-primary/20 shadow-xs"
                                : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                        )}
                    >
                        Tháng
                    </button>
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors border border-transparent hover:border-border-subtle shrink-0"
                        title="Lùi kỳ trước"
                    >
                        <ChevronLeft size={18} strokeWidth={2.5} />
                    </button>

                    <div 
                        className="relative flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-text-primary sm:min-w-[140px] justify-center text-center cursor-pointer hover:bg-surface-hover rounded-lg transition-colors border border-border-subtle/40 bg-surface-card shadow-xs select-none"
                        onClick={() => {
                            if (dateInputRef.current && typeof dateInputRef.current.showPicker === 'function') {
                                dateInputRef.current.showPicker();
                            }
                        }}
                    >
                        {pendingFilterMode === 'WEEK' && <span>T.02 - {format(parseISO(pendingDateRange.start), "dd/MM")}</span>}
                        {pendingFilterMode === 'MONTH' && <span>Tháng {format(parseISO(pendingDateRange.start), 'MM/yyyy')}</span>}
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
                            <CalendarIcon className="w-3.5 h-3.5 text-text-tertiary" />
                        )}
                    </div>

                    <button
                        onClick={() => navigate(1)}
                        className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors border border-transparent hover:border-border-subtle shrink-0"
                        title="Tiến kỳ sau"
                    >
                        <ChevronRight size={18} strokeWidth={2.5} />
                    </button>
                </div>

                <Button 
                    size="sm"
                    variant={isDirty ? "primary" : "secondary"}
                    onClick={applyFilter}
                    className="w-full sm:w-auto"
                >
                    {isDirty ? '🔄 Xem dữ liệu' : '✓ Đã áp dụng'}
                </Button>
            </div>

            {/* Compare Toggle */}
            {setCompareMode && (
                <div className="flex bg-surface-section p-1 rounded-xl border border-border-subtle w-full sm:w-auto">
                    <button
                        onClick={() => setCompareMode(false)}
                        className={cn(
                            "flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-lg transition-all select-none",
                            !compareMode
                                ? "bg-surface-card text-text-primary shadow-xs border border-border-subtle"
                                : "text-text-secondary hover:text-text-primary"
                        )}
                    >
                        Số liệu hiện tại
                    </button>
                    <button
                        onClick={() => setCompareMode(true)}
                        className={cn(
                            "flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-lg transition-all select-none",
                            compareMode
                                ? "bg-surface-card text-text-primary shadow-xs border border-border-subtle"
                                : "text-text-secondary hover:text-text-primary"
                        )}
                    >
                        So với tuần trước
                    </button>
                </div>
            )}

            {/* Selectors */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                {gradeOptions && setSelectedGrade && (
                    <div className="min-w-[140px]">
                        <Select 
                            value={selectedGrade || ''} 
                            onChange={(e) => setSelectedGrade(e.target.value)}
                            leftIcon={<Filter className="w-4 h-4" />}
                            options={[
                                { value: '', label: 'Tất cả khối' },
                                ...gradeOptions
                            ]}
                        />
                    </div>
                )}

                {classOptions && setSelectedClass && (
                    <div className="min-w-[140px]">
                        <Select 
                            value={selectedClass || ''} 
                            onChange={(e) => setSelectedClass(e.target.value)}
                            leftIcon={<Users className="w-4 h-4" />}
                            options={[
                                { value: '', label: 'Tất cả lớp' },
                                ...classOptions
                            ]}
                        />
                    </div>
                )}
            </div>
            
        </Card>
    );
}
