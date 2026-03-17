import { AbsenceDetail, updateReportAttendance, addReportAttendance } from "@/app/actions/report";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { ShieldCheck, Plus, X, Loader2 } from "lucide-react";
import { getClassAndStudents } from "@/app/actions/common";
import { Class, Student } from "@/types/models";
import { AttendanceSheet } from "@/components/attendance-sheet";
import { useAuth } from "@/context/auth-context";

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
    // ...
    const dates = eachDayOfInterval({ start: parseISO(dateRange.start), end: parseISO(dateRange.end) });

    // 2. Group Absences
    const groupedData = useMemo(() => {
        const groups: Record<string, { className: string; students: Record<string, any> }> = {};

        // ...
        absences.forEach(record => {
            const status = record.status;
            const statuses = status.split(', ');
            
            // Filter by visible columns using base code - check if ANY of the statuses are visible
            if (!statuses.some(st => visibleColumns.includes(st.split(' ')[0]))) return;

            const clsId = record.classId;
            // Filter by selectedClasses if set
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
                    stt: record.stt || 0, // Ensure real STT is used
                    absences: {}
                };
            }

            if (!groups[clsId].students[record.studentCode].absences[record.date]) {
                groups[clsId].students[record.studentCode].absences[record.date] = status;
            } else {
                groups[clsId].students[record.studentCode].absences[record.date] += `, ${status}`;
            }
        });

        return groups;
    }, [absences, selectedClasses, classes]);

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

    const getGradeColor = (className: string) => {
        if (className.startsWith('6')) return "bg-emerald-100 border-emerald-200 text-emerald-900";
        if (className.startsWith('7')) return "bg-blue-100 border-blue-200 text-blue-900";
        if (className.startsWith('8')) return "bg-orange-100 border-orange-200 text-orange-900";
        if (className.startsWith('9')) return "bg-rose-100 border-rose-200 text-rose-900";
        return "bg-gray-100 border-gray-200 text-gray-900";
    };

    const getGradeBarColor = (className: string) => {
        if (className.startsWith('6')) return "bg-emerald-600";
        if (className.startsWith('7')) return "bg-blue-600";
        if (className.startsWith('8')) return "bg-orange-600";
        if (className.startsWith('9')) return "bg-rose-600";
        return "bg-gray-600";
    };

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
                const students = Object.values(group.students).sort((a, b) => a.stt - b.stt);

                const headerStyle = getGradeColor(group.className);
                const barColor = getGradeBarColor(group.className);

                return (
                    <div key={clsId} className="bg-white rounded-xl border border-gray-400 shadow-sm overflow-hidden flex flex-col">
                        <div className={cn("px-4 py-3 border-b border-gray-400 shrink-0", headerStyle)}>
                            <h3 className="font-black uppercase flex items-center gap-2 text-base">
                                <div className={cn("w-1.5 h-6 rounded-full", barColor)}></div>
                                <span>LỚP {group.className}</span>
                                <button
                                    onClick={() => setShowAddModalForClass(clsId)}
                                    className="bg-white/30 hover:bg-white/60 text-emerald-900 border border-emerald-700/30 p-1 rounded cursor-pointer transition-colors"
                                    title="Thêm học sinh vắng"
                                >
                                    <Plus size={14} className="stroke-[3px]" />
                                </button>
                                <span className="text-sm opacity-90 normal-case ml-2 font-bold text-gray-700 text-white bg-black/10 px-2 py-0.5 rounded-full inline-block mt-[-2px] tracking-wide">
                                    (SS: {classSizes[clsId] || '?'}, V: {students.length})
                                </span>
                            </h3>
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
                                                ? "bg-orange-300 text-black border-gray-500"
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
                                        {visibleColumns.includes('P') && <th className="p-1 border border-gray-500 w-10 bg-yellow-300 text-black font-black text-center">P</th>}
                                        {visibleColumns.includes('K') && <th className="p-1 border border-gray-500 w-10 bg-red-300 text-black font-black text-center">K</th>}
                                        {visibleColumns.includes('T') && <th className="p-1 border border-gray-500 w-10 bg-blue-300 text-black font-black text-center">T</th>}
                                        {visibleColumns.includes('VP') && <th className="p-1 border border-gray-500 w-10 bg-purple-300 text-black font-black text-center">VP</th>}
                                        {visibleColumns.includes('KH') && <th className="p-1 border border-gray-500 w-10 bg-pink-300 text-black font-black text-center">KH</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student, idx) => {
                                        const rowStats = { P: 0, K: 0, T: 0, VP: 0, KH: 0 };

                                        return (
                                            <tr key={student.code} className="hover:bg-blue-100 transition-colors border-b border-gray-400 font-bold text-black">
                                                <td className="p-2 border border-gray-400 text-center text-xs font-black text-black bg-white sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]">{student.stt}</td>
                                                <td className={cn(
                                                    "p-2 border border-gray-400 font-bold whitespace-nowrap bg-white sticky left-12 z-30 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.25)] flex items-center gap-1",
                                                    (() => {
                                                        const allStatusValues = Object.values(student.absences || {});
                                                        const firstStatus = allStatusValues.find(s => s) as string;
                                                        if (!firstStatus) return "text-black";
                                                        const base = firstStatus.split(', ')[0].split(' ')[0];
                                                        return base === 'P' ? "text-yellow-600" :
                                                               base === 'K' ? "text-red-600" :
                                                               base === 'T' ? "text-blue-600" :
                                                               base === 'VP' ? "text-purple-600" :
                                                               base === 'KH' ? "text-pink-600" : "text-black";
                                                    })()
                                                )}>
                                                    <span className="truncate">{student.name}</span>
                                                    {(() => {
                                                        // Tính SC: Tổng P + K trên tất cả các ngày đang hiển thị
                                                        let pkCount = 0;
                                                        dates.forEach(d => {
                                                            const ds = format(d, 'yyyy-MM-dd');
                                                            const st = student.absences[ds];
                                                            if (st) {
                                                                const parts = st.split(/[,]+/).map(p => p.trim().split(' ')[0].toUpperCase()).filter(Boolean);
                                                                pkCount += parts.filter(p => p.startsWith('P') || p.startsWith('K')).length;
                                                            }
                                                        });
                                                        return pkCount >= 2 ? (
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
                                                    const statuses = status ? status.split(/[,]+/).map(s => s.trim()).filter(Boolean) : [];
                                                    
                                                    statuses.forEach(st => {
                                                        const base = st.split(' ')[0].toUpperCase();
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

                                                {visibleColumns.includes('P') && <td className="p-1 border border-gray-400 text-center text-base font-black text-black bg-yellow-200">{rowStats.P > 0 ? rowStats.P : ''}</td>}
                                                {visibleColumns.includes('K') && <td className="p-1 border border-gray-400 text-center text-base font-black text-black bg-red-200">{rowStats.K > 0 ? rowStats.K : ''}</td>}
                                                {visibleColumns.includes('T') && <td className="p-1 border border-gray-400 text-center text-base font-black text-black bg-blue-200">{rowStats.T > 0 ? rowStats.T : ''}</td>}
                                                {visibleColumns.includes('VP') && <td className="p-1 border border-gray-400 text-center text-base font-black text-black bg-purple-200">{rowStats.VP > 0 ? rowStats.VP : ''}</td>}
                                                {visibleColumns.includes('KH') && <td className="p-1 border border-gray-400 text-center text-base font-black text-black bg-pink-200">{rowStats.KH > 0 ? rowStats.KH : ''}</td>}
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
                                                    const bases = status.split(', ').map(st => st.split(' ')[0]);
                                                    if (bases.includes('P') || bases.includes('K')) {
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
                                            <td className="p-1 border border-gray-500 text-center text-base bg-yellow-300">
                                                {students.reduce((sum, s) => sum + (Object.values(s.absences || {}) as string[]).reduce((c: number, st: string) => c + (st ? st.split(', ').filter(x => x.split(' ')[0] === 'P').length : 0), 0), 0) || ''}
                                            </td>
                                        )}
                                        {visibleColumns.includes('K') && (
                                            <td className="p-1 border border-gray-500 text-center text-base bg-red-300 text-white">
                                                {students.reduce((sum, s) => sum + (Object.values(s.absences || {}) as string[]).reduce((c: number, st: string) => c + (st ? st.split(', ').filter(x => x.split(' ')[0] === 'K').length : 0), 0), 0) || ''}
                                            </td>
                                        )}
                                        {visibleColumns.includes('T') && (
                                            <td className="p-1 border border-gray-500 text-center text-base bg-blue-300">
                                                {students.reduce((sum, s) => sum + (Object.values(s.absences || {}) as string[]).reduce((c: number, st: string) => c + (st ? st.split(', ').filter(x => x.split(' ')[0] === 'T').length : 0), 0), 0) || ''}
                                            </td>
                                        )}
                                        {visibleColumns.includes('VP') && (
                                            <td className="p-1 border border-gray-500 text-center text-base bg-purple-300 text-white">
                                                {students.reduce((sum, s) => sum + (Object.values(s.absences || {}) as string[]).reduce((c: number, st: string) => c + (st ? st.split(', ').filter(x => x.split(' ')[0] === 'VP').length : 0), 0), 0) || ''}
                                            </td>
                                        )}
                                        {visibleColumns.includes('KH') && (
                                            <td className="p-1 border border-gray-500 text-center text-base bg-pink-300">
                                                {students.reduce((sum, s) => sum + (Object.values(s.absences || {}) as string[]).reduce((c: number, st: string) => c + (st ? st.split(', ').filter(x => x.split(' ')[0] === 'KH').length : 0), 0), 0) || ''}
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
                                                            "bg-pink-100 text-pink-800"
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
    const allStatuses = (status || '').split(', ').filter(Boolean);
    const displayStatuses = allStatuses.filter(st => {
        const baseCode = st.split(' ')[0];
        return visibleColumns.includes(baseCode);
    });

    if (displayStatuses.length === 0) return null;

    const map = {
        'P': "bg-yellow-400 text-black border border-yellow-600",
        'K': "bg-red-500 text-white border border-red-700",
        'T': "bg-blue-400 text-white border border-blue-600",
        'VP': "bg-purple-400 text-white border border-purple-600",
        'KH': "bg-pink-500 text-white border border-pink-700",
    };

    return (
        <div className="flex flex-wrap gap-0.5 justify-center">
            {displayStatuses.map((st, i) => {
                const baseCode = st.split(' ')[0];
                const hasNote = st.includes('(');
                const note = hasNote ? st.substring(st.indexOf('(') + 1, st.lastIndexOf(')')) : '';
                const style = map[baseCode as keyof typeof map] || "bg-gray-400 text-white border-gray-600";

                return (
                    <div 
                        key={i}
                        className={cn("w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black shadow-sm group relative cursor-help", style)}
                    >
                        {baseCode}
                        {hasNote && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block z-[9999] pointer-events-none">
                                {/* Arrow (mũi tên chỉ xuống) */}
                                <div className="w-3 h-3 bg-gray-900 rotate-45 mx-auto mt-[-6px] border-r border-b border-gray-700"></div>
                                
                                {/* Nội dung tooltip */}
                                <div className="bg-gray-900 text-white text-[11px] font-medium px-3 py-2 rounded-lg shadow-2xl min-w-[120px] max-w-[260px] w-max whitespace-normal break-words leading-relaxed border border-gray-700 text-center animate-in fade-in slide-in-from-bottom-1 duration-200">
                                    {note}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
