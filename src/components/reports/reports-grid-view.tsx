import { AbsenceDetail } from "@/app/actions/report";
import { useMemo } from "react";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

interface ReportsGridViewProps {
    dateRange: { start: string, end: string };
    selectedClasses: string[]; // IDs
    absences: AbsenceDetail[];
    classes: { id: string, name: string }[];
    visibleColumns: string[]; // New prop
}

export function ReportsGridView({ dateRange, selectedClasses, absences, classes, visibleColumns }: ReportsGridViewProps) {
    // ...
    const dates = eachDayOfInterval({ start: parseISO(dateRange.start), end: parseISO(dateRange.end) });

    // 2. Group Absences
    const groupedData = useMemo(() => {
        const groups: Record<string, { className: string; students: Record<string, any> }> = {};

        // ...
        absences.forEach(record => {
            // Filter by visible columns
            if (!visibleColumns.includes(record.status)) return;

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

            groups[clsId].students[record.studentCode].absences[record.date] = record.status;
        });

        return groups;
    }, [absences, selectedClasses, classes]);

    const visibleGroups = Object.keys(groupedData).sort();

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

    return (
        <div className="space-y-8">
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
                                LỚP {group.className} <span className="text-sm opacity-90 normal-case ml-2 font-bold text-gray-700">({students.length} trường hợp nghỉ học)</span>
                            </h3>
                        </div>

                        {/* Scrollable Container */}
                        <div className="overflow-auto max-h-[75vh] relative scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-200">
                            <table className="w-full text-sm border-collapse min-w-max">
                                <thead className="bg-gray-300 border-b border-gray-500 text-xs sticky top-0 z-40 shadow-md">
                                    <tr className="bg-gray-300">
                                        <th className="p-2 border border-gray-500 w-12 text-center text-black font-black bg-gray-300 sticky left-0 z-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">STT</th>
                                        <th className="p-2 border border-gray-500 min-w-[180px] text-left text-black font-black bg-gray-300 sticky left-12 z-50 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.3)]">Họ Tên</th>
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
                                                <th key={date.toString()} className={cn("p-1 border border-gray-500 min-w-[45px] text-center", headerClass)}>
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
                                        {visibleColumns.includes('KH') && <th className="p-1 border border-gray-500 w-10 bg-orange-300 text-black font-black text-center">KH</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student, idx) => {
                                        const rowStats = { P: 0, K: 0, T: 0, VP: 0, KH: 0 };

                                        return (
                                            <tr key={student.code} className="hover:bg-blue-100 transition-colors border-b border-gray-400 font-bold text-black">
                                                <td className="p-2 border border-gray-400 text-center text-xs font-black text-black bg-white sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]">{student.stt}</td>
                                                <td className="p-2 border border-gray-400 text-black font-bold whitespace-nowrap bg-white sticky left-12 z-30 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.25)]">{student.name}</td>

                                                {dates.map(date => {
                                                    const dateStr = format(date, 'yyyy-MM-dd');
                                                    const dayName = getDayName(date);
                                                    const isSat = dayName === 'T7';
                                                    const isSun = dayName === 'CN';

                                                    // Slight tint for weekends in body rows for guidance
                                                    const colClass = isSat ? "bg-orange-50" : isSun ? "bg-red-50" : "bg-white";

                                                    const status = student.absences[dateStr];

                                                    if (status === 'P') rowStats.P++;
                                                    if (status === 'K') rowStats.K++;
                                                    if (status === 'T') rowStats.T++;
                                                    if (status === 'VP') rowStats.VP++;
                                                    if (status === 'KH') rowStats.KH++;

                                                    return (
                                                        <td key={dateStr} className={cn("p-1 border border-gray-400 text-center relative", colClass)}>
                                                            <GridCell status={status} visibleColumns={visibleColumns} />
                                                        </td>
                                                    );
                                                })}

                                                {visibleColumns.includes('P') && <td className="p-1 border border-gray-400 text-center text-base font-black text-black bg-yellow-200">{rowStats.P > 0 ? rowStats.P : ''}</td>}
                                                {visibleColumns.includes('K') && <td className="p-1 border border-gray-400 text-center text-base font-black text-black bg-red-200">{rowStats.K > 0 ? rowStats.K : ''}</td>}
                                                {visibleColumns.includes('T') && <td className="p-1 border border-gray-400 text-center text-base font-black text-black bg-blue-200">{rowStats.T > 0 ? rowStats.T : ''}</td>}
                                                {visibleColumns.includes('VP') && <td className="p-1 border border-gray-400 text-center text-base font-black text-black bg-purple-200">{rowStats.VP > 0 ? rowStats.VP : ''}</td>}
                                                {visibleColumns.includes('KH') && <td className="p-1 border border-gray-400 text-center text-base font-black text-black bg-orange-200">{rowStats.KH > 0 ? rowStats.KH : ''}</td>}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function GridCell({ status, visibleColumns }: { status: string, visibleColumns: string[] }) {
    if (!status) return null;

    // Filter by visibility (redundant if parent filters, but good for safety)
    if (!visibleColumns.includes(status)) return null;

    const map = {
        'P': "bg-yellow-400 text-black border border-yellow-600",
        'K': "bg-red-500 text-white border border-red-700",
        'T': "bg-blue-400 text-white border border-blue-600",
        'VP': "bg-purple-400 text-white border border-purple-600",
        'KH': "bg-orange-400 text-white border border-orange-600",
    };

    const style = map[status as keyof typeof map];
    if (!style) return null; // Or render default?

    return (
        <div className={cn("w-7 h-7 mx-auto rounded-md flex items-center justify-center text-xs font-black shadow-sm", style)}>
            {status}
        </div>
    );
}
