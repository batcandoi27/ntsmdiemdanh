'use client';

import { useState, useEffect, useTransition } from 'react';
import { Modal } from '@/components/ui/modal';
import { StudentAttendanceDetail, getClassAttendanceDetails } from '@/app/actions/quick-attendance';
import { batchMarkAttendance } from '@/services/attendance-v3-service';
import { AttendanceStatusV3 } from '@/types/attendance-v3';
import { useAuth } from '@/context/auth-context';
import { AttendanceStatus } from '@/types/models';

import { SessionType } from '@/types/timetable';
import { Search, Loader2, Save, X, CheckCircle2, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    // Map studentCode -> main status ('P', 'K', 'T', 'V', or '' for present)
    const [localStatusMap, setLocalStatusMap] = useState<Record<string, AttendanceStatus>>({});
    // Map studentCode -> boolean for violation/praise
    const [localViolationMap, setLocalViolationMap] = useState<Record<string, boolean>>({});
    const [localRewardMap, setLocalRewardMap] = useState<Record<string, boolean>>({});
    const [localRewardPeriodsMap, setLocalRewardPeriodsMap] = useState<Record<string, number[]>>({});
    
    // Map studentCode -> number[]: Tiết vắng/phép/trễ và Tiết vi phạm
    const [localMissedPeriodsMap, setLocalMissedPeriodsMap] = useState<Record<string, number[]>>({});
    const [localViolationPeriodsMap, setLocalViolationPeriodsMap] = useState<Record<string, number[]>>({});

    // Local Notes Map: studentCode -> { periodNumber -> note }
    const [localNotesMap, setLocalNotesMap] = useState<Record<string, Record<number, string>>>({});
    const [localViolationNotesMap, setLocalViolationNotesMap] = useState<Record<string, Record<number, string>>>({});
    const [localRewardNotesMap, setLocalRewardNotesMap] = useState<Record<string, Record<number, string>>>({});

    const [selectedHs, setSelectedHs] = useState<Set<string>>(new Set());
    const [isMultiMode, setIsMultiMode] = useState(false);
    const [showBulkSuggestions, setShowBulkSuggestions] = useState(false);

    const [loading, setLoading] = useState(false);
    const [isSaving, startSaving] = useTransition();
    const [search, setSearch] = useState('');
    const { appUser } = useAuth();

    const NOTE_SUGGESTIONS = {
        P: [
            { group: "Sức khỏe & Gia đình", items: ["Có tang", "Bệnh", "Bệnh nằm viện", "Tai nạn", "Y tế"], color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
            { group: "Hoạt động trường", items: ["Thi HS giỏi", "Thi năng khiếu", "Hoạt động trường", "Hoạt động Đội", "Thi đấu thể thao"], color: "bg-blue-50 text-blue-700 border-blue-200" }
        ],
        K: [
            { group: "Bổ sung", items: ["Có bổ sung Phép"], color: "bg-red-50 text-red-700 border-red-200" }
        ],
        VP: [
            { group: "Tác phong", items: ["Sai đồng phục", "Không phù hiệu", "Áo ngoài quần", "Đem điện thoại", "Đeo Ba lô", "Ko Khăn quàng", "Đi dép", "Tóc sai QĐ"], color: "bg-purple-100 text-purple-700 border-purple-200" },
            { group: "Trong giờ học", items: ["Nói chuyện", "Mất trật tự", "Không làm bài", "Không mang sách", "Không mang vở", "Không học bài", "Không trực nhật", "Không nộp bài", "Quên dụng cụ"], color: "bg-pink-100 text-pink-700 border-pink-200" },
            { group: "Khác", items: ["Khác", "Chạy giỡn", "Nói chuyện riêng", "Không thuộc bài"], color: "bg-gray-100 text-gray-700 border-gray-200" }
        ],
        KH: [
            { group: "Học tập", items: ["Phát biểu tốt", "Bài làm tốt", "Điểm tốt", "Tiến bộ", "Thái độ", "Chăm học", "Tích cực", "Hợp tác tốt", "Gương mẫu"], color: "bg-green-100 text-green-700 border-green-200" },
            { group: "Hoạt động", items: ["Trực nhật tốt", "Giúp bạn", "Hỗ trợ lớp", "Tham gia tốt"], color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
            { group: "Đặc biệt", items: ["Gương tốt", "Xuất sắc", "Tuyên dương"], color: "bg-orange-100 text-orange-700 border-orange-200" }
        ]
    };
    
    // Thêm danh sách các tiết cho phép Trễ
    const LATE_PERIODS = ["T1", "T2", "T3", "T4", "T5"];

    const STATUS_THEME = {
        P: { bg: "bg-yellow-500", border: "border-yellow-600", text: "text-white", light: "bg-yellow-50/50", accent: "bg-yellow-600", ripple: "shadow-yellow-200" },
        K: { bg: "bg-red-500", border: "border-red-600", text: "text-white", light: "bg-red-50/50", accent: "bg-red-600", ripple: "shadow-red-200" },
        V: { bg: "bg-blue-500", border: "border-blue-600", text: "text-white", light: "bg-blue-50/50", accent: "bg-blue-600", ripple: "shadow-blue-200" },
        T: { bg: "bg-sky-500", border: "border-sky-600", text: "text-white", light: "bg-sky-50/50", accent: "bg-sky-600", ripple: "shadow-sky-200" },
        VP: { bg: "bg-purple-600", border: "border-purple-700", text: "text-white", light: "bg-purple-50/50", accent: "bg-purple-700", ripple: "shadow-purple-200" },
        KH: { bg: "bg-orange-500", border: "border-orange-600", text: "text-white", light: "bg-orange-50/50", accent: "bg-orange-600", ripple: "shadow-orange-200" },
    };
    const theme = STATUS_THEME[targetStatus as keyof typeof STATUS_THEME] || STATUS_THEME.V;

    useEffect(() => {
        if (open && classId) {
            setLoading(true);
            getClassAttendanceDetails(classId, date, session)
                .then(data => {
                    // Sắp xếp học sinh theo mã (phần số sau dấu gạch dưới)
                    const sortedData = [...data].sort((a, b) => {
                        const codeA = a.student.code || '';
                        const codeB = b.student.code || '';
                        const numA = parseInt(codeA.split('_').pop() || '0');
                        const numB = parseInt(codeB.split('_').pop() || '0');
                        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                        return codeA.localeCompare(codeB, undefined, { numeric: true });
                    });

                    setStudents(sortedData);
                    // Initialize local maps
                    const statusMap: Record<string, AttendanceStatus> = {};
                    const violationMap: Record<string, boolean> = {};
                    const rewardMap: Record<string, boolean> = {};
                    const missedPeriodsMap: Record<string, number[]> = {};
                    const violationPeriodsMap: Record<string, number[]> = {};
                    const rewardPeriodsMap: Record<string, number[]> = {};
                    const noteMap: Record<string, Record<number, string>> = {};
                    const vNoteMap: Record<string, Record<number, string>> = {};
                    const rNoteMap: Record<string, Record<number, string>> = {};

                    sortedData.forEach(s => {
                        const code = s.student.code;
                        statusMap[code] = s.status || '';
                        violationMap[code] = !!s.violation;
                        rewardMap[code] = !!s.reward;
                        
                        noteMap[code] = s.statusNotes || (s.note ? { 0: s.note } : {});
                        vNoteMap[code] = s.violationNotes || (s.violationNote ? { 0: s.violationNote } : {});
                        rNoteMap[code] = s.rewardNotes || (s.rewardNote ? { 0: s.rewardNote } : {});

                        if (s.violation) {
                            violationPeriodsMap[code] = s.violationPeriods || [1, 2, 3, 4, 5];
                        }
                        
                        if (s.reward) {
                            // @ts-ignore
                            rewardPeriodsMap[code] = s.rewardPeriods || [];
                        }
                        
                        if (s.missedPeriods) {
                            missedPeriodsMap[code] = s.missedPeriods;
                        } else if (['P', 'K', 'T', 'V'].includes(s.status)) {
                            missedPeriodsMap[code] = [];
                        }
                    });
                    setLocalStatusMap(statusMap);
                    setLocalViolationMap(violationMap);
                    setLocalRewardMap(rewardMap);
                    setLocalMissedPeriodsMap(missedPeriodsMap);
                    setLocalViolationPeriodsMap(violationPeriodsMap);
                    setLocalNotesMap(noteMap);
                    setLocalViolationNotesMap(vNoteMap);
                    setLocalRewardNotesMap(rNoteMap);
                    setLocalRewardPeriodsMap(rewardPeriodsMap);
                })
                .finally(() => setLoading(false));
        }
    }, [open, classId, date, session]);

    const handleToggle = (studentCode: string) => {
        triggerHapticFeedback();
        
        if (targetStatus === 'VP') {
            // Toggle Vi phạm độc lập
            setLocalViolationMap(prev => ({
                ...prev,
                [studentCode]: !prev[studentCode]
            }));
            return;
        }

        if (targetStatus === 'KH') {
            // Toggle Khen thưởng độc lập
            setLocalRewardMap(prev => {
                const newVal = !prev[studentCode];
                if (newVal && !localRewardPeriodsMap[studentCode]) {
                    setLocalRewardPeriodsMap(p => ({ ...p, [studentCode]: [] }));
                }
                return { ...prev, [studentCode]: newVal };
            });
            return;
        }

        // Toggle Chuyên cần (P, K, T, V)
        setLocalStatusMap(prev => {
            const currentStatus = prev[studentCode];
            const isTarget = currentStatus === targetStatus;
            const newStatus = isTarget ? '' as AttendanceStatus : targetStatus;
            
            // Mặc định là vắng cả buổi (mảng rỗng)
            if (newStatus && !localMissedPeriodsMap[studentCode]) {
                setLocalMissedPeriodsMap(p => ({ ...p, [studentCode]: [] }));
            }
            
            return {
                ...prev,
                [studentCode]: newStatus
            };
        });
    };

    const handleClear = (studentCode: string, e: React.MouseEvent) => {
        e.stopPropagation();
        triggerHapticFeedback();
        setLocalStatusMap(prev => ({ ...prev, [studentCode]: '' as AttendanceStatus }));
        setLocalViolationMap(prev => ({ ...prev, [studentCode]: false }));
        setLocalRewardMap(prev => ({ ...prev, [studentCode]: false }));
        setLocalMissedPeriodsMap(p => ({ ...p, [studentCode]: [] }));
        setLocalViolationPeriodsMap(p => ({ ...p, [studentCode]: [] }));
        setLocalRewardPeriodsMap(p => ({ ...p, [studentCode]: [] }));
        setLocalNotesMap(p => ({ ...p, [studentCode]: {} }));
        setLocalViolationNotesMap(p => ({ ...p, [studentCode]: {} }));
        setLocalRewardNotesMap(p => ({ ...p, [studentCode]: {} }));
        setSelectedHs(prev => {
            const next = new Set(prev);
            next.delete(studentCode);
            return next;
        });
    };

    const handleNoteChange = (studentCode: string, note: string) => {
        // Find the "current" active period to apply the note to
        const periods = targetStatus === 'VP' 
            ? (localViolationPeriodsMap[studentCode] || []) 
            : (targetStatus === 'KH' ? (localRewardPeriodsMap[studentCode] || []) : (localMissedPeriodsMap[studentCode] || []));
        
        // Use the first period in the list, or 0 if none
        const targetPeriod = periods[0] || 0;

        if (targetStatus === 'VP') {
            setLocalViolationNotesMap(prev => ({
                ...prev,
                [studentCode]: { ...(prev[studentCode] || {}), [targetPeriod]: note }
            }));
        } else if (targetStatus === 'KH') {
            setLocalRewardNotesMap(prev => ({
                ...prev,
                [studentCode]: { ...(prev[studentCode] || {}), [targetPeriod]: note }
            }));
        } else {
            setLocalNotesMap(prev => ({
                ...prev,
                [studentCode]: { ...(prev[studentCode] || {}), [targetPeriod]: note }
            }));
        }
    };

    const handleSave = () => {
        console.group("🚀 [Quick Attendance] Đang lưu Điểm danh thủ công");
        startSaving(async () => {
            const marks: any[] = [];
            // Thu thập TẤT CẢ các mã học sinh đã được thay đổi HOẶC có dữ liệu ban đầu
            // Để gửi lên server. Server sẽ dùng danh sách này để DELETE toàn bộ, rồi INSERT nếu có.
            const allCodes = Array.from(new Set([
                ...Object.keys(localStatusMap),
                ...Object.keys(localViolationMap),
                ...Object.keys(localRewardMap),
                // Lấy thêm các học sinh có điểm danh ban đầu để đảm bảo nếu bị clear thì vẫn gửi lên
                ...students.filter(s => s.status || s.violation || s.reward).map(s => s.student.code)
            ]));

            allCodes.forEach(code => {
                const status = localStatusMap[code] || '';
                const hasViolation = localViolationMap[code];
                const hasReward = localRewardMap[code];

                let v3Status: AttendanceStatusV3 = 'present';
                if (status === 'P') v3Status = 'excused';
                else if (status === 'K') v3Status = 'absent';
                else if (status === 'T') v3Status = 'late';
                else if (status === 'V') v3Status = 'absent';

                const selectedMissed = localMissedPeriodsMap[code] || [];
                const missedPeriods = (status && selectedMissed.length === 0) 
                    ? [1, 2, 3, 4, 5] 
                    : (status ? selectedMissed : []);

                // Chuyển đổi Record<number, string> sang string gộp cho API backend cũ hỗ trợ đa tầng
                // Nếu backend đã hỗ trợ mảng record thì tốt, nhưng hiện tại ta gộp để tương thích
                const formatNotes = (nMap: Record<number, string>) => {
                    const entries = Object.entries(nMap).filter(([_, v]) => v);
                    if (entries.length === 0) return "";
                    
                    // Nếu tất cả các tiết lẻ có cùng nội dung ghi chú -> Chỉ hiện nội dung đó (gọn)
                    const uniqueNotes = Array.from(new Set(entries.map(([_, v]) => v)));
                    if (uniqueNotes.length === 1 && entries.length > 1) {
                        return uniqueNotes[0];
                    }

                    return entries.map(([p, v]) => p === "0" ? v : `T${p}: ${v}`).join(", ");
                };

                marks.push({
                    studentId: code,
                    studentName: students.find(s => s.student.code === code)?.student.fullName || code,
                    status: v3Status,
                    missedPeriods,
                    note: v3Status !== 'present' ? formatNotes(localNotesMap[code] || {}) : '',
                    statusNotes: localNotesMap[code],
                    violation: hasViolation || false,
                    violationNote: formatNotes(localViolationNotesMap[code] || {}),
                    violationNotes: localViolationNotesMap[code],
                    violationPeriods: hasViolation ? (localViolationPeriodsMap[code] || []) : undefined,
                    reward: hasReward || false,
                    rewardNote: formatNotes(localRewardNotesMap[code] || {}),
                    rewardNotes: localRewardNotesMap[code],
                    // @ts-ignore
                    rewardPeriods: hasReward ? (localRewardPeriodsMap[code] || []) : undefined
                });
            });

            if (!appUser) return;

            const allStudentIds = students.map(s => s.student.code);

            try {
                console.log("-> 1. Danh sách học sinh cần cập nhật:", marks);
                await batchMarkAttendance(appUser, {
                    classId,
                    session,
                    period: null,
                    marks
                }, allStudentIds, new Date(date));

                console.log("-> 2. ✅ Lưu thành công!");
                onSaved();
                onOpenChange(false);
            } catch (error: any) {
                console.error("-> ❌ Lỗi khi lưu:", error);
                alert(error.message || 'Lỗi lưu điểm danh');
            } finally {
                console.groupEnd();
            }
        });
    };

    const filteredStudents = students.filter(s =>
        s.student.fullName.toLowerCase().includes(search.toLowerCase()) ||
        s.student.code.toLowerCase().includes(search.toLowerCase())
    );

    const targetLabel = STATUS_LABELS[targetStatus] || targetStatus;
    const targetColor = STATUS_COLORS[targetStatus] || 'text-gray-800';
    const showNoteInput = targetStatus === 'VP' || targetStatus === 'T' || targetStatus === 'K' || targetStatus === 'P' || targetStatus === 'KH';

    const allInViewSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedHs.has(s.student.code));

    const handleSelectAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (allInViewSelected) {
            setSelectedHs(new Set());
        } else {
            setSelectedHs(new Set(filteredStudents.map(s => s.student.code)));
        }
        triggerHapticFeedback();
    };

    return (
        <Modal
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title={`Điểm danh lớp ${className} - ${targetLabel}`}
        >
            <div className="flex flex-col h-[75vh] sm:h-[70vh]">
                <div className="flex gap-2 mb-2 shrink-0">
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

                <div className="flex items-center justify-between px-2 mb-4 bg-gray-50 p-2 rounded-xl border border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleSelectAll}
                            className={cn(
                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                allInViewSelected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
                            )}
                        >
                            {allInViewSelected && <CheckCircle2 className="text-white w-4 h-4" />}
                        </button>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black text-gray-800 uppercase tracking-tight">Chọn tất cả</span>
                            <span className="text-[9px] text-gray-400 font-bold italic">({filteredStudents.length} em)</span>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => {
                            const newState = !isMultiMode;
                            setIsMultiMode(newState);
                            if (!newState) setSelectedHs(new Set());
                        }}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all",
                            isMultiMode ? `${theme.bg} text-white shadow-md ${theme.ripple}` : "bg-white text-gray-500 border border-gray-200 shadow-sm"
                        )}
                    >
                        <div className={cn("w-2 h-2 rounded-full", isMultiMode ? "bg-white animate-pulse" : "bg-gray-300")} />
                        NHIỀU HS
                    </button>
                </div>

                {/* Shared Editor for Bulk Mode (Ultra Compact) */}
                {isMultiMode && selectedHs.size > 0 && (
                    <div className={cn("mb-2 rounded-xl p-1.5 shadow-lg animate-in slide-in-from-top-2 duration-200 shrink-0", theme.bg, theme.text)}>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-2 border-r border-white/20 shrink-0">
                                <span className="text-[10px] font-black uppercase text-white">{selectedHs.size} HS</span>
                                <button onClick={() => setSelectedHs(new Set())} className="text-white/70 hover:text-white transition-colors">
                                    <X size={12} />
                                </button>
                            </div>

                            <div className="flex gap-1 shrink-0">
                                {[1, 2, 3, 4, 5].map(p => {
                                    const firstCode = Array.from(selectedHs)[0];
                                    const periods = targetStatus === 'VP' ? (localViolationPeriodsMap[firstCode] || []) : (targetStatus === 'KH' ? (localRewardPeriodsMap[firstCode] || []) : (localMissedPeriodsMap[firstCode] || []));
                                    const isActive = periods.includes(p);

                                    return (
                                        <button
                                            key={p}
                                            onClick={() => {
                                                const codes = Array.from(selectedHs);
                                                const setFn = targetStatus === 'VP' ? setLocalViolationPeriodsMap : (targetStatus === 'KH' ? setLocalRewardPeriodsMap : setLocalMissedPeriodsMap);
                                                codes.forEach(c => setFn(prev => {
                                                    const current = prev[c] || [];
                                                    const next = current.includes(p) ? current.filter(x => x !== p) : [...current, p].sort();
                                                    return { ...prev, [c]: next };
                                                }));
                                            }}
                                            className={cn(
                                                "w-7 h-7 rounded-lg text-[10px] font-black border transition-all shadow-sm",
                                                isActive 
                                                   ? "bg-white text-gray-800 border-white" 
                                                   : "bg-black/20 border-white/10 text-white/40 hover:bg-black/30"
                                            )}
                                        >
                                            T{p}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    placeholder="Ghi chú nhóm... (Enter)"
                                    className="w-full bg-black/10 border border-white/10 text-white placeholder:text-white/40 px-3 py-1.5 rounded-lg text-xs outline-none focus:bg-black/20 focus:border-white transition-all"
                                    onFocus={() => setShowBulkSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowBulkSuggestions(false), 200)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = (e.target as HTMLInputElement).value;
                                            if (!val) return;
                                            const codes = Array.from(selectedHs);
                                            codes.forEach(code => {
                                                const periods = targetStatus === 'VP' ? (localViolationPeriodsMap[code] || []) : (targetStatus === 'KH' ? (localRewardPeriodsMap[code] || []) : (localMissedPeriodsMap[code] || []));
                                                const targetPeriod = periods[0] || 0;
                                                const setNFn = targetStatus === 'VP' ? setLocalViolationNotesMap : (targetStatus === 'KH' ? setLocalRewardNotesMap : setLocalNotesMap);
                                                setNFn(prev => ({ ...prev, [code]: { ...(prev[code] || {}), [targetPeriod]: val } }));
                                            });
                                            (e.target as HTMLInputElement).value = '';
                                            triggerHapticFeedback();
                                            setShowBulkSuggestions(false);
                                        }
                                    }}
                                />

                                {showBulkSuggestions && (
                                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="space-y-3">
                                            {NOTE_SUGGESTIONS[targetStatus as keyof typeof NOTE_SUGGESTIONS]?.map(g => (
                                                <div key={g.group} className="space-y-1">
                                                    <div className="text-[9px] font-bold text-gray-400 uppercase px-1">{g.group}</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {g.items.map(item => (
                                                            <button
                                                                key={item}
                                                                onClick={() => {
                                                                    const codes = Array.from(selectedHs);
                                                                    codes.forEach(code => {
                                                                        const periods = targetStatus === 'VP' ? (localViolationPeriodsMap[code] || []) : (targetStatus === 'KH' ? (localRewardPeriodsMap[code] || []) : (localMissedPeriodsMap[code] || []));
                                                                        const targetPeriod = periods[0] || 0;
                                                                        const setNFn = targetStatus === 'VP' ? setLocalViolationNotesMap : (targetStatus === 'KH' ? setLocalRewardNotesMap : setLocalNotesMap);
                                                                        setNFn(prev => {
                                                                            const current = prev[code]?.[targetPeriod] || '';
                                                                            const newVal = current ? `${current}, ${item}` : item;
                                                                            return { ...prev, [code]: { ...(prev[code] || {}), [targetPeriod]: newVal } };
                                                                        });
                                                                    });
                                                                    triggerHapticFeedback();
                                                                }}
                                                                className={cn("text-[10px] px-2 py-1 rounded-md border transition-all", g.color)}
                                                            >
                                                                + {item}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto px-1 pb-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin text-blue-600" size={32} />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredStudents.map(item => {
                                const currentStatus = localStatusMap[item.student.code];
                                const hasViolation = localViolationMap[item.student.code];
                                const hasReward = localRewardMap[item.student.code];
                                const isMultiSelected = selectedHs.has(item.student.code);
                                
                                let isChecked = false;
                                if (targetStatus === 'VP') isChecked = hasViolation || false;
                                else if (targetStatus === 'KH') isChecked = hasReward || false;
                                else isChecked = currentStatus === targetStatus;

                                const isOtherStatus = !isChecked && (currentStatus || hasViolation || hasReward);

                                return (
                                    <div
                                        key={item.student.code}
                                        className={cn(
                                            "p-3 rounded-xl border transition-all",
                                            isMultiSelected
                                                ? `${theme.bg} ${theme.border} text-white shadow-md ring-2 ${theme.ripple}`
                                                : isChecked
                                                    ? `${theme.light} ${theme.border} shadow-sm`
                                                    : isOtherStatus
                                                        ? 'bg-gray-100 border-gray-200 opacity-60'
                                                        : 'bg-white border-gray-100 hover:border-blue-200'
                                        )}
                                    >
                                        <div
                                            onClick={() => {
                                                if (isMultiMode) {
                                                    setSelectedHs(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(item.student.code)) next.delete(item.student.code);
                                                        else next.add(item.student.code);
                                                        return next;
                                                    });
                                                } else {
                                                    handleToggle(item.student.code);
                                                }
                                            }}
                                            className="flex items-center justify-between cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedHs(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(item.student.code)) next.delete(item.student.code);
                                                            else next.add(item.student.code);
                                                            return next;
                                                        });
                                                    }}
                                                    className={cn(
                                                        "w-5 h-5 rounded border flex items-center justify-center transition-all",
                                                        isMultiSelected 
                                                            ? "bg-white border-white" 
                                                            : isChecked ? `${theme.bg} ${theme.border}` : "bg-white border-gray-300"
                                                    )}
                                                >
                                                    {(isMultiSelected || isChecked) && (
                                                        <CheckCircle2 className={cn("w-3 h-3", isMultiSelected ? theme.bg.replace('bg-', 'text-') : "text-white")} />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={cn(
                                                            "font-bold text-sm truncate transition-colors",
                                                            isMultiSelected ? "text-white" : (
                                                               currentStatus === 'P' ? "text-yellow-600" :
                                                               currentStatus === 'K' ? "text-red-600" :
                                                               (currentStatus === 'T' || currentStatus === 'V') ? "text-blue-600" :
                                                               hasViolation ? "text-purple-600" :
                                                               hasReward ? "text-green-600" :
                                                               "text-gray-800"
                                                            )
                                                        )}>
                                                            {item.student.fullName}
                                                        </h4>
                                                        <span className={cn("text-xs font-mono shrink-0", isMultiSelected ? "text-white/70" : "text-gray-400")}>
                                                            {item.student.code}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="flex gap-1">
                                                    {currentStatus && (
                                                        <span className={cn(
                                                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                                            isMultiSelected ? 'bg-white/20 text-white border-white/20' : 'bg-blue-100 text-blue-600 border border-blue-200'
                                                        )}>
                                                            {currentStatus}
                                                        </span>
                                                    )}
                                                    {hasViolation && (
                                                        <span className={cn(
                                                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                                            isMultiSelected ? 'bg-white/20 text-white border-white/20' : 'bg-purple-100 text-purple-600 border border-purple-200'
                                                        )}>
                                                            VP
                                                        </span>
                                                    )}
                                                    {hasReward && (
                                                        <span className={cn(
                                                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                                            isMultiSelected ? 'bg-white/20 text-white border-white/20' : 'bg-green-100 text-green-600 border border-green-200'
                                                        )}>
                                                            KH
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {(currentStatus || hasViolation || hasReward) && (
                                                    <button
                                                        onClick={(e) => handleClear(item.student.code, e)}
                                                        className={cn(
                                                            "p-1 rounded-full transition-colors", 
                                                            isMultiSelected 
                                                                ? "hover:bg-white/20 text-white/60 hover:text-white" 
                                                                : "hover:bg-red-100 text-red-400 hover:text-red-600"
                                                        )}
                                                        title="Xóa điểm danh"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Period & Note Editor for Individual Student */}
                                        {isChecked && showNoteInput && !isMultiMode && (
                                            <div className="mt-3 pl-8 animate-in slide-in-from-top-1 space-y-3">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-[10px] text-gray-400 font-medium capitalize">
                                                            {targetStatus === 'VP' ? 'Vi phạm tiết:' : (targetStatus === 'KH' ? 'Khen thưởng tiết:' : 'Tiết vắng/muộn:')}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {[1, 2, 3, 4, 5].map(p => {
                                                            const periods = targetStatus === 'VP' 
                                                                ? (localViolationPeriodsMap[item.student.code] || [])
                                                                : (targetStatus === 'KH' 
                                                                    ? (localRewardPeriodsMap[item.student.code] || [])
                                                                    : (localMissedPeriodsMap[item.student.code] || []));
                                                            
                                                            const isActive = periods.includes(p);
                                                            
                                                            return (
                                                                <button
                                                                    key={p}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const setFn = targetStatus === 'VP' ? setLocalViolationPeriodsMap : (targetStatus === 'KH' ? setLocalRewardPeriodsMap : setLocalMissedPeriodsMap);
                                                                        setFn(prev => {
                                                                            const current = prev[item.student.code] || [];
                                                                            const next = current.includes(p) ? current.filter(x => x !== p) : [...current, p].sort();
                                                                            return { ...prev, [item.student.code]: next };
                                                                        });
                                                                    }}
                                                                    className={cn(
                                                                        "text-[10px] min-w-[32px] px-2 py-1 rounded border transition-colors font-bold",
                                                                        isActive
                                                                            ? (targetStatus === 'VP' ? 'bg-purple-100 text-purple-700 border-purple-200' : (targetStatus === 'KH' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'))
                                                                            : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50 font-normal outline-none'
                                                                    )}
                                                                >
                                                                    T{p}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Suggestions & Note Input */}
                                                <div className="space-y-2">
                                                    {/* Existing Notes Summary */}
                                                    {(() => {
                                                        const currentNotesMap = targetStatus === 'VP' ? localViolationNotesMap[item.student.code] : (targetStatus === 'KH' ? localRewardNotesMap[item.student.code] : localNotesMap[item.student.code]);
                                                        const entries = Object.entries(currentNotesMap || {}).filter(([p, v]) => v && p !== "0");
                                                        if (entries.length === 0) return null;

                                                        return (
                                                            <div className="space-y-1 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                                {entries.map(([p, v]) => (
                                                                    <div key={p} className="flex items-center justify-between text-[11px]">
                                                                        <div className="truncate pr-2">
                                                                            <span className="font-bold text-blue-600">
                                                                                {p === "0" ? "Cả buổi:" : `t${p}:`}
                                                                            </span> {v}
                                                                        </div>
                                                                        <button 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const setNFn = targetStatus === 'VP' ? setLocalViolationNotesMap : (targetStatus === 'KH' ? setLocalRewardNotesMap : setLocalNotesMap);
                                                                                setNFn(prev => {
                                                                                    const next = { ...(prev[item.student.code] || {}) };
                                                                                    delete next[parseInt(p)];
                                                                                    return { ...prev, [item.student.code]: next };
                                                                                });
                                                                            }}
                                                                            className="text-red-400 hover:text-red-600"
                                                                        >
                                                                            <X size={10} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}

                                                    <div className="space-y-3">
                                                        {/* Suggestions Grouped */}
                                                        {(NOTE_SUGGESTIONS[targetStatus as keyof typeof NOTE_SUGGESTIONS])?.map(group => (
                                                            <div key={group.group} className="flex flex-wrap gap-1.5">
                                                                {group.items.map(suggestion => {
                                                                    const periods = targetStatus === 'VP' ? (localViolationPeriodsMap[item.student.code] || []) : (targetStatus === 'KH' ? (localRewardPeriodsMap[item.student.code] || []) : (localMissedPeriodsMap[item.student.code] || []));
                                                                    const targetPeriod = periods[0] || 0;
                                                                    const currentNote = (targetStatus === 'VP' ? (localViolationNotesMap[item.student.code]?.[targetPeriod]) : (targetStatus === 'KH' ? (localRewardNotesMap[item.student.code]?.[targetPeriod]) : (localNotesMap[item.student.code]?.[targetPeriod]))) || '';
                                                                    const isSelected = currentNote.split(', ').includes(suggestion);

                                                                    return (
                                                                        <button
                                                                            key={suggestion}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const parts = currentNote.split(', ').filter(Boolean);
                                                                                let newVal = parts.includes(suggestion) ? parts.filter(p => p !== suggestion).join(', ') : (currentNote ? `${currentNote}, ${suggestion}` : suggestion);
                                                                                
                                                                                const setNFn = targetStatus === 'VP' ? setLocalViolationNotesMap : (targetStatus === 'KH' ? setLocalRewardNotesMap : setLocalNotesMap);
                                                                                setNFn(prev => ({ ...prev, [item.student.code]: { ...(prev[item.student.code] || {}), [targetPeriod]: newVal } }));
                                                                            }}
                                                                            className={cn(
                                                                                "text-[10px] px-2 py-1 rounded border transition-colors",
                                                                                isSelected ? "bg-gray-800 border-gray-800 text-white font-bold" : cn("bg-white", group.color)
                                                                            )}
                                                                        >
                                                                            {suggestion}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        ))}

                                                        {/* Manual Note Input */}
                                                        <input
                                                            type="text"
                                                            placeholder="Ghi chú khác..."
                                                            value={(() => {
                                                                const periods = targetStatus === 'VP' ? (localViolationPeriodsMap[item.student.code] || []) : (targetStatus === 'KH' ? (localRewardPeriodsMap[item.student.code] || []) : (localMissedPeriodsMap[item.student.code] || []));
                                                                const targetPeriod = periods[0] || 0;
                                                                return (targetStatus === 'VP' ? (localViolationNotesMap[item.student.code]?.[targetPeriod]) : (targetStatus === 'KH' ? (localRewardNotesMap[item.student.code]?.[targetPeriod]) : (localNotesMap[item.student.code]?.[targetPeriod]))) || '';
                                                            })()}
                                                            onChange={(e) => {
                                                                const periods = targetStatus === 'VP' ? (localViolationPeriodsMap[item.student.code] || []) : (targetStatus === 'KH' ? (localRewardPeriodsMap[item.student.code] || []) : (localMissedPeriodsMap[item.student.code] || []));
                                                                const targetPeriod = periods[0] || 0;
                                                                const setNFn = targetStatus === 'VP' ? setLocalViolationNotesMap : (targetStatus === 'KH' ? setLocalRewardNotesMap : setLocalNotesMap);
                                                                setNFn(prev => ({ ...prev, [item.student.code]: { ...(prev[item.student.code] || {}), [targetPeriod]: e.target.value } }));
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>


                <div className="pt-4 pb-20 sm:pb-4 border-t flex items-center justify-between bg-white shrink-0 shadow-[0_-15px_15px_-15px_rgba(0,0,0,0.1)] z-20 sticky bottom-0">
                    <div className="text-sm font-bold text-gray-500">
                        Đã chọn: <span className="text-blue-600">
                            {students.filter(item => {
                                const currentStatus = localStatusMap[item.student.code];
                                const hasViolation = localViolationMap[item.student.code];
                                const hasReward = localRewardMap[item.student.code];
                                if (targetStatus === 'VP') return hasViolation;
                                if (targetStatus === 'KH') return hasReward;
                                return currentStatus === targetStatus;
                            }).length}
                        </span> em
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
