'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { getFeedbacksAdmin, replyToFeedback, markAsReadByAdmin } from '@/app/actions/feedback';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MessageSquare, Send, Loader2, Bug, Lightbulb, HelpCircle, CheckCircle2, User, Mail, Search, ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export default function AdminFeedbackPage() {
    const { appUser, loading: authLoading } = useAuth();
    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [replyContent, setReplyContent] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!authLoading && appUser?.role === 'admin') {
            loadFeedbacks();
        }
    }, [authLoading, appUser]);

    useEffect(() => {
        if (replyingTo) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [replyingTo]);

    const loadFeedbacks = async () => {
        setLoading(true);
        const data = await getFeedbacksAdmin(appUser);
        setFeedbacks(data);
        setLoading(false);
    };

    const handleReply = async () => {
        if (!replyContent || replyContent.trim().length < 5) {
            toast.error("Nội dung phản hồi quá ngắn.");
            return;
        }

        setIsSending(true);
        try {
            const result = await replyToFeedback(appUser, replyingTo.id, replyContent);
            if (result.success) {
                toast.success(result.message);
                // Cập nhật local
                const updatedAt = new Date().toISOString();
                setFeedbacks(prev => prev.map(f => f.id === replyingTo.id ? { ...f, reply_content: replyContent, status: 'replied', updated_at: updatedAt } : f));
                setReplyingTo(prev => ({ ...prev, reply_content: replyContent, status: 'replied', updated_at: updatedAt }));
                setReplyContent('');
            } else {
                toast.error(result.message);
            }
        } catch (error: any) {
            toast.error("Lỗi khi gửi phản hồi.");
        } finally {
            setIsSending(false);
        }
    };

    const onSelectFeedback = (f: any) => {
        setReplyingTo(f);
        setReplyContent(f.reply_content || '');
        if (!f.is_read_admin) {
            markAsReadByAdmin(f.id);
            setFeedbacks(prev => prev.map(item => item.id === f.id ? { ...item, is_read_admin: true } : item));
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="animate-spin text-blue-600" size={48} />
                <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Đang tải dữ liệu Feedback...</p>
            </div>
        );
    }

    if (appUser?.role !== 'admin') {
        return (
            <div className="max-w-md mx-auto mt-20 p-8 bg-red-50 rounded-3xl border-2 border-red-100 text-center space-y-4">
                <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-red-600">
                    <Bug size={32} />
                </div>
                <h1 className="text-xl font-black text-red-800 uppercase">Truy cập bị chặn!</h1>
                <p className="text-sm font-medium text-red-600">Sếp cần quyền Admin để vào khu vực này.</p>
            </div>
        );
    }

    const filtered = feedbacks.filter(f => 
        f.user_email?.toLowerCase().includes(search.toLowerCase()) ||
        f.content?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="h-[calc(100vh-120px)] max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-100">
                            <MessageSquare size={24} strokeWidth={2.5} />
                        </div>
                        Trung tâm Điều hành Feedback
                    </h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 ml-14">
                        Lắng nghe và hỗ trợ Sếp mỗi ngày
                    </p>
                </div>
                
                <div className="relative w-full sm:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm theo nội dung hoặc email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 text-sm font-medium border-2 border-gray-100 rounded-2xl focus:ring-0 focus:border-blue-500 outline-none transition-all bg-white group-hover:bg-gray-50/50"
                    />
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden min-h-0">
                {/* List View */}
                <div className={cn(
                    "lg:w-96 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar shrink-0 transition-all",
                    replyingTo ? "hidden lg:flex" : "flex"
                )}>
                    {filtered.length === 0 ? (
                        <div className="text-center py-20 bg-surface-section rounded-3xl border-2 border-dashed border-border-default">
                            <p className="text-sm font-black text-text-tertiary uppercase italic tracking-widest">Không có dữ liệu</p>
                        </div>
                    ) : (
                        filtered.map(f => (
                            <button
                                key={f.id}
                                onClick={() => onSelectFeedback(f)}
                                className={cn(
                                    "w-full p-5 rounded-3xl border-2 text-left transition-all relative group flex flex-col gap-3",
                                    replyingTo?.id === f.id 
                                        ? "bg-white border-blue-600 shadow-xl shadow-blue-100 ring-4 ring-blue-50 scale-[1.02] z-10" 
                                        : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-lg"
                                )}
                            >
                                {!f.is_read_admin && (
                                    <div className="absolute top-5 right-5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse shadow-md" />
                                )}
                                <div className="flex items-center gap-2">
                                    <div className={cn("px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-tighter",
                                        f.type === 'bug' ? "bg-red-50 text-red-600 border border-red-100" : f.type === 'feature' ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-blue-50 text-blue-600 border border-blue-100")
                                    }>
                                        {f.type === 'bug' ? 'Lỗi hệ thống' : f.type === 'feature' ? 'Đề xuất mới' : 'Góp ý khác'}
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-bold">
                                        {format(new Date(f.created_at), "HH:mm, dd/MM", { locale: vi })}
                                    </span>
                                </div>
                                <p className={cn("text-sm line-clamp-2 leading-relaxed h-10 overflow-hidden", !f.is_read_admin ? "font-black text-gray-900" : "font-medium text-gray-600")}>
                                    {f.content}
                                </p>
                                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                    <div className="flex items-center gap-2 max-w-[60%] overflow-hidden">
                                        <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 shrink-0">
                                            <User size={12} />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-400 truncate">{f.user_email}</span>
                                    </div>
                                    {f.status === 'replied' ? (
                                        <div className="flex items-center gap-1 text-[9px] text-green-600 font-black uppercase bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                                            <CheckCircle2 size={10} strokeWidth={3} /> Đã trả lời
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-[9px] text-amber-500 font-black uppercase bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                            <Loader2 size={10} className="animate-spin" /> Đang chờ
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Chat View */}
                <div className={cn(
                    "flex-1 bg-white rounded-[2rem] border-2 border-gray-100 shadow-xl flex flex-col overflow-hidden min-h-0",
                    !replyingTo ? "hidden lg:flex items-center justify-center" : "flex"
                )}>
                    {!replyingTo ? (
                        <div className="flex flex-col items-center justify-center text-text-tertiary gap-6 py-20 animate-in fade-in zoom-in duration-500">
                            <div className="bg-surface-section p-10 rounded-[2.5rem] shadow-xs border border-border-subtle">
                                <MessageSquare size={80} strokeWidth={1.5} className="text-text-tertiary" />
                            </div>
                            <div className="text-center space-y-1">
                                <p className="font-black text-lg uppercase tracking-[0.2em] text-text-primary">Khu vực trực chiến</p>
                                <p className="font-bold italic text-sm text-text-secondary">Chọn một tín hiệu từ giáo viên để xử lý</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div className="p-5 border-b-2 border-gray-50 flex items-center justify-between bg-white shrink-0">
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => setReplyingTo(null)}
                                        className="lg:hidden p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-lg shadow-blue-100">
                                            {replyingTo.user_email?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-gray-900 flex items-center gap-2">
                                                {replyingTo.user_email}
                                                <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">Giáo viên</span>
                                            </div>
                                            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Đang trực tuyến
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center gap-2">
                                    <div className={cn("px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border-2",
                                        replyingTo.type === 'bug' ? "bg-red-50 text-red-600 border-red-100" : "bg-blue-50 text-blue-600 border-blue-100")
                                    }>
                                        {replyingTo.type}
                                    </div>
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-gray-50/30">
                                <div className="flex justify-center">
                                    <span className="bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm text-[9px] font-black text-gray-400 px-3 py-1 rounded-full uppercase tracking-widest">
                                        Khởi tạo hội thoại: {format(new Date(replyingTo.created_at), "HH:mm, dd/MM/yyyy", { locale: vi })}
                                    </span>
                                </div>

                                {/* User Bubble */}
                                <div className="flex flex-col items-start gap-1 max-w-[85%] animate-in slide-in-from-left-4 fade-in duration-300">
                                    <div className="bg-white border-2 border-gray-100 p-4 rounded-3xl rounded-tl-none shadow-sm shadow-black/5">
                                        <p className="text-sm font-medium text-gray-800 leading-relaxed whitespace-pre-wrap">{replyingTo.content}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Sếp gửi</span>
                                        <div className="w-1 h-1 bg-gray-300 rounded-full" />
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                            {format(new Date(replyingTo.created_at), "HH:mm")}
                                        </span>
                                    </div>
                                </div>

                                {/* Admin Bubble (If replied) */}
                                {replyingTo.status === 'replied' && replyingTo.reply_content && (
                                    <div className="flex flex-col items-end gap-1 max-w-[85%] ml-auto animate-in slide-in-from-right-4 fade-in duration-300">
                                        <div className="bg-indigo-600 text-white p-4 rounded-3xl rounded-tr-none shadow-xl shadow-indigo-100">
                                            <p className="text-sm font-semibold leading-relaxed whitespace-pre-wrap">{replyingTo.reply_content}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2">
                                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">Admin Phản hồi</span>
                                            <div className="w-1 h-1 bg-gray-300 rounded-full" />
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                                {format(new Date(replyingTo.updated_at), "HH:mm")}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Chat Input */}
                            <div className="p-5 bg-white border-t-2 border-gray-50 shrink-0">
                                <div className="relative group">
                                    <textarea
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        placeholder={replyingTo.status === 'replied' ? "Cập nhật lại phản hồi..." : "Nhập phản hồi gửi đến Sếp..."}
                                        className="w-full h-24 p-4 pr-16 text-sm font-medium border-2 border-gray-100 rounded-[1.5rem] focus:ring-0 focus:border-indigo-500 outline-none transition-all bg-gray-50 group-hover:bg-white resize-none"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleReply();
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={handleReply}
                                        disabled={isSending || !replyContent.trim()}
                                        className={cn(
                                            "absolute bottom-4 right-4 p-3 rounded-2xl shadow-lg transition-all active:scale-90",
                                            isSending || !replyContent.trim() ? "bg-gray-200 text-gray-400" : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
                                        )}
                                    >
                                        {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} strokeWidth={2.5} />}
                                    </button>
                                </div>
                                <div className="mt-3 flex items-center justify-between px-2">
                                    <span className="text-[9px] text-gray-400 font-bold italic uppercase tracking-tighter">Nhấn Enter để gửi phản hồi nhanh</span>
                                    {replyingTo.status === 'replied' && (
                                        <span className="text-[9px] text-amber-500 font-black uppercase tracking-tighter">Sửa lại phản hồi cũ</span>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e5e7eb;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #d1d5db;
                }
            `}</style>
        </div>
    );
}
