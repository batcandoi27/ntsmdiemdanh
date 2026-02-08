"use client";

import { AttendanceStatus } from "@/types/models";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, FileText, Ban, AlertTriangle, User, MoreVertical, X, ChevronLeft, Save } from "lucide-react";
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
    onUpdateStatus: (status: AttendanceStatus, note?: string) => void;
}

const VIOLATION_REASONS = [
    "Không đồng phục", "Tóc dài/nhuộm",
    "Sử dụng điện thoại", " Ồn ào/Nói chuyện",
    "Không thuộc bài", "Đi trễ (VP)",
    "Quên dụng cụ", "Ngủ trong lớp",
    "Ăn vụng", "Xả rác"
];

export function MobileStudentCard({ student, status, note, onUpdateStatus }: MobileStudentCardProps) {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<'MAIN' | 'VIOLATION'>('MAIN');
    const [violationReason, setViolationReason] = useState(note || '');

    useEffect(() => {
        if (open) {
            setView('MAIN');
            setViolationReason(note || '');
        }
    }, [open, note]);

    // Helpers for display
    const shortName = (student.name || 'Học Sinh').split(' ').slice(-2).join(' ');

    const getStatusIcon = (s: AttendanceStatus) => {
        switch (s) {
            case 'P': return <FileText className="text-yellow-600" size={24} />;
            case 'K': return <X className="text-red-600" size={24} />;
            case 'T': return <Clock className="text-blue-600" size={24} />;
            case 'VP': return <AlertTriangle className="text-purple-600" size={24} />;
            default: return <CheckCircle2 className="text-green-500/20" size={24} />;
        }
    };

    const getStatusLabel = (s: AttendanceStatus) => {
        switch (s) {
            case 'P': return 'Phép';
            case 'K': return 'Không';
            case 'T': return 'Trễ';
            case 'VP': return 'Vi Phạm';
            default: return 'Có mặt';
        }
    };

    const isException = status !== 'Present';

    const handleSaveViolation = () => {
        onUpdateStatus('VP', violationReason);
        setOpen(false);
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
                            {view === 'VIOLATION' && (
                                <button
                                    onClick={() => setView('MAIN')}
                                    className="absolute left-0 p-2 -ml-2 text-gray-400 hover:text-gray-600"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                            )}
                            <span className="truncate max-w-[200px]">{student.name}</span>
                        </Drawer.Title>

                        {view === 'MAIN' ? (
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <StatusButton
                                    type="Present"
                                    active={status === 'Present'}
                                    icon={<CheckCircle2 size={24} />}
                                    label="Có mặt"
                                    onClick={() => { onUpdateStatus('Present'); setOpen(false); }}
                                    color="green"
                                />
                                <StatusButton
                                    type="T"
                                    active={status === 'T'}
                                    icon={<Clock size={24} />}
                                    label="Đi trễ"
                                    onClick={() => { onUpdateStatus('T'); setOpen(false); }}
                                    color="blue"
                                />
                                <StatusButton
                                    type="P"
                                    active={status === 'P'}
                                    icon={<FileText size={24} />}
                                    label="Có phép"
                                    onClick={() => { onUpdateStatus('P'); setOpen(false); }}
                                    color="yellow"
                                />
                                <StatusButton
                                    type="K"
                                    active={status === 'K'}
                                    icon={<Ban size={24} />}
                                    label="Không phép"
                                    onClick={() => { onUpdateStatus('K'); setOpen(false); }}
                                    color="red"
                                />
                                <StatusButton
                                    type="VP"
                                    active={status === 'VP'}
                                    icon={<AlertTriangle size={24} />}
                                    label="Vi phạm"
                                    onClick={() => setView('VIOLATION')}
                                    color="purple"
                                    className="col-span-2"
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Chọn lỗi vi phạm</h3>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    {VIOLATION_REASONS.map(reason => (
                                        <button
                                            key={reason}
                                            onClick={() => setViolationReason(reason)}
                                            className={cn(
                                                "py-3 px-2 rounded-lg text-sm font-medium border transition-colors",
                                                violationReason === reason
                                                    ? "bg-purple-100 border-purple-500 text-purple-800"
                                                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                            )}
                                        >
                                            {reason}
                                        </button>
                                    ))}
                                </div>

                                <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Hoặc nhập chi tiết</h3>
                                <textarea
                                    value={violationReason}
                                    onChange={(e) => setViolationReason(e.target.value)}
                                    placeholder="Ví dụ: Nói chuyện, Xả rác..."
                                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px] text-base mb-4 bg-gray-50"
                                />

                                <button
                                    onClick={handleSaveViolation}
                                    disabled={!violationReason.trim()}
                                    className="w-full bg-purple-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all text-lg flex items-center justify-center gap-2 mt-auto disabled:opacity-50 disabled:shadow-none"
                                >
                                    <Save size={20} />
                                    LƯU VI PHẠM
                                </button>
                            </div>
                        )}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}

function StatusButton({ type, active, icon, label, onClick, color, className }: any) {
    const activeClass = {
        green: "bg-green-100 border-green-500 text-green-800 ring-1 ring-green-500",
        blue: "bg-blue-100 border-blue-500 text-blue-800 ring-1 ring-blue-500",
        yellow: "bg-yellow-100 border-yellow-500 text-yellow-800 ring-1 ring-yellow-500",
        red: "bg-red-100 border-red-500 text-red-800 ring-1 ring-red-500",
        purple: "bg-purple-100 border-purple-500 text-purple-800 ring-1 ring-purple-500",
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
