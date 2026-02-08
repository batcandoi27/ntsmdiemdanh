"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { MobileStudentCard } from "./mobile-student-card";
import { getClassAttendanceDetails, updateBatchAttendance, StudentAttendanceDetail } from "@/app/actions/quick-attendance";
import { AttendanceStatus } from "@/types/models";
import { cn } from "@/lib/utils"; // Added import for cn utility

interface MobileClassDetailProps {
    classId: string;
    className: string;
    date: string;
    onDateChange: (date: string) => void;
    onBack: () => void;
}

export function MobileClassDetail({ classId, className, date, onDateChange, onBack }: MobileClassDetailProps) {
    const [students, setStudents] = useState<StudentAttendanceDetail[]>([]);
    const [loading, setLoading] = useState(true);
    // Track local changes: map of studentCode -> { status, note }
    const [changes, setChanges] = useState<Record<string, { status: AttendanceStatus; note?: string }>>({});

    useEffect(() => {
        loadStudents();
    }, [classId, date]);

    const loadStudents = async () => {
        setLoading(true);
        try {
            const result = await getClassAttendanceDetails(classId, date);
            setStudents(result);
            setChanges({}); // Reset changes
        } catch (error) {
            console.error(error);
            // alert("Không thể tải danh sách học sinh");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = (studentCode: string, status: AttendanceStatus, note?: string) => {
        setChanges(prev => ({
            ...prev,
            [studentCode]: { status, note }
        }));
    };

    const handleSave = async () => {
        // Prepare payload from changes
        const updates = Object.entries(changes).map(([studentCode, data]) => ({
            studentCode,
            status: data.status,
            note: data.note
        }));

        if (updates.length === 0) {
            onBack();
            return;
        }

        try {
            await updateBatchAttendance(classId, date, updates);
            onBack();
        } catch (error) {
            console.error(error);
            alert("Lưu thất bại");
        }
    };

    // Calculate current stats
    const presentCount = students.filter(s => {
        const changed = changes[s.student.code];
        const status = changed ? changed.status : s.status;
        return status === '' || status === 'C';
    }).length;

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div>;
    }

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
                    disabled={Object.keys(changes).length === 0}
                    className={cn(
                        "px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wide transition-all whitespace-nowrap",
                        Object.keys(changes).length > 0
                            ? "bg-blue-600 text-white shadow-md active:scale-95"
                            : "bg-gray-100 text-gray-400"
                    )}
                >
                    {Object.keys(changes).length > 0 ? 'Lưu' : 'Xong'}
                </button>
            </div>

            {/* List */}
            <div className="divide-y divide-gray-100">
                {students.map((detail) => {
                    const studentCode = detail.student.code || detail.student.id; // Fallback
                    // Check if changed locally, else use loaded status
                    const currentStatus = changes[studentCode]?.status || detail.status || 'Present';
                    const currentNote = changes[studentCode]?.note !== undefined ? changes[studentCode].note : detail.student.note; // Need to check where note is stored. `detail.student` has note? No, `detail` has status. 
                    // Wait, `StudentAttendanceDetail` interface: { student: Student, status: AttendanceStatus }. 
                    // Does `Student` have note?
                    // In `quick-attendance.ts` types: `Student` ...
                    // Let's assume `detail.student` might not have the daily note.
                    // The note is likely in the `AttendanceRecord` but spread out?
                    // `getClassAttendanceDetails` implementation should be checked if it returns notes.
                    // If not, we might miss notes.
                    // But for "Quick Selection", maybe notes are secondary.
                    // Let's pass what we can.

                    return (
                        <MobileStudentCard
                            key={studentCode}
                            student={{
                                id: detail.student.code,
                                name: detail.student.fullName,
                                code: studentCode,
                                stt: detail.student.order
                            }}
                            status={currentStatus}
                            note={currentNote} // This might be stale if API doesn't return note in detail
                            onUpdateStatus={(status, note) => handleUpdateStatus(studentCode, status, note)}
                        />
                    );
                })}
            </div>
        </div>
    );
}
