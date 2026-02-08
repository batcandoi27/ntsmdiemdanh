import { AbsenceDetail } from "@/app/actions/report";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface ReportsListViewProps {
    data: AbsenceDetail[];
    groupBy: 'DATE' | 'CLASS';
}

export function ReportsListView({ data, groupBy }: ReportsListViewProps) {

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
                        <div className={cn("px-4 py-3 border-b flex items-center gap-2", headerStyle)}>
                            <div className={cn("w-1 h-6 rounded-full", barColor)}></div>
                            <h3 className="font-bold uppercase">
                                {groupBy === 'DATE'
                                    ? `NGÀY: ${format(new Date(key), 'dd/MM/yyyy', { locale: vi })}`
                                    : `LỚP: ${key}`
                                }
                            </h3>
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
                                {sortedSubKeys.map(subKey => (
                                    <div key={subKey} className="bg-white border border-gray-100 rounded-lg p-3 grid grid-cols-12 gap-4 items-start shadow-sm hover:shadow-md transition-shadow">

                                        {/* Left Column: Date or Class */}
                                        <div className="col-span-12 md:col-span-2 flex items-center h-full">
                                            <span className="text-sm font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                                {groupBy === 'CLASS'
                                                    ? (() => {
                                                        const d = new Date(subKey);
                                                        const dayName = d.getDay() === 0 ? 'CN' : `T${d.getDay() + 1}`;
                                                        return `${dayName} - ${format(d, 'dd/MM/yyyy', { locale: vi })}`;
                                                    })()
                                                    : subKey
                                                }
                                            </span>
                                        </div>

                                        {/* Right Column: List of Students */}
                                        <div className="col-span-12 md:col-span-10 flex flex-wrap gap-2">
                                            {subGroups[subKey].map(student => (
                                                <div key={student.id} className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md text-sm text-gray-700 hover:bg-white hover:border-gray-300 transition-colors">
                                                    <span className="font-bold text-gray-500 text-xs">{student.studentCode}</span>
                                                    <span className="font-medium">{student.studentName}</span>
                                                    <CompactStatusBadge status={student.status} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
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
    };
    const style = map[status as keyof typeof map] || { text: status, bg: 'bg-gray-100', color: 'text-gray-600' };

    return (
        <span className={cn("px-2 py-1 rounded text-xs font-bold", style.bg, style.color)}>
            {style.text}
        </span>
    );
}
