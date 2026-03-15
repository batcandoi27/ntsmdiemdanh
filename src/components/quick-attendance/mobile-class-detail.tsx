"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { MobileStudentCard } from "./mobile-student-card";
import { getDailyAttendanceData, toggleDailyCheck, updateBatchAttendance, StudentAttendanceDetail } from "@/app/actions/quick-attendance";
import { AttendanceStatus, Column } from "@/types/models";
import { cn } from "@/lib/utils";
import { useAppSettings } from "@/hooks/use-settings";
import { SessionType } from '@/types/timetable';

interface MobileClassDetailProps {
    classId: string;
    className: string;
    date: string;
    session: SessionType;
    onDateChange: (date: string) => void;
    onBack: () => void;
}

export function MobileClassDetail({ classId, className, date, session, onDateChange, onBack }: MobileClassDetailProps) {
    const { settings } = useAppSettings();

    // Data State
    const [students, setStudents] = useState<StudentAttendanceDetail[]>([]);
    const [customColumns, setCustomColumns] = useState<Column[]>([]);
    const [initialRecords, setInitialRecords] = useState<Record<string, Record<string, boolean>>>({});

    const [loading, setLoading] = useState(true);

    // Changes State
    // studentCode -> { status?, note?, custom: { colId -> checked } }
    const [changes, setChanges] = useState<Record<string, {
        status?: AttendanceStatus;
        note?: string;
        missedPeriods?: number[];
        violation?: boolean;
        violationNote?: string;
        violationPeriods?: number[];
        reward?: boolean;
        rewardNote?: string;
        custom?: Record<string, boolean>;
    }>>({});

    useEffect(() => {
        loadData();
    }, [classId, date]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getDailyAttendanceData(classId, date, session);
            setStudents(data.students);
            setCustomColumns(data.customColumns);
            setInitialRecords(data.studentRecords);
            setChanges({});
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateAll = (studentCode: string, data: any) => {
        setChanges(prev => ({
            ...prev,
            [studentCode]: {
                ...prev[studentCode],
                ...data
            }
        }));
    };

    const handleUpdateCustom = (studentCode: string, colId: string, checked: boolean) => {
        setChanges(prev => ({
            ...prev,
            [studentCode]: {
                ...prev[studentCode],
                custom: {
                    ...prev[studentCode]?.custom,
                    [colId]: checked
                }
            }
        }));
    };

    const handleSave = async () => {
        const studentCodes = Object.keys(changes);
        if (studentCodes.length === 0) return onBack();

        setLoading(true);
        try {
            // 1. Separate Core Updates vs Custom Updates
            const coreUpdates: { studentCode: string, status: AttendanceStatus, note?: string }[] = [];
            const customUpdates: Promise<void>[] = [];

            studentCodes.forEach(code => {
                const change = changes[code];
                const student = students.find(s => (s.student.code || s.student.id) === code);
                if (!student) return;

                // Core + Details
                const hasImpactfulChange = change.status !== undefined || 
                                          change.note !== undefined || 
                                          change.violation !== undefined || 
                                          change.reward !== undefined ||
                                          change.missedPeriods !== undefined;

                if (hasImpactfulChange) {
                    coreUpdates.push({
                        studentCode: code,
                        studentName: student.student.fullName,
                        status: (change.status ?? student.status ?? '') as AttendanceStatus,
                        note: change.note ?? student.note,
                        missedPeriods: change.missedPeriods ?? student.missedPeriods,
                        violation: change.violation ?? student.violation,
                        violationNote: change.violationNote ?? student.violationNote,
                        violationPeriods: change.violationPeriods ?? student.violationPeriods,
                        reward: change.reward ?? student.reward,
                        rewardNote: change.rewardNote ?? student.rewardNote
                    } as any);
                }

                // Custom
                if (change.custom) {
                    Object.entries(change.custom).forEach(([colId, checked]) => {
                        customUpdates.push(toggleDailyCheck(colId, date, code, checked));
                    });
                }
            });

            const allStudentIds = students.map(s => s.student.code || s.student.id);

            await Promise.all([
                coreUpdates.length > 0 
                    ? updateBatchAttendance(classId, date, session, coreUpdates, allStudentIds) 
                    : Promise.resolve(),
                ...customUpdates
            ]);

            onBack();
        } catch (error) {
            console.error(error);
            alert("Lưu thất bại. Vui lòng thử lại.");
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div>;
    }

    const hasChanges = Object.keys(changes).length > 0;

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center gap-3 p-3 border-b bg-white sticky top-0 z-10 shadow-sm">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-bold text-gray-800 truncate">{className}</h1>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => onDateChange(e.target.value)}
                            className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-gray-50 text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-400">• {students.length} HS</span>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={!hasChanges}
                    className={cn(
                        "px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wide transition-all whitespace-nowrap",
                        hasChanges
                            ? "bg-blue-600 text-white shadow-md active:scale-95"
                            : "bg-gray-100 text-gray-400"
                    )}
                >
                    {hasChanges ? 'Lưu' : 'Xong'}
                </button>
            </div>

            {/* List */}
            <div className="divide-y divide-gray-100">
                {students.map((detail) => {
                    const studentCode = detail.student.code || detail.student.id;
                    const change = changes[studentCode];

                    // Core Status
                    const currentStatus = change?.status ?? detail.status ?? '';
                    const currentNote = change?.note ?? detail.note; // Use detail.note as fallback

                    // Custom Columns
                    // Merge initial state with changes
                    const rowCustomColumns = customColumns.map(col => {
                        const isCheckedInitial = initialRecords[studentCode]?.[col.id] || false;
                        const isCheckedChanged = change?.custom?.[col.id];
                        return {
                            id: col.id,
                            name: col.name,
                            checked: isCheckedChanged !== undefined ? isCheckedChanged : isCheckedInitial
                        };
                    });

                    return (
                        <MobileStudentCard
                            key={studentCode}
                            student={{
                                id: detail.student.code,
                                name: detail.student.fullName,
                                code: studentCode,
                                stt: detail.student.order
                            }}
                            status={(change?.status ?? detail.status ?? '') as AttendanceStatus}
                            note={change?.note ?? detail.note}
                            missedPeriods={change?.missedPeriods ?? detail.missedPeriods}
                            violation={change?.violation ?? detail.violation}
                            violationNote={change?.violationNote ?? detail.violationNote}
                            violationPeriods={change?.violationPeriods ?? detail.violationPeriods}
                            reward={change?.reward ?? detail.reward}
                            rewardNote={change?.rewardNote ?? detail.rewardNote}
                            
                            onUpdateAll={(data) => handleUpdateAll(studentCode, data)}
                            // New Props
                            visibleStatuses={settings.visibleDefaultColumns}
                            customColumns={rowCustomColumns}
                            onUpdateCustomColumn={(colId, checked) => handleUpdateCustom(studentCode, colId, checked)}
                        />
                    );
                })}
            </div>
        </div>
    );
}
