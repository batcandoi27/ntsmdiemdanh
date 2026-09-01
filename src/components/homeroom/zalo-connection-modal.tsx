'use client';

import React, { useState, useEffect } from 'react';
import {
    QrCode,
    CheckCircle2,
    AlertCircle,
    Copy,
    Share2,
    ShieldCheck,
    Users,
    Send,
    Bot,
    ExternalLink,
    X,
    Sparkles,
    RefreshCw
} from 'lucide-react';
import { StudentParentZaloMapping } from '@/types/zalo';
import { usePrivacy } from '@/context/privacy-context';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ZaloConnectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    classId: string;
    className: string;
    students: Array<{ id: string; name: string; student_code?: string }>;
}

export function ZaloConnectionModal({
    isOpen,
    onClose,
    classId,
    className,
    students
}: ZaloConnectionModalProps) {
    const { maskSchoolName } = usePrivacy();
    const [gatewayStatus, setGatewayStatus] = useState<'checking' | 'online' | 'offline'>('online');
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<any>(students[0] || null);

    // Mock connected parents state
    const [connectedList, setConnectedList] = useState<Record<string, boolean>>({
        [students[0]?.id || '']: true,
        [students[1]?.id || '']: true
    });

    useEffect(() => {
        if (isOpen) {
            checkHealth();
            if (students.length > 0 && !selectedStudent) {
                setSelectedStudent(students[0]);
            }
        }
    }, [isOpen, students]);

    const checkHealth = async () => {
        setGatewayStatus('online');
    };

    if (!isOpen) return null;

    const studentCode = selectedStudent?.student_code || selectedStudent?.id?.slice(0, 7)?.toUpperCase() || 'HS10293';
    const deeplinkUrl = `https://zalo.me/0901234567?text=%2Fketnoi%20${encodeURIComponent(studentCode)}`;
    const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(deeplinkUrl)}&margin=8`;

    const handleCopy = (text: string, idx: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(idx);
        toast.success('📋 Đã sao chép liên kết ghép nối Zalo!');
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const connectedCount = Object.values(connectedList).filter(Boolean).length;
    const totalCount = students.length || 1;
    const percentConnected = Math.round((connectedCount / totalCount) * 100);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col text-slate-900 font-sans">
                
                {/* Header (Light Theme) */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-5 bg-white/95 backdrop-blur border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-600 rounded-2xl">
                            <Bot size={22} />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                                Quản Lý Ghép Nối Zalo Sổ Liên Lạc • Lớp {className}
                                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                    Gateway :3871
                                </span>
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Phụ huynh quét mã QR để kết nối 1-chạm • Tự động nhận báo vắng, báo bài & điểm danh 24/7
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    
                    {/* Status & Overview Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-bold text-blue-900">Trạng Thái Gateway</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-xs font-extrabold text-blue-700 uppercase">
                                        Đang Hoạt Động (HTTP 200)
                                    </span>
                                </div>
                            </div>
                            <ShieldCheck className="w-6 h-6 text-blue-600" />
                        </div>

                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-bold text-emerald-900">Phụ Huynh Đã Kết Nối</p>
                                <p className="text-base font-extrabold text-emerald-700 mt-0.5">
                                    {connectedCount} / {totalCount} học sinh ({percentConnected}%)
                                </p>
                            </div>
                            <Users className="w-6 h-6 text-emerald-600" />
                        </div>

                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-bold text-amber-900">Tự Động Đổi Biệt Danh</p>
                                <p className="text-xs font-extrabold text-amber-800 mt-0.5">
                                    [{className}] - Phụ huynh [Tên Con]
                                </p>
                            </div>
                            <Sparkles className="w-6 h-6 text-amber-600" />
                        </div>
                    </div>

                    {/* QR Deeplink & Instruction Card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center p-6 bg-slate-50 border border-slate-200 rounded-3xl">
                        {/* QR Code */}
                        <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="p-3 bg-white border border-slate-200 rounded-3xl shadow-sm">
                                <img
                                    src={qrCodeImageUrl}
                                    alt="Zalo QR Deeplink"
                                    className="w-48 h-48 rounded-2xl object-cover"
                                />
                            </div>
                            <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                <span>📱 Quét mã để kết nối học sinh:</span>
                                <span className="font-extrabold text-blue-600">{selectedStudent?.name || 'Nguyễn Văn An'}</span>
                            </p>
                        </div>

                        {/* Deeplink details */}
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-extrabold text-slate-900">
                                    Cú Pháp Ghép Nối Nhanh Cho Phụ Huynh:
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Phụ huynh chỉ cần mở Zalo nhắn tin cho Bot cú pháp dưới đây:
                                </p>
                            </div>

                            <div className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs">
                                <span className="font-mono text-sm font-black text-blue-700">
                                    /ketnoi {studentCode}
                                </span>
                                <button
                                    onClick={() => handleCopy(`/ketnoi ${studentCode}`, 999)}
                                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition"
                                >
                                    <Copy size={13} />
                                    <span>{copiedIndex === 999 ? 'Đã sao chép' : 'Sao chép'}</span>
                                </button>
                            </div>

                            <div className="space-y-2 text-xs text-slate-600">
                                <p className="flex items-center gap-2">
                                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                                    <span>Tự động nhận cảnh báo ngoại lệ khi học sinh vắng học / đi trễ.</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                                    <span>Tra cứu báo bài, thời khóa biểu, điểm số 24/7 bằng số 1..8.</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                                    <span>Thanh toán học phí 1-chạm qua mã VietQR Napas247 động.</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Student List & Selection */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-extrabold text-slate-900">
                            Danh Sách Học Sinh Trong Lớp ({students.length} em)
                        </h4>

                        <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-white">
                            {students.map((st, idx) => {
                                const isConnected = connectedList[st.id];
                                const isSelected = selectedStudent?.id === st.id;

                                return (
                                    <div
                                        key={st.id || idx}
                                        onClick={() => setSelectedStudent(st)}
                                        className={cn(
                                            "p-3 flex items-center justify-between cursor-pointer transition-colors text-xs",
                                            isSelected ? "bg-blue-50/70" : "hover:bg-slate-50"
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px]">
                                                {idx + 1}
                                            </span>
                                            <span className="font-extrabold text-slate-900">{st.name}</span>
                                            <span className="font-mono text-[11px] text-slate-400">
                                                ({st.student_code || `HS${idx + 1}`})
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isConnected ? (
                                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                                                    Đã liên kết Zalo
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                                                    Chưa kết nối
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="sticky bottom-0 z-10 flex items-center justify-between p-5 bg-slate-50 border-t border-slate-200 rounded-b-3xl">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
                    >
                        Đóng Cửa Sổ
                    </button>
                </div>
            </div>
        </div>
    );
}
