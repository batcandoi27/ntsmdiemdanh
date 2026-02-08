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
                        <span className="text-sm font-medium text-gray-500">{cls.totalStudents} HS</span>
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
                    <div className="bg-white rounded-b-xl border border-t-0 border-gray-100 p-4 space-y-3">
                        {/* This part of the plan might need refinement. 
                             If the user wants to take attendance, they need to tap the class.
                             Let's visualize the "Block View" on mobile as just a list of classes to Pick.
                         */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex flex-col items-center">
                                <span className="text-xs text-green-600 font-bold uppercase">Hiện diện</span>
                                <span className="text-2xl font-black text-green-700">{cls.attendanceCount.Present}</span>
                            </div>
                            <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex flex-col items-center">
                                <span className="text-xs text-red-600 font-bold uppercase">Vắng</span>
                                <span className="text-2xl font-black text-red-700">{cls.attendanceCount.P + cls.attendanceCount.K}</span>
                            </div>
                        </div>

                        {/* Exceptions Preview */}
                        {(cls.attendanceCount.P + cls.attendanceCount.K + cls.attendanceCount.T + cls.attendanceCount.VP) > 0 && (
                            <div className="pt-2 border-t border-gray-100 mt-2 space-y-1">
                                {cls.studentLists.P.map(s => <TinyStudentPill key={s.id} student={s} type="P" />)}
                                {cls.studentLists.K.map(s => <TinyStudentPill key={s.id} student={s} type="K" />)}
                                {cls.studentLists.T.map(s => <TinyStudentPill key={s.id} student={s} type="T" />)}
                                {cls.studentLists.VP.map(s => <TinyStudentPill key={s.id} student={s} type="VP" />)}
                            </div>
                        )}

                        {/* Action Button */}
                        <button
                            onClick={() => onItemClick(cls.classId, 'Present', '')}
                            className="w-full mt-2 py-3 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-sm active:scale-95 transition-transform"
                        >
                            VÀO ĐIỂM DANH
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
    }[type];

    return (
        <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border mr-1 mb-1", color)}>
            <span>{student.name.split(' ').slice(-2).join(' ')}</span>
            <span className="opacity-75 text-[10px] uppercase">({type})</span>
        </div>
    )
}
