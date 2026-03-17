'use client';

import { useState, useEffect, useTransition } from 'react';
import { Modal } from '@/components/ui/modal';
import { StudentAttendanceDetail, getClassAttendanceDetails } from '@/app/actions/quick-attendance';
import { batchMarkAttendance } from '@/services/attendance-v3-service';
import { AttendanceStatusV3 } from '@/types/attendance-v3';
import { useAuth } from '@/context/auth-context';
import { AttendanceStatus } from '@/types/models';

import { SessionType } from '@/types/timetable';
import { Search, Loader2, Save, X } from 'lucide-react';
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

    // Local Notes Map: studentCode -> note (chuyên cần) + maps cho vi phạm
    const [localNotesMap, setLocalNotesMap] = useState<Record<string, string>>({});
    const [localViolationNotesMap, setLocalViolationNotesMap] = useState<Record<string, string>>({});
    const [localRewardNotesMap, setLocalRewardNotesMap] = useState<Record<string, string>>({});

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

    useEffect(() => {
        if (open && classId) {
            setLoading(true);
            getClassAttendanceDetails(classId, date, session)
                .then(data => {
                    setStudents(data);
                    // Initialize local maps
                    const statusMap: Record<string, AttendanceStatus> = {};
                    const violationMap: Record<string, boolean> = {};
                    const rewardMap: Record<string, boolean> = {};
                    const missedPeriodsMap: Record<string, number[]> = {};
                    const violationPeriodsMap: Record<string, number[]> = {};
                    const rewardPeriodsMap: Record<string, number[]> = {};
                    const noteMap: Record<string, string> = {};
                    const vNoteMap: Record<string, string> = {};
                    const rNoteMap: Record<string, string> = {};

                    data.forEach(s => {
                        // Khởi tạo luôn rỗng cho tất cả học sinh để dễ track thay đổi
                        statusMap[s.student.code] = s.status || '';
                        violationMap[s.student.code] = !!s.violation;
                        rewardMap[s.student.code] = !!s.reward;
                        
                        if (s.note) noteMap[s.student.code] = s.note;
                        
                        // @ts-ignore
                        if (s.violation) {
                            // @ts-ignore
                            violationPeriodsMap[s.student.code] = s.violationPeriods || [1, 2, 3, 4, 5];
                        }
                        // @ts-ignore
                        if (s.violationNote) vNoteMap[s.student.code] = s.violationNote;
                        
                        // @ts-ignore
                        if (s.reward) {
                            // @ts-ignore
                            rNoteMap[s.student.code] = s.rewardNote || '';
                            // @ts-ignore
                            rewardPeriodsMap[s.student.code] = s.rewardPeriods || [];
                        }
                        
                        // @ts-ignore
                        if (s.missedPeriods) {
                            // @ts-ignore
                            missedPeriodsMap[s.student.code] = s.missedPeriods;
                        } else if (['P', 'K', 'T', 'V'].includes(s.status)) {
                            // Mặc định cho record cũ: Vắng cả buổi (rỗng = 5 tiết)
                            missedPeriodsMap[s.student.code] = [];
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
        setLocalNotesMap(p => ({ ...p, [studentCode]: '' }));
    };

    const handleNoteChange = (studentCode: string, note: string) => {
        if (targetStatus === 'VP') {
            setLocalViolationNotesMap(prev => ({ ...prev, [studentCode]: note }));
        } else {
            setLocalNotesMap(prev => ({ ...prev, [studentCode]: note }));
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

                // Logic: Gửi record ngay cả khi là 'present' (status rỗng) để backend thực hiện DELETE
                let v3Status: AttendanceStatusV3 = 'present';
                if (status === 'P') v3Status = 'excused';
                else if (status === 'K') v3Status = 'absent';
                else if (status === 'T') v3Status = 'late';
                else if (status === 'V') v3Status = 'absent';

                // Logic: Nếu không chọn tiết nào (rỗng) -> Mặc định vắng cả 5 tiết [1,2,3,4,5]
                // Nếu status là '' (present) thì missedPeriods rỗng
                const selectedMissed = localMissedPeriodsMap[code] || [];
                const missedPeriods = (status && selectedMissed.length === 0) 
                    ? [1, 2, 3, 4, 5] 
                    : (status ? selectedMissed : []);

                marks.push({
                    studentId: code,
                    studentName: students.find(s => s.student.code === code)?.student.fullName || code,
                    status: v3Status,
                    missedPeriods,
                    // Hiệu chỉnh: Nếu học sinh chỉ Vi phạm (không Trễ/Vắng) thì note (cho Trễ) phải để trống
                    note: v3Status !== 'present' ? (localNotesMap[code] || '') : '',
                    violation: hasViolation || false,
                    violationNote: localViolationNotesMap[code] || '',
                    violationPeriods: hasViolation ? (localViolationPeriodsMap[code] || []) : undefined,
                    reward: hasReward || false,
                    rewardNote: localRewardNotesMap[code] || '',
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
                                const hasViolation = localViolationMap[item.student.code];
                                const hasReward = localRewardMap[item.student.code];
                                
                                let isChecked = false;
                                if (targetStatus === 'VP') isChecked = hasViolation || false;
                                else if (targetStatus === 'KH') isChecked = hasReward || false;
                                else isChecked = currentStatus === targetStatus;

                                const isOtherStatus = !isChecked && (currentStatus || hasViolation || hasReward);

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
                                                        <h4 className={cn(
                                                            "font-bold text-sm truncate transition-colors",
                                                            currentStatus === 'P' ? "text-yellow-600" :
                                                            currentStatus === 'K' ? "text-red-600" :
                                                            (currentStatus === 'T' || currentStatus === 'V') ? "text-blue-600" :
                                                            hasViolation ? "text-purple-600" :
                                                            hasReward ? "text-green-600" :
                                                            "text-gray-800"
                                                        )}>
                                                            {item.student.fullName}
                                                        </h4>
                                                        <span className="text-xs text-gray-400 font-mono shrink-0">{item.student.code}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status Badge - Multi status support */}
                                            <div className="flex items-center gap-2">
                                                <div className="flex gap-1">
                                                    {currentStatus && (
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 border border-blue-200`}>
                                                            {currentStatus}
                                                        </span>
                                                    )}
                                                    {hasViolation && (
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 border border-purple-200`}>
                                                            VP
                                                        </span>
                                                    )}
                                                    {hasReward && (
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-600 border border-green-200`}>
                                                            KH
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {(currentStatus || hasViolation || hasReward) && (
                                                    <button
                                                        onClick={(e) => handleClear(item.student.code, e)}
                                                        className="p-1 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-full transition-colors"
                                                        title="Xóa điểm danh"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Toàn bộ Logic Chọn Tiết (T1-T5) cho K, P, T, VP */}
                                        {isChecked && showNoteInput && (
                                            <div className="mt-3 pl-8 animate-in slide-in-from-top-1 space-y-3">
                                                
                                                {/* Bộ chọn tiết lẻ (Hiện cho P, K, T, VP, KH) */}
                                                {(['P', 'K', 'T', 'VP', 'KH'].includes(targetStatus)) && (
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-[10px] text-gray-400 font-medium">
                                                                {targetStatus === 'VP' ? 'Áp dụng cho các tiết:' : 'Đánh dấu các tiết vắng/muộn:'}
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
                                                                
                                                                const toggleP = (e: React.MouseEvent) => {
                                                                    e.stopPropagation();
                                                                    const setFn = targetStatus === 'VP' ? setLocalViolationPeriodsMap : (targetStatus === 'KH' ? setLocalRewardPeriodsMap : setLocalMissedPeriodsMap);
                                                                    setFn(prev => {
                                                                        const current = prev[item.student.code] || [];
                                                                        const next = current.includes(p) 
                                                                            ? current.filter(x => x !== p) 
                                                                            : [...current, p].sort();
                                                                        return { ...prev, [item.student.code]: next };
                                                                    });
                                                                };

                                                                return (
                                                                    <button
                                                                        key={p}
                                                                        onClick={toggleP}
                                                                        className={`text-[10px] min-w-[32px] px-2 py-1 rounded border transition-colors ${isActive
                                                                            ? (targetStatus === 'VP' ? 'bg-purple-100 text-purple-700 border-purple-200' : (targetStatus === 'KH' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'))
                                                                            : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                                                                            } font-bold`}
                                                                    >
                                                                        Tiết {p}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Gợi ý Phân nhóm */}
                                                <div className="space-y-3">
                                                    {(['P', 'K', 'VP', 'KH'].includes(targetStatus)) && (NOTE_SUGGESTIONS[targetStatus as keyof typeof NOTE_SUGGESTIONS]).map(group => (
                                                        <div key={group.group} className="space-y-1.5">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{group.group}</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {group.items.map(suggestion => (
                                                                    <button
                                                                        key={suggestion}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const currentVal = (targetStatus === 'VP' ? localViolationNotesMap[item.student.code] : (targetStatus === 'KH' ? localRewardNotesMap[item.student.code] : localNotesMap[item.student.code])) || '';
                                                                            
                                                                            const parts = currentVal.split(', ').filter(Boolean);
                                                                            let newVal = '';
                                                                            if (parts.includes(suggestion)) {
                                                                                newVal = parts.filter(p => p !== suggestion).join(', ');
                                                                            } else {
                                                                                newVal = currentVal ? `${currentVal}, ${suggestion}` : suggestion;
                                                                            }
                                                                            
                                                                            if (targetStatus === 'KH') setLocalRewardNotesMap(p => ({ ...p, [item.student.code]: newVal }));
                                                                            else handleNoteChange(item.student.code, newVal);
                                                                        }}
                                                                        className={cn(
                                                                            "text-[10px] px-2 py-1 rounded border transition-colors font-medium",
                                                                            ((targetStatus === 'VP' ? localViolationNotesMap[item.student.code] : (targetStatus === 'KH' ? localRewardNotesMap[item.student.code] : localNotesMap[item.student.code])) || '').split(', ').includes(suggestion)
                                                                                ? "bg-gray-800 border-gray-800 text-white font-bold"
                                                                                : cn("bg-white", group.color)
                                                                        )}
                                                                    >
                                                                        {suggestion}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    
                                                    <div className="space-y-2">
                                                        {((targetStatus === 'P' || targetStatus === 'K' || targetStatus === 'T' || (targetStatus as any) === 'V') && (['P', 'K', 'T', 'V'].includes(currentStatus || ''))) && (
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold text-sky-600 uppercase">Ghi chú Điểm danh (Trễ/Vắng/Phép):</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Đi muộn, phép gia đình..."
                                                                    value={localNotesMap[item.student.code] || ''}
                                                                    onChange={(e) => setLocalNotesMap(prev => ({ ...prev, [item.student.code]: e.target.value }))}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="w-full px-3 py-2 text-sm border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none bg-sky-50/30 text-sky-700 font-medium placeholder:text-sky-300/40"
                                                                />
                                                            </div>
                                                        )}

                                                        {(targetStatus === 'VP' && hasViolation) && (
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold text-purple-600 uppercase">Ghi chú Vi phạm:</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Áo ngoài quần, không làm bài..."
                                                                    value={localViolationNotesMap[item.student.code] || ''}
                                                                    onChange={(e) => setLocalViolationNotesMap(prev => ({ ...prev, [item.student.code]: e.target.value }))}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-purple-50/30 text-purple-700 font-medium placeholder:text-purple-300/40"
                                                                />
                                                            </div>
                                                        )}

                                                        {(targetStatus === 'KH' && hasReward) && (
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold text-green-600 uppercase">Nội dung Khen thưởng:</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Phát biểu tốt, giúp đỡ bạn..."
                                                                    value={localRewardNotesMap[item.student.code] || ''}
                                                                    onChange={(e) => setLocalRewardNotesMap(prev => ({ ...prev, [item.student.code]: e.target.value }))}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-green-50/30 text-green-700 font-medium placeholder:text-green-300/40"
                                                                />
                                                            </div>
                                                        )}
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
