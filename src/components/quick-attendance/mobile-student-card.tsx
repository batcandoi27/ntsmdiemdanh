"use client";

import { AttendanceStatus } from "@/types/models";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, FileText, Ban, AlertTriangle, User, MoreVertical, X, ChevronLeft, Save, Star } from "lucide-react";
import { Drawer } from "vaul"; // Using Vaul for bottom sheet
import { useState, useEffect } from "react";

interface MobileStudentCardProps {
    student: {
        id: string;
        name: string;
        code: string;
        stt?: number;
    };
    status: AttendanceStatus;
    note?: string;
    missedPeriods?: number[];
    violation?: boolean;
    violationNote?: string;
    violationPeriods?: number[];
    reward?: boolean;
    rewardNote?: string;
    onUpdateAll: (data: {
        status: AttendanceStatus;
        note?: string;
        missedPeriods?: number[];
        violation?: boolean;
        violationNote?: string;
        violationPeriods?: number[];
        reward?: boolean;
        rewardNote?: string;
    }) => void;
    visibleStatuses?: { P: boolean; K: boolean; T: boolean; VP: boolean; KH: boolean };
    customColumns?: { id: string; name: string; checked: boolean }[];
    onUpdateCustomColumn?: (colId: string, checked: boolean) => void;
}

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

export function MobileStudentCard({
    student, status, note, 
    missedPeriods = [1,2,3,4,5],
    violation, violationNote, violationPeriods = [1,2,3,4,5],
    reward, rewardNote,
    onUpdateAll,
    visibleStatuses = { P: true, K: true, T: true, VP: true, KH: true },
    customColumns = [],
    onUpdateCustomColumn
}: MobileStudentCardProps) {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<'MAIN' | 'DETAILS'>('MAIN');
    
    // Local State for Editing
    const [localStatus, setLocalStatus] = useState<AttendanceStatus>(status);
    const [localNote, setLocalNote] = useState(note || '');
    const [localMissedPeriods, setLocalMissedPeriods] = useState<number[]>(missedPeriods || [1,2,3,4,5]);
    
    const [localViolation, setLocalViolation] = useState(violation || false);
    const [localVNote, setLocalVNote] = useState(violationNote || '');
    const [localVPeriods, setLocalVPeriods] = useState<number[]>(violationPeriods || [1,2,3,4,5]);
    
    const [localReward, setLocalReward] = useState(reward || false);
    const [localRNote, setLocalRNote] = useState(rewardNote || '');

    useEffect(() => {
        if (open) {
            setView('MAIN');
            setLocalStatus(status);
            setLocalNote(note || '');
            setLocalMissedPeriods(missedPeriods || [1,2,3,4,5]);
            setLocalViolation(violation || false);
            setLocalVNote(violationNote || '');
            setLocalVPeriods(violationPeriods || [1,2,3,4,5]);
            setLocalReward(reward || false);
            setLocalRNote(rewardNote || '');
        }
    }, [open, status, note, missedPeriods, violation, violationNote, violationPeriods, reward, rewardNote]);

    // Helpers for display
    const shortName = (student.name || 'Học Sinh').split(' ').slice(-2).join(' ');

    const getStatusIcon = (s: AttendanceStatus) => {
        switch (s) {
            case 'P': return <FileText className="text-yellow-600" size={24} />;
            case 'K': return <X className="text-red-600" size={24} />;
            case 'T': return <Clock className="text-blue-600" size={24} />;
            case 'VP': return <AlertTriangle className="text-purple-600" size={24} />;
            case 'KH': return <Star className="text-orange-500" size={24} />;
            default: return <CheckCircle2 className="text-green-500/20" size={24} />;
        }
    };

    const getStatusLabel = (s: AttendanceStatus) => {
        switch (s) {
            case 'P': return 'Phép';
            case 'K': return 'Không';
            case 'T': return 'Trễ';
            case 'VP': return 'Vi Phạm';
            case 'KH': return 'Khen thưởng';
            default: return 'Có mặt';
        }
    };

    const isException = status !== '' || violation || reward;

    const handleSave = () => {
        onUpdateAll({
            status: localStatus,
            note: localNote,
            missedPeriods: localMissedPeriods,
            violation: localViolation,
            violationNote: localVNote,
            violationPeriods: localVPeriods,
            reward: localReward,
            rewardNote: localRNote
        });
        setOpen(false);
    };

    const togglePeriod = (p: number, type: 'missed' | 'violation') => {
        if (type === 'missed') {
            setLocalMissedPeriods(prev => 
                prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p].sort()
            );
        } else {
            setLocalVPeriods(prev => 
                prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p].sort()
            );
        }
    };

    return (
        <Drawer.Root open={open} onOpenChange={setOpen}>
            <Drawer.Trigger asChild>
                <div className={cn(
                    "flex items-center justify-between p-4 bg-white border-b border-gray-100/50 active:bg-gray-50 transition-colors touch-pan-y select-none",
                    isException ? "bg-gray-50/80" : ""
                )}>
                    {/* Left: Info */}
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                            isException ? "bg-white border shadow-sm text-gray-700" : "bg-gray-100 text-gray-400"
                        )}>
                            {student.stt || '#'}
                        </div>
                        <div>
                            <h4 className={cn("text-lg font-medium leading-tight", isException ? "text-gray-900" : "text-gray-700")}>
                                {shortName}
                            </h4>
                            {note && (
                                <p className="text-xs text-red-500 font-medium mt-0.5 line-clamp-1">
                                    {note}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right: Status Icon */}
                    <div className="flex items-center gap-2">
                        {isException && (
                            <span className={cn(
                                "text-xs font-bold px-2 py-0.5 rounded-full",
                                status === 'P' && "bg-yellow-100 text-yellow-800",
                                status === 'K' && "bg-red-100 text-red-800",
                                status === 'T' && "bg-blue-100 text-blue-800",
                                status === 'VP' && "bg-purple-100 text-purple-800",
                                status === 'KH' && "bg-orange-100 text-orange-800",
                            )}>
                                {getStatusLabel(status)}
                            </span>
                        )}
                        {getStatusIcon(status)}
                    </div>
                </div>
            </Drawer.Trigger>

            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
                <Drawer.Content className="bg-white flex flex-col rounded-t-[20px] h-[65vh] fixed bottom-0 left-0 right-0 z-50 focus:outline-none">
                    {/* Handle */}
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mt-4 mb-4" />

                    <div className="p-4 flex-1 overflow-y-auto">
                        <Drawer.Title className="text-xl font-bold text-center mb-6 flex items-center justify-center relative">
                            {view === 'DETAILS' && (
                                <button
                                    onClick={() => setView('MAIN')}
                                    className="absolute left-0 p-2 -ml-2 text-gray-400 hover:text-gray-600"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                            )}
                            <div className="flex flex-col items-center">
                                <span className="truncate max-w-[240px] leading-tight">{student.name}</span>
                                <span className="text-xs font-mono text-gray-400 font-normal mt-1">{student.code}</span>
                            </div>
                        </Drawer.Title>

                        {view === 'MAIN' ? (
                            <div className="space-y-6 pb-20">
                                {/* Fixed Columns */}
                                <div className="grid grid-cols-2 gap-3">
                                    <StatusButton
                                        active={localStatus === ''}
                                        icon={<CheckCircle2 size={24} />}
                                        label="Có mặt"
                                        onClick={() => { setLocalStatus(''); setLocalNote(''); }}
                                        color="green"
                                    />
                                    {visibleStatuses.T && (
                                        <StatusButton
                                            active={localStatus === 'T'}
                                            icon={<Clock size={24} />}
                                            label="Đi trễ"
                                            onClick={() => { setLocalStatus('T'); setView('DETAILS'); }}
                                            color="blue"
                                        />
                                    )}
                                    {visibleStatuses.P && (
                                        <StatusButton
                                            active={localStatus === 'P'}
                                            icon={<FileText size={24} />}
                                            label="Có phép"
                                            onClick={() => { setLocalStatus('P'); setView('DETAILS'); }}
                                            color="yellow"
                                        />
                                    )}
                                    {visibleStatuses.K && (
                                        <StatusButton
                                            active={localStatus === 'K'}
                                            icon={<Ban size={24} />}
                                            label="Không phép"
                                            onClick={() => { setLocalStatus('K'); setView('DETAILS'); }}
                                            color="red"
                                        />
                                    )}
                                    {visibleStatuses.VP && (
                                        <StatusButton
                                            active={localViolation}
                                            icon={<AlertTriangle size={24} />}
                                            label="Vi phạm"
                                            onClick={() => { setLocalViolation(!localViolation); setView('DETAILS'); }}
                                            color="purple"
                                        />
                                    )}
                                    {visibleStatuses.KH && (
                                        <StatusButton
                                            active={localReward}
                                            icon={<Star size={24} />}
                                            label="Khen thưởng"
                                            onClick={() => { setLocalReward(!localReward); setView('DETAILS'); }}
                                            color="orange"
                                        />
                                    )}
                                </div>

                                {/* Custom Columns */}
                                {customColumns.length > 0 && (
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        {customColumns.map(col => (
                                            <button
                                                key={col.id}
                                                onClick={() => onUpdateCustomColumn?.(col.id, !col.checked)}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-xl border-2 transition-all active:scale-95 text-left h-16",
                                                    col.checked ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "bg-white border-gray-100 text-gray-600"
                                                )}
                                            >
                                                <div className={cn("w-5 h-5 rounded border flex items-center justify-center shrink-0", col.checked ? "bg-indigo-500 border-indigo-500 text-white" : "border-gray-300")}>
                                                    {col.checked && <CheckCircle2 size={12} />}
                                                </div>
                                                <span className="font-bold text-xs line-clamp-2">{col.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Bottom Floating Action */}
                                <div className="fixed bottom-6 left-4 right-4 animate-in slide-in-from-bottom-4">
                                    <button
                                        onClick={handleSave}
                                        className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-lg"
                                    >
                                        <Save size={20} />
                                        HOÀN TẤT
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 pb-24">
                                {/* DETAIL VIEW: Show specific controls based on what's active */}
                                
                                {/* 1. Attendance Details (P, K, T) */}
                                {(['P', 'K', 'T'].includes(localStatus)) && (
                                    <div className="animate-in fade-in slide-in-from-right-4">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                                            Chi tiết {getStatusLabel(localStatus)}
                                        </h3>
                                        
                                        <div className="mb-6">
                                            <p className="text-xs text-gray-400 mb-3">Chọn các tiết vắng/muộn:</p>
                                            <div className="grid grid-cols-5 gap-2">
                                                {[1, 2, 3, 4, 5].map(p => (
                                                    <button
                                                        key={p}
                                                        onClick={() => togglePeriod(p, 'missed')}
                                                        className={cn(
                                                            "py-3 rounded-xl font-bold border-2 transition-all",
                                                            localMissedPeriods.includes(p)
                                                                ? "bg-blue-50 border-blue-500 text-blue-700"
                                                                : "bg-white border-gray-100 text-gray-400"
                                                        )}
                                                    >
                                                        T{p}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-4 mb-4">
                                            {(['P', 'K'].includes(localStatus)) && (NOTE_SUGGESTIONS[localStatus as 'P' | 'K']).map(group => (
                                                <div key={group.group} className="space-y-2">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{group.group}</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {group.items.map(item => (
                                                            <button
                                                                key={item}
                                                                onClick={() => setLocalNote(item)}
                                                                className={cn(
                                                                    "py-2.5 px-2 rounded-xl text-[11px] font-bold border transition-all active:scale-95",
                                                                    localNote === item ? "bg-gray-800 border-gray-800 text-white shadow-md" : cn("bg-white border-gray-100", group.color)
                                                                )}
                                                            >
                                                                {item}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <textarea
                                            value={localNote}
                                            onChange={(e) => setLocalNote(e.target.value)}
                                            placeholder="Ghi chú thêm..."
                                            className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-blue-400 outline-none min-h-[100px] text-lg bg-gray-50/50"
                                        />
                                    </div>
                                )}

                                {/* 2. Violation Details */}
                                {localViolation && (
                                    <div className="animate-in fade-in slide-in-from-right-4 border-t pt-6">
                                        <h3 className="text-sm font-bold text-purple-600 uppercase mb-4 flex items-center gap-2">
                                            Chi tiết Vi phạm
                                        </h3>

                                        <div className="mb-6">
                                            <p className="text-xs text-gray-400 mb-3">Tiết vi phạm:</p>
                                            <div className="grid grid-cols-5 gap-2">
                                                {[1, 2, 3, 4, 5].map(p => (
                                                    <button
                                                        key={p}
                                                        onClick={() => togglePeriod(p, 'violation')}
                                                        className={cn(
                                                            "py-3 rounded-xl font-bold border-2 transition-all",
                                                            localVPeriods.includes(p)
                                                                ? "bg-purple-50 border-purple-500 text-purple-700"
                                                                : "bg-white border-gray-100 text-gray-400"
                                                        )}
                                                    >
                                                        T{p}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-4 mb-4">
                                            {NOTE_SUGGESTIONS.VP.map(group => (
                                                <div key={group.group} className="space-y-2">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{group.group}</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {group.items.map(reason => (
                                                            <button
                                                                key={reason}
                                                                onClick={() => setLocalVNote(reason)}
                                                                className={cn(
                                                                    "py-2.5 px-2 rounded-xl text-[11px] font-bold border transition-all active:scale-95",
                                                                    localVNote === reason ? "bg-purple-600 border-purple-600 text-white shadow-md" : cn("bg-white border-gray-100", group.color)
                                                                )}
                                                            >
                                                                {reason}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <textarea
                                            value={localVNote}
                                            onChange={(e) => setLocalVNote(e.target.value)}
                                            placeholder="Nội dung vi phạm..."
                                            className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-400 outline-none min-h-[100px] text-lg bg-gray-50/50"
                                        />
                                    </div>
                                )}

                                {/* 3. Reward Details */}
                                {localReward && (
                                    <div className="animate-in fade-in slide-in-from-right-4 border-t pt-6">
                                        <h3 className="text-sm font-bold text-orange-500 uppercase mb-4">Mô tả Khen thưởng</h3>
                                        <div className="space-y-4 mb-4">
                                            {NOTE_SUGGESTIONS.KH.map(group => (
                                                <div key={group.group} className="space-y-2">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{group.group}</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {group.items.map(item => (
                                                            <button
                                                                key={item}
                                                                onClick={() => setLocalRNote(item)}
                                                                className={cn(
                                                                    "py-2.5 px-2 rounded-xl text-[11px] font-bold border transition-all active:scale-95",
                                                                    localRNote === item ? "bg-orange-500 border-orange-500 text-white shadow-md" : cn("bg-white border-gray-100", group.color)
                                                                )}
                                                            >
                                                                {item}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <textarea
                                            value={localRNote}
                                            onChange={(e) => setLocalRNote(e.target.value)}
                                            placeholder="Vì sao em được khen?"
                                            className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-orange-400 outline-none min-h-[100px] text-lg bg-gray-50/50"
                                        />
                                    </div>
                                )}

                                {/* Bottom Floating Action for Details View */}
                                <div className="fixed bottom-6 left-4 right-4">
                                    <button
                                        onClick={() => setView('MAIN')}
                                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-lg"
                                    >
                                        <ChevronLeft size={20} />
                                        QUAY LẠI CHỌN TIẾP
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}

function StatusButton({ active, icon, label, onClick, color, className }: any) {
    const activeClass = {
        green: "bg-green-100 border-green-500 text-green-800 ring-1 ring-green-500",
        blue: "bg-blue-100 border-blue-500 text-blue-800 ring-1 ring-blue-500",
        yellow: "bg-yellow-100 border-yellow-500 text-yellow-800 ring-1 ring-yellow-500",
        red: "bg-red-100 border-red-500 text-red-800 ring-1 ring-red-500",

        purple: "bg-purple-100 border-purple-500 text-purple-800 ring-1 ring-purple-500",
        orange: "bg-orange-100 border-orange-500 text-orange-800 ring-1 ring-orange-500",
    }[color as string];

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all active:scale-95 h-24",
                active ? activeClass : "border-gray-100 hover:bg-gray-50 text-gray-500 bg-white",
                className
            )}
        >
            <div className={cn("mb-2", active ? "" : "opacity-50")}>{icon}</div>
            <span className="font-bold">{label}</span>
        </button>
    )
}
