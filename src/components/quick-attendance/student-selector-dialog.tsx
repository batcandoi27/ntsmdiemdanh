'use client';

import { useState, useEffect, useTransition } from 'react';
import { Modal } from '@/components/ui/modal';
import { StudentAttendanceDetail, getClassAttendanceDetails } from '@/app/actions/quick-attendance';
import { batchMarkAttendance } from '@/services/attendance-v3-service';
import { AttendanceStatusV3 } from '@/types/attendance-v3';
import { useAuth } from '@/context/auth-context';
import { AttendanceStatus } from '@/types/models';

import { SessionType } from '@/types/timetable';
import { Search, Loader2, Save } from 'lucide-react';

const triggerHapticFeedback = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
            navigator.vibrate(50); // Light vibration
        } catch (e) { }
    }
};

interface StudentSelectorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classId: string;
    className: string;
    targetStatus: AttendanceStatus; // The status we are modifying (e.g. 'P')
    date: string;
    session: SessionType;
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
    session,
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
    const { appUser } = useAuth();

    const COMMON_VIOLATIONS = [
        "Đồng phục", "Điện thoại", "Chạy giỡn", "Ăn quà vặt", "Nói chuyện riêng", "Không thuộc bài"
    ];
    
    // Thêm danh sách các tiết cho phép Trễ
    const LATE_PERIODS = ["T1", "T2", "T3", "T4", "T5"];

    useEffect(() => {
        if (open && classId) {
            setLoading(true);
            getClassAttendanceDetails(classId, date, session)
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
    }, [open, classId, date, session]);

    const handleToggle = (studentCode: string) => {
        triggerHapticFeedback();
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
            const marks: { studentId: string; studentName: string; status: AttendanceStatusV3; note?: string }[] = [];

            Object.entries(localStatusMap).forEach(([code, status]) => {
                let v3Status: AttendanceStatusV3 | '' = '';
                if (status === 'P') v3Status = 'excused';
                else if (status === 'K') v3Status = 'absent';
                else if (status === 'T') v3Status = 'late';
                else if (status === 'VP') v3Status = 'violation';
                else if (status === 'KH') v3Status = 'praise';

                if (v3Status !== '') {
                    marks.push({
                        studentId: code,
                        studentName: students.find(s => s.student.code === code)?.student.fullName || code,
                        status: v3Status as AttendanceStatusV3,
                        note: localNotesMap[code] || ''
                    });
                }
            });

            if (!appUser) return;

            const allStudentIds = students.map(s => s.student.code);

            try {
                await batchMarkAttendance(appUser, {
                    classId,
                    session,
                    period: null,
                    marks
                }, allStudentIds, new Date(date));

                onSaved();
                onOpenChange(false);
            } catch (error: any) {
                alert(error.message || 'Lỗi lưu điểm danh');
            }
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
            <div className="flex flex-col h-[75vh] sm:h-[70vh]">
                <div className="flex gap-2 mb-4 shrink-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm học sinh..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all bg-gray-50/50"
                        />
                    </div>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-2 text-sm font-medium text-gray-600 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    />
                </div>

                <div className="flex-1 overflow-y-auto px-1 pb-4">
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
                                                    {targetStatus === 'VP' && COMMON_VIOLATIONS.map(v => (
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
                                                    {targetStatus === 'T' && LATE_PERIODS.map(p => {
                                                        const currentNote = localNotesMap[item.student.code] || '';
                                                        // Cho phép chọn nhiều Tiết (VD: "Trễ T1, T2")
                                                        const isSelected = currentNote.includes(p);
                                                        
                                                        const togglePeriod = (e: React.MouseEvent) => {
                                                            e.stopPropagation();
                                                            let newNote = '';
                                                            if (isSelected) {
                                                                // Xoá tiết khỏi chuỗi Note (VD: "Trễ T1, T2" -> "Trễ T2")
                                                                newNote = currentNote.replace(new RegExp(`(Trễ )?${p}(, )?`), '').trim();
                                                                // Clean up comma at start/end
                                                                newNote = newNote.replace(/^, /, '').replace(/,$/, '').trim();
                                                            } else {
                                                                // Thêm tiết vào chuỗi note mới
                                                                const base = currentNote.replace(/^Trễ /, '');
                                                                const parts = base ? base.split(', ').filter(Boolean) : [];
                                                                parts.push(p);
                                                                // Sort to keep order "T1", "T2" 
                                                                parts.sort();
                                                                newNote = `Trễ ${parts.join(', ')}`;
                                                            }
                                                            handleNoteChange(item.student.code, newNote);
                                                        };
                                                        
                                                        return (
                                                            <button
                                                                key={p}
                                                                onClick={togglePeriod}
                                                                className={`text-[10px] px-2 py-1 rounded border transition-colors ${isSelected
                                                                    ? 'bg-blue-100 text-blue-700 border-blue-200 font-bold'
                                                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                                                    }`}
                                                            >
                                                                {p}
                                                            </button>
                                                        );
                                                    })}
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

                <div className="pt-4 pb-20 sm:pb-4 border-t flex items-center justify-between bg-white shrink-0 shadow-[0_-15px_15px_-15px_rgba(0,0,0,0.1)] z-20 sticky bottom-0">
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
