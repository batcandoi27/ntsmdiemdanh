'use client';

import { useState, useEffect, useTransition } from 'react';
import { Student, AttendanceStatus, Class, Column } from '@/types/models';
import { batchMarkAttendance, getClassAttendance } from '@/services/attendance-v3-service';
import { saveDailyRecord, getDailyRecords, deleteRecord } from '@/services/record-service';
import { AttendanceStatusV3 } from '@/types/attendance-v3';
import { useAuth } from '@/context/auth-context';
import { useLoading } from '@/context/loading-context';
import { getColumnsByFrequency } from '@/services/column-service';
import { getClassAndStudents } from '@/app/actions/common';
import { useAppSettings } from '@/hooks/use-settings';
import { getEffectiveStatus, getClassSize } from '@/services/student-status-service';
import { Loader2, Calendar, Save, CheckCircle, AlertCircle, Clock, Ban, HelpCircle, UserX, X, ChevronDown, MessageSquare, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useSwipeable } from 'react-swipeable';

const triggerHapticFeedback = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
            navigator.vibrate(50); // Light vibration
        } catch (e) { }
    }
};

import { SessionType } from '@/types/timetable';

// --- Subcomponents for list items ---
const StatusBtn = ({ label, sub, color, active, onClick, compact = false }: { label: string, sub?: string, color: 'danger' | 'warning' | 'info' | 'purple' | 'gray' | 'orange', active: boolean, onClick: () => void, compact?: boolean }) => {
    const colorStyles = {
        danger: active ? 'bg-red-500 text-white border-red-600 shadow-md' : 'bg-white text-red-600 border-red-200 hover:bg-red-50',
        warning: active ? 'bg-yellow-500 text-white border-yellow-600 shadow-md' : 'bg-white text-yellow-600 border-yellow-200 hover:bg-yellow-50',
        info: active ? 'bg-blue-500 text-white border-blue-600 shadow-md' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50',
        purple: active ? 'bg-purple-500 text-white border-purple-600 shadow-md' : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50',
        gray: active ? 'bg-gray-500 text-white border-gray-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
        orange: active ? 'bg-orange-500 text-white border-orange-600 shadow-md' : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50',
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center rounded-lg border font-bold transition-all active:scale-95",
                colorStyles[color],
                compact ? "w-10 h-10" : "flex-1 py-1.5 min-h-[44px]"
            )}
        >
            <span className={cn(compact ? "text-[11px]" : "text-sm", "leading-none")}>{label}</span>
            <span className={cn(compact ? "text-[8px] mt-0.5" : "text-[10px] mt-1", "font-medium opacity-80 leading-none")}>{sub}</span>
        </button>
    );
};

interface SwipeableStudentRowProps {
    hs: Student;
    status: string;
    violationNote?: string;
    isLeave: boolean;
    settings: any;
    customColumns: Column[];
    customRecords: Record<string, Record<string, boolean>>;
    latePeriods?: number[];
    isSelected?: boolean;
    onToggleSelect?: () => void;
    handleStatusChange: (code: string, st: AttendanceStatus) => void;
    handleCustomChange: (code: string, colId: string, checked: boolean) => void;
    handlePeriodToggle: (code: string, periodNumber: number) => void;
    onOpenViolation: () => void;
    onOpenNote: () => void;
}

function SwipeableStudentRow({
    hs, status, violationNote, isLeave, settings, customColumns, customRecords, latePeriods,
    isSelected, onToggleSelect,
    handleStatusChange, handleCustomChange, handlePeriodToggle, onOpenViolation, onOpenNote
}: SwipeableStudentRowProps) {
    const [swipeOffset, setSwipeOffset] = useState(0);

    const handlers = useSwipeable({
        onSwiping: (e) => {
            if (isLeave) return;
            if (e.dir === 'Left') {
                setSwipeOffset(Math.max(e.deltaX, -100));
            } else if (e.dir === 'Right') {
                if (swipeOffset < 0) {
                    setSwipeOffset(Math.min(0, swipeOffset + e.deltaX));
                }
            }
        },
        onSwiped: (e) => {
            if (isLeave) return;
            if (e.dir === 'Left' && e.velocity > 0.5 || swipeOffset < -50) {
                setSwipeOffset(-100);
            } else {
                setSwipeOffset(0);
            }
        },
        trackMouse: true,
        preventScrollOnSwipe: true,
    });

    return (
        <div className="relative overflow-hidden rounded-xl mb-3">
            {/* Background Actions Layer */}
            <div className="absolute inset-y-0 right-0 w-[100px] bg-gray-100 flex items-center justify-end px-2 space-x-1 border border-l-0 border-gray-200 rounded-r-xl">
                <button onClick={() => { setSwipeOffset(0); onOpenNote(); triggerHapticFeedback(); }} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200" title="Ghi chú">
                    <MessageSquare size={18} />
                </button>
                <button onClick={() => { setSwipeOffset(0); onOpenViolation(); triggerHapticFeedback(); }} className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200" title="Đánh dấu VP">
                    <Edit3 size={18} />
                </button>
            </div>

            {/* Foreground Content Layer */}
            <div
                {...handlers}
                className={cn(
                    "bg-white p-3 border transition-all relative z-10",
                    status ? "border-blue-200 ring-1 ring-blue-100 shadow-sm" : "border-gray-100",
                    isLeave ? "opacity-60 pointer-events-none filter grayscale-[30%]" : "",
                    swipeOffset < 0 ? "rounded-l-xl rounded-r-none border-r-0 shadow-[-4px_0_10px_rgba(0,0,0,0.05)]" : "rounded-xl"
                )}
                style={{ transform: `translateX(${swipeOffset}px)` }}
            >
                {isLeave && (
                    <div className="absolute inset-0 bg-gray-50/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
                        <span className="bg-gray-700 text-white px-3 py-1 rounded-md text-xs font-bold shadow-sm border border-gray-600">
                            Nghỉ phép tạm thời
                        </span>
                    </div>
                )}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="flex items-center gap-3 min-w-[180px]">
                        {/* Bulk Select Checkbox */}
                        <div 
                            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
                            className={cn(
                                "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer",
                                isSelected ? "bg-blue-600 border-blue-600 shadow-sm" : "bg-white border-gray-200"
                            )}
                        >
                            {isSelected && <CheckCircle size={14} className="text-white" />}
                        </div>
                        
                        <div>
                            <div className="font-bold text-gray-800">{hs.fullName}</div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">#{hs.order}</span>
                                {status === '' || status === 'C' ? (
                                    <span className="text-[10px] font-bold text-green-600 flex items-center gap-1"><CheckCircle size={10} /> Có mặt</span>
                                ) : status === 'VP' ? (
                                    <span className="text-[10px] font-bold text-purple-600 flex items-center gap-1"><Ban size={10} /> {violationNote || 'Vi phạm'}</span>
                                ) : (
                                    <span className="text-[10px] font-bold text-gray-500">
                                        {status === 'P' ? 'Có phép' : status === 'K' ? 'Không phép' : status === 'V' ? 'Vắng?' : 'Đi trễ'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0 items-center">
                        <div className="flex gap-1 pr-2 border-r border-gray-100">
                            {settings.visibleDefaultColumns.P && <StatusBtn label="P" sub="Phép" color="warning" active={status === 'P'} onClick={() => handleStatusChange(hs.code, 'P')} compact />}
                            {settings.visibleDefaultColumns.K && <StatusBtn label="K" sub="Không" color="danger" active={status === 'K'} onClick={() => handleStatusChange(hs.code, 'K')} compact />}
                            <StatusBtn label="V" sub="Vắng?" color="gray" active={status === 'V'} onClick={() => handleStatusChange(hs.code, 'V')} compact />
                        </div>
                        <div className="flex gap-1 pl-2 border-r border-gray-100 pr-2">
                            {settings.visibleDefaultColumns.T && <StatusBtn label="T" sub="Trễ" color="info" active={status === 'T'} onClick={() => handleStatusChange(hs.code, 'T')} compact />}
                            {settings.visibleDefaultColumns.VP && <StatusBtn label="VP" sub="Vi Phạm" color="purple" active={status === 'VP'} onClick={() => handleStatusChange(hs.code, 'VP')} compact />}
                            {settings.visibleDefaultColumns.KH && <StatusBtn label="KH" sub="Khen" color="orange" active={status === 'KH'} onClick={() => handleStatusChange(hs.code, 'KH')} compact />}
                        </div>

                        {customColumns.length > 0 && (
                            <div className="flex gap-1 pl-2">
                                {customColumns.map(col => {
                                    const isChecked = customRecords[hs.code]?.[col.id] || false;
                                    return (
                                        <button
                                            key={col.id}
                                            onClick={() => handleCustomChange(hs.code, col.id, !isChecked)}
                                            className={cn(
                                                "w-10 h-10 rounded-lg flex items-center justify-center border transition-all active:scale-95",
                                                isChecked ? "bg-indigo-100 border-indigo-500 text-indigo-700 font-bold shadow-sm" : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
                                            )}
                                            title={col.name}
                                        >
                                            <span className="text-[10px] leading-tight text-center line-clamp-2 px-0.5 pointer-events-none">
                                                {col.name.slice(0, 8)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* FIVE PERIODS ACCORDION - Hiện cho mọi trạng thái ngoại trừ 'Có mặt' hoặc đã là tiết lẻ cụ thể */}
                {status !== '' && status !== 'C' && (
                    <div className="mt-3 pt-3 border-t border-blue-50 relative animate-in slide-in-from-top-2 duration-200">
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white px-2 text-[10px] text-gray-500 font-medium whitespace-nowrap">
                            Đánh dấu tiết học <span className="text-gray-400 font-normal">({(!latePeriods || latePeriods.length === 0) ? "Mặc định: Cả buổi" : "Đã chọn một số tiết lẻ"})</span>
                        </div>
                        <div className="flex gap-2 justify-between mt-1 px-1">
                            {[1, 2, 3, 4, 5].map(p => {
                                const isSelected = latePeriods?.includes(p);
                                return (
                                    <button
                                        key={p}
                                        onClick={() => handlePeriodToggle(hs.code, p)}
                                        className={cn(
                                            "flex-1 py-1.5 rounded-md text-xs font-bold border transition-all active:scale-95",
                                            isSelected
                                                ? "bg-blue-500 border-blue-600 text-white shadow-sm"
                                                : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
                                        )}
                                    >
                                        Tiết {p}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

interface AttendanceSheetProps {
    classId: string;
    session?: SessionType;
    dateStr?: string;
    onClose?: () => void; // Optional close handler if needed
}

export function AttendanceSheet({ classId, session = 'morning', dateStr, onClose }: AttendanceSheetProps) {
    const { settings } = useAppSettings();
    const [date, setDate] = useState(dateStr || new Date().toISOString().split('T')[0]);
    const [period, setPeriod] = useState<number | null>(null);
    const [cls, setCls] = useState<Class | null>(null);
    const [students, setStudents] = useState<Student[]>([]);

    // State for Attendance
    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [notes, setNotes] = useState<Record<string, Record<number, string>>>({}); // studentCode -> period -> note (period 0 for all)
    const [latePeriods, setLatePeriods] = useState<Record<string, number[]>>({});
    const [selectedHs, setSelectedHs] = useState<Set<string>>(new Set());

    // Custom Columns
    const [customColumns, setCustomColumns] = useState<Column[]>([]);
    const [customRecords, setCustomRecords] = useState<Record<string, Record<string, boolean>>>({}); // studentCode -> colId -> checked

    const { showLoading, hideLoading } = useLoading();
    const { appUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isSaving, startTransition] = useTransition();
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Modal for Violation / Notes
    const [violationModal, setViolationModal] = useState<{ isOpen: boolean, studentCode: string | null }>({ isOpen: false, studentCode: null });
    const [violationInput, setViolationInput] = useState('');
    const [noteModal, setNoteModal] = useState<{ isOpen: boolean, studentCode: string | null }>({ isOpen: false, studentCode: null });
    const [noteInput, setNoteInput] = useState('');

    // Bottom Sheet
    const [isPeriodSheetOpen, setIsPeriodSheetOpen] = useState(false);

    const COMMON_VIOLATIONS = [
        "Đồng phục", "Điện thoại", "Chạy giỡn", "Ăn quà vặt", "Nói chuyện riêng", "Không thuộc bài"
    ];

    // Load Data
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                // 1. Get Class & Students
                const { cls: c, students: s } = await getClassAndStudents(classId);
                const activeStudents = s.filter(student => {
                    const status = getEffectiveStatus(student);
                    return status !== 'dropped_out' && status !== 'suspended';
                });

                setCls(c);
                setStudents(activeStudents);

                // 3. Get Custom Columns (Daily)
                const cols = await getColumnsByFrequency(classId, 'daily');
                setCustomColumns(cols);

                // 4. Get Custom Records
                const recordsMap: Record<string, Record<string, boolean>> = {};

                // Initialize map
                s.forEach(student => {
                    recordsMap[student.code] = {};
                });

                await Promise.all(cols.map(async (col) => {
                    const recs = await getDailyRecords(col.id, date);
                    recs.forEach(r => {
                        if (recordsMap[r.studentCode]) {
                            recordsMap[r.studentCode][col.id] = true;
                        }
                    });
                }));
                setCustomRecords(recordsMap);

                // 2. Get Existing Attendance (V3 API)
                const allRecords = await getClassAttendance(classId, date, session);
                const records = allRecords.filter(r => r.period === period);
                const attMap: Record<string, AttendanceStatus> = {};
                const noteMap: Record<string, Record<number, string>> = {};
                const lateMap: Record<string, number[]> = {};

                records.forEach(r => {
                    let uiStatus = '';
                    if (r.status === 'excused') uiStatus = 'P';
                    else if (r.status === 'absent') uiStatus = 'K';
                    else if (r.status === 'late') uiStatus = 'T';
                    
                    if (uiStatus) {
                        attMap[r.studentId] = uiStatus as AttendanceStatus;
                    } else if (r.violation) {
                        attMap[r.studentId] = 'VP';
                    } else if ((r as any).praise) {
                        attMap[r.studentId] = 'KH';
                    }

                    if (attMap[r.studentId]) {
                        if (!noteMap[r.studentId]) noteMap[r.studentId] = {};
                        const pKey = r.period === null ? 0 : r.period;
                        
                        if (r.note) noteMap[r.studentId][pKey] = r.note;
                        if (r.violation && r.violationNote) noteMap[r.studentId][pKey] = r.violationNote;
                        
                        if (attMap[r.studentId] === 'T' && r.missedPeriods) {
                            lateMap[r.studentId] = r.missedPeriods;
                        }
                    }
                });

                setAttendance(attMap);
                setNotes(noteMap);
                setLatePeriods(lateMap);
            } catch (e) {
                console.error(e);
                setMsg({ type: 'error', text: 'Lỗi tải dữ liệu.' });
            } finally {
                setLoading(false);
            }
        };

        if (classId) init();
    }, [classId, date, session, period]);

    const handleNoteSave = () => {
        triggerHapticFeedback();
        const code = noteModal.studentCode;
        if (!code) return;

        setNotes(prev => {
            const studentNotes = { ...(prev[code] || {}) };
            const selected = latePeriods[code] || [0];
            
            if (!noteInput.trim()) {
                selected.forEach(p => delete studentNotes[p]);
            } else {
                selected.forEach(p => studentNotes[p] = noteInput.trim());
            }

            if (Object.keys(studentNotes).length === 0) {
                const newState = { ...prev };
                delete newState[code];
                return newState;
            }
            return { ...prev, [code]: studentNotes };
        });
        setNoteModal({ isOpen: false, studentCode: null });
    };

    const handleStatusChange = (studentCode: string, status: AttendanceStatus) => {
        triggerHapticFeedback();

        if (status === 'VP') {
            const studentNotes = notes[studentCode] || {};
            const selected = latePeriods[studentCode] || [0];
            const existingNote = selected.map(p => studentNotes[p]).find(n => !!n) || '';
            setViolationInput(existingNote);
            setViolationModal({ isOpen: true, studentCode });
        } else {
            const newAtt = attendance[studentCode] === status ? '' : status;
            
            setAttendance(prev => ({
                ...prev,
                [studentCode]: newAtt
            }));

            if (!newAtt || newAtt !== 'T') {
                setLatePeriods(prev => {
                    const newState = { ...prev };
                    delete newState[studentCode];
                    return newState;
                });
            }
            
            if (attendance[studentCode] === 'VP' || !newAtt) {
                setNotes(prev => {
                    const newState = { ...prev };
                    delete newState[studentCode];
                    return newState;
                });
            }
        }
    };

    const handleBulkStatusChange = (status: AttendanceStatus) => {
        triggerHapticFeedback();
        if (selectedHs.size === 0) return;

        if (status === 'VP') {
            setViolationInput("");
            setViolationModal({ isOpen: true, studentCode: "BULK_SELECTION" });
            return;
        }

        const hsArray = Array.from(selectedHs);
        const newAttendance = { ...attendance };
        const newLatePeriods = { ...latePeriods };
        const newNotes = { ...notes };

        hsArray.forEach(code => {
            newAttendance[code] = status;
            // Clear specific periods if changing to a session-wide status (P, K)
            if (status === 'P' || status === 'K') {
                delete newLatePeriods[code];
            }
            // If clearing, delete notes
            if (!status) delete newNotes[code];
        });

        setAttendance(newAttendance);
        setLatePeriods(newLatePeriods);
        setNotes(newNotes);
        setSelectedHs(new Set());
        setMsg({ type: 'success', text: `Đã áp dụng ${status} cho ${hsArray.length} học sinh.` });
        setTimeout(() => setMsg(null), 2000);
    };

    const confirmViolation = () => {
        if (violationModal.studentCode) {
            const code = violationModal.studentCode;
            const codesToApply = code === "BULK_SELECTION" ? Array.from(selectedHs) : [code];

            setAttendance(prev => {
                const next = { ...prev };
                codesToApply.forEach(c => next[c] = 'VP');
                return next;
            });

            setNotes(prev => {
                const next = { ...prev };
                codesToApply.forEach(c => {
                    const studentNotes = { ...(next[c] || {}) };
                    const selected = latePeriods[c] || [0];
                    if (violationInput.trim()) {
                        selected.forEach(p => studentNotes[p] = violationInput.trim());
                    } else {
                        selected.forEach(p => delete studentNotes[p]);
                    }
                    next[c] = studentNotes;
                });
                return next;
            });
            
            if (code === "BULK_SELECTION") setSelectedHs(new Set());
        }
        setViolationModal({ isOpen: false, studentCode: null });
    };

    const handleCustomChange = (studentCode: string, colId: string, checked: boolean) => {
        triggerHapticFeedback();
        setCustomRecords(prev => ({
            ...prev,
            [studentCode]: {
                ...prev[studentCode],
                [colId]: checked
            }
        }));
    };

    const handlePeriodToggle = (studentCode: string, periodNumber: number) => {
        triggerHapticFeedback();
        setLatePeriods(prev => {
            const current = prev[studentCode] || [];
            let next;
            if (current.includes(periodNumber)) {
                next = current.filter(p => p !== periodNumber);
            } else {
                next = [...current, periodNumber].sort();
            }
            
            // Nếu không còn tiết lẻ nào -> Coi như không điểm danh tiết lẻ
            if (next.length === 0) {
                const newState = { ...prev };
                delete newState[studentCode];
                return newState;
            }

            return { ...prev, [studentCode]: next };
        });
    };

    const handleSave = () => {
        triggerHapticFeedback();
        showLoading('Đang lưu dữ liệu điểm danh...');
        startTransition(async () => {
            try {
                if (!appUser) {
                    setMsg({ type: 'error', text: 'Vui lòng đăng nhập lại để lưu điểm danh.' });
                    hideLoading();
                    return;
                }

                // Generate marks payload for V3 API
                const marks: any[] = [];
                Object.entries(attendance).forEach(([code, status]) => {
                    let v3Status: AttendanceStatusV3 | '' = '';
                    let violation = false;
                    let reward = false;

                    if (status === 'P') v3Status = 'excused';
                    else if (status === 'K' || status === 'V') v3Status = 'absent';
                    else if (status === 'T') v3Status = 'late';
                    else if (status === 'VP') {
                        v3Status = 'violation' as any; // Legacy compatibility
                        violation = true;
                    } else if (status === 'KH') {
                        v3Status = 'praise' as any; // Legacy compatibility
                        reward = true;
                    }

                    if (v3Status !== '' || violation || reward) {
                        const studentNotes = notes[code] || {};
                        const selectedPeriods = latePeriods[code] || [];
                        
                        // Group periods by their note to send minimal marks objects
                        const periodsByNote: Record<string, number[]> = {};
                        
                        // 1. Periods with specific notes
                        Object.entries(studentNotes).forEach(([p, n]) => {
                            const pNum = Number(p);
                            if (pNum === 0 || selectedPeriods.includes(pNum)) {
                                if (!periodsByNote[n]) periodsByNote[n] = [];
                                if (pNum > 0) periodsByNote[n].push(pNum);
                            }
                        });

                        // 2. Selected periods with NO note
                        const noteLessPeriods = selectedPeriods.filter(p => !studentNotes[p]);
                        if (noteLessPeriods.length > 0) {
                            if (!periodsByNote[""]) periodsByNote[""] = [];
                            periodsByNote[""].push(...noteLessPeriods);
                        }

                        // 3. Fallback: If nothing in periodsByNote but status is active (all session)
                        if (Object.keys(periodsByNote).length === 0) {
                            const mainNote = studentNotes[0] || "";
                            periodsByNote[mainNote] = []; // Empty array means all/period null
                        }

                        // Create mark for each note group
                        Object.entries(periodsByNote).forEach(([noteText, pList]) => {
                            marks.push({
                                studentId: code,
                                studentName: students.find(s => s.code === code)?.fullName || code,
                                status: v3Status as AttendanceStatusV3,
                                note: noteText,
                                missedPeriods: pList.length > 0 ? pList : undefined,
                                violation,
                                violationNote: violation ? noteText : undefined,
                                reward,
                                rewardNote: reward ? noteText : undefined
                            });
                        });
                    }
                });

                const allStudentIds = students.map(s => s.code);
                let coreSuccess = true;

                try {
                    await batchMarkAttendance(appUser, {
                        classId,
                        session,
                        period,
                        marks
                    }, allStudentIds, new Date(date));
                } catch (err: any) {
                    coreSuccess = false;
                    setMsg({ type: 'error', text: err.message || 'Lỗi lưu điểm danh cơ bản.' });
                }

                // Save custom columns
                const customUpdates: Promise<void>[] = [];
                for (const student of students) {
                    for (const col of customColumns) {
                        const isChecked = customRecords[student.code]?.[col.id] || false;
                        if (isChecked) {
                            customUpdates.push(saveDailyRecord({
                                classId,
                                columnId: col.id,
                                studentCode: student.code,
                                date: date,
                                selectedSuggestions: ['True'],
                                note: ''
                            }).then());
                        } else {
                            const recId = `${col.id}_${date}_${student.code}`;
                            customUpdates.push(deleteRecord(col.id, recId));
                        }
                    }
                }

                await Promise.all(customUpdates);

                if (coreSuccess) {
                    setMsg({ type: 'success', text: 'Đã lưu điểm danh thành công!' });
                    setTimeout(() => setMsg(null), 3000);
                }
            } catch (err) {
                console.error(err);
                setMsg({ type: 'error', text: 'Có lỗi không xác định xảy ra.' });
            } finally {
                hideLoading();
            }
        });
    };

    // Stats
    const stats = {
        P: Object.values(attendance).filter(s => s === 'P').length,
        K: Object.values(attendance).filter(s => s === 'K').length,
        V: Object.values(attendance).filter(s => s === 'V').length,
        T: Object.values(attendance).filter(s => s === 'T').length,
        VP: Object.values(attendance).filter(s => s === 'VP').length,
    };
    // Calculate Present (C)
    // Updated Logic: Present include T (Late) and VP (Violation), unless they are explicitly marked as Absent (P, K, V).
    // So Present = Students - (P + K + V)
    const countPresent = students.length - (stats.P + stats.K + stats.V);


    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    }

    if (!cls) return <div>Không tìm thấy lớp</div>;

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden animate-in slide-in-from-top-4 duration-300">
            {/* Header */}
            <div className="bg-blue-50/50 p-4 border-b border-blue-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-blue-900">
                        ĐIỂM DANH LỚP {cls.name}
                    </h3>
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                        Sĩ số: {countPresent}/{cls ? getClassSize(cls) : students.length} HS
                    </span>
                </div>

                <div className="flex items-center gap-2 relative">
                    {/* Period Selector Button (Mobile Friendly) */}
                    <button
                        onClick={() => setIsPeriodSheetOpen(true)}
                        className="py-2 px-3 border border-blue-200 rounded-lg text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none bg-white md:hidden flex items-center gap-1.5 active:scale-95 transition-transform"
                    >
                        <Clock size={16} className="text-blue-500" />
                        <span>{period ? `Tiết ${period}` : 'Cả buổi'}</span>
                        <ChevronDown size={14} className="text-gray-400" />
                    </button>

                    {/* Desktop Select */}
                    <select
                        value={period || ''}
                        onChange={(e) => { triggerHapticFeedback(); setPeriod(e.target.value ? Number(e.target.value) : null); }}
                        className="hidden md:block py-2 pl-3 pr-8 border border-blue-200 rounded-lg text-sm font-bold text-blue-700 hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white cursor-pointer transition-colors"
                    >
                        <option value="">Cả buổi</option>
                        <option value="1">Tiết 1</option>
                        <option value="2">Tiết 2</option>
                        <option value="3">Tiết 3</option>
                        <option value="4">Tiết 4</option>
                        <option value="5">Tiết 5</option>
                    </select>

                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="pl-9 pr-3 py-2 border border-blue-200 rounded-lg text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {msg && (
                <div className={cn(
                    "mx-4 mt-4 p-3 rounded-lg flex items-center gap-2 text-sm font-medium",
                    msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                )}>
                    {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {msg.text}
                </div>
            )}

            {/* Student List */}
            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 text-center text-xs text-indigo-700 mb-2 font-medium flex items-center justify-between px-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle size={14} />
                        Mặc định: <span className="font-bold">CÓ MẶT (C)</span>
                    </div>
                    <button 
                        onClick={() => {
                            if (selectedHs.size === students.length) setSelectedHs(new Set());
                            else setSelectedHs(new Set(students.map(s => s.code)));
                        }}
                        className="text-[10px] bg-white px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-100 transition-colors uppercase font-bold"
                    >
                        {selectedHs.size === students.length ? "Bỏ chọn tất cả" : "Chọn tất cả HS"}
                    </button>
                </div>

                {students.map((hs) => {
                    const status = attendance[hs.code] || '';
                    const studentNotes = notes[hs.code] || {};
                    // Display note for currently selected periods, or first available
                    const selected = latePeriods[hs.code] || [0];
                    const violationNote = selected.map(p => studentNotes[p]).find(n => !!n) || Object.values(studentNotes)[0];
                    const isLeave = getEffectiveStatus(hs) === 'temporary_leave';

                    return (
                        <SwipeableStudentRow
                            key={hs.code}
                            hs={hs}
                            status={status}
                            violationNote={violationNote}
                            isLeave={isLeave}
                            settings={settings}
                            customColumns={customColumns}
                            customRecords={customRecords}
                            latePeriods={latePeriods[hs.code]}
                            isSelected={selectedHs.has(hs.code)}
                            onToggleSelect={() => {
                                triggerHapticFeedback();
                                setSelectedHs(prev => {
                                    const next = new Set(prev);
                                    if (next.has(hs.code)) next.delete(hs.code);
                                    else next.add(hs.code);
                                    return next;
                                });
                            }}
                            handleStatusChange={handleStatusChange}
                            handleCustomChange={handleCustomChange}
                            handlePeriodToggle={handlePeriodToggle}
                            onOpenViolation={() => {
                                setViolationInput(""); // Clear or fetch based on selection
                                const currentNotes = notes[hs.code] || {};
                                const selected = latePeriods[hs.code] || [0];
                                const existing = selected.map(p => currentNotes[p]).find(n => !!n) || "";
                                setViolationInput(existing);
                                setViolationModal({ isOpen: true, studentCode: hs.code });
                            }}
                            onOpenNote={() => {
                                const currentNotes = notes[hs.code] || {};
                                const selected = latePeriods[hs.code] || [0];
                                const existing = selected.map(p => currentNotes[p]).find(n => !!n) || "";
                                setNoteInput(existing);
                                setNoteModal({ isOpen: true, studentCode: hs.code });
                            }}
                        />
                    );
                })}
            </div>

            {/* Floating Bulk Action Bar */}
            {selectedHs.size > 0 && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in slide-in-from-bottom-10 duration-300">
                    <div className="bg-white/90 backdrop-blur-md border border-blue-200 shadow-2xl rounded-2xl p-2 flex items-center gap-2 ring-4 ring-blue-500/10">
                        <div className="px-3 border-r border-gray-100 mr-1 flex flex-col items-center">
                            <span className="text-[10px] font-bold text-blue-600 uppercase">Đã chọn</span>
                            <span className="text-sm font-black text-gray-800 leading-none">{selectedHs.size} HS</span>
                        </div>
                        <div className="flex gap-1.5">
                            <button onClick={() => handleBulkStatusChange('P')} className="w-10 h-10 bg-yellow-500 text-white rounded-xl shadow-lg shadow-yellow-500/30 flex items-center justify-center font-bold text-xs active:scale-90 transition-transform">P</button>
                            <button onClick={() => handleBulkStatusChange('K')} className="w-10 h-10 bg-red-500 text-white rounded-xl shadow-lg shadow-red-500/30 flex items-center justify-center font-bold text-xs active:scale-90 transition-transform">K</button>
                            <button onClick={() => handleBulkStatusChange('T')} className="w-10 h-10 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center font-bold text-xs active:scale-90 transition-transform">T</button>
                            <button onClick={() => handleBulkStatusChange('VP')} className="w-10 h-10 bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-500/30 flex items-center justify-center font-bold text-xs active:scale-90 transition-transform">VP</button>
                            <button onClick={() => setSelectedHs(new Set())} className="w-10 h-10 bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center font-bold text-xs active:scale-90 transition-transform ml-1">
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Stats & Save */}
            <div className="bg-gray-50 border-t border-gray-200 p-4">
                <div className="flex flex-wrap justify-center gap-4 text-xs font-bold text-gray-500 mb-4 uppercase">
                    <div className="flex flex-col items-center"><span className="text-xl text-green-600 leading-none">{countPresent}</span>Hiện diện</div>
                    <div className="w-px bg-gray-300 h-8"></div>
                    <div className="flex flex-col items-center"><span className="text-xl text-yellow-600 leading-none">{stats.P}</span>Phép</div>
                    <div className="flex flex-col items-center"><span className="text-xl text-red-600 leading-none">{stats.K}</span>Không</div>
                    <div className="flex flex-col items-center"><span className="text-xl text-gray-400 leading-none">{stats.V}</span>Vắng?</div>
                    <div className="w-px bg-gray-300 h-8"></div>
                    <div className="flex flex-col items-center"><span className="text-xl text-blue-600 leading-none">{stats.T}</span>Trễ</div>
                    <div className="flex flex-col items-center"><span className="text-xl text-purple-600 leading-none">{stats.VP}</span>Vi phạm</div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-70 transition-all active:scale-95"
                >
                    {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    LƯU ĐIỂM DANH
                </button>
            </div>

            {/* Violation Modal */}
            <Modal
                isOpen={violationModal.isOpen}
                onClose={() => setViolationModal({ isOpen: false, studentCode: null })}
                title="Ghi Nhận Vi Phạm"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        {COMMON_VIOLATIONS.map(v => (
                            <button
                                key={v}
                                onClick={() => setViolationInput(v)}
                                className={cn(
                                    "py-2 px-3 rounded-lg text-sm font-medium border transition-colors",
                                    violationInput === v ? "bg-purple-100 border-purple-300 text-purple-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                    <div>
                        <input
                            type="text"
                            placeholder="Nhập lỗi khác..."
                            value={violationInput}
                            onChange={(e) => setViolationInput(e.target.value)}
                            className={cn(
                                "w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none font-bold",
                                violationInput && !COMMON_VIOLATIONS.includes(violationInput) ? "text-red-600 border-red-300 bg-red-50" : "text-gray-800 border-gray-300"
                            )}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setViolationModal({ isOpen: false, studentCode: null })} className="px-3 py-1.5 text-gray-500 text-sm hover:bg-gray-100 rounded">Hủy</button>
                        <button onClick={confirmViolation} className="px-3 py-1.5 bg-purple-600 text-white font-bold text-sm rounded shadow-sm">Xác Nhận</button>
                    </div>
                </div>
            </Modal>
            {/* Note Modal */}
            <Modal
                isOpen={noteModal.isOpen}
                onClose={() => setNoteModal({ isOpen: false, studentCode: null })}
                title="Ghi chú học sinh"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">Thêm ghi chú đặc biệt cho HS này (miễn học, trực nhật, v.v.)</p>
                    <input
                        type="text"
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Nhập ghi chú..."
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleNoteSave()}
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setNoteModal({ isOpen: false, studentCode: null })} className="px-4 py-2 text-sm text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Huỷ</button>
                        <button onClick={handleNoteSave} className="px-4 py-2 text-sm text-white font-bold bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm">Lưu Ghi Chú</button>
                    </div>
                </div>
            </Modal>

            {/* Period Selection Bottom Sheet */}
            <BottomSheet
                isOpen={isPeriodSheetOpen}
                onClose={() => setIsPeriodSheetOpen(false)}
                title="Chọn tiết điểm danh"
            >
                <div className="space-y-2">
                    <button
                        onClick={() => { triggerHapticFeedback(); setPeriod(null); setIsPeriodSheetOpen(false); }}
                        className={cn(
                            "w-full text-left px-4 py-4 rounded-xl font-bold text-gray-800 transition-colors border",
                            period === null ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-100 hover:bg-gray-50 text-gray-700"
                        )}
                    >
                        Trọn Cả Buổi
                    </button>
                    {[1, 2, 3, 4, 5].map(p => (
                        <button
                            key={p}
                            onClick={() => { triggerHapticFeedback(); setPeriod(p); setIsPeriodSheetOpen(false); }}
                            className={cn(
                                "w-full text-left px-4 py-3 rounded-xl font-medium transition-colors border",
                                period === p ? "bg-blue-50 border-blue-200 text-blue-700 font-bold" : "bg-white border-gray-100 hover:bg-gray-50 text-gray-700"
                            )}
                        >
                            Tiết {p}
                        </button>
                    ))}
                </div>
            </BottomSheet>
        </div >
    );
}
