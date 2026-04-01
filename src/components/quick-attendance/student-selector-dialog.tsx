'use client';

import { useState, useEffect, useTransition } from 'react';
import { Modal } from '@/components/ui/modal';
import { StudentAttendanceDetail, getClassAttendanceDetails } from '@/app/actions/quick-attendance';
import { fetchAppSettings } from '@/app/actions/settings';
import { batchMarkAttendance } from '@/services/attendance-v3-service';
import { AttendanceStatusV3 } from '@/types/attendance-v3';
import { useAuth } from '@/context/auth-context';
import { AttendanceStatus } from '@/types/models';

import { SessionType } from '@/types/timetable';
import { Search, Loader2, Save, X, CheckCircle2, Edit3, Plus, ChevronDown, ChevronUp, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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
    onSessionChange?: (session: SessionType) => void;
    onSaved: () => void;
}

const STATUS_LABELS: Record<string, string> = {
    'P': 'Phép',
    'K': 'Vắng (Không phép)',
    'T': 'Trễ',
    'VP': 'Vi Phạm',
    'V': 'Vắng (Chưa rõ)'
};

const DEFAULT_SUBJECTS = {
    primary: "Tiếng Việt, Toán, Đạo đức, Tự nhiên, Xã hội, Khoa học, Lịch sử, Địa lí, Tin học, Ngoại ngữ, Công nghệ, Âm nhạc, Mỹ thuật, GDTC, Trải nghiệm",
    secondary: "Ngữ văn, Toán, Ngoại ngữ, GDCD, Lịch sử, Địa lí, Vật lí, Hóa học, Sinh học, Tin học, Công nghệ, Âm nhạc, Mỹ thuật, GDTC, Trải nghiệm",
    high: "Ngữ văn, Toán, Ngoại ngữ, Lịch sử, Địa lí, GDKTPL, Vật lí, Hóa học, Sinh học, Tin học, Công nghệ, Âm nhạc, Mỹ thuật, GDTC, GDQP-AN, Trải nghiệm"
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
    onSessionChange,
    onSaved
}: StudentSelectorDialogProps) {
    const [students, setStudents] = useState<StudentAttendanceDetail[]>([]);
    const [lastActivePeriod, setLastActivePeriod] = useState<number | null>(null);
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
    const [mode, setMode] = useState<'single' | 'multi'>('single');
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    
    // Multi-mode shared states (form trống khi bắt đầu)
    const [multiMissedPeriods, setMultiMissedPeriods] = useState<number[]>([]);
    const [multiViolationPeriods, setMultiViolationPeriods] = useState<number[]>([]);
    const [multiRewardPeriods, setMultiRewardPeriods] = useState<number[]>([]);
    const [multiNotes, setMultiNotes] = useState<Record<number, string>>({});
    const [multiViolationNotes, setMultiViolationNotes] = useState<Record<number, string>>({});
    const [multiRewardNotes, setMultiRewardNotes] = useState<Record<number, string>>({});
    const [multiLastActiveP, setMultiLastActiveP] = useState<number | null>(null);

    const [loading, setLoading] = useState(false);
    const [isSaving, startSaving] = useTransition();
    const [search, setSearch] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('Không');
    const [subjectOptions, setSubjectOptions] = useState<string[]>(['Không']);
    const { appUser } = useAuth();

    // Load subjects - Auto fetch if localStorage empty
    useEffect(() => {
        const loadSubjects = async () => {
            let config: any = null;
            const stored = localStorage.getItem('app_subjects_config');
            
            if (stored) {
                try {
                    config = JSON.parse(stored);
                } catch (e) {
                    console.error("Failed to parse local subjects config", e);
                }
            }
            
            // If No config in localStorage, fetch from server
            if (!config) {
                try {
                    const res = await fetchAppSettings();
                    if (res.success && res.settings?.subjectConfig) {
                        config = res.settings.subjectConfig;
                        // Sync back to local storage for next time
                        localStorage.setItem('app_subjects_config', JSON.stringify(config));
                    }
                } catch (e) {
                    console.error("Failed to fetch subjects from server", e);
                }
            }

            // Fallback to defaults if still no config (e.g. Server error)
            if (!config) {
                config = DEFAULT_SUBJECTS;
            }

            // Determine grade level (6-9 is secondary)
            const gradeMatch = classId?.match(/\d+/);
            const grade = gradeMatch ? parseInt(gradeMatch[0]) : 0;
            
            let subjectCsv = "";
            if (grade >= 1 && grade <= 5) subjectCsv = config.primary;
            else if (grade >= 6 && grade <= 9) subjectCsv = config.secondary;
            else if (grade >= 10 && grade <= 12) subjectCsv = config.high;
            else subjectCsv = config.secondary || config.primary || config.high || "";

            if (subjectCsv) {
                const parsed = subjectCsv.split(', ').map((s: string) => s.trim()).filter(Boolean);
                setSubjectOptions(['Không', ...parsed]);
                setSelectedSubject('Không');
            }
        };

        loadSubjects();
    }, [classId, open]);

    const NOTE_SUGGESTIONS = {
        P: [
            { group: "Sức khỏe & Gia đình", items: ["Có tang", "Bệnh", "Bệnh nằm viện", "Tai nạn", "Y tế"], color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
            { group: "Hoạt động trường", items: ["Thi HS giỏi", "Thi năng khiếu", "Hoạt động trường", "Hoạt động Đội", "Thi đấu thể thao"], color: "bg-blue-50 text-blue-700 border-blue-200" }
        ],
        K: [],
        VP: [
            { group: "Tác phong", items: ["Sai đồng phục", "Không phù hiệu", "Áo ngoài quần", "Đem điện thoại", "Đeo Ba lô", "Ko Khăn quàng", "Đi dép", "Tóc sai QĐ"], color: "bg-purple-100 text-purple-700 border-purple-200" },
            { group: "Trong giờ học", items: ["Nói chuyện", "Mất trật tự", "Không làm bài", "Không mang sách", "Không mang vở", "Không học bài", "Không trực nhật", "Không nộp bài", "Quên dụng cụ"], color: "bg-pink-100 text-pink-700 border-pink-200" },
            { group: "Khác", items: ["Khác", "Chạy giỡn", "Nói chuyện riêng", "Không thuộc bài"], color: "bg-gray-100 text-gray-700 border-gray-200" }
        ],
        KH: [
            { group: "Học tập", items: ["Phát biểu tốt", "Bài làm tốt", "Điểm tốt", "Tiến bộ", "Thái độ", "Chăm học", "Tích cực", "Hợp tác tốt", "Gương mẫu"], color: "bg-green-100 text-green-700 border-green-200" },
            { group: "Hoạt động", items: ["Trực nhật tốt", "Giúp bạn", "Hỗ trợ lớp", "Tham gia tốt"], color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
            { group: "Đặc biệt", items: ["Gương tốt", "Xuất sắc", "Tuyên đương"], color: "bg-orange-100 text-orange-700 border-orange-200" }
        ]
    };

    const STATUS_THEME = {
        P: { bg: "bg-yellow-500", border: "border-yellow-600", text: "text-white", light: "bg-yellow-50/50", accent: "bg-yellow-600", ripple: "shadow-yellow-200" },
        K: { bg: "bg-red-500", border: "border-red-600", text: "text-white", light: "bg-red-50/50", accent: "bg-red-600", ripple: "shadow-red-200" },
        V: { bg: "bg-blue-500", border: "border-blue-600", text: "text-white", light: "bg-blue-50/50", accent: "bg-blue-600", ripple: "shadow-blue-200" },
        T: { bg: "bg-blue-500", border: "border-blue-600", text: "text-white", light: "bg-blue-50/50", accent: "bg-blue-600", ripple: "shadow-blue-200" },
        VP: { bg: "bg-purple-600", border: "border-purple-700", text: "text-white", light: "bg-purple-50/50", accent: "bg-purple-700", ripple: "shadow-purple-200" },
        KH: { bg: "bg-green-600", border: "border-green-700", text: "text-white", light: "bg-green-50/50", accent: "bg-green-700", ripple: "shadow-green-200" },
    };
    const theme = STATUS_THEME[targetStatus as keyof typeof STATUS_THEME] || STATUS_THEME.V;

    // --- RE-USE FORM LOGIC 100% FROM SINGLE-MODE ---
    const renderAttendanceForm = (
        periods: number[],
        vPeriods: number[],
        rPeriods: number[],
        notes: Record<number, string>,
        vNotes: Record<number, string>,
        rNotes: Record<number, string>,
        updatePeriods: (p: number[]) => void,
        updateVPeriods: (p: number[]) => void,
        updateRPeriods: (p: number[]) => void,
        updateNotes: (n: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void,
        updateVNotes: (n: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void,
        updateRNotes: (n: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void,
        lastActP: number | null,
        setLastActP: (p: number | null) => void,
        isMultiMode: boolean = false,
        studentCode: string = ''
    ) => {
        const currentP = targetStatus === 'VP' ? vPeriods : (targetStatus === 'KH' ? rPeriods : periods);
        const currentN = targetStatus === 'VP' ? vNotes : (targetStatus === 'KH' ? rNotes : notes);
        const setP = targetStatus === 'VP' ? updateVPeriods : (targetStatus === 'KH' ? updateRPeriods : updatePeriods);
        const setN = targetStatus === 'VP' ? updateVNotes : (targetStatus === 'KH' ? updateRNotes : updateNotes);

        return (
            <div className={cn("animate-in slide-in-from-top-1 space-y-3", isMultiMode ? "p-0" : "mt-3 pl-8")}>
                {/* Subject Selection Dropdown */}
                <div className="flex items-center gap-3 p-2 bg-blue-50/30 border border-blue-100 rounded-xl mb-1 shadow-sm">
                    <div className="flex flex-col shrink-0">
                        <Label className="text-blue-900 font-black text-[10px] uppercase">Môn học</Label>
                        <span className="text-[8px] text-blue-600 font-medium italic">Chọn để thêm vào note</span>
                    </div>
                    <select 
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="flex-1 bg-white border border-blue-100 rounded-lg px-2 py-1.5 text-xs font-bold text-blue-800 outline-none focus:ring-2 focus:ring-blue-100"
                    >
                        {subjectOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
                {targetStatus === 'K' && (
                    <div className="flex items-center justify-between p-2.5 bg-orange-50 border border-orange-100 rounded-xl mb-2 shadow-sm">
                        <div className="flex flex-col">
                            <Label htmlFor="bo-sung-p-desktop" className="text-orange-900 font-black text-[11px] uppercase">Bổ sung phép sau</Label>
                            <span className="text-[9px] text-orange-700 font-medium italic">Chuyển sang cột Phép (P) để theo dõi</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className={cn("text-[10px] font-black transition-colors", !Object.values(notes).some(v => v && v.includes('Có bổ sung Phép')) ? "text-red-500" : "text-gray-300")}>K</span>
                             <Switch 
                                id="bo-sung-p-desktop"
                                className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-red-500"
                                checked={Object.values(notes).some(v => v && v.includes('Có bổ sung Phép'))}
                                onCheckedChange={(checked) => {
                                    if (isMultiMode) {
                                        updateNotes(prev => {
                                            const next = { ...prev };
                                            if (checked) {
                                               [0, 1, 2, 3, 4, 5].forEach(p => { if (next[p] !== undefined || p === 0) next[p] = 'Có bổ sung Phép'; });
                                            } else {
                                               Object.keys(next).forEach(p => { if (next[Number(p)] === 'Có bổ sung Phép') delete next[Number(p)]; });
                                            }
                                            return next;
                                        });
                                    } else if (studentCode) {
                                        if (checked) {
                                            setLocalStatusMap(prev => ({ ...prev, [studentCode]: 'P' }));
                                            updateNotes(prev => ({ ...prev, [0]: 'Có bổ sung Phép' }));
                                        } else {
                                            setLocalStatusMap(prev => ({ ...prev, [studentCode]: 'K' }));
                                            updateNotes(prev => {
                                                const next = { ...prev };
                                                Object.keys(next).forEach(p => { if (next[Number(p)] === 'Có bổ sung Phép') delete next[Number(p)]; });
                                                return next;
                                            });
                                        }
                                    }
                                }}
                            />
                            <span className={cn("text-[10px] font-black transition-colors", Object.values(notes).some(v => v && v.includes('Có bổ sung Phép')) ? "text-blue-600" : "text-gray-300")}>P</span>
                        </div>
                    </div>
                )}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <div className="text-[10px] text-gray-400 font-medium capitalize">
                            {targetStatus === 'VP' ? 'Vi phạm tiết:' : (targetStatus === 'KH' ? 'Khen thưởng tiết:' : 'Tiết vắng/muộn:')}:
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setP([1, 2, 3, 4, 5]); }}
                                className="text-[9px] font-bold text-blue-500 hover:underline"
                            >
                                Tất cả
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setP([]); setLastActP(null); }}
                                className="text-[9px] font-bold text-red-500 hover:underline"
                            >
                                Hủy chọn
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setP([]); setLastActP(null); }}
                                className="ml-1 text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 hover:bg-green-100 flex items-center gap-0.5"
                            >
                                <Plus size={10} /> Tiết
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {[1, 2, 3, 4, 5].map(p => {
                            const isActive = currentP.includes(p);
                            const isLast = lastActP === p;
                            return (
                                <button
                                    key={p}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const next = currentP.includes(p) ? currentP.filter(x => x !== p) : [...currentP, p].sort();
                                        setP(next);
                                        if (next.includes(p)) setLastActP(p);
                                        else if (lastActP === p) setLastActP(next[0] || null);
                                    }}
                                    className={cn(
                                        "text-[10px] min-w-[32px] px-2 py-1 rounded border transition-colors font-bold relative",
                                        isActive
                                            ? (targetStatus === 'VP' ? 'bg-purple-100 text-purple-700 border-purple-200' : (targetStatus === 'KH' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'))
                                            : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50 font-normal outline-none',
                                        isLast && "ring-2 ring-yellow-400 ring-offset-1"
                                    )}
                                >
                                    T{p}
                                    {isLast && <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full border border-white" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-2">
                    {(() => {
                        const entries = Object.entries(currentN || {}).filter(([p, v]) => v && p !== "0");
                        if (entries.length === 0) return null;
                        const notePs: Record<string, number[]> = {};
                        entries.forEach(([p, v]) => {
                            if (!notePs[v]) notePs[v] = [];
                            notePs[v].push(Number(p));
                        });
                        return (
                            <div className="space-y-1 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                {Object.entries(notePs).map(([v, periods]) => {
                                    const sorted = [...periods].sort((a,b) => a - b);
                                    const ranges: string[] = [];
                                    let start = sorted[0], prev = sorted[0];
                                    for (let i = 1; i <= sorted.length; i++) {
                                        if (i < sorted.length && sorted[i] === prev + 1) prev = sorted[i];
                                        else {
                                            if (start === prev) ranges.push(`${start}`); else ranges.push(`${start}-${prev}`);
                                            if (i < sorted.length) { start = sorted[i]; prev = sorted[i]; }
                                        }
                                    }
                                    
                                    // Parse subject from internal format: "Subject|Note"
                                    let displayNote = v;
                                    let subjectPart = "";
                                    if (v.includes('|')) {
                                        const parts = v.split('|');
                                        const sub = parts[0];
                                        displayNote = parts.slice(1).join('|');
                                        if (sub && sub !== 'Không') subjectPart = `: [${sub}] - `;
                                        else subjectPart = ": ";
                                    } else {
                                        const globalSub = (selectedSubject && selectedSubject !== 'Không') ? `: [${selectedSubject}] - ` : ": ";
                                        subjectPart = globalSub;
                                    }

                                    return (
                                        <div key={v} className="flex items-center gap-2 text-[10px]">
                                            <span className="text-blue-800 font-black truncate">
                                                T{ranges.join(',')}{subjectPart}{displayNote}
                                            </span>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const updated = { ...currentN };
                                                    periods.forEach(p => delete updated[p]);
                                                    setN(updated);
                                                }}
                                                className="ml-auto text-red-400 hover:text-red-600"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    <div className="space-y-3">
                        {NOTE_SUGGESTIONS[targetStatus as keyof typeof NOTE_SUGGESTIONS]?.map(group => (
                            <div key={group.group} className="flex flex-wrap gap-1.5">
                                {group.items.map(suggestion => {
                                    const targetPeriod = lastActP || (currentP.includes(0) ? 0 : (currentP[0] || 0));
                                    const currentNote = currentN?.[targetPeriod] || '';
                                    const isSelected = currentNote.split(', ').includes(suggestion);
                                    return (
                                        <button
                                            key={suggestion}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const targetPs = lastActP ? [lastActP] : (currentP.length > 0 ? currentP : [0]);
                                                const subjectPrefix = selectedSubject !== 'Không' ? `${selectedSubject}|` : '';
                                                
                                                setN(prev => {
                                                    const updated = { ...prev };
                                                    targetPs.forEach(p => {
                                                        const curRaw = updated[p] || '';
                                                        let curNote = curRaw;
                                                        if (curRaw.includes('|')) curNote = curRaw.split('|').slice(1).join('|');
                                                        
                                                        const parts = curNote ? curNote.split(', ') : [];
                                                        let newNote = "";
                                                        if (parts.includes(suggestion)) newNote = parts.filter(x => x !== suggestion).join(', ');
                                                        else newNote = parts.length > 0 ? `${curNote}, ${suggestion}` : suggestion;
                                                        
                                                        updated[p] = newNote ? `${subjectPrefix}${newNote}` : '';
                                                    });
                                                    return updated;
                                                });
                                                triggerHapticFeedback();
                                            }}
                                            className={cn(
                                                "text-[10px] px-2 py-1 rounded-md border transition-all",
                                                isSelected ? `${theme.bg} text-white border-transparent` : `${group.color} hover:shadow-sm`
                                            )}
                                        >
                                            {isSelected ? suggestion : `+ ${suggestion}`}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}

                        <div className="relative group/input">
                            <input
                                type="text"
                                placeholder={lastActP ? `Ghi chú cho Tiết ${lastActP}...` : "Nhập ghi chú chung..."}
                                className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all pr-8 font-bold text-blue-700 placeholder:font-normal placeholder:text-gray-400"
                                value={(() => {
                                    const raw = (currentN && (currentN as any)[lastActP || 0]) || '';
                                    return raw.includes('|') ? raw.split('|').slice(1).join('|') : raw;
                                })()}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const targetPs = lastActP ? [lastActP] : (currentP.length > 0 ? currentP : [0]);
                                    const subjectPrefix = selectedSubject !== 'Không' ? `${selectedSubject}|` : '';
                                    setN(prev => {
                                        const updated = { ...prev };
                                        targetPs.forEach(p => updated[p] = val ? `${subjectPrefix}${val}` : '');
                                        return updated;
                                    });
                                }}
                            />
                            <Edit3 className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within/input:text-blue-400 transition-colors" size={12} />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    useEffect(() => {
        if (open && classId) {
            setLoading(true);
            getClassAttendanceDetails(classId, date, session)
                .then(data => {
                    const sortedData = [...data].sort((a, b) => {
                        const codeA = a.student.code || '';
                        const codeB = b.student.code || '';
                        const numA = parseInt(codeA.split('_').pop() || '0');
                        const numB = parseInt(codeB.split('_').pop() || '0');
                        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                        return codeA.localeCompare(codeB, undefined, { numeric: true });
                    });

                    setStudents(sortedData);
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
                        let currentStatus = s.status || '';
                        
                        // AUTO-MAP: Dữ liệu cũ (K + bổ sung phép) -> P để hiển thị đúng
                        const hasBổSungPhép = (s.note && s.note.includes('Có bổ sung Phép')) || 
                                              (s.statusNotes && Object.values(s.statusNotes).some(v => v && v.includes('Có bổ sung Phép')));

                        if (currentStatus === 'K' && hasBổSungPhép) {
                            currentStatus = 'P';
                        }

                        statusMap[code] = currentStatus as AttendanceStatus;
                        violationMap[code] = !!s.violation;
                        rewardMap[code] = !!s.reward;
                        const parseFormattedNote = (n?: string): Record<number, string> => {
                            if (!n) return {};
                            if (!n.includes('T') || !n.includes(':')) return { 0: n };
                            
                            const result: Record<number, string> = {};
                            // Phân rã chuỗi dạng "T1-2,4: Ghi chú A, T3: Ghi chú B"
                            const sections = n.split(/,\s*(?=T\d)/);
                            sections.forEach(section => {
                                const match = section.trim().match(/^T([\d\-,]+):\s*(.*)$/);
                                if (match) {
                                    const [, pRange, noteText] = match;
                                    pRange.split(',').forEach(r => {
                                        if (r.includes('-')) {
                                            const [start, end] = r.split('-').map(Number);
                                            for (let i = start; i <= end; i++) result[i] = noteText;
                                        } else {
                                            result[Number(r)] = noteText;
                                        }
                                    });
                                } else if (!section.includes(':')) {
                                    result[0] = section.trim();
                                }
                            });
                            return result;
                        };

                        noteMap[code] = s.statusNotes || parseFormattedNote(s.note);
                        vNoteMap[code] = s.violationNotes || parseFormattedNote(s.violationNote);
                        rNoteMap[code] = s.rewardNotes || parseFormattedNote(s.rewardNote);
                        if (s.violation) violationPeriodsMap[code] = s.violationPeriods || (s.violationNotes ? Object.keys(s.violationNotes).map(Number).filter(n => n > 0) : [1, 2, 3, 4, 5]);
                        if (s.reward) rewardPeriodsMap[code] = (s as any).rewardPeriods || [];
                        if (s.missedPeriods) missedPeriodsMap[code] = s.missedPeriods;
                        else if (['P', 'K', 'T', 'V'].includes(currentStatus)) missedPeriodsMap[code] = [];
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
            setLocalViolationMap(prev => ({ ...prev, [studentCode]: !prev[studentCode] }));
            return;
        }
        if (targetStatus === 'KH') {
            setLocalRewardMap(prev => ({ ...prev, [studentCode]: !prev[studentCode] }));
            return;
        }
        setLocalStatusMap(prev => {
            const isTarget = prev[studentCode] === targetStatus;
            const newStatus = isTarget ? '' as AttendanceStatus : targetStatus;
            if (newStatus && !localMissedPeriodsMap[studentCode]) setLocalMissedPeriodsMap(p => ({ ...p, [studentCode]: [] }));
            return { ...prev, [studentCode]: newStatus };
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

    const handleSave = () => {
        startSaving(async () => {
            const marks: any[] = [];
            const allCodes = Array.from(new Set([
                ...Object.keys(localStatusMap),
                ...Object.keys(localViolationMap),
                ...Object.keys(localRewardMap),
                ...students.filter(s => s.status || s.violation || s.reward).map(s => s.student.code)
            ]));

            const formatNotes = (entriesMap: Record<number, string>) => {
                const entries = Object.entries(entriesMap);
                if (entries.length === 0) return "";
                const notePs: Record<string, number[]> = {};
                entries.forEach(([p, v]) => {
                    if (!v) return;
                    if (!notePs[v]) notePs[v] = [];
                    notePs[v].push(Number(p));
                });
                return Object.entries(notePs).map(([noteRaw, ps]) => {
                    const sorted = ps.sort((a,b) => a - b);
                    const isFullSession = sorted.length === 0 || (sorted.length >= 5 && sorted.includes(1) && sorted.includes(5));
                    
                    let noteText = noteRaw;
                    let sub = "";
                    if (noteRaw.includes('|')) {
                        const parts = noteRaw.split('|');
                        sub = parts[0];
                        noteText = parts.slice(1).join('|');
                    }

                    const ranges: string[] = [];
                    let start = sorted[0], prev = sorted[0];
                    for (let i = 1; i <= sorted.length; i++) {
                        if (i < sorted.length && sorted[i] === prev + 1) prev = sorted[i];
                        else {
                            if (start === prev) ranges.push(`${start}`); else ranges.push(`${start}-${prev}`);
                            if (i < sorted.length) { start = sorted[i]; prev = sorted[i]; }
                        }
                    }
                    const prefix = isFullSession ? "" : `T${ranges.join(',')}`;
                    const subjectPart = sub ? `: [${sub}] - ` : (prefix ? ": " : "");

                    return `${prefix}${subjectPart}${noteText}`;
                }).join(", ");
            };

            const mergePeriods = (existing: number[], incoming: number[]) => {
                const combined = Array.from(new Set([...existing, ...incoming]));
                if (combined.length >= 5 && combined.includes(1) && combined.includes(5)) return [];
                return combined;
            };

            const mergeNotes = (existing: Record<number, string>, incoming: Record<number, string>) => {
                let result = { ...existing };
                Object.entries(result).forEach(([p, val]) => {
                    if (typeof val === 'string' && (val.includes('T') || val.includes(':'))) delete result[Number(p)];
                });
                const fullKey = result[0] !== undefined ? 0 : ((result as any)["0"] !== undefined ? "0" : null);
                const incomingHasPeriods = Object.keys(incoming).some(k => k !== "0" && k !== "null");
                if (fullKey !== null && incomingHasPeriods) {
                    const fullNote = result[fullKey as any];
                    [1, 2, 3, 4, 5].forEach(p => { if (!result[p]) result[p] = fullNote; });
                    delete result[fullKey as any];
                }
                Object.entries(incoming).forEach(([p, val]) => {
                    const period = Number(p);
                    if (!val) return;
                    if (period === 0) {
                         [1, 2, 3, 4, 5].forEach(i => {
                             if (!result[i]) result[i] = val;
                             else if (!result[i].includes(val)) result[i] = `${result[i]}, ${val}`;
                         });
                         return;
                    }
                    if (result[period] && result[period] !== val) {
                        if (!result[period].includes(val)) result[period] = `${result[period]}, ${val}`;
                    } else result[period] = val;
                });
                return result;
            };

            allCodes.forEach(code => {
                const isMultiTarget = mode === 'multi' && selectedHs.has(code);
                const status = isMultiTarget ? targetStatus : (localStatusMap[code] || '');
                const hasViolation = isMultiTarget ? (targetStatus === 'VP' || localViolationMap[code]) : localViolationMap[code];
                const hasReward = isMultiTarget ? (targetStatus === 'KH' || localRewardMap[code]) : localRewardMap[code];

                let v3Status: AttendanceStatusV3 = 'present';
                let notes = isMultiTarget ? mergeNotes(localNotesMap[code] || {}, multiNotes) : (localNotesMap[code] || {});

                // AUTO-CONVERT: K + bổ sung phép -> P và chuẩn hóa note
                const hasBổSungPhép = Object.values(notes).some(v => v && v.includes('Có bổ sung Phép'));
                let currentStatus = status;
                if (status === 'K' && hasBổSungPhép) {
                    currentStatus = 'P';
                    const updatedNotes = { ...notes };
                    Object.keys(updatedNotes).forEach(p => {
                        if (updatedNotes[Number(p)]?.includes('Có bổ sung Phép')) {
                            updatedNotes[Number(p)] = '(có bổ sung phép)';
                        }
                    });
                    notes = updatedNotes;
                }

                if (currentStatus === 'P') v3Status = 'excused';
                else if (currentStatus === 'K') v3Status = 'absent';
                else if (currentStatus === 'T') v3Status = 'late';
                else if (currentStatus === 'V') v3Status = 'absent';

                const vNotes = isMultiTarget ? mergeNotes(localViolationNotesMap[code] || {}, multiViolationNotes) : (localViolationNotesMap[code] || {});
                const rNotes = isMultiTarget ? mergeNotes(localRewardNotesMap[code] || {}, multiRewardNotes) : (localRewardNotesMap[code] || {});

                const missedPs = isMultiTarget ? mergePeriods(localMissedPeriodsMap[code] || [], multiMissedPeriods) : (localMissedPeriodsMap[code] || []);
                const vPs = isMultiTarget ? mergePeriods(localViolationPeriodsMap[code] || [], multiViolationPeriods) : (localViolationPeriodsMap[code] || []);
                const rPs = isMultiTarget ? mergePeriods(localRewardPeriodsMap[code] || [], multiRewardPeriods) : (localRewardPeriodsMap[code] || []);

                marks.push({
                    studentId: code,
                    studentName: students.find(s => s.student.code === code)?.student.fullName || code,
                    status: v3Status,
                    note: formatNotes(notes),
                    statusNotes: notes,
                    violation: hasViolation,
                    violationNote: formatNotes(vNotes),
                    violationNotes: vNotes,
                    violationPeriods: hasViolation ? vPs : [],
                    reward: hasReward,
                    rewardNote: formatNotes(rNotes),
                    rewardNotes: rNotes,
                    rewardPeriods: hasReward ? rPs : [],
                    missedPeriods: missedPs
                });
            });

            if (!appUser) {
                console.error('[QuickAttendance] Không tìm thấy thông tin appUser');
                alert('Lỗi: Phiên đăng nhập hết hạn. Vui lòng tải lại trang.');
                return;
            }
            try {
                await batchMarkAttendance(appUser, { classId, session, period: null, marks }, students.map(s => s.student.code), new Date(date));
                onSaved();
                onOpenChange(false);
            } catch (error: any) {
                console.error('[QuickAttendance] Lỗi nghiêm trọng khi lưu:', error);
                alert(error.message || 'Lỗi lưu điểm danh');
            }
        });
    };

    const filteredStudents = students.filter(s =>
        s.student.fullName.toLowerCase().includes(search.toLowerCase()) ||
        s.student.code.toLowerCase().includes(search.toLowerCase())
    );

    const allInViewSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedHs.has(s.student.code));

    return (
        <Modal
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title={`Điểm danh lớp ${className}`}
        >
            <div className="flex flex-col h-[75vh] sm:h-[70vh]">
                <div className="flex flex-wrap items-center gap-2 mb-4 bg-white/50 p-1.5 rounded-2xl border border-gray-100 shadow-sm shrink-0">
                    {/* Nút toggle Buổi Sáng / Chiều */}
                    <div className="flex bg-gray-100/80 rounded-xl p-1">
                        <button
                            onClick={() => onSessionChange?.('morning')}
                            className={cn(
                                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                session === 'morning'
                                    ? "bg-blue-500 text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            )}
                        >
                            ☀️ Buổi Sáng
                        </button>
                        <button
                            onClick={() => onSessionChange?.('afternoon')}
                            className={cn(
                                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                session === 'afternoon'
                                    ? "bg-purple-500 text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            )}
                        >
                            🌙 Buổi Chiều
                        </button>
                    </div>
                    <div className="flex p-1 bg-gray-100/80 rounded-xl">
                        <button
                            onClick={() => { setMode('single'); setSelectedHs(new Set()); setIsSelectorOpen(false); }}
                            className={cn("flex items-center justify-center w-9 h-9 rounded-lg transition-all", mode === 'single' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}
                            title="Từng em"
                        >
                            <User size={18} />
                        </button>
                        <button
                            onClick={() => { setMode('multi'); setIsSelectorOpen(true); }}
                            className={cn("flex items-center justify-center w-9 h-9 rounded-lg transition-all", mode === 'multi' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}
                            title="Hàng loạt"
                        >
                            <Users size={18} />
                        </button>
                    </div>

                    <div className="relative flex-1 min-w-[120px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Tìm học sinh..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs border border-transparent rounded-xl focus:bg-white focus:border-blue-200 outline-none transition-all bg-gray-100/50"
                        />
                    </div>

                    <input
                        type="date"
                        value={date}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="bg-gray-100/80 border border-transparent rounded-xl px-3 py-1.5 text-xs font-bold text-gray-600 outline-none focus:bg-white focus:border-blue-200 cursor-pointer w-auto"
                    />
                </div>

                {mode === 'multi' && (
                    <div className="flex-1 flex flex-col min-h-0 relative">
                        <div className="bg-white border-b border-gray-100 shadow-sm shrink-0">
                            <button
                                onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm transition-all animate-in zoom-in-50 duration-300", selectedHs.size > 0 ? theme.bg + " text-white" : "bg-gray-100 text-gray-400")}>
                                        {selectedHs.size}
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-black text-gray-800 uppercase tracking-tight mb-0.5">Học sinh đã chọn</div>
                                        <div className={cn("text-[10px] font-bold italic", selectedHs.size > 0 ? "text-blue-600" : "text-gray-400")}>
                                            {selectedHs.size === 0 ? "Chưa chọn em nào" : `Đã chọn ${selectedHs.size} em`}
                                        </div>
                                    </div>
                                </div>
                                {isSelectorOpen ? <ChevronUp size={20} className="text-blue-600 animate-bounce-subtle" /> : <ChevronDown size={20} className="text-gray-400" />}
                            </button>
                        </div>

                        {isSelectorOpen && (
                            <div className="absolute top-[64px] left-0 right-0 bottom-0 bg-white/80 backdrop-blur-md z-40 animate-in fade-in duration-200">
                                <div className="bg-white border-b border-gray-200 shadow-2xl max-h-[80%] flex flex-col animate-in slide-in-from-top-2 duration-300">
                                    <div className="p-3 grid grid-cols-1 gap-1.5 overflow-y-auto">
                                        {filteredStudents.map(s => (
                                            <button
                                                key={s.student.code}
                                                onClick={() => {
                                                    setSelectedHs(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(s.student.code)) next.delete(s.student.code);
                                                        else next.add(s.student.code);
                                                        return next;
                                                    });
                                                }}
                                                className={cn("flex items-center gap-3 p-2 rounded-xl transition-all text-left", selectedHs.has(s.student.code) ? "bg-gray-50 ring-1 ring-gray-100" : "hover:bg-gray-50/50")}
                                            >
                                                <div className={cn("w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0", selectedHs.has(s.student.code) ? theme.bg + " " + theme.border + " shadow-sm rotate-0" : "bg-white border-gray-300 rotate-45 group-hover:rotate-0")}>
                                                    {selectedHs.has(s.student.code) && <CheckCircle2 size={12} className="text-white" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={cn("text-xs font-medium truncate tracking-tight", selectedHs.has(s.student.code) ? theme.bg.replace('bg-', 'text-') : "text-gray-700")}>{s.student.fullName}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="p-3 bg-gray-50/90 border-t border-gray-100 flex items-center justify-between shadow-inner shrink-0">
                                        {(() => {
                                            const allInViewSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedHs.has(s.student.code));

                                            return (
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        if (allInViewSelected) setSelectedHs(new Set()); 
                                                        else setSelectedHs(new Set(filteredStudents.map(s => s.student.code))); 
                                                        triggerHapticFeedback(); 
                                                    }}
                                                    className="text-[11px] font-black text-blue-600 uppercase tracking-tighter hover:bg-blue-50 px-3 py-2 rounded-xl transition-colors"
                                                >
                                                    {allInViewSelected ? "Bỏ chọn tất cả" : `CHỌN TOÀN BỘ ${filteredStudents.length} HS`}
                                                </button>
                                            );
                                        })()}
                                        <button onClick={() => { setIsSelectorOpen(false); triggerHapticFeedback(); }} className={cn("text-[11px] font-black uppercase px-6 py-2.5 rounded-xl shadow-lg transition-all active:scale-95", theme.bg, "text-white")}>
                                            XÁC NHẬN ({selectedHs.size})
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1" onClick={() => setIsSelectorOpen(false)} />
                            </div>
                        )}

                        <div className={cn("flex-1 overflow-y-auto p-4 transition-all duration-500", isSelectorOpen ? "opacity-20 blur-[4px] pointer-events-none scale-[0.98]" : "opacity-100 blur-0")}>
                            {selectedHs.size === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3 italic">
                                    <Users size={48} className="opacity-20" />
                                    <p className="text-sm">Vui lòng chọn học sinh để bắt đầu</p>
                                </div>
                            ) : (
                                <div className="space-y-6 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="max-h-[140px] overflow-y-auto pr-1 custom-scrollbar scroll-smooth">
                                        <div className="flex flex-wrap gap-2 p-1">
                                            {Array.from(selectedHs).map(code => {
                                                const s = students.find(x => x.student.code === code);
                                                return (
                                                    <div key={code} className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-sm flex items-center gap-1.5 transition-all text-white", theme.bg, theme.border)}>
                                                        {s?.student.fullName}
                                                        <button onClick={() => setSelectedHs(prev => { const next = new Set(prev); next.delete(code); return next; })} className="hover:scale-110 active:scale-95 transition-transform"><X size={10} className="text-white/80 hover:text-white" /></button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-all overflow-hidden">
                                        {renderAttendanceForm(multiMissedPeriods, multiViolationPeriods, multiRewardPeriods, multiNotes, multiViolationNotes, multiRewardNotes, setMultiMissedPeriods, setMultiViolationPeriods, setMultiRewardPeriods, setMultiNotes, setMultiViolationNotes, setMultiRewardNotes, multiLastActiveP, setMultiLastActiveP, true, '')}
                                    </div>
                                    <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 italic">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 shadow-inner">
                                            <Users size={20} className="text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-black text-blue-900 uppercase tracking-tighter">Chế độ hàng loạt</div>
                                            <div className="text-[10px] text-blue-700/70 font-bold">Dữ liệu trên sẽ áp dụng cho {selectedHs.size} học sinh đang chọn.</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {mode === 'single' && (
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
                                    const isBổSungPhép = localNotesMap[item.student.code] && Object.values(localNotesMap[item.student.code]).some(v => v && v.includes('Có bổ sung Phép'));
                                    let isChecked = targetStatus === 'VP' ? (hasViolation || false) : 
                                                    (targetStatus === 'KH' ? (hasReward || false) : 
                                                    (currentStatus === targetStatus || (targetStatus === 'K' && currentStatus === 'P' && isBổSungPhép)));
                                    const isOtherStatus = !isChecked && (currentStatus || hasViolation || hasReward);

                                    return (
                                        <div key={item.student.code} className={cn("p-3 rounded-xl border transition-all", isMultiSelected ? `${theme.bg} ${theme.border} text-white shadow-md ring-2 ${theme.ripple}` : isChecked ? `${theme.light} ${theme.border} shadow-sm` : isOtherStatus ? 'bg-gray-100 border-gray-200 opacity-60' : 'bg-white border-gray-100 hover:border-blue-200')}>
                                            <div onClick={() => handleToggle(item.student.code)} className="flex items-center justify-between cursor-pointer">
                                                <div className="flex items-center gap-3">
                                                    <div onClick={(e) => { e.stopPropagation(); setSelectedHs(prev => { const next = new Set(prev); if (next.has(item.student.code)) next.delete(item.student.code); else next.add(item.student.code); return next; }); }} className={cn("w-5 h-5 rounded border flex items-center justify-center transition-all", isMultiSelected ? "bg-white border-white" : isChecked ? `${theme.bg} ${theme.border}` : "bg-white border-gray-300")}>
                                                        {(isMultiSelected || isChecked) && <CheckCircle2 className={cn("w-3 h-3", isMultiSelected ? theme.bg.replace('bg-', 'text-') : "text-white")} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className={cn("font-bold text-sm truncate transition-colors", isMultiSelected ? "text-white" : (currentStatus === 'P' ? "text-yellow-600" : currentStatus === 'K' ? "text-red-600" : (currentStatus === 'T' || currentStatus === 'V') ? "text-blue-600" : hasViolation ? "text-purple-600" : hasReward ? "text-green-600" : "text-gray-800"))}>
                                                                {item.student.fullName}
                                                            </h4>
                                                            <span className={cn("text-xs font-mono shrink-0", isMultiSelected ? "text-white/70" : "text-gray-400")}>{item.student.code}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex gap-1">
                                                        {currentStatus && <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", isMultiSelected ? 'bg-white/20 text-white border-white/20' : 'bg-blue-100 text-blue-600 border border-blue-200')}>{currentStatus}</span>}
                                                        {hasViolation && <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", isMultiSelected ? 'bg-white/20 text-white border-white/20' : 'bg-purple-100 text-purple-600 border border-purple-200')}>VP</span>}
                                                        {hasReward && <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", isMultiSelected ? 'bg-white/20 text-white border-white/20' : 'bg-green-100 text-green-600 border border-green-200')}>KH</span>}
                                                    </div>
                                                    {(currentStatus || hasViolation || hasReward) && <button onClick={(e) => handleClear(item.student.code, e)} className={cn("p-1 rounded-full transition-colors", isMultiSelected ? "hover:bg-white/20 text-white/60 hover:text-white" : "hover:bg-red-100 text-red-400 hover:text-red-600")} title="Xóa điểm danh"><X size={14} /></button>}
                                                </div>
                                            </div>
                                            {isChecked && (targetStatus === 'VP' || targetStatus === 'K' || targetStatus === 'P' || targetStatus === 'T' || targetStatus === 'KH') && renderAttendanceForm(
                                                localMissedPeriodsMap[item.student.code] || [],
                                                localViolationPeriodsMap[item.student.code] || [],
                                                localRewardPeriodsMap[item.student.code] || [],
                                                localNotesMap[item.student.code] || {},
                                                localViolationNotesMap[item.student.code] || {},
                                                localRewardNotesMap[item.student.code] || {},
                                                (p) => setLocalMissedPeriodsMap(prev => ({ ...prev, [item.student.code]: p })),
                                                (p) => { setLocalViolationMap(prev => ({ ...prev, [item.student.code]: true })); setLocalViolationPeriodsMap(prev => ({ ...prev, [item.student.code]: p })); },
                                                (p) => { setLocalRewardMap(prev => ({ ...prev, [item.student.code]: true })); setLocalRewardPeriodsMap(prev => ({ ...prev, [item.student.code]: p })); },
                                                (n) => setLocalNotesMap(prev => { const current = prev[item.student.code] || {}; const next = typeof n === 'function' ? n(current) : n; return { ...prev, [item.student.code]: next }; }),
                                                (n) => setLocalViolationNotesMap(prev => { const current = prev[item.student.code] || {}; const next = typeof n === 'function' ? n(current) : n; return { ...prev, [item.student.code]: next }; }),
                                                (n) => setLocalRewardNotesMap(prev => { const current = prev[item.student.code] || {}; const next = typeof n === 'function' ? n(current) : n; return { ...prev, [item.student.code]: next }; }),
                                                lastActivePeriod,
                                                setLastActivePeriod,
                                                false,
                                                item.student.code
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between shrink-0">
                    <div className="text-xs font-bold text-gray-500">
                        Đã chọn: <span className="text-blue-600">
                            {mode === 'multi' ? selectedHs.size : students.filter(item => {
                                const status = localStatusMap[item.student.code];
                                const hasVP = localViolationMap[item.student.code];
                                const hasKH = localRewardMap[item.student.code];
                                if (targetStatus === 'VP') return hasVP;
                                if (targetStatus === 'KH') return hasKH;
                                return status === targetStatus;
                            }).length}
                        </span> em
                    </div>
                    <div className="flex gap-3 px-2">
                        <button onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Hủy</button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={cn("px-6 py-2 text-sm font-black rounded-xl shadow-lg transition-all flex items-center gap-2", isSaving ? "bg-gray-400 cursor-not-allowed" : theme.bg + " text-white hover:scale-105 active:scale-95")}
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            LƯU THAY ĐỔI
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
