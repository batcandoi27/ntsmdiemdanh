import { Class } from "@/types/models";
import { Calendar, Filter, LayoutGrid, List, Check, ChevronsUpDown, ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, subWeeks, addMonths, subMonths, parseISO, format, isSameDay } from "date-fns";

interface ReportsFilterProps {
    dateRange: { start: string, end: string };
    setDateRange: (range: { start: string, end: string }) => void;

    selectedClasses: string[];
    setSelectedClasses: (ids: string[]) => void;

    classes: Class[];
    visibleColumns: string[];
    setVisibleColumns: (cols: string[]) => void;

    viewMode: 'LIST' | 'GRID';
    setViewMode: (mode: 'LIST' | 'GRID') => void;

    groupBy: 'DATE' | 'CLASS';
    setGroupBy: (group: 'DATE' | 'CLASS') => void;

    onExport: () => void;
    onExportAdvanced?: () => void; // Optional for backward compatibility if needed
    onGenerateReport: () => void;
}

type FilterMode = 'WEEK' | 'MONTH' | 'CUSTOM';

const COLUMNS = [
    { id: 'P', label: 'Phép (P)' },
    { id: 'K', label: 'Không (K)' },
    { id: 'T', label: 'Trễ (T)' },
    { id: 'VP', label: 'Vi phạm (VP)' },
    { id: 'KH', label: 'Khen thưởng (KH)' }
];

export function ReportsFilter({
    dateRange, setDateRange,
    selectedClasses, setSelectedClasses,
    classes,
    visibleColumns, setVisibleColumns,
    viewMode, setViewMode,
    groupBy, setGroupBy,
    onExport,
    onExportAdvanced,
    onGenerateReport
}: ReportsFilterProps) {
    const [openClassDropdown, setOpenClassDropdown] = useState(false);
    const [openColumnDropdown, setOpenColumnDropdown] = useState(false); // New
    const dropdownRef = useRef<HTMLDivElement>(null);
    const columnDropdownRef = useRef<HTMLDivElement>(null); // New
    const [filterMode, setFilterMode] = useState<FilterMode>('MONTH');

    // Close dropdowns on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenClassDropdown(false);
            }
            if (columnDropdownRef.current && !columnDropdownRef.current.contains(event.target as Node)) {
                setOpenColumnDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleClass = (id: string) => {
        if (selectedClasses.includes(id)) {
            setSelectedClasses(selectedClasses.filter(c => c !== id));
        } else {
            setSelectedClasses([...selectedClasses, id]);
        }
    };

    const toggleAllClasses = () => {
        if (selectedClasses.length === classes.length) {
            setSelectedClasses([]);
        } else {
            setSelectedClasses(classes.map(c => c.id));
        }
    };

    const toggleColumn = (id: string) => {
        if (visibleColumns.includes(id)) {
            setVisibleColumns(visibleColumns.filter(c => c !== id));
        } else {
            setVisibleColumns([...visibleColumns, id]);
        }
    };

    const setMode = (mode: FilterMode) => {
        setFilterMode(mode);
        const now = new Date();
        if (mode === 'WEEK') {
            setDateRange({
                start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
            });
        } else if (mode === 'MONTH') {
            setDateRange({
                start: format(startOfMonth(now), 'yyyy-MM-dd'),
                end: format(endOfMonth(now), 'yyyy-MM-dd')
            });
        }
    };

    const navigate = (direction: -1 | 1) => {
        const start = parseISO(dateRange.start);

        if (filterMode === 'WEEK') {
            const fn = direction === 1 ? addWeeks : subWeeks;
            const newStart = fn(start, 1);
            setDateRange({
                start: format(startOfWeek(newStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                end: format(endOfWeek(newStart, { weekStartsOn: 1 }), 'yyyy-MM-dd')
            });
        } else if (filterMode === 'MONTH') {
            const fn = direction === 1 ? addMonths : subMonths;
            const newStart = fn(start, 1);
            setDateRange({
                start: format(startOfMonth(newStart), 'yyyy-MM-dd'),
                end: format(endOfMonth(newStart), 'yyyy-MM-dd')
            });
        } else {
            // Custom mode: Shift by logic of "Duration" or just default to week shift? 
            // Let's default to shifting by 1 day or keeping it simple. 
            // For now, if custom, maybe disable nav or shift by difference.
            const end = parseISO(dateRange.end);
            const diff = end.getTime() - start.getTime();
            const days = Math.round(diff / (1000 * 60 * 60 * 24));
            // Shift by days + 1
            const fn = direction === 1 ? addWeeks : subWeeks; // Fallback to week shift if custom is weird, or manual logic.
            // Actually user expects Week/Month buttons to work properly.
        }
    };

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4 md:space-y-0 md:flex flex-wrap items-center gap-4">

            {/* View Mode Toggles */}
            <div className="flex bg-gray-100 p-1 rounded-lg shrink-0 border border-gray-200">
                <button
                    onClick={() => setViewMode('LIST')}
                    className={cn(
                        "p-2 rounded-md transition-all",
                        viewMode === 'LIST' ? "bg-white text-blue-700 shadow-sm font-bold" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                    )}
                    title="Xem Danh Sách"
                >
                    <List size={20} className={cn(viewMode === 'LIST' ? "stroke-[2.5px]" : "")} />
                </button>
                <button
                    onClick={() => setViewMode('GRID')}
                    className={cn(
                        "p-2 rounded-md transition-all",
                        viewMode === 'GRID' ? "bg-white text-blue-700 shadow-sm font-bold" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                    )}
                    title="Xem Lưới (Excel)"
                >
                    <LayoutGrid size={20} className={cn(viewMode === 'GRID' ? "stroke-[2.5px]" : "")} />
                </button>
            </div>

            <div className="h-8 w-px bg-gray-300 hidden md:block"></div>

            {/* Period Navigation */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-50 p-1 rounded-lg border border-gray-200">
                <div className="flex bg-white p-1 rounded border border-gray-300 shadow-sm">
                    <button
                        onClick={() => setMode('WEEK')}
                        className={cn("px-4 py-1.5 text-xs font-bold rounded transition-colors uppercase tracking-wide", filterMode === 'WEEK' ? "bg-blue-100 text-blue-800 border border-blue-200" : "text-gray-700 hover:bg-gray-100")}
                    >
                        Tuần
                    </button>
                    <button
                        onClick={() => setMode('MONTH')}
                        className={cn("px-4 py-1.5 text-xs font-bold rounded transition-colors uppercase tracking-wide", filterMode === 'MONTH' ? "bg-blue-100 text-blue-800 border border-blue-200" : "text-gray-700 hover:bg-gray-100")}
                    >
                        Tháng
                    </button>
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-gray-200 text-gray-700 transition-colors border border-transparent hover:border-gray-300">
                        <ChevronLeft size={18} strokeWidth={2.5} />
                    </button>

                    <div className="flex items-center gap-2 px-3 text-sm font-black text-black min-w-[140px] justify-center text-center">
                        {filterMode === 'WEEK' && <span>Tuần {format(parseISO(dateRange.start), "ww/'T'MM/yyyy")}</span>}
                        {filterMode === 'MONTH' && <span>Tháng {format(parseISO(dateRange.start), 'MM/yyyy')}</span>}
                        {filterMode === 'CUSTOM' && <span>Tùy Chọn</span>}
                    </div>

                    <button onClick={() => navigate(1)} className="p-1.5 rounded-full hover:bg-gray-200 text-gray-700 transition-colors border border-transparent hover:border-gray-300">
                        <ChevronRight size={18} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Custom Date Inputs */}
            <div className="flex items-center gap-2 text-sm">
                <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => { setFilterMode('CUSTOM'); setDateRange({ ...dateRange, start: e.target.value }) }}
                    className="w-34 px-2 py-1.5 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 shadow-sm"
                />
                <span className="text-gray-600 font-black">-</span>
                <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => { setFilterMode('CUSTOM'); setDateRange({ ...dateRange, end: e.target.value }) }}
                    className="w-34 px-2 py-1.5 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 shadow-sm"
                />
            </div>

            <div className="h-8 w-px bg-gray-300 hidden md:block"></div>

            {/* Class Multi-Select */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setOpenClassDropdown(!openClassDropdown)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-w-[180px] justify-between transition-all shadow-sm active:translate-y-0.5"
                >
                    <div className="flex items-center gap-2 text-sm text-black font-bold">
                        <Filter size={16} className="text-gray-700 stroke-[2.5px]" />
                        <span>
                            {selectedClasses.length === 0 ? "Tất cả lớp" :
                                selectedClasses.length === classes.length ? "Tất cả lớp" :
                                    `Đã chọn ${selectedClasses.length} lớp`}
                        </span>
                    </div>
                    <ChevronsUpDown size={14} className="text-gray-600 stroke-[2px]" />
                </button>

                {openClassDropdown && (
                    <div className="absolute top-full mt-2 left-0 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-2 max-h-[300px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                        <div
                            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg cursor-pointer mb-1 border-b border-gray-100"
                            onClick={toggleAllClasses}
                        >
                            <div className={cn("w-4 h-4 border rounded flex items-center justify-center", selectedClasses.length === classes.length ? "bg-blue-600 border-blue-600" : "border-gray-400 bg-white")}>
                                {selectedClasses.length === classes.length && <Check size={12} className="text-white stroke-[3px]" />}
                            </div>
                            <span className="text-sm font-bold text-black">Chọn Tất Cả</span>
                        </div>
                        {classes.map(cls => (
                            <div
                                key={cls.id}
                                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                onClick={() => toggleClass(cls.id)}
                            >
                                <div className={cn("w-4 h-4 border rounded flex items-center justify-center", selectedClasses.includes(cls.id) ? "bg-blue-600 border-blue-600" : "border-gray-400 bg-white")}>
                                    {selectedClasses.includes(cls.id) && <Check size={12} className="text-white stroke-[3px]" />}
                                </div>
                                <span className="text-sm font-medium text-gray-900">{cls.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Column Multi-Select */}
            <div className="relative" ref={columnDropdownRef}>
                <button
                    onClick={() => setOpenColumnDropdown(!openColumnDropdown)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-w-[160px] justify-between transition-all shadow-sm active:translate-y-0.5"
                >
                    <div className="flex items-center gap-2 text-sm text-black font-bold">
                        <Settings2 size={16} className="text-gray-700 stroke-[2.5px]" />
                        <span>
                            {visibleColumns.length === COLUMNS.length ? "Tất cả cột" : `Chọn cột (${visibleColumns.length})`}
                        </span>
                    </div>
                    <ChevronsUpDown size={14} className="text-gray-600 stroke-[2px]" />
                </button>

                {openColumnDropdown && (
                    <div className="absolute top-full mt-2 left-0 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                        {COLUMNS.map(col => (
                            <div
                                key={col.id}
                                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                onClick={() => toggleColumn(col.id)}
                            >
                                <div className={cn("w-4 h-4 border rounded flex items-center justify-center", visibleColumns.includes(col.id) ? "bg-blue-600 border-blue-600" : "border-gray-400 bg-white")}>
                                    {visibleColumns.includes(col.id) && <Check size={12} className="text-white stroke-[3px]" />}
                                </div>
                                <span className="text-sm font-medium text-gray-900">{col.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="ml-auto flex gap-2">
                {/* Generate Report Button */}
                <button
                    onClick={onGenerateReport}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md flex items-center gap-2 transition-all active:scale-95 border border-blue-700 whitespace-nowrap"
                >
                    <Filter size={18} className="stroke-[2.5px]" /> Báo Cáo
                </button>

                {/* Export Button */}
                <button
                    onClick={onExport}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md flex items-center gap-2 transition-all active:scale-95 border border-emerald-700 whitespace-nowrap"
                >
                    <LayoutGrid size={18} className="stroke-[2.5px]" /> Xuất Excel
                </button>

                {onExportAdvanced && (
                    <button
                        onClick={onExportAdvanced}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md flex items-center gap-2 transition-all active:scale-95 border border-purple-700 whitespace-nowrap"
                        title="Xuất báo cáo tổng hợp kèm cột tùy chỉnh"
                    >
                        <Settings2 size={18} className="stroke-[2.5px]" /> Xuất Tổng Hợp
                    </button>
                )}
            </div>

            {/* Sub-toolbar for List View Grouping */}
            {viewMode === 'LIST' && (
                <div className="w-full flex justify-end border-t border-gray-200 pt-3 mt-1">
                    <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-bold border border-gray-200">
                        <button
                            onClick={() => setGroupBy('DATE')}
                            className={cn("px-3 py-1.5 rounded transition-all", groupBy === 'DATE' ? "bg-white shadow text-black" : "text-gray-600 hover:text-gray-900")}
                        >
                            Nhóm theo Ngày
                        </button>
                        <button
                            onClick={() => setGroupBy('CLASS')}
                            className={cn("px-3 py-1.5 rounded transition-all", groupBy === 'CLASS' ? "bg-white shadow text-black" : "text-gray-600 hover:text-gray-900")}
                        >
                            Nhóm theo Lớp
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
