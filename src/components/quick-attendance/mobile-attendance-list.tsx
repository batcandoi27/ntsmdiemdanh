"use client";

import { useViewMode } from "@/context/view-mode-context";
import { BlockAttendanceItem } from "@/app/actions/quick-attendance";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, FileText, Ban, AlertTriangle, User, Zap } from "lucide-react";
import { AttendanceStatus } from "@/types/models";
import { useState } from "react";
import { Drawer } from "vaul"; // Setup next

interface MobileAttendanceListProps {
    data: BlockAttendanceItem[];
    grade: number;
    onItemClick: (classId: string, status: AttendanceStatus, studentName: string) => void; // Will refine this
}

export function MobileAttendanceList({ data, grade, onItemClick }: MobileAttendanceListProps) {
    const { viewDevice } = useViewMode();

    // Only show on mobile/tablet (device width check is handled by parent or CSS)
    // But logically we can also return null if viewDevice === 'desktop'
    if (viewDevice === 'desktop') return null;

    if (data.length === 0) {
        return (
            <div className="text-center py-20 opacity-50">
                <Zap size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-bold text-gray-400">
                    Chọn khối để xem
                </p>
            </div>
        );
    }

    return (
        <div className="pb-24">
            {data.map((cls) => (
                <div key={cls.classId} className="mb-6">
                    {/* Class Header */}
                    <div className="flex justify-between items-center bg-gray-100/80 px-4 py-2 rounded-t-xl backdrop-blur-sm sticky top-16 z-10 border-b border-gray-200">
                        <span className="font-black text-lg text-gray-700">{cls.className}</span>
                        <span className="text-sm font-medium text-gray-500">{cls.attendanceCount.Present}/{cls.totalStudents} HS</span>
                    </div>

                    {/* Student List - Assuming we have student lists from the BlockItem */}
                    {/* Wait, BlockAttendanceItem aggregates counts. It DOES have studentLists (P, K, T, VP).
                        BUT it doesn't have the full class list (Present students).
                        The current logic on Desktop is: Table shows counts, clicking cell shows detailed dialog.
                        
                        For Mobile, the plan says: "List of students".
                        If default is "Present", we need the FULL list of students for each class.
                        Currently `BlockAttendanceItem` only returns lists of *exceptions* (P, K, VP, T).
                        
                        CRITICAL ADAPTATION:
                        To implement the "Touch student to change status" flow, we need to KNOW all students.
                        However, loading ALL students for ALL classes in a block might be heavy?
                        
                        Let's re-read the plan: "Danh sách học sinh = DANH SÁCH CHỌN".
                        If we only show exceptions, how do we mark a "Present" student as "Late"?
                        We need the full list.
                        
                        OPTION A: Fetch full student list when taking attendance for a specific class (Class Mode).
                        OPTION B: The `QuickAttendancePage` has `mode='BLOCK'` and `mode='CLASS'`.
                        
                        The user guide says: "Mobile = điểm danh nhanh... Mobile không phải là Desktop thu nhỏ... Mobile ưu tiên Chọn - Đánh dấu".
                        And "Mở lớp -> Danh sách HS".
                        
                        So Mobile flow should probably be:
                        1. Show List of Classes (Card style).
                        2. Tap a Class -> Enter "Class Detail Mode" (Full Student List).
                        
                        The current `QuickAttendancePage` has `grade` (Block mode).
                        If I'm on Mobile, maybe I shouldn't show the big Block Table at all?
                        Instead, I show a list of Classes. User taps a Class -> drill down.
                        
                        Let's stick to the Plan:
                        "3.1 Header: Lớp - Ngày - Buổi".
                        This implies we are IN a specific class.
                        
                        So on Mobile, the default view for `QuickAttendancePage` should probably be:
                        Step 1: Select Grade (Khối 6).
                        Step 2: List of Classes (6A1, 6A2...).
                        Step 3: Tap 6A1 -> Switch to `MobileAttendanceView` for 6A1.
                        
                        Currently `QuickAttendancePage` has `mode='CLASS'` which does exactly this (Select Grade -> Select Class -> Show Sheet).
                        
                        So I should enhance `mode='CLASS'` for mobile.
                    */}

                    {/* For now, just render the class summary cards for selecting a class on mobile */}
                    {/* Class Summary Card */}
                    <div className="bg-white rounded-b-xl border border-t-0 border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Sĩ số</p>
                                    <p className="text-lg font-black text-gray-800">{cls.totalStudents}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tỷ lệ có mặt</p>
                                <p className="text-lg font-black text-green-600">
                                    {cls.totalStudents > 0 ? Math.round((cls.attendanceCount.Present / cls.totalStudents) * 100) : 0}%
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2.5 bg-red-100 rounded-full overflow-hidden mb-4 flex">
                            <div
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: `${cls.totalStudents > 0 ? (cls.attendanceCount.Present / cls.totalStudents) * 100 : 0}%` }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-green-50/50 p-2.5 rounded-lg border border-green-100/50 flex flex-col items-center">
                                <span className="text-[10px] text-green-600 font-bold uppercase">Hiện diện</span>
                                <span className="text-xl font-black text-green-700">{cls.attendanceCount.Present}</span>
                            </div>
                            <div className="bg-red-50/50 p-2.5 rounded-lg border border-red-100/50 flex flex-col items-center">
                                <span className="text-[10px] text-red-600 font-bold uppercase">Vắng (P+K)</span>
                                <span className="text-xl font-black text-red-700">{cls.attendanceCount.P + cls.attendanceCount.K}</span>
                            </div>
                        </div>

                        {/* Exceptions Preview */}
                        {(cls.attendanceCount.P + cls.attendanceCount.K + cls.attendanceCount.T + cls.attendanceCount.VP) > 0 && (
                            <div className="pt-2 border-t border-gray-100 mt-2 space-y-1 mb-4">
                                {cls.studentLists.P.map((s, i) => <TinyStudentPill key={`${i}_${s.stt}`} student={s as any} type="P" />)}
                                {cls.studentLists.K.map((s, i) => <TinyStudentPill key={`${i}_${s.stt}`} student={s as any} type="K" />)}
                                {cls.studentLists.T.map((s, i) => <TinyStudentPill key={`${i}_${s.stt}`} student={s as any} type="T" />)}
                                {cls.studentLists.VP.map((s, i) => <TinyStudentPill key={`${i}_${s.stt}`} student={s as any} type="VP" />)}
                                {cls.studentLists.KH.map((s, i) => <TinyStudentPill key={`${i}_${s.stt}`} student={s as any} type="KH" />)}
                            </div>
                        )}

                        {/* Action Button */}
                        <button
                            onClick={() => onItemClick(cls.classId, '', '')}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[15px] shadow-[0_4px_0_rgb(29,78,216)] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
                        >
                            <FileText size={18} />
                            Vào Điểm Danh
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function TinyStudentPill({ student, type }: { student: any, type: string }) {
    const color = {
        P: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        K: 'bg-red-100 text-red-800 border-red-200',
        T: 'bg-blue-100 text-blue-800 border-blue-200',
        VP: 'bg-purple-100 text-purple-800 border-purple-200',
        KH: 'bg-orange-100 text-orange-800 border-orange-200',
    }[type];

    return (
        <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border mr-1 mb-1", color)}>
            <span>{student.name.split(' ').slice(-2).join(' ')}</span>
            <span className="opacity-75 text-[10px] uppercase">({type})</span>
        </div>
    )
}
