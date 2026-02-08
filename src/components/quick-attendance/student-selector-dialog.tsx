'use client';

import { useState, useEffect, useTransition } from 'react';
import { Modal } from '@/components/ui/modal';
import { Search, Loader2, Save } from 'lucide-react';
import { StudentAttendanceDetail, getClassAttendanceDetails, updateBatchAttendance } from '@/app/actions/quick-attendance';
import { AttendanceStatus } from '@/types/models';

interface StudentSelectorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classId: string;
    className: string;
    targetStatus: AttendanceStatus; // The status we are modifying (e.g. 'P')
    date: string;
    onDateChange: (date: string) => void;
    onSaved: () => void;
}

const STATUS_LABELS: Record<string, string> = {
    'P': 'Phép',
    'K': 'Vắng (Không phép)',
    'T': 'Trễ',
    'VP': 'Vi Phạm',
    'V': 'Vắng (Chưa rõ)'
};

const STATUS_COLORS: Record<string, string> = {
    'P': 'text-yellow-600',
    'K': 'text-red-600',
    'T': 'text-blue-600',
    'VP': 'text-purple-600',
    'V': 'text-orange-600'
};

export function StudentSelectorDialog({
    open,
    onOpenChange,
    classId,
    className,
    targetStatus,
    date,
    onDateChange,
    onSaved
}: StudentSelectorDialogProps) {
    const [students, setStudents] = useState<StudentAttendanceDetail[]>([]);
    // Map studentCode -> boolean (isChecked for targetStatus)
    const [localStatusMap, setLocalStatusMap] = useState<Record<string, AttendanceStatus>>({});
    // Local Notes Map: studentCode -> note
    const [localNotesMap, setLocalNotesMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [isSaving, startSaving] = useTransition();
    const [search, setSearch] = useState('');

    const COMMON_VIOLATIONS = [
        "Đồng phục", "Điện thoại", "Chạy giỡn", "Ăn quà vặt", "Nói chuyện riêng", "Không thuộc bài"
    ];

    useEffect(() => {
        if (open && classId) {
            setLoading(true);
            getClassAttendanceDetails(classId, date)
                .then(data => {
                    setStudents(data);
                    // Initialize local maps
                    const map: Record<string, AttendanceStatus> = {};
                    const noteMap: Record<string, string> = {};

                    data.forEach(s => {
                        map[s.student.code] = s.status;
                        if (s.note) noteMap[s.student.code] = s.note;
                    });
                    setLocalStatusMap(map);
                    setLocalNotesMap(noteMap);
                })
                .finally(() => setLoading(false));
        }
    }, [open, classId, date]);

    const handleToggle = (studentCode: string) => {
        setLocalStatusMap(prev => {
            const currentStatus = prev[studentCode];
            const isTarget = currentStatus === targetStatus;

            return {
                ...prev,
                [studentCode]: isTarget ? '' : targetStatus
            };
        });
    };

    const handleNoteChange = (studentCode: string, note: string) => {
        setLocalNotesMap(prev => ({
            ...prev,
            [studentCode]: note
        }));
    };

    const handleSave = () => {
        startSaving(async () => {
            // Send all updates that match targetStatus OR were targetStatus (now cleared/changed)
            // Actually, we should sync all changes to be safe, but focusing on the current context is better.
            // Let's send everything in localStatusMap that differs from original?
            // "updateBatchAttendance" simply updates whatever we send. 
            // We send the current state of `localStatusMap` for ALL students is safest to ensure consistency,
            // BUT `localStatusMap` only has what we loaded.

            const updates = Object.entries(localStatusMap).map(([code, status]) => ({
                studentCode: code,
                status,
                note: localNotesMap[code] || '' // Send the note (or empty if none)
            }));

            await updateBatchAttendance(classId, date, updates);
            onSaved();
            onOpenChange(false);
        });
    };

    const filteredStudents = students.filter(s =>
        s.student.fullName.toLowerCase().includes(search.toLowerCase()) ||
        s.student.code.toLowerCase().includes(search.toLowerCase())
    );

    const targetLabel = STATUS_LABELS[targetStatus] || targetStatus;
    const targetColor = STATUS_COLORS[targetStatus] || 'text-gray-800';
    const showNoteInput = targetStatus === 'VP' || targetStatus === 'T';

    return (
        <Modal
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title={`Điểm danh lớp ${className} - ${targetLabel}`}
        >
            <div className="flex flex-col h-[70vh]">
                <div className="flex gap-2 mb-4">
                    <div className="flex-1 flex items-center gap-2 bg-gray-50 p-2 rounded-lg border">
                        <Search className="text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Tìm học sinh..."
                            className="flex-1 bg-transparent border-none outline-none text-sm h-full"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-2 text-sm font-medium text-gray-600 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    />
                </div>

                <div className="flex-1 overflow-y-auto px-1">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin text-blue-600" size={32} />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredStudents.map(item => {
                                const currentStatus = localStatusMap[item.student.code];
                                const isChecked = currentStatus === targetStatus;
                                const isOtherStatus = currentStatus && currentStatus !== targetStatus;

                                return (
                                    <div
                                        key={item.student.code}
                                        className={`p-3 rounded-xl border transition-all ${isChecked
                                            ? 'bg-blue-50 border-blue-300 shadow-sm'
                                            : isOtherStatus
                                                ? 'bg-gray-100 border-gray-200 opacity-60'
                                                : 'bg-white border-gray-100 hover:border-blue-200'
                                            }`}
                                    >
                                        <div
                                            onClick={() => handleToggle(item.student.code)}
                                            className="flex items-center justify-between cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => { }} // handled by div click
                                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-gray-800 text-sm truncate">{item.student.fullName}</h4>
                                                        <span className="text-xs text-gray-400 font-mono shrink-0">{item.student.code}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status Badge if selected or other */}
                                            {(currentStatus && !isChecked) && (
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full bg-gray-200 text-gray-600`}>
                                                    {currentStatus}
                                                </span>
                                            )}
                                        </div>

                                        {/* Inline Note Input if Checked AND (VP or T) */}
                                        {isChecked && showNoteInput && (
                                            <div className="mt-3 pl-8 animate-in slide-in-from-top-1">
                                                <div className="flex flex-wrap gap-1.5 mb-2">
                                                    {COMMON_VIOLATIONS.map(v => (
                                                        <button
                                                            key={v}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleNoteChange(item.student.code, v);
                                                            }}
                                                            className={`text-[10px] px-2 py-1 rounded border transition-colors ${localNotesMap[item.student.code] === v
                                                                ? 'bg-purple-100 text-purple-700 border-purple-200 font-bold'
                                                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            {v}
                                                        </button>
                                                    ))}
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Ghi chú cụ thể..."
                                                    value={localNotesMap[item.student.code] || ''}
                                                    onChange={(e) => handleNoteChange(item.student.code, e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-400 outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t flex items-center justify-between bg-white sticky bottom-0">
                    <div className="text-sm text-gray-500">
                        Đã chọn: <span className="font-bold text-gray-800">{Object.values(localStatusMap).filter(s => s === targetStatus).length}</span> em
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onOpenChange(false)}
                            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 font-medium text-gray-700"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || loading}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            Lưu Thay Đổi
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
