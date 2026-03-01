import { AbsenceDetail, updateReportAttendance, addReportAttendance } from "@/app/actions/report";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { useState, useEffect } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { getClassAndStudents } from "@/app/actions/common";
import { Student } from "@/types/models";
import { useAuth } from "@/context/auth-context";

interface ReportsListViewProps {
    data: AbsenceDetail[];
    classSizes?: Record<string, number>;
    groupBy: 'DATE' | 'CLASS';
    visibleColumns: string[]; // New
    onRefresh?: () => void;
}

export function ReportsListView({ data, classSizes = {}, groupBy, visibleColumns, onRefresh }: ReportsListViewProps) {
    const { appUser } = useAuth();
    const [editCell, setEditCell] = useState<{ classId: string, studentCode: string, studentName: string, date: string, currentStatus: string, rect: { top: number, left: number } } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [addModalConfig, setAddModalConfig] = useState<{ className: string, date?: string } | null>(null);

    const handleSaveStatus = async (newStatus: string) => {
        if (!editCell) return;
        setIsSaving(true);
        try {
            const res = await updateReportAttendance(appUser, editCell.classId, editCell.studentCode, editCell.studentName, editCell.date, newStatus as any);
            if (!res.success) {
                alert(res.message);
            } else {
                setEditCell(null);
                if (onRefresh) onRefresh();
            }
        } catch (error) {
            console.error(error);
            alert("Lỗi cập nhật!");
        } finally {
            setIsSaving(false);
        }
    };

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-gray-50/50 p-4 border-b border-gray-100 grid grid-cols-12 gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <div className="col-span-2">Ngày/Lớp</div>
                    <div className="col-span-10 text-center">Danh Sách</div>
                </div>
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                    <div className="bg-gray-50 p-4 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="12" y1="18" x2="12" y2="12"></line>
                            <line x1="9" y1="15" x2="15" y2="15"></line>
                        </svg>
                    </div>
                    <span className="font-medium italic">Không có dữ liệu báo cáo nào.</span>
                </div>
            </div>
        );
    }

    // Grouping Logic
    const groups: Record<string, AbsenceDetail[]> = {};

    data.forEach(item => {
        if (!visibleColumns.includes(item.status)) return; // Filter
        const key = groupBy === 'DATE' ? item.date : item.className;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });

    // Sort keys
    const sortedKeys = Object.keys(groups).sort((a, b) => {
        if (groupBy === 'DATE') return new Date(b).getTime() - new Date(a).getTime();
        return a.localeCompare(b, undefined, { numeric: true });
    });

    const getGradeColor = (className: string) => {
        if (className.startsWith('6')) return "bg-emerald-100 text-emerald-800 border-emerald-200";
        if (className.startsWith('7')) return "bg-blue-100 text-blue-800 border-blue-200";
        if (className.startsWith('8')) return "bg-orange-100 text-orange-800 border-orange-200";
        if (className.startsWith('9')) return "bg-rose-100 text-rose-800 border-rose-200";
        return "bg-gray-100 text-gray-800 border-gray-200";
    };

    const getGradeBarColor = (className: string) => {
        if (className.startsWith('6')) return "bg-emerald-500";
        if (className.startsWith('7')) return "bg-blue-500";
        if (className.startsWith('8')) return "bg-orange-500";
        if (className.startsWith('9')) return "bg-rose-500";
        return "bg-gray-500";
    };

    return (
        <div className="space-y-6">
            {sortedKeys.map(key => {
                const headerStyle = groupBy === 'CLASS' ? getGradeColor(key) : "bg-white border-green-100 text-green-800";
                const barColor = groupBy === 'CLASS' ? getGradeBarColor(key) : "bg-green-500";
                const items = groups[key];

                // Sub-grouping
                // If grouped by CLASS -> sub-group by DATE
                // If grouped by DATE -> sub-group by CLASS
                const subGroups: Record<string, AbsenceDetail[]> = {};
                items.forEach(item => {
                    const subKey = groupBy === 'CLASS' ? item.date : item.className;
                    if (!subGroups[subKey]) subGroups[subKey] = [];
                    subGroups[subKey].push(item);
                });

                // Sort sub-keys
                const sortedSubKeys = Object.keys(subGroups).sort((a, b) => {
                    // If grouping by CLASS (subKey is Date) -> Sort Dates Ascending (Oldest first)
                    if (groupBy === 'CLASS') return new Date(a).getTime() - new Date(b).getTime();
                    // If grouping by DATE (subKey is Class) -> Sort Class Name
                    return a.localeCompare(b, undefined, { numeric: true });
                });

                return (
                    <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        {/* Group Header */}
                        <div className={cn("px-4 py-3 border-b flex items-center", headerStyle)}>
                            <div className="flex items-center gap-2">
                                <div className={cn("w-1 h-6 rounded-full", barColor)}></div>
                                <h3 className="font-bold uppercase flex items-center gap-2">
                                    <span>
                                        {groupBy === 'DATE'
                                            ? `NGÀY: ${format(new Date(key), 'dd/MM/yyyy', { locale: vi })}`
                                            : `LỚP: ${key}`
                                        }
                                    </span>
                                    {groupBy === 'CLASS' && (() => {
                                        // Tìm 1 classId bất kỳ của Lớp trong items để lookup size
                                        const classId = items.find(i => i.className === key)?.classId;
                                        const totalStudents = classId ? (classSizes[classId] || 0) : 0;
                                        const vCount = items.length; // Tổng vắng trong view này
                                        // Hiển thị "(SS: 51, V: 5)"
                                        return (
                                            <span className="ml-2 text-xs font-medium opacity-80 bg-white/30 px-2 py-0.5 rounded-full inline-block mt-[-2px]">
                                                {`(SS: ${totalStudents || '?'}, V: ${vCount})`}
                                            </span>
                                        );
                                    })()}
                                    {/* Nút Cộng Chỉ Hiện Khi Group By LỚP */}
                                    {groupBy === 'CLASS' && (
                                        <button
                                            onClick={() => setAddModalConfig({ className: key })}
                                            className="bg-white/30 hover:bg-white/60 text-emerald-900 border border-emerald-700/30 p-1 rounded shadow-sm transition-colors"
                                            title={`Thêm học sinh vắng Lớp ${key}`}
                                        >
                                            <Plus size={14} className="stroke-[3px]" />
                                        </button>
                                    )}
                                </h3>
                            </div>
                        </div>

                        {/* Content: Table-like list */}
                        <div className="p-4 bg-gray-50/30">
                            {/* Table Header (Only for Class View really, but consistent is good) */}
                            <div className="grid grid-cols-12 gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-2">
                                <div className="col-span-12 md:col-span-2">
                                    {groupBy === 'CLASS' ? "Ngày" : "Lớp"}
                                </div>
                                <div className="col-span-12 md:col-span-10">Danh Sách Học Sinh</div>
                            </div>

                            <div className="space-y-2">
                                {sortedSubKeys.map(subKey => {
                                    const subGroupItems = subGroups[subKey];

                                    // Consolidate students for SC (Sáng Chiều)
                                    // Map: studentCode -> { name, status, count, id }
                                    const consolidatedMap: Record<string, { name: string, status: string, count: number, id: string, classId: string, date: string }> = {};
                                    subGroupItems.forEach(item => {
                                        if (!consolidatedMap[item.studentCode]) {
                                            consolidatedMap[item.studentCode] = {
                                                name: item.studentName,
                                                status: item.status,
                                                count: 1,
                                                id: item.id,
                                                classId: item.classId,
                                                date: item.date
                                            };
                                        } else {
                                            consolidatedMap[item.studentCode].count++;
                                        }
                                    });
                                    const consolidatedStudents = Object.entries(consolidatedMap).map(([code, info]) => ({
                                        code, ...info
                                    })).sort((a, b) => a.name.localeCompare(b.name));

                                    return (
                                        <div key={subKey} className="bg-white border border-gray-100 rounded-lg p-3 grid grid-cols-12 gap-4 items-start shadow-sm hover:shadow-md transition-shadow">

                                            {/* Left Column: Date or Class */}
                                            <div className="col-span-12 md:col-span-2 flex items-center h-full">
                                                {groupBy === 'CLASS' ? (
                                                    <span className="text-sm font-bold text-gray-700 bg-gray-100 flex items-center rounded overflow-hidden shadow-sm border border-gray-200">
                                                        <span className="px-2 py-1 flex items-center gap-2">
                                                            {(() => {
                                                                const d = new Date(subKey);
                                                                const dayName = d.getDay() === 0 ? 'CN' : `T${d.getDay() + 1}`;
                                                                return `${dayName} - ${format(d, 'dd/MM/yyyy', { locale: vi })}`;
                                                            })()}
                                                            {(() => {
                                                                // SS and V for 'CLASS' group -> Date subGroup
                                                                const classId = items[0]?.classId;
                                                                const ss = classId ? (classSizes[classId] || 0) : 0;
                                                                const v = consolidatedStudents.length; // Count unique students
                                                                return (
                                                                    <span className="text-[10px] font-bold flex gap-1">
                                                                        <span className="text-blue-600 bg-blue-50 px-1 rounded border border-blue-100">SS: {ss || '?'}</span>
                                                                        <span className="text-red-600 bg-red-50 px-1 rounded border border-red-100">V: {v}</span>
                                                                    </span>
                                                                );
                                                            })()}
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-col gap-1 items-start group">
                                                        <span className="text-sm font-bold text-gray-700 bg-gray-100 flex items-center rounded overflow-hidden shadow-sm border border-gray-200">
                                                            <span className="px-2 py-1 flex items-center gap-2">
                                                                {subKey}
                                                                {(() => {
                                                                    // SS and V for 'DATE' group -> Class subGroup
                                                                    const classId = subGroupItems[0]?.classId;
                                                                    const ss = classId ? classSizes[classId] : 0;
                                                                    const v = consolidatedStudents.length; // Count unique students
                                                                    return (
                                                                        <span className="text-[10px] font-bold flex gap-1 bg-white px-1.5 py-0.5 rounded shadow-sm opacity-90 whitespace-nowrap">
                                                                            <span className="text-blue-600">SS: {ss || '?'}</span>
                                                                            <span className="text-red-600">V: {v}</span>
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </span>
                                                            <button
                                                                onClick={() => setAddModalConfig({ className: subKey, date: key })}
                                                                className="bg-gray-200 hover:bg-gray-300 transition-colors p-1"
                                                                title={`Thêm học sinh vắng lớp ${subKey} ngày ${format(new Date(key), 'dd/MM')}`}
                                                            >
                                                                <Plus size={14} strokeWidth={3} className="text-gray-600" />
                                                            </button>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right Column: List of Students */}
                                            <div className="col-span-12 md:col-span-10 flex flex-wrap gap-2">
                                                {consolidatedStudents.map(student => (
                                                    <div
                                                        key={student.id}
                                                        className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md text-sm text-gray-700 hover:bg-white hover:border-gray-300 transition-colors cursor-pointer hover:shadow-sm"
                                                        onClick={(e) => {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setEditCell({
                                                                classId: student.classId,
                                                                studentCode: student.code,
                                                                studentName: student.name,
                                                                date: student.date,
                                                                currentStatus: student.status,
                                                                rect: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX }
                                                            });
                                                        }}
                                                    >
                                                        <span className="font-bold text-gray-500 text-xs">{student.code.split('_').pop()}</span>
                                                        <span className="font-medium">
                                                            {student.name}
                                                            {student.count > 1 && <span className="text-red-600 font-black ml-1">(SC)</span>}
                                                        </span>
                                                        <CompactStatusBadge status={student.status} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Chú thích phía dưới cùng */}
            <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex items-center gap-3 text-xs text-blue-800">
                <div className="bg-blue-100 p-1 rounded-full text-blue-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                </div>
                <p>
                    <span className="font-bold">Ghi chú:</span> Ký hiệu <span className="text-red-600 font-bold">(SC)</span> hiển thị cho các học sinh vắng cả <span className="font-bold">Sáng</span> và <span className="font-bold">Chiều</span> trong cùng một ngày.
                </p>
            </div>

            {/* Custom Popover Editor */}
            {editCell && (
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setEditCell(null)}></div>
                    <div
                        className="absolute z-[70] bg-white rounded-xl shadow-2xl border border-gray-200 p-2 w-48 animate-in zoom-in-95 duration-150"
                        style={{ top: editCell.rect.top, left: Math.min(editCell.rect.left - 50, window.innerWidth - 200) }}
                    >
                        <div className="text-xs font-bold text-gray-500 mb-2 px-1 text-center border-b pb-1">Đổi trạng thái - {format(parseISO(editCell.date), 'dd/MM')}</div>
                        <div className="grid grid-cols-2 gap-1.5">
                            {['P', 'K', 'T', 'VP', 'KH'].map(st => (
                                <button
                                    key={st}
                                    disabled={isSaving}
                                    onClick={() => handleSaveStatus(st)}
                                    className={cn("text-xs font-black p-1.5 rounded-lg border",
                                        st === 'P' ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-300" :
                                            st === 'K' ? "bg-red-100 text-red-700 hover:bg-red-200 border-red-300" :
                                                st === 'T' ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300" :
                                                    st === 'VP' ? "bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-300" :
                                                        "bg-pink-100 text-pink-700 hover:bg-pink-200 border-pink-300"
                                    )}
                                >
                                    {isSaving ? "..." : st}
                                </button>
                            ))}
                        </div>
                        <button
                            disabled={isSaving}
                            onClick={() => handleSaveStatus('DELETE')}
                            className="w-full mt-2 text-xs font-bold text-gray-700 bg-gray-100 p-1.5 rounded-lg border border-gray-300 hover:bg-gray-200 hover:text-red-600 transition-colors"
                        >
                            {isSaving ? "Đang lưu..." : "🗑 Gỡ & Xoá vắng"}
                        </button>
                    </div>
                </>
            )}

            {/* Add Attendance Modal scoped to this view */}
            {addModalConfig && (
                <AddAttendanceModal
                    className={addModalConfig.className}
                    defaultDate={addModalConfig.date}
                    onClose={() => setAddModalConfig(null)}
                    onRefresh={() => {
                        setAddModalConfig(null);
                        if (onRefresh) onRefresh();
                    }}
                />
            )}
        </div>
    );
}

// Internal Add Attendance Modal for ListView
function AddAttendanceModal({ className, defaultDate, onClose, onRefresh }: { className: string, defaultDate?: string, onClose: () => void, onRefresh: () => void }) {
    const { appUser } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentCode, setSelectedStudentCode] = useState('');
    const [date, setDate] = useState(defaultDate || format(new Date(), 'yyyy-MM-dd'));
    const [status, setStatus] = useState('P');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        getClassAndStudents(className).then(res => {
            setStudents(res.students.sort((a, b) => a.fullName.localeCompare(b.fullName)));
            setSelectedStudentCode(res.students.length > 0 ? res.students[0].code : '');
            setLoading(false);
        });
    }, [className]);

    const handleSave = async () => {
        if (!className || !selectedStudentCode || !date || !status) {
            alert("Vui lòng nhập đủ thông tin.");
            return;
        }
        setLoading(true);
        try {
            const stu = students.find(s => s.code === selectedStudentCode);
            const res = await addReportAttendance(appUser, className, selectedStudentCode, stu?.fullName || '', date, status as any); // fallback className
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

function CompactStatusBadge({ status }: { status: string }) {
    const map = {
        'P': { text: 'P', color: 'text-yellow-600' },
        'K': { text: 'K', color: 'text-red-600' },
        'V': { text: 'V', color: 'text-gray-600' },
        'T': { text: 'T', color: 'text-blue-600' },
        'VP': { text: 'VP', color: 'text-purple-600' },
        'KH': { text: 'KH', color: 'text-pink-600' },
    };
    const style = map[status as keyof typeof map] || { text: status, color: 'text-gray-600' };

    return (
        <span className={cn("font-extrabold text-xs uppercase", style.color)}>
            {style.text}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map = {
        'P': { text: 'Phép (P)', bg: 'bg-yellow-100', color: 'text-yellow-700' },
        'K': { text: 'Không (K)', bg: 'bg-red-100', color: 'text-red-700' },
        'V': { text: 'Vắng (V)', bg: 'bg-gray-100', color: 'text-gray-700' },
        'T': { text: 'Trễ (T)', bg: 'bg-blue-100', color: 'text-blue-700' },
        'VP': { text: 'Vi Phạm (VP)', bg: 'bg-purple-100', color: 'text-purple-700' },
        'KH': { text: 'Khen thưởng (KH)', bg: 'bg-pink-100', color: 'text-pink-700' },
    };
    const style = map[status as keyof typeof map] || { text: status, bg: 'bg-gray-100', color: 'text-gray-600' };

    return (
        <span className={cn("px-2 py-1 rounded text-xs font-bold", style.bg, style.color)}>
            {style.text}
        </span>
    );
}
