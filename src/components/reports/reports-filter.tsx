import { Class } from "@/types/models";
import { Calendar, Filter, LayoutGrid, List, Check, ChevronsUpDown, ChevronLeft, ChevronRight, Settings2, Loader2, ChevronDown } from "lucide-react";
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

    onExport: (isCompact: boolean) => void;
    onExportAdvanced?: () => void;
    onGenerateReport: () => void;
    isLoading?: boolean;
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
    onGenerateReport,
    isLoading = false
}: ReportsFilterProps) {
    const [openClassDropdown, setOpenClassDropdown] = useState(false);
    const [openColumnDropdown, setOpenColumnDropdown] = useState(false);
    const [openExportDropdown, setOpenExportDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const columnDropdownRef = useRef<HTMLDivElement>(null);
    const exportDropdownRef = useRef<HTMLDivElement>(null);
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
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
                setOpenExportDropdown(false);
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
        <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-col md:flex-row flex-wrap items-center gap-3 md:gap-4">
                {/* View Mode Toggles */}
                <div className="flex bg-gray-100 p-1 rounded-lg shrink-0 border border-gray-200 w-full sm:w-auto">
                    <button
                        onClick={() => setViewMode('LIST')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-sm font-bold",
                            viewMode === 'LIST' ? "bg-white text-indigo-700 shadow-sm border border-indigo-200" : "text-gray-500 hover:text-gray-800"
                        )}
                        title="Xem Danh Sách"
                    >
                        <List size={16} /> Danh sách
                    </button>
                    <button
                        onClick={() => setViewMode('GRID')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-sm font-bold",
                            viewMode === 'GRID' ? "bg-white text-teal-700 shadow-sm border border-teal-200" : "text-gray-500 hover:text-gray-800"
                        )}
                        title="Xem Lưới (Excel)"
                    >
                        <LayoutGrid size={16} /> Dạng lưới
                    </button>
                </div>

                <div className="h-8 w-px bg-gray-300 hidden md:block"></div>

                {/* Period Navigation */}
                <div className="flex flex-col sm:flex-row items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200 w-full sm:w-auto">
                    <div className="flex bg-white p-1 rounded border border-gray-300 shadow-sm w-full sm:w-auto">
                        <button
                            onClick={() => setMode('WEEK')}
                            className={cn("flex-1 px-4 py-1.5 text-xs font-bold rounded transition-colors uppercase tracking-wide", filterMode === 'WEEK' ? "bg-blue-100 text-blue-800 border border-blue-200" : "text-gray-700 hover:bg-gray-100")}
                        >
                            Tuần
                        </button>
                        <button
                            onClick={() => setMode('MONTH')}
                            className={cn("flex-1 px-4 py-1.5 text-xs font-bold rounded transition-colors uppercase tracking-wide", filterMode === 'MONTH' ? "bg-blue-100 text-blue-800 border border-blue-200" : "text-gray-700 hover:bg-gray-100")}
                        >
                            Tháng
                        </button>
                    </div>

                    <div className="flex items-center gap-1 w-full sm:w-auto justify-between sm:justify-center">
                        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-gray-200 text-gray-700 transition-colors border border-transparent hover:border-gray-300 shrink-0">
                            <ChevronLeft size={18} strokeWidth={2.5} />
                        </button>

                        <div className="flex items-center gap-2 px-2 text-sm font-black text-black sm:min-w-[130px] justify-center text-center">
                            {filterMode === 'WEEK' && <span>T.{format(parseISO(dateRange.start), "ww-Mm/yyyy")}</span>}
                            {filterMode === 'MONTH' && <span>Th.{format(parseISO(dateRange.start), 'MM/yyyy')}</span>}
                            {filterMode === 'CUSTOM' && <span>Tùy Chọn</span>}
                        </div>

                        <button onClick={() => navigate(1)} className="p-1.5 rounded-full hover:bg-gray-200 text-gray-700 transition-colors border border-transparent hover:border-gray-300 shrink-0">
                            <ChevronRight size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* Custom Date Inputs */}
                {filterMode === 'CUSTOM' && (
                    <div className="flex items-center gap-2 text-sm w-full sm:w-auto">
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => { setFilterMode('CUSTOM'); setDateRange({ ...dateRange, start: e.target.value }) }}
                            className="flex-1 sm:w-34 px-2 py-1.5 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 shadow-sm"
                        />
                        <span className="text-gray-600 font-black">-</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => { setFilterMode('CUSTOM'); setDateRange({ ...dateRange, end: e.target.value }) }}
                            className="flex-1 sm:w-34 px-2 py-1.5 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 shadow-sm"
                        />
                    </div>
                )}

                <div className="h-8 w-px bg-gray-300 hidden md:block"></div>

                {/* Class & Column Filters (Side by Side on Mobile) */}
                <div className="flex gap-2 w-full md:w-auto flex-1">
                    {/* Class Multi-Select */}
                    <div className="relative flex-1 min-w-0" ref={dropdownRef}>
                        <button
                            onClick={() => setOpenClassDropdown(!openClassDropdown)}
                            className="w-full flex items-center gap-1.5 px-2 sm:px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 justify-between transition-all shadow-sm active:translate-y-0.5"
                        >
                            <div className="flex items-center gap-1.5 text-sm text-black font-bold truncate">
                                <Filter size={14} className="text-gray-500 stroke-[2.5px] shrink-0 hidden sm:block" />
                                <span className="truncate">
                                    {selectedClasses.length === 0 || selectedClasses.length === classes.length ? "Tất cả lớp" : `Xem ${selectedClasses.length} lớp`}
                                </span>
                            </div>
                            <ChevronsUpDown size={14} className="text-gray-400 stroke-[2px] shrink-0" />
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
                    <div className="relative flex-1 min-w-0" ref={columnDropdownRef}>
                        <button
                            onClick={() => setOpenColumnDropdown(!openColumnDropdown)}
                            className="w-full flex items-center gap-1.5 px-2 sm:px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 justify-between transition-all shadow-sm active:translate-y-0.5"
                        >
                            <div className="flex items-center gap-1.5 text-sm text-black font-bold truncate">
                                <Settings2 size={14} className="text-gray-500 stroke-[2.5px] shrink-0 hidden sm:block" />
                                <span className="truncate">
                                    {visibleColumns.length === COLUMNS.length ? "Đủ cột" : `Cột (${visibleColumns.length})`}
                                </span>
                            </div>
                            <ChevronsUpDown size={14} className="text-gray-400 stroke-[2px] shrink-0" />
                        </button>

                        {openColumnDropdown && (
                            <div className="absolute top-full mt-2 right-0 sm:left-0 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
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
                </div>

                <div className="w-full md:w-auto md:ml-auto flex gap-2 mt-1 md:mt-0">
                    {/* Generate Report Button */}
                    <button
                        onClick={onGenerateReport}
                        disabled={isLoading}
                        className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white px-3 sm:px-4 py-2 rounded-lg font-bold text-sm shadow-md flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-95 border border-blue-700 whitespace-nowrap"
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Filter size={16} className="stroke-[2.5px]" />}
                        Báo Cáo
                    </button>

                    {/* Export Dropdown Button */}
                    <div className="relative flex-1 md:flex-none flex" ref={exportDropdownRef}>
                        <button
                            onClick={() => onExport(false)}
                            disabled={isLoading}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 disabled:cursor-not-allowed text-white px-3 sm:px-4 py-2 rounded-l-lg font-bold text-sm shadow-md flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-95 border border-emerald-700 border-r-emerald-800 whitespace-nowrap"
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <LayoutGrid size={16} className="stroke-[2.5px]" />}
                            <span className="hidden sm:inline">Xuất Excel</span>
                            <span className="sm:hidden">Xuất</span>
                        </button>
                        <button
                            onClick={() => setOpenExportDropdown(!openExportDropdown)}
                            disabled={isLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 disabled:cursor-not-allowed text-white px-1.5 py-2 rounded-r-lg shadow-md flex items-center justify-center transition-all active:scale-95 border border-emerald-700 border-l-0"
                        >
                            <ChevronDown size={18} className="stroke-[2.5px]" />
                        </button>
                        {openExportDropdown && (
                            <div className="absolute top-full mt-2 right-0 w-52 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                                <button
                                    onClick={() => { setOpenExportDropdown(false); onExport(false); }}
                                    className="w-full text-left px-3 py-2 text-sm font-bold text-gray-800 hover:bg-gray-100 rounded-lg flex flex-col transition-colors"
                                >
                                    <span>Đầy đủ (cả lớp)</span>
                                    <span className="text-[11px] text-gray-500 font-normal">Mặc định</span>
                                </button>
                                <div className="h-px bg-gray-100 my-1"></div>
                                <button
                                    onClick={() => { setOpenExportDropdown(false); onExport(true); }}
                                    className="w-full text-left px-3 py-2 text-sm font-bold text-gray-800 hover:bg-gray-100 rounded-lg flex flex-col transition-colors"
                                >
                                    <span className="text-emerald-700">Rút gọn (HS Vắng)</span>
                                    <span className="text-[11px] text-gray-500 font-normal">Chỉ người vi phạm</span>
                                </button>
                                {onExportAdvanced && (
                                    <>
                                        <div className="h-px bg-gray-200 my-1"></div>
                                        <button
                                            onClick={() => { setOpenExportDropdown(false); onExportAdvanced(); }}
                                            className="w-full text-left px-3 py-2 text-sm font-bold text-purple-700 hover:bg-purple-50 rounded-lg flex flex-col transition-colors"
                                        >
                                            <span>Báo Cáo Tổng Hợp</span>
                                            <span className="text-[11px] text-purple-500 font-normal">Xuất kèm cột tùy chỉnh</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sub-toolbar for List View Grouping */}
            {viewMode === 'LIST' && (
                <div className="w-full flex justify-end border-t border-gray-100 pt-3 mt-2">
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
