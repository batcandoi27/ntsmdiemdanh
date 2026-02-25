'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getColumn } from '@/services/column-service';
import { getStudents } from '@/services/student-service';
import { getAllRecordsForColumn, savePeriodRecord, getOneTimeRecords, saveOneTimeRecord } from '@/services/record-service';
import { Column, Student, PeriodRecord, OneTimeRecord } from '@/types/models';
import { ArrowLeft, Loader2, Save, CheckCircle2, Circle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';

export default function MonitorDetailPage() {
    const params = useParams();
    const router = useRouter();
    const classId = params.id as string;
    const columnId = params.columnId as string;

    const [loading, setLoading] = useState(true);
    const [column, setColumn] = useState<Column | null>(null);
    const [students, setStudents] = useState<Student[]>([]);

    // Records State
    const [periodRecords, setPeriodRecords] = useState<Record<string, Record<string, string>>>({}); // studentCode -> periodKey -> value
    const [oneTimeRecords, setOneTimeRecords] = useState<Record<string, { completed: boolean; value?: string; note?: string }>>({}); // studentCode -> { completed, value, note }

    // Edit State for Note/Value
    const [editingCell, setEditingCell] = useState<{ studentCode: string; periodKey?: string; type: 'period' | 'one_time'; initialValue: string } | null>(null);

    useEffect(() => {
        loadData();
    }, [columnId]);

    const loadData = async () => {
        try {
            const [col, studList] = await Promise.all([
                getColumn(columnId),
                getStudents(classId)
            ]);

            if (!col) {
                alert('Không tìm thấy cột này');
                router.back();
                return;
            }

            setColumn(col);

            // Filter students by scope
            let filteredStudents = studList;
            if (col.applicableScope === 'subset' && col.applicableStudentIds) {
                filteredStudents = studList.filter(s => col.applicableStudentIds?.includes(s.id));
            }
            // Sort by order/name
            filteredStudents.sort((a, b) => (a.order || 999) - (b.order || 999) || a.firstName.localeCompare(b.firstName));

            setStudents(filteredStudents);

            // Fetch Records based on frequency
            if (col.frequency === 'period') {
                const allRecords = await getAllRecordsForColumn(columnId);
                const records = allRecords as PeriodRecord[]; // Cast assuming correctness based on column type

                // Transform to map
                const map: Record<string, Record<string, string>> = {};
                records.forEach(r => {
                    if (!map[r.studentCode]) map[r.studentCode] = {};
                    map[r.studentCode][r.periodKey] = r.value as string;
                });
                setPeriodRecords(map);
            } else if (col.frequency === 'one_time') {
                const records = await getOneTimeRecords(columnId);
                const map: Record<string, any> = {};
                records.forEach(r => {
                    map[r.studentCode] = { completed: r.status === 'done', value: r.value, note: r.note };
                });
                setOneTimeRecords(map);
            }

        } catch (error) {
            console.error('Error loading detail:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOneTimeToggle = async (studentCode: string) => {
        if (!column) return;
        const current = oneTimeRecords[studentCode] || { completed: false };
        const newCompleted = !current.completed;

        // Optimistic Update
        setOneTimeRecords(prev => ({
            ...prev,
            [studentCode]: { ...current, completed: newCompleted }
        }));

        try {
            await saveOneTimeRecord({
                columnId: column.id,
                classId,
                studentCode,
                status: newCompleted ? 'done' : 'pending',
                note: current.note,
                value: current.value
            });
        } catch (error) {
            console.error(error);
            alert('Lỗi lưu trạng thái: ' + (error as Error).message);
            // Revert
            setOneTimeRecords(prev => ({
                ...prev,
                [studentCode]: { ...current, completed: !newCompleted }
            }));
        }
    };

    const handleBulkOneTime = async (completed: boolean) => {
        if (!column) return;
        if (!confirm(completed ? 'Đánh dấu tất cả là xong?' : 'Hủy đánh dấu tất cả?')) return;

        const nextRecords = { ...oneTimeRecords };
        const promises = [];

        for (const s of students) {
            const current = nextRecords[s.code];

            nextRecords[s.code] = {
                completed,
                value: current?.value,
                note: current?.note
            };

            promises.push(saveOneTimeRecord({
                columnId: column.id,
                classId,
                studentCode: s.code,
                status: completed ? 'done' : 'pending',
                note: current.note
            }));
        }
        setOneTimeRecords(nextRecords);
        try {
            await Promise.all(promises);
        } catch (e) {
            console.error(e);
            alert('Lỗi lưu thay đổi');
        }
    };

    const handlePeriodCellClick = async (studentCode: string, periodKey: string) => {
        if (!column) return;

        if (column.suggestions.length > 0) {
            const currentVal = periodRecords[studentCode]?.[periodKey];
            const currentIndex = column.suggestions.indexOf(currentVal || '');

            let nextVal = '';
            if (currentIndex === -1) {
                nextVal = column.suggestions[0];
            } else if (currentIndex < column.suggestions.length - 1) {
                nextVal = column.suggestions[currentIndex + 1];
            } else {
                nextVal = ''; // Cycle back to empty (unchecked)
            }

            updatePeriodRecord(studentCode, periodKey, nextVal);
        } else {
            // No suggestions -> Boolean toggle (Check/Uncheck)
            // Stored as "X" or ""
            const currentVal = periodRecords[studentCode]?.[periodKey];
            const nextVal = currentVal ? '' : 'X';
            updatePeriodRecord(studentCode, periodKey, nextVal);
        }
    };

    const updatePeriodRecord = async (studentCode: string, periodKey: string, value: string) => {
        if (!column) return;

        setPeriodRecords(prev => ({
            ...prev,
            [studentCode]: {
                ...prev[studentCode],
                [periodKey]: value
            }
        }));

        try {
            await savePeriodRecord({
                columnId: column.id,
                classId, // Add classId
                studentCode,
                periodKey,
                value
            });
        } catch (error) {
            console.error(error);
        }
    };

    const getStudentName = (s: Student) => {
        return s.fullName;
    };

    if (loading || !column) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="min-h-screen bg-white pb-20">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10 p-4 flex items-center gap-3 shadow-sm">
                <button
                    onClick={() => router.push(`/classes/${classId}/monitor`)}
                    className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1 overflow-hidden">
                    <h1 className="font-bold text-lg text-gray-800 truncate">{column.name}</h1>
                    <p className="text-xs text-gray-500 truncate">
                        {students.length} học sinh • {column.frequency === 'period' ? 'Theo giai đoạn' : 'Một lần'}
                    </p>
                </div>
            </div>

            <div className="p-4 overflow-x-auto">
                {column.frequency === 'period' ? (
                    <div className="min-w-[600px]">
                        {/* Period Matrix */}
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="text-left p-2 border-b font-medium text-gray-500 w-48 sticky left-0 bg-white z-10">Học sinh</th>
                                    {column.subPeriods?.map(sub => (
                                        <th key={sub.id} className="text-center p-2 border-b font-medium text-gray-500 min-w-[100px]">
                                            {sub.label}
                                        </th>
                                    ))}
                                    {(!column.subPeriods || column.subPeriods.length === 0) && (
                                        <th className="text-center p-2 border-b font-medium text-gray-500">Trạng thái</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student, idx) => (
                                    <tr key={student.id} className="hover:bg-gray-50 group">
                                        <td className="p-2 border-b sticky left-0 bg-white group-hover:bg-gray-50 z-10 font-medium text-sm text-gray-700">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs">
                                                    {student.order || idx + 1}
                                                </span>
                                                <span className="truncate max-w-[150px]">{getStudentName(student)}</span>
                                            </div>
                                        </td>

                                        {column.subPeriods?.map(sub => {
                                            const val = periodRecords[student.code]?.[sub.id];
                                            return (
                                                <td key={sub.id} className="p-1 border-b text-center">
                                                    <button
                                                        onClick={() => handlePeriodCellClick(student.code, sub.id)}
                                                        className={cn(
                                                            "w-full h-10 rounded-lg flex items-center justify-center transition-all text-sm font-medium",
                                                            val
                                                                ? "bg-blue-100 text-blue-700 font-bold"
                                                                : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                                                        )}
                                                    >
                                                        {val || '-'}
                                                    </button>
                                                </td>
                                            );
                                        })}

                                        {(!column.subPeriods || column.subPeriods.length === 0) && (
                                            <td className="p-1 border-b text-center">
                                                <button
                                                    onClick={() => handlePeriodCellClick(student.code, 'main')}
                                                    className={cn(
                                                        "w-full h-10 rounded-lg flex items-center justify-center transition-all text-sm font-medium",
                                                        periodRecords[student.code]?.['main']
                                                            ? "bg-blue-100 text-blue-700 font-bold"
                                                            : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                                                    )}
                                                >
                                                    {periodRecords[student.code]?.['main'] || '-'}
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="mt-4 text-xs text-gray-400 text-center">
                            Chạm vào ô để thay đổi trạng thái
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Bulk Actions */}
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => handleBulkOneTime(true)}
                                className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-bold"
                            >
                                ✓ Tất cả xong
                            </button>
                            <button
                                onClick={() => handleBulkOneTime(false)}
                                className="text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 font-bold"
                            >
                                ✕ Bỏ chọn hết
                            </button>
                        </div>

                        {/* One Time List */}
                        {students.map((student, idx) => {
                            const record = oneTimeRecords[student.code];
                            const isDone = record?.completed;

                            return (
                                <div
                                    key={student.id}
                                    onClick={() => handleOneTimeToggle(student.code)}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.99] cursor-pointer",
                                        isDone ? "bg-blue-50 border-blue-200" : "bg-white border-gray-100 hover:border-blue-200"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                                            isDone ? "bg-blue-200 text-blue-700" : "bg-gray-100 text-gray-400"
                                        )}>
                                            {student.order || idx + 1}
                                        </div>
                                        <div>
                                            <div className={cn("font-medium", isDone ? "text-blue-900" : "text-gray-700")}>
                                                {getStudentName(student)}
                                            </div>
                                            {record?.value && (
                                                <div className="text-xs text-blue-600 font-medium">
                                                    {record.value}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className={cn(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                        isDone ? "bg-blue-500 border-blue-500 text-white" : "border-gray-200"
                                    )}>
                                        {isDone && <CheckCircle2 size={14} />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
