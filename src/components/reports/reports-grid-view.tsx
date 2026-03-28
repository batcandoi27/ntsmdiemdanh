import { AbsenceDetail, updateReportAttendance, addReportAttendance } from "@/app/actions/report";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { ShieldCheck, Plus, X, Loader2, MessageSquare } from "lucide-react";
import { getClassAndStudents } from "@/app/actions/common";
import { Class, Student } from "@/types/models";
import { AttendanceSheet } from "@/components/attendance-sheet";
import { useAuth } from "@/context/auth-context";
import { ReportMessageModal } from "./report-message-modal";

const getGradeColor = (className: string) => {
    if (className.startsWith('6')) return "bg-emerald-100 border-emerald-200 text-emerald-900";
    if (className.startsWith('7')) return "bg-blue-100 border-blue-200 text-blue-900";
    if (className.startsWith('8')) return "bg-orange-100 border-orange-200 text-orange-900";
    if (className.startsWith('9')) return "bg-rose-100 border-rose-200 text-rose-900";
    return "bg-gray-100 border-gray-200 text-gray-900";
};

const compareVietnameseNames = (nameA: string, nameB: string) => {
    const a = (nameA || '').trim();
    const b = (nameB || '').trim();
    const partsA = a.split(' ');
    const partsB = b.split(' ');
    const lastNameA = partsA.pop() || '';
    const lastNameB = partsB.pop() || '';
    const cmp = lastNameA.localeCompare(lastNameB, 'vi', { sensitivity: 'base' });
    if (cmp !== 0) return cmp;
    return a.localeCompare(b, 'vi', { sensitivity: 'base' });
};

const getGradeBarColor = (className: string) => {
    if (className.startsWith('6')) return "bg-emerald-600";
    if (className.startsWith('7')) return "bg-blue-600";
    if (className.startsWith('8')) return "bg-orange-600";
    if (className.startsWith('9')) return "bg-rose-600";
    return "bg-gray-600";
};

interface ReportsGridViewProps {
    dateRange: { start: string, end: string };
    selectedClasses: string[]; // IDs
    absences: AbsenceDetail[];
    classSizes?: Record<string, number>;
    classes: { id: string, name: string }[];
    visibleColumns: string[]; // New prop
    onRefresh?: () => void;
}

export function ReportsGridView({ dateRange, classSizes = {}, selectedClasses, absences, classes, visibleColumns, onRefresh }: ReportsGridViewProps) {
    const { appUser } = useAuth();
    const [editCell, setEditCell] = useState<{ classId: string, studentCode: string, studentName: string, date: string, currentStatus: string, rect: { top: number, left: number } } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showAddModalForClass, setShowAddModalForClass] = useState<string | null>(null);
    const [quickAtt, setQuickAtt] = useState<{ classId: string, date: string } | null>(null);
    const [showMessageModal, setShowMessageModal] = useState<{
        classId: string,
        className: string,
        absences: AbsenceDetail[],
        visibleColumns?: string[]
    } | null>(null);

    // ...
    const dates = eachDayOfInterval({ start: parseISO(dateRange.start), end: parseISO(dateRange.end) });

    // 2. Group Absences
    const groupedData = useMemo(() => {
        const groups: Record<string, { className: string; students: Record<string, any> }> = {};

        absences.forEach(record => {
            const status = record.status;
            const statuses = (status || '').split('; ');
            
            // Filter by visible columns: Check if any status (VPc1, P, etc) belongs to visible columns
            const isVisible = statuses.some(st => {
                const base = st.split(/[\(\[\s]/)[0].trim().toUpperCase();
                return visibleColumns.includes(base);
            });
            if (!isVisible) return;

            const clsId = record.classId;
            if (selectedClasses.length > 0 && !selectedClasses.includes(clsId)) return;

            if (!groups[clsId]) {
                groups[clsId] = {
                    className: record.className || classes.find(c => c.id === clsId)?.name || clsId,
                    students: {}
                };
            }

            if (!groups[clsId].students[record.studentCode]) {
                groups[clsId].students[record.studentCode] = {
                    code: record.studentCode,
                    name: record.studentName,
                    stt: record.stt || 0,
                    absences: {}
                };
            }

            // Sync status for the date
            if (!groups[clsId].students[record.studentCode].absences[record.date]) {
                groups[clsId].students[record.studentCode].absences[record.date] = status;
            } else {
                // If multiple records for same day, merge them smartly
                const existing = groups[clsId].students[record.studentCode].absences[record.date];
                const parts = new Set([...existing.split('; '), ...status.split('; ')]);
                groups[clsId].students[record.studentCode].absences[record.date] = Array.from(parts).join('; ');
            }
        });

        return groups;
    }, [absences, selectedClasses, classes, visibleColumns]);
    
    // 3. Tính tổng số lượt vắng P/K toàn bộ (Không phụ thuộc Filter cột)
    const classPKTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        absences.forEach(record => {
            if (selectedClasses.length > 0 && !selectedClasses.includes(record.classId)) return;
            const status = record.status || '';
            const subTotal = status.split('; ').filter(st => {
                const base = st.split(/[\(\[\s]/)[0].trim().toUpperCase();
                return base === 'P' || base === 'K';
            }).length;
            if (subTotal > 0) {
                totals[record.classId] = (totals[record.classId] || 0) + subTotal;
            }
        });
        return totals;
    }, [absences, selectedClasses]);

    const visibleGroups = Object.keys(groupedData).sort((a, b) => {
        const nameA = groupedData[a].className;
        const nameB = groupedData[b].className;
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });

    if (visibleGroups.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border-2 border-dashed border-gray-300 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <ShieldCheck className="w-12 h-12 text-emerald-600 stroke-[1.5px]" />
                </div>
                <h3 className="text-xl font-black text-gray-800 mb-3 uppercase tracking-wide">Không có dữ liệu vi phạm</h3>
                <p className="text-gray-600 font-medium max-w-lg leading-relaxed">
                    Tuyệt vời! Trong giai đoạn này hệ thống không ghi nhận trường hợp <span className="text-yellow-600 font-bold">nghỉ học (P)</span> hoặc <span className="text-red-600 font-bold">vắng k.phép (K)</span> nào.
                </p>
            </div>
        );
    }



    const getDayName = (date: Date) => {
        const day = date.getDay(); // 0 = Sun, 1 = Mon...
        if (day === 0) return 'CN';
        return `T${day + 1}`;
    };

    const handleSaveStatus = async (newStatus: string) => {
        if (!editCell) return;
        setIsSaving(true);
        console.log('[ReportsGridView] handleSaveStatus:', {
            classId: editCell.classId,
            studentCode: editCell.studentCode,
            date: editCell.date,
            newStatus
        });
        try {
            const res = await updateReportAttendance(appUser, editCell.classId, editCell.studentCode, editCell.studentName, editCell.date, newStatus as any);
            console.log('[ReportsGridView] updateReportAttendance result:', res);
            if (!res.success) {
                alert(res.message);
            } else {
                setEditCell(null);
                if (onRefresh) onRefresh();
            }
        } catch (error) {
            console.error('[ReportsGridView] Save Error:', error);
            alert("Lỗi cập nhật!");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 relative">
            {visibleGroups.map(clsId => {
                const group = groupedData[clsId];
                // SORT BY REAL STT
                const students = Object.values(group.students).sort((a: any, b: any) => compareVietnameseNames(a.name, b.name));

                const headerStyle = getGradeColor(group.className);
                const barColor = getGradeBarColor(group.className);

                return (
                    <div key={clsId} className="bg-white rounded-xl border border-gray-400 shadow-sm overflow-hidden flex flex-col">
                        <div className={cn("px-4 py-3 border-b border-gray-400 flex items-center justify-between shrink-0", headerStyle)}>
                            <div className="flex items-center gap-3">
                                <h3 className="font-black uppercase flex items-center gap-2 text-base">
                                    <div className={cn("w-1.5 h-6 rounded-full", barColor)}></div>
                                    <span>LỚP {group.className}</span>
                                </h3>
                                <span className="text-sm font-black text-emerald-900 bg-white/70 border-2 border-white/60 px-3 py-0.5 rounded-full shadow-sm tracking-wide">
                                    (SS: {classSizes[clsId] || '?'}, Lượt vắng (P/K): {classPKTotals[clsId] || 0})
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowAddModalForClass(clsId)}
                                    className="bg-white hover:bg-gray-50 text-emerald-700 border border-emerald-200 p-1.5 rounded-lg shadow-sm cursor-pointer transition-colors"
                                    title="Thêm học sinh vắng"
                                >
                                    <Plus size={16} className="stroke-[3px]" />
                                </button>
                                <button
                                    onClick={() => setShowMessageModal({ 
                                        classId: clsId, 
                                        className: group.className, 
                                        absences: (absences || []).filter(a => a.classId === clsId),
                                        visibleColumns
                                    })}
                                    className="bg-teal-600 hover:bg-teal-700 text-white border border-transparent px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition-colors flex items-center gap-1.5 font-bold text-sm"
                                    title="Soạn tin nhắn"
                                >
                                    <MessageSquare size={16} className="stroke-[2.5px] mt-px" />
                                    Soạn tin nhắn
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Container - Chỉnh thành overflow-x-auto, overflow-y-visible để tip không bị che */}
                        <div className="overflow-x-auto overflow-y-visible relative scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-200">
                            <table className="w-full text-sm border-collapse min-w-max">
                                <thead className="bg-gray-300 border-b border-gray-500 text-xs sticky top-0 z-40 shadow-md">
                                    <tr className="bg-gray-300">
                                        <th className="p-2 border border-gray-500 w-12 text-center text-black font-black bg-gray-300 sticky left-0 z-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">STT</th>
                                        <th className="p-0 border border-gray-500 bg-gray-300 sticky left-12 z-50 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.3)]">
                                            <div className="min-w-[160px] w-[180px] max-w-[400px] h-full min-h-[40px] p-2 flex items-center resize-x overflow-hidden text-left text-black font-black bg-gray-300">
                                                Họ Tên
                                            </div>
                                        </th>
                                        {dates.map(date => {
                                            const dayName = getDayName(date);
                                            const isSat = dayName === 'T7';
                                            const isSun = dayName === 'CN';

                                            // HIGH CONTRAST COLORS
                                            const headerClass = isSat
                                                ? "bg-orange-100 text-orange-800 font-black text-black border-gray-500"
                                                : isSun
                                                    ? "bg-red-300 text-black border-gray-500"
                                                    : "bg-gray-300 text-black border-gray-500";

                                            return (
                                                <th
                                                    key={date.toString()}
                                                    className={cn("p-1 border border-gray-500 min-w-[45px] text-center cursor-pointer hover:opacity-80 transition-opacity", headerClass)}
                                                    onClick={() => {
                                                        if (!isSun) {
                                                            setQuickAtt({ classId: clsId, date: format(date, 'yyyy-MM-dd') });
                                                        }
                                                    }}
                                                    title={!isSun ? "Nhấn để điểm danh ngày này" : "Chủ nhật"}
                                                >
                                                    <div className="flex flex-col items-center justify-center h-full py-1">
                                                        <span className="text-[11px] uppercase font-black tracking-wider block mb-0.5">{dayName}</span>
                                                        <span className="font-black text-base block leading-none">{format(date, 'd')}</span>
                                                    </div>
                                                </th>
                                            );
                                        })}
                                        {visibleColumns.includes('P') && <th className="p-1 border border-gray-500 w-10 bg-yellow-100 text-yellow-800 font-black text-center">P</th>}
                                        {visibleColumns.includes('K') && <th className="p-1 border border-gray-500 w-10 bg-red-300 text-center">K</th>}
                                        {visibleColumns.includes('T') && <th className="p-1 border border-gray-500 w-10 bg-blue-100 text-blue-800 font-black text-center">T</th>}
                                        {visibleColumns.includes('VP') && <th className="p-1 border border-gray-500 w-10 bg-purple-300 text-center">VP</th>}
                                        {visibleColumns.includes('KH') && <th className="p-1 border border-gray-500 w-10 bg-orange-100 text-orange-800 font-black text-center">KH</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student, idx) => {
                                        const rowStats = { P: 0, K: 0, T: 0, VP: 0, KH: 0 };

                                        return (
                                            <tr key={student.code} className="hover:bg-blue-100 transition-colors border-b border-gray-400 font-bold text-black">
                                                <td className="p-2 border border-gray-400 text-center text-xs font-black bg-white sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]">{student.stt}</td>
                                                <td className={cn(
                                                    "p-2 border border-gray-400 font-bold whitespace-nowrap bg-white sticky left-12 z-30 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.25)] flex items-center gap-1",
                                                    (() => {
                                                        const allStatusValues = Object.values(student.absences || {});
                                                        const firstStatus = allStatusValues.find(s => s) as string;
                                                        if (!firstStatus) return "text-black";
                                                        const base = firstStatus.split(' | ')[0].split('(')[0].trim().toUpperCase();
                                                        return base === 'P' ? "text-yellow-600" :
                                                               base === 'K' ? "text-red-600" :
                                                               base === 'VP' ? "text-purple-600" :
                                                               base === 'T' ? "text-blue-600" :
                                                               base === 'KH' ? "text-orange-600" : "text-black";
                                                    })()
                                                )}>
                                                    <span className="truncate">{student.name}</span>
                                                    {(() => {
                                                        // Tính SC: Nghỉ cả sáng và chiều TRONG CÙNG 1 NGÀY
                                                        let hasFullDayAbsence = false;
                                                        dates.forEach(d => {
                                                            const ds = format(d, 'yyyy-MM-dd');
                                                            const st = student.absences[ds];
                                                            if (st) {
                                                                const parts = st.split(' | ').map(p => p.trim().toUpperCase()).filter(Boolean);
                                                                // TH1: Có cả (S) và (C) trong cùng ngày
                                                                const morningAbs = parts.some(p => (p.startsWith('P') || p.startsWith('K')) && p.includes('Sáng'));
                                                                const afternoonAbs = parts.some(p => (p.startsWith('P') || p.startsWith('K')) && p.includes('Chiều'));
                                                                if (morningAbs && afternoonAbs) hasFullDayAbsence = true;
                                                                
                                                                // TH2: Fallback cho dữ liệu cũ V1 (không có (S)/(C)) hoặc nếu có 2 bản ghi P, K
                                                                if (!hasFullDayAbsence) {
                                                                    const pkParts = parts.filter(p => p.startsWith('P') || p.startsWith('K'));
                                                                    if (pkParts.length >= 2) hasFullDayAbsence = true;
                                                                }
                                                            }
                                                        });
                                                        return hasFullDayAbsence ? (
                                                            <span className="text-red-600 font-black text-[10px] leading-none tracking-tighter shrink-0 border border-red-200 bg-red-50 px-0.5 rounded" title="Nghỉ cả sáng và chiều">(SC)</span>
                                                        ) : null;
                                                    })()}
                                                </td>

                                                {dates.map(date => {
                                                    const dateStr = format(date, 'yyyy-MM-dd');
                                                    const dayName = getDayName(date);
                                                    const isSat = dayName === 'T7';
                                                    const isSun = dayName === 'CN';

                                                    // Slight tint for weekends in body rows for guidance
                                                    const colClass = isSat ? "bg-orange-50" : isSun ? "bg-red-50" : "bg-white";

                                                    const status = student.absences[dateStr];
                                                    const statuses = status ? status.split(' | ').map(s => s.trim()).filter(Boolean) : [];
                                                    
                                                    statuses.forEach(st => {
                                                        const base = st.split(/[(\[\s]/i)[0].trim().toUpperCase();
                                                        if (base.startsWith('P')) rowStats.P++;
                                                        else if (base.startsWith('K')) rowStats.K++;
                                                        else if (base.startsWith('T')) rowStats.T++;
                                                        else if (base.startsWith('VP')) rowStats.VP++;
                                                        else if (base.startsWith('KH')) rowStats.KH++;
                                                    });

                                                    return (
                                                        <td key={dateStr} className={cn("p-0 border border-gray-400 text-center relative h-full align-top", colClass)}>
                                                            <div
                                                                className={cn("w-full h-full min-h-[32px] flex items-center justify-center m-0 p-1 transition-all cursor-pointer hover:bg-black/5 hover:opacity-80")}
                                                                onClick={(e) => {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setEditCell({
                                                                        classId: clsId,
                                                                        studentCode: student.code,
                                                                        studentName: student.name,
                                                                        date: dateStr,
                                                                        currentStatus: status || '',
                                                                        rect: { top: rect.bottom, left: rect.left }
                                                                    });
                                                                }}
                                                            >
                                                                <GridCell status={status} visibleColumns={visibleColumns} />
                                                            </div>
                                                        </td>
                                                    );
                                                })}

                                                {visibleColumns.includes('P') && <td className="p-1 border border-gray-400 text-center text-base font-black bg-yellow-100 text-yellow-800 font-black">{rowStats.P > 0 ? rowStats.P : ''}</td>}
                                                {visibleColumns.includes('K') && <td className="p-1 border border-gray-400 text-center text-base font-black bg-red-100 text-red-700 font-black">{rowStats.K > 0 ? rowStats.K : ''}</td>}
                                                {visibleColumns.includes('T') && <td className="p-1 border border-gray-400 text-center text-base font-black bg-blue-100 text-blue-800 font-black">{rowStats.T > 0 ? rowStats.T : ''}</td>}
                                                {visibleColumns.includes('VP') && <td className="p-1 border border-gray-400 text-center text-base font-black bg-purple-100 text-purple-800 font-black">{rowStats.VP > 0 ? rowStats.VP : ''}</td>}
                                                {visibleColumns.includes('KH') && <td className="p-1 border border-gray-400 text-center text-base font-black bg-orange-100 text-orange-800 font-black">{rowStats.KH > 0 ? rowStats.KH : ''}</td>}
                                            </tr>
                                        );
                                    })}
                                    {/* SUMMARY ROW */}
                                    <tr className="bg-gray-200 border-t-2 border-gray-800 font-extrabold text-black">
                                        <td colSpan={2} className="p-2 border border-gray-500 text-right uppercase tracking-wider sticky left-0 z-30 bg-gray-200 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.3)]">
                                            Tổng cộng
                                        </td>
                                        {dates.map(date => {
                                            const dateStr = format(date, 'yyyy-MM-dd');
                                            let count = 0;
                                            students.forEach(s => {
                                                const status = s.absences[dateStr];
                                                if (status) {
                                                    const bases = status.split(' | ').map(st => st.split(/[(\[\s]/i)[0].trim().toUpperCase());
                                                    if (bases.some(b => ['P', 'K', 'T', 'VP'].includes(b))) {
                                                        count++;
                                                    }
                                                }
                                            });
                                            return (
                                                <td key={`total-${dateStr}`} className="p-1 border border-gray-500 text-center text-sm font-black text-red-700 bg-gray-100">
                                                    {count > 0 ? count : ''}
                                                </td>
                                            );
                                        })}
                                        {visibleColumns.includes('P') && (
                                            <td className="p-1 border border-gray-500 text-center text-base bg-yellow-100 text-yellow-800 font-black">
                                                {students.reduce((sum, s) => sum + (Object.values(s.absences || {}) as string[]).reduce((c: number, st: string) => c + (st ? st.split(' | ').filter(x => x.split(/[(\[\s]/i)[0].trim().toUpperCase() === 'P').length : 0), 0), 0) || ''}
                                            </td>
                                        )}
                                        {visibleColumns.includes('K') && (
                                            <td className="p-1 border border-gray-500 text-center text-base bg-red-100 text-red-700 font-black">
                                                {students.reduce((sum, s) => sum + (Object.values(s.absences || {}) as string[]).reduce((c: number, st: string) => c + (st ? st.split(' | ').filter(x => x.split(/[(\[\s]/i)[0].trim().toUpperCase() === 'K').length : 0), 0), 0) || ''}
                                            </td>
                                        )}
                                        {visibleColumns.includes('T') && (
                                            <td className="p-1 border border-gray-500 text-center text-base bg-blue-100 text-blue-800 font-black">
                                                {students.reduce((sum, s) => sum + (Object.values(s.absences || {}) as string[]).reduce((c: number, st: string) => c + (st ? st.split(' | ').filter(x => x.split(/[(\[\s]/i)[0].trim().toUpperCase() === 'T').length : 0), 0), 0) || ''}
                                            </td>
                                        )}
                                        {visibleColumns.includes('VP') && (
                                            <td className="p-1 border border-gray-500 text-center text-base bg-purple-100 text-purple-800 font-black">
                                                {students.reduce((sum, s) => sum + (Object.values(s.absences || {}) as string[]).reduce((c: number, st: string) => c + (st ? st.split(' | ').filter(x => x.split(/[(\[\s]/i)[0].trim().toUpperCase() === 'VP').length : 0), 0), 0) || ''}
                                            </td>
                                        )}
                                        {visibleColumns.includes('KH') && (
                                            <td className="p-1 border border-gray-500 text-center text-base bg-orange-100 text-orange-800 font-black">
                                                {students.reduce((sum, s) => sum + (Object.values(s.absences || {}) as string[]).reduce((c: number, st: string) => c + (st ? st.split(' | ').filter(x => x.split(/[(\[\s]/i)[0].trim().toUpperCase() === 'KH').length : 0), 0), 0) || ''}
                                            </td>
                                        )}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}

            {/* Custom Popover Editor */}
            {editCell && typeof document !== 'undefined' && createPortal(
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setEditCell(null)}></div>
                    <div
                        className="fixed z-[70] bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-gray-200 p-2 w-52 animate-in zoom-in-95 duration-150"
                        style={{ top: editCell.rect.top + 5, left: Math.max(10, Math.min(editCell.rect.left - 60, window.innerWidth - 220)) }}
                    >
                        <div className="text-xs font-black text-gray-500 mb-2 px-1 text-center border-b pb-1.5 uppercase tracking-wide">
                            {format(parseISO(editCell.date), 'dd/MM/yyyy')}
                            <span className="block text-[10px] text-gray-400 normal-case mt-0.5 font-bold leading-tight truncate">{editCell.studentName}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {['P', 'K', 'T', 'VP', 'KH'].map(st => {
                                const label = st === 'P' ? 'Có Phép (P)' :
                                    st === 'K' ? 'Không Phép (K)' :
                                        st === 'T' ? 'Đi Trễ (T)' :
                                            st === 'VP' ? 'Vi Phạm (VP)' : 'Khen Thưởng (KH)';
                                return (
                                    <button
                                        key={st}
                                        disabled={isSaving}
                                        onClick={() => handleSaveStatus(st)}
                                        className={cn("text-xs font-black px-2 py-2 rounded-lg border text-left transition-colors flex items-center justify-between",
                                            st === 'P' ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200" :
                                                st === 'K' ? "bg-red-50 text-red-700 hover:bg-red-100 border-red-200" :
                                                    st === 'T' ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" :
                                                       st === 'VP' ? "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200" :
                                                            "bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200"
                                        )}
                                    >
                                        <span>{label}</span>
                                        {isSaving && editCell.currentStatus !== st ? <Loader2 size={12} className="animate-spin opacity-50" /> : null}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-100">
                            <button
                                disabled={isSaving || !editCell.currentStatus}
                                onClick={() => handleSaveStatus('DELETE')}
                                className="w-full text-xs font-bold p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-1"
                            >
                                <X size={14} /> Gỡ Trạng thái
                            </button>
                        </div>
                    </div>
                </>,
                document.body
            )}

            {/* Quick Attendance Modal (from clicking date header) */}
            {quickAtt && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95">
                        <button
                            onClick={() => {
                                setQuickAtt(null);
                                if (onRefresh) onRefresh();
                            }}
                            className="absolute top-4 right-4 z-[110] bg-red-100 text-red-600 p-2 rounded-full hover:bg-red-200 transition"
                        >
                            <X size={20} strokeWidth={3} />
                        </button>
                        <div className="p-1">
                            {/* AttendanceSheet assumes it occupies normal page space, so we just render it */}
                            <AttendanceSheet
                                classId={quickAtt.classId}
                                session="morning" // Default session? Most schools use morning
                                dateStr={quickAtt.date}
                            />
                        </div>
                    </div>
                </div>
            )}
            {/* Add Attendance Modal scoped to this view */}
            {showAddModalForClass && (
                <AddAttendanceModal
                    classId={showAddModalForClass}
                    className={classes.find(c => c.id === showAddModalForClass)?.name || ''}
                    onClose={() => setShowAddModalForClass(null)}
                    onRefresh={() => {
                        setShowAddModalForClass(null);
                        if (onRefresh) onRefresh();
                    }}
                />
            )}

            {/* Report Message Modal */}
            {showMessageModal && (
                <ReportMessageModal
                    isOpen={!!showMessageModal}
                    onClose={() => setShowMessageModal(null)}
                    classId={showMessageModal.classId}
                    className={showMessageModal.className}
                    dateRange={{
                        start: dateRange.start || showMessageModal.absences.reduce((min, p) => p.date < min ? p.date : min, showMessageModal.absences[0]?.date || ''),
                        end: dateRange.end || showMessageModal.absences.reduce((max, p) => p.date > max ? p.date : max, showMessageModal.absences[0]?.date || '')
                    }}
                    absences={showMessageModal.absences}
                    totalStudents={classSizes[showMessageModal.classId] || 0}
                    visibleColumns={showMessageModal.visibleColumns}
                />
            )}

            {/* Bảng Chú thích Ký hiệu & Màu sắc */}
            <div className="mt-8 p-4 bg-white border border-gray-100 rounded-xl shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 pb-3 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <span className="text-[11px] font-bold text-yellow-700 uppercase tracking-tight">Phép (P)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-[11px] font-bold text-red-700 uppercase tracking-tight">Không (K)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-[11px] font-bold text-blue-700 uppercase tracking-tight">Trễ (T)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="text-[11px] font-bold text-purple-700 uppercase tracking-tight">Vi Phạm (VP)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-[11px] font-bold text-orange-700 uppercase tracking-tight">Khen (KH)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-red-600 font-extrabold text-[11px] tracking-tighter">(SC)</span>
                        <span className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">Vắng cả ngày</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                    <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                        <span className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Ký hiệu tiết:</span>
                        <span className="text-gray-600"><b>Sáng</b>: Buổi sáng</span>
                        <span className="text-gray-600"><b>Chiều</b>: Buổi chiều</span>
                        <span className="text-gray-600"><b>1, 2, 3...</b>: Số tiết vắng</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 justify-center md:justify-end border-t md:border-t-0 pt-2 md:pt-0">
                        <span className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Ví dụ:</span>
                        <span className="bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-100 font-bold">Ps: Phép sáng</span>
                        <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100 font-bold">Ks1: Không phép sáng tiết 1</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Internal Add Attendance Modal
function AddAttendanceModal({ classId, className, onClose, onRefresh }: { classId: string, className: string, onClose: () => void, onRefresh: () => void }) {
    const { appUser } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentCode, setSelectedStudentCode] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [status, setStatus] = useState('P');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        getClassAndStudents(classId).then(res => {
            setStudents(res.students.sort((a, b) => a.fullName.localeCompare(b.fullName)));
            setSelectedStudentCode(res.students.length > 0 ? res.students[0].code : '');
            setLoading(false);
        });
    }, [classId]);

    const handleSave = async () => {
        if (!classId || !selectedStudentCode || !date || !status) {
            alert("Vui lòng nhập đủ thông tin.");
            return;
        }
        setLoading(true);
        try {
            const stu = students.find(s => s.code === selectedStudentCode);
            const res = await addReportAttendance(appUser, classId, selectedStudentCode, stu?.fullName || '', date, status as any);
            if (!res.success) {
                alert(res.message);
                setLoading(false);
            } else {
                onRefresh();
                onClose();
            }
        } catch (error: any) {
            alert(error.message || "Lỗi lưu dữ liệu");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-base font-black text-gray-800 uppercase tracking-tight">Thêm Bù Báo Cáo - LỚP {className}</h2>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-200 transition text-gray-500">
                        <X size={18} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {loading && students.length === 0 ? (
                        <div className="py-8 flex justify-center text-gray-400">
                            <Loader2 className="animate-spin" />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Học Sinh</label>
                                <select
                                    value={selectedStudentCode}
                                    onChange={(e) => setSelectedStudentCode(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-blue-700 font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none hover:bg-blue-50 transition-colors"
                                >
                                    {students.map((s, idx) => <option key={s.id} value={s.code}>{idx + 1}. {s.fullName}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Ngày</label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-black"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Lý do</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className={cn("w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 outline-none font-bold",
                                            status === 'P' ? "bg-yellow-100 text-yellow-800" :
                                                status === 'K' ? "bg-red-100 text-red-800" :
                                                    status === 'T' ? "bg-blue-100 text-blue-800" :
                                                        status === 'VP' ? "bg-purple-100 text-purple-800" :
                                                            "bg-orange-100 text-orange-800"
                                        )}
                                    >
                                        <option value="P">Có Phép (P)</option>
                                        <option value="K">Không Phép (K)</option>
                                        <option value="T">Đi Trễ (T)</option>
                                        <option value="VP">Vi Phạm (VP)</option>
                                        <option value="KH">Khen Thưởng (KH)</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-3 border-t border-gray-100 bg-gray-50 flex gap-2 justify-end">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-1.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || students.length === 0}
                        className="px-4 py-1.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />} Ghi Nhận
                    </button>
                </div>
            </div>
        </div>
    );
}

function GridCell({ status, visibleColumns }: { status: string, visibleColumns: string[] }) {
    const allStatuses = (status || '').split('; ').filter(Boolean);
    const displayStatuses = allStatuses.filter(st => {
        const base = st.split(/[(\[sc]/i)[0].trim().toUpperCase();
        return visibleColumns.includes(base);
    });

    if (displayStatuses.length === 0) return null;

    const map = {
        'P': "bg-yellow-50 text-yellow-600 border border-yellow-200",
        'K': "bg-red-50 text-red-600 border border-red-200",
        'T': "bg-blue-50 text-blue-600 border border-blue-200",
        'VP': "bg-purple-50 text-purple-600 border border-purple-200",
        'KH': "bg-orange-50 text-orange-600 border border-orange-200",
    };

    return (
        <div className="flex flex-wrap gap-0.5 justify-center">
            {displayStatuses.map((st, i) => {
                const label = st.split(' [')[0].trim();
                const baseCode = label.split(/[(\[\s]/i)[0].trim().toUpperCase();
                const hasNote = st.includes('[');
                const note = hasNote ? st.match(/\[(.*?)\]/)?.[1] || '' : '';
                const style = map[baseCode as keyof typeof map] || "bg-gray-400 text-white border-gray-600";
                
                return (
                    <div 
                        key={i}
                        className={cn(
                            "min-w-6 h-6 px-1 rounded-md flex items-center justify-center text-[9px] font-black shadow-sm group relative cursor-help leading-none", 
                            style
                        )}
                    >
                        <span>{label}</span>
                        {hasNote && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block z-[9999] pointer-events-none">
                                {/* Arrow */}
                                <div className="w-3 h-3 bg-gray-900 rotate-45 mx-auto mt-[-6px] border-r border-b border-gray-700"></div>
                                
                                {/* Content */}
                                <div className="bg-gray-900 text-white text-[11px] font-medium px-3 py-2 rounded-lg shadow-2xl min-w-[140px] max-w-[300px] w-max whitespace-pre-wrap break-words leading-relaxed border border-gray-700 text-center animate-in fade-in slide-in-from-bottom-1 duration-200">
                                    {note.replace(/; /g, '\n').replace(/, /g, '\n')}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
