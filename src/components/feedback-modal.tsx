'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/context/auth-context';
import { sendFeedback, getMyFeedbacks, markFeedbackAsRead } from '@/app/actions/feedback';
import { MessageSquare, Send, Loader2, Bug, Lightbulb, HelpCircle, History, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface FeedbackModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const FEEDBACK_TYPES = [
    { id: 'bug', label: 'Lỗi', icon: Bug, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
    { id: 'feature', label: 'Đề xuất', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
    { id: 'other', label: 'Khác', icon: HelpCircle, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' }
];

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
    const { appUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
    
    const [type, setType] = useState('bug');
    const [content, setContent] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    const [history, setHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    useEffect(() => {
        if (open && activeTab === 'history') {
            loadHistory();
        }
    }, [open, activeTab]);

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        const data = await getMyFeedbacks(appUser);
        setHistory(data || []);
        setIsLoadingHistory(false);
    };

    const handleSubmit = async () => {
        if (!content || content.trim().length < 10) {
            toast.error("Nội dung góp ý quá ngắn (tối thiểu 10 ký tự).");
            return;
        }

        setIsSending(true);
        try {
            const result = await sendFeedback(appUser, { type, content });
            if (result.success) {
                toast.success(result.message);
                setContent('');
                setActiveTab('history');
            } else {
                toast.error(result.message);
            }
        } catch (error: any) {
            toast.error("Đã có lỗi xảy ra.");
        } finally {
            setIsSending(false);
        }
    };

    const handleRead = async (id: string, isRead: boolean) => {
        if (!isRead) {
            await markFeedbackAsRead(id);
            setHistory(prev => prev.map(h => h.id === id ? { ...h, is_read_user: true } : h));
        }
    };

    return (
        <Modal
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title="Trung tâm Góp ý & Phản hồi"
            overlayClassName="items-start justify-center pt-10 sm:pt-20"
            className="max-w-md sm:max-w-lg shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)]"
        >
            <div className="flex flex-col h-[75vh] sm:h-[65vh] bg-white">
                {/* Tabs */}
                <div className="px-6 pt-4">
                    <div className="flex bg-gray-100/80 p-1 rounded-2xl mb-4 shrink-0 backdrop-blur-sm">
                        <button
                            onClick={() => setActiveTab('send')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black transition-all rounded-xl",
                                activeTab === 'send' ? "bg-white shadow-md text-blue-600 ring-1 ring-black/5" : "text-gray-500 hover:bg-gray-200/50"
                            )}
                        >
                            <Send size={14} strokeWidth={3} /> GỬI GÓP Ý
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black transition-all rounded-xl relative",
                                activeTab === 'history' ? "bg-white shadow-md text-blue-600 ring-1 ring-black/5" : "text-gray-500 hover:bg-gray-200/50"
                            )}
                        >
                            <History size={14} strokeWidth={3} /> LỊCH SỬ
                            {history?.some(h => !h.is_read_user) && (
                                <span className="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 custom-scrollbar pb-6">
                    {activeTab === 'send' ? (
                        <div className="space-y-6 py-2">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Loại phản hồi:</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {FEEDBACK_TYPES.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setType(t.id)}
                                            className={cn(
                                                "flex flex-col items-center gap-2 p-3 rounded-[1.5rem] border-2 transition-all group/btn",
                                                type === t.id 
                                                    ? `bg-white shadow-xl shadow-blue-50 border-blue-500 ring-4 ring-blue-50 scale-[1.05]` 
                                                    : "bg-gray-50/50 border-transparent hover:border-gray-200 hover:bg-white"
                                            )}
                                        >
                                            <div className={cn("p-2 rounded-2xl transition-all group-hover/btn:scale-110", type === t.id ? t.bg : "bg-white border border-gray-100 shadow-sm")}>
                                                <t.icon size={20} className={t.color} strokeWidth={2.5} />
                                            </div>
                                            <span className={cn("text-[10px] font-black uppercase tracking-tighter", type === t.id ? "text-blue-600" : "text-gray-400")}>{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] px-1">Nội dung phản hồi:</label>
                                <div className="relative group">
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="Để lại ý kiến của bạn tại đây..."
                                        className="w-full h-44 p-5 text-sm font-semibold border border-border-default rounded-[1.5rem] focus:ring-4 focus:ring-sky-500/15 focus:border-border-focus outline-none transition-all resize-none bg-surface-card text-text-primary placeholder:text-text-disabled shadow-xs"
                                        disabled={isSending}
                                    />
                                    <div className="absolute bottom-4 right-4 text-[10px] font-black text-text-tertiary bg-surface-section/90 px-2 py-1 rounded-lg border border-border-subtle">
                                        {content.trim().length}/10 ký tự
                                    </div>
                                </div>
                            </div>

                            <div className="flex pt-4">
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSending || content.trim().length < 10}
                                    className={cn(
                                        "w-full py-5 text-sm font-black text-white rounded-[1.5rem] shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] flex items-center justify-center gap-3 transition-all active:scale-[0.97] active:shadow-none hover:-translate-y-1 hover:shadow-[0_25px_50px_-12px_rgba(37,99,235,0.5)]",
                                        isSending ? "bg-gray-400" : "bg-gradient-to-br from-blue-600 to-indigo-700 disabled:opacity-50 disabled:grayscale disabled:translate-y-0 disabled:shadow-none"
                                    )}
                                >
                                    {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} strokeWidth={2.5} />}
                                    GỬI PHẢN HỒI
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 py-4 pb-12">
                            {isLoadingHistory ? (
                                <div className="flex flex-col items-center justify-center py-24 gap-4">
                                    <Loader2 className="animate-spin text-primary" size={40} />
                                    <span className="text-[11px] font-black text-text-tertiary uppercase tracking-[0.3em] animate-pulse">Lục lại lịch sử...</span>
                                </div>
                            ) : history.length === 0 ? (
                                <div className="text-center py-24 animate-in fade-in zoom-in duration-500">
                                    <div className="bg-surface-section w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xs border border-border-subtle rotate-12">
                                        <MessageSquare className="text-text-tertiary -rotate-12" size={48} strokeWidth={1.5} />
                                    </div>
                                    <div className="text-text-primary font-black italic text-sm uppercase tracking-widest">Chưa có phản hồi nào</div>
                                    <p className="text-xs text-text-secondary font-semibold mt-2 tracking-tight">Hãy để lại dấu ấn đầu tiên tại tab Gửi Góp Ý</p>
                                </div>
                            ) : (
                                history.map((h) => (
                                    <div 
                                        key={h.id} 
                                        className="space-y-4"
                                        onMouseEnter={() => handleRead(h.id, h.is_read_user)}
                                    >
                                        <div className="flex justify-center">
                                            <span className="bg-gray-100 text-[10px] font-black text-gray-400 px-4 py-1.5 rounded-full uppercase tracking-tighter shadow-sm border border-white">
                                                {format(new Date(h.created_at), "HH:mm, dd MMMM yyyy", { locale: vi })}
                                                {' • '}
                                                {h.type === 'bug' ? 'Lỗi hệ thống' : h.type === 'feature' ? 'Đề xuất mới' : 'Ý kiến khác'}
                                            </span>
                                        </div>

                                        {/* User Bubble */}
                                        <div className="flex flex-col items-end gap-1.5 pl-12 animate-in slide-in-from-right-4 fade-in duration-500">
                                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 rounded-[1.8rem] rounded-tr-none shadow-xl shadow-blue-100/50 max-w-full">
                                                <p className="text-sm font-semibold leading-relaxed whitespace-pre-wrap">{h.content}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-1 px-2">
                                                <span className="text-[10px] font-black text-gray-400 uppercase">Sếp gửi</span>
                                                <div className="w-1 h-1 bg-gray-300 rounded-full" />
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                    {format(new Date(h.created_at), "HH:mm")}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Admin Response */}
                                        {h.status === 'replied' && h.reply_content ? (
                                            <div className="flex flex-col items-start gap-1.5 pr-12 animate-in slide-in-from-left-4 fade-in duration-700">
                                                <div className="bg-white border-2 border-gray-100 p-4 rounded-[1.8rem] rounded-tl-none shadow-lg shadow-black/5 max-w-full relative overflow-hidden group/admin">
                                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 transition-all group-hover/admin:w-2" />
                                                    <p className="text-sm font-semibold text-gray-800 leading-relaxed whitespace-pre-wrap">{h.reply_content}</p>
                                                </div>
                                                <div className="flex items-center gap-2 px-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-5 h-5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white text-[9px] font-black shadow-md">A</div>
                                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Admin Phản hồi</span>
                                                    </div>
                                                    <div className="w-1 h-1 bg-gray-300 rounded-full" />
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                        {format(new Date(h.updated_at), "HH:mm")}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 animate-pulse pl-4 group/pending">
                                                <div className="w-2 h-2 bg-amber-400 rounded-full ring-4 ring-amber-50" />
                                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest italic group-hover/pending:tracking-[0.15em] transition-all">Đang chờ Admin phê duyệt...</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #f1f3f6;
                    border-radius: 10px;
                    border: 1px solid #ffffff;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #e5e7eb;
                }
            `}</style>
        </Modal>
    );
}
