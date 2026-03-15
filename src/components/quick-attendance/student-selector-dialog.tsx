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
                    const noteMap: Record<string, string> = {};
                    const vNoteMap: Record<string, string> = {};
                    const rNoteMap: Record<string, string> = {};

                    data.forEach(s => {
                        statusMap[s.student.code] = s.status;
                        if (s.note) noteMap[s.student.code] = s.note;
                        
                        // @ts-ignore
                        if (s.violation) {
                            violationMap[s.student.code] = true;
                            // @ts-ignore
                            violationPeriodsMap[s.student.code] = s.violationPeriods || [1, 2, 3, 4, 5];
                        }
                        // @ts-ignore
                        if (s.violationNote) vNoteMap[s.student.code] = s.violationNote;
                        
                        // @ts-ignore
                        if (s.reward) {
                            rewardMap[s.student.code] = true;
                            // @ts-ignore
                            rNoteMap[s.student.code] = s.rewardNote || '';
                        }
                        
                        // @ts-ignore
                        if (s.missedPeriods) {
                            missedPeriodsMap[s.student.code] = s.missedPeriods;
                        } else if (['P', 'K', 'T', 'V'].includes(s.status)) {
                            // Fallback cho record cũ không có missedPeriods
                            missedPeriodsMap[s.student.code] = [1, 2, 3, 4, 5];
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
            setLocalRewardMap(prev => ({
                ...prev,
                [studentCode]: !prev[studentCode]
            }));
            return;
        }

        // Toggle Chuyên cần (P, K, T, V)
        setLocalStatusMap(prev => {
            const currentStatus = prev[studentCode];
            const isTarget = currentStatus === targetStatus;
            const newStatus = isTarget ? '' as AttendanceStatus : targetStatus;
            
            // Nếu là bật trạng thái mới, mặc định chọn cả 5 tiết
            if (newStatus && !localMissedPeriodsMap[studentCode]) {
                setLocalMissedPeriodsMap(p => ({ ...p, [studentCode]: [1, 2, 3, 4, 5] }));
            }
            
            return {
                ...prev,
                [studentCode]: newStatus
            };
        });
    };

    const handleNoteChange = (studentCode: string, note: string) => {
        if (targetStatus === 'VP') {
            setLocalViolationNotesMap(prev => ({ ...prev, [studentCode]: note }));
        } else {
            setLocalNotesMap(prev => ({ ...prev, [studentCode]: note }));
        }
    };

    const handleSave = () => {
        startSaving(async () => {
            const marks: any[] = [];
            const allCodes = Array.from(new Set([
                ...Object.keys(localStatusMap),
                ...Object.keys(localViolationMap),
                ...Object.keys(localRewardMap)
            ]));

            allCodes.forEach(code => {
                const status = localStatusMap[code] || '';
                const hasViolation = localViolationMap[code];
                const hasReward = localRewardMap[code];

                if (status || hasViolation || hasReward) {
                    let v3Status: AttendanceStatusV3 = 'present';
                    if (status === 'P') v3Status = 'excused';
                    else if (status === 'K') v3Status = 'absent';
                    else if (status === 'T') v3Status = 'late';

                    marks.push({
                        studentId: code,
                        studentName: students.find(s => s.student.code === code)?.student.fullName || code,
                        status: v3Status,
                        missedPeriods: status ? (localMissedPeriodsMap[code] || [1, 2, 3, 4, 5]) : undefined,
                        note: localNotesMap[code] || '',
                        violation: hasViolation || false,
                        violationNote: localViolationNotesMap[code] || '',
                        violationPeriods: hasViolation ? (localViolationPeriodsMap[code] || [1, 2, 3, 4, 5]) : undefined,
                        reward: hasReward || false,
                        rewardNote: localRewardNotesMap[code] || ''
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
                                                        <h4 className="font-bold text-gray-800 text-sm truncate">{item.student.fullName}</h4>
                                                        <span className="text-xs text-gray-400 font-mono shrink-0">{item.student.code}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status Badge - Multi status support */}
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
                                        </div>

                                        {/* Toàn bộ Logic Chọn Tiết (T1-T5) cho K, P, T, VP */}
                                        {isChecked && showNoteInput && (
                                            <div className="mt-3 pl-8 animate-in slide-in-from-top-1 space-y-3">
                                                
                                                {/* Bộ chọn tiết lẻ (Hiện cho P, K, T, VP) */}
                                                {(['P', 'K', 'T', 'VP'].includes(targetStatus)) && (
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-[10px] text-gray-400 font-medium">
                                                                {targetStatus === 'VP' ? 'Áp dụng cho các tiết:' : 'Đánh dấu các tiết vắng/muộn:'}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {[1, 2, 3, 4, 5].map(p => {
                                                                const periods = targetStatus === 'VP' 
                                                                    ? (localViolationPeriodsMap[item.student.code] || [1,2,3,4,5])
                                                                    : (localMissedPeriodsMap[item.student.code] || [1,2,3,4,5]);
                                                                
                                                                const isActive = periods.includes(p);
                                                                
                                                                const toggleP = (e: React.MouseEvent) => {
                                                                    e.stopPropagation();
                                                                    const setFn = targetStatus === 'VP' ? setLocalViolationPeriodsMap : setLocalMissedPeriodsMap;
                                                                    setFn(prev => {
                                                                        const current = prev[item.student.code] || [1,2,3,4,5];
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
                                                                            ? (targetStatus === 'VP' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200')
                                                                            : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                                                                            } font-bold`}
                                                                    >
                                                                        T{p}
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
                                                                            const currentVal = targetStatus === 'VP' ? (localViolationNotesMap[item.student.code] || '') : (targetStatus === 'KH' ? (localRewardNotesMap[item.student.code] || '') : (localNotesMap[item.student.code] || ''));
                                                                            const newVal = currentVal ? `${currentVal}, ${suggestion}` : suggestion;
                                                                            
                                                                            if (targetStatus === 'KH') setLocalRewardNotesMap(p => ({ ...p, [item.student.code]: suggestion }));
                                                                            else handleNoteChange(item.student.code, suggestion);
                                                                        }}
                                                                        className={cn(
                                                                            "text-[10px] px-2 py-1 rounded border transition-colors font-medium",
                                                                            ((targetStatus === 'VP' ? localViolationNotesMap[item.student.code] : (targetStatus === 'KH' ? localRewardNotesMap[item.student.code] : localNotesMap[item.student.code])) === suggestion)
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
                                                    
                                                    <input
                                                        type="text"
                                                        placeholder={targetStatus === 'KH' ? "Nội dung khen thưởng..." : "Ghi chú thêm..."}
                                                        value={targetStatus === 'VP' ? (localViolationNotesMap[item.student.code] || '') : (targetStatus === 'KH' ? (localRewardNotesMap[item.student.code] || '') : (localNotesMap[item.student.code] || ''))}
                                                        onChange={(e) => {
                                                            if (targetStatus === 'KH') setLocalRewardNotesMap(p => ({ ...p, [item.student.code]: e.target.value }));
                                                            else handleNoteChange(item.student.code, e.target.value);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-400 outline-none"
                                                    />
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
