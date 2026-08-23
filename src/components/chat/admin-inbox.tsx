"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { useChat } from '@/context/chat-context';
import { ChatService } from '@/services/chat-service';
import { ChatMessage } from '@/types/models';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Search, User as UserIcon, Send, MessageSquare, Clock, ShieldCheck, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function AdminInbox() {
    const { appUser } = useAuth();
    const { setCurrentThreadId, currentThreadId: activeThreadId } = useChat();
    const [threads, setThreads] = useState<any[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    const scrollRef = useRef<HTMLDivElement>(null);

    const isAdmin = appUser?.role === 'admin' || appUser?.role === 'principal';

    // 1. Tải danh sách thread
    const loadThreads = async () => {
        try {
            const data = await ChatService.getAllThreadsWithLastMessage();
            setThreads(data);
        } catch (error) {
            console.error('Failed to load threads:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (appUser && isAdmin) {
            loadThreads();

            // Realtime lắng nghe tin nhắn mới để cập nhật danh sách hòm thư
            const channel = supabase
                .channel('admin_inbox_updates')
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'chat_messages' 
                }, () => {
                    loadThreads(); // Reload danh sách khi có tin nhắn bất kỳ (để cập nhật lastMessage/unreadCount)
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [appUser, isAdmin]);

    // 2. Tải tin nhắn khi chọn một thread
    useEffect(() => {
        if (selectedThreadId) {
            ChatService.getMessages(selectedThreadId).then(msgs => {
                setMessages(msgs);
                // Đánh dấu đã đọc khi admin xem
                ChatService.markAsRead(selectedThreadId, appUser!.uid).then(() => {
                    loadThreads(); // Cập nhật lại badge chưa đọc trên danh sách
                });
            });

            // Đăng ký lắng nghe realtime cho thread cụ thể đang mở
            const channel = supabase
                .channel(`thread_${selectedThreadId}`)
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'chat_messages',
                    filter: `thread_id=eq.${selectedThreadId}`
                }, (payload) => {
                    const newMsg = payload.new as any;
                    setMessages(prev => [...prev, {
                        id: newMsg.id,
                        threadId: newMsg.thread_id,
                        senderId: newMsg.sender_id,
                        content: newMsg.content,
                        isRead: newMsg.is_read,
                        createdAt: newMsg.created_at
                    }]);
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [selectedThreadId, appUser]);

    // Tự động cuộn xuống cuối
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !selectedThreadId || !appUser) return;
        
        const content = input;
        setInput('');
        try {
            await ChatService.sendMessage(selectedThreadId, appUser.uid, content);
        } catch (error: any) {
            toast.error('Không thể gửi tin nhắn phản hồi');
        }
    };

    const filteredThreads = threads.filter(t => 
        t.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        t.profiles?.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-280px)] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden m-4">
            {/* Sidebar: Thread List */}
            <div className="w-80 border-r border-gray-100 flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <MessageSquare className="text-primary" size={20} />
                        Hộp Thư Hỗ Trợ
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm theo tên/email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Đang tải...</div>
                    ) : filteredThreads.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            {search ? 'Không tìm thấy kết quả' : 'Chưa có yêu cầu hỗ trợ nào'}
                        </div>
                    ) : (
                        filteredThreads.map(thread => {
                            const isSelected = selectedThreadId === thread.id;
                            const lastMsg = thread.lastMessage;
                            return (
                                <div
                                    key={thread.id}
                                    onClick={() => {
                                        setSelectedThreadId(thread.id);
                                        setCurrentThreadId(thread.id); // Đồng bộ với bong bóng chat
                                    }}
                                    className={`w-full p-4 flex gap-3 text-left border-b border-gray-50 transition-colors cursor-pointer ${
                                        selectedThreadId === thread.id ? 'bg-primary/5' : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                            {thread.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        {thread.unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 block h-4 w-4 rounded-full bg-red-500 border-2 border-white text-[8px] font-bold text-white flex items-center justify-center">
                                                {thread.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h4 className="font-bold text-sm text-gray-800 truncate">
                                                {thread.profiles?.full_name || 'N/A'}
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                {lastMsg && (
                                                    <span className="text-[10px] text-gray-400">
                                                        {format(new Date(lastMsg.created_at), 'HH:mm')}
                                                    </span>
                                                )}
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm('Bạn có chắc muốn xóa luồng chat này?')) {
                                                            ChatService.deleteThread(thread.id).then(() => {
                                                                if (selectedThreadId === thread.id) setSelectedThreadId(null);
                                                                loadThreads();
                                                                toast.success('Đã xóa luồng chat');
                                                            }).catch(err => {
                                                                console.error('Delete thread error:', err);
                                                                toast.error('Không có quyền xóa luồng này');
                                                            });
                                                        }
                                                    }}
                                                    className="p-1 text-text-tertiary hover:text-danger transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className={`text-xs truncate ${thread.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                                            {lastMsg ? lastMsg.content : 'Chưa có tin nhắn'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Main Area: Chat Window */}
            <div className="flex-1 flex flex-col bg-slate-50/30">
                {selectedThreadId ? (
                    <>
                        {/* Header của thread đang chọn */}
                        <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                                    {threads.find(t => t.id === selectedThreadId)?.profiles?.full_name?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">
                                        {threads.find(t => t.id === selectedThreadId)?.profiles?.full_name}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        {threads.find(t => t.id === selectedThreadId)?.profiles?.email}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.map((msg) => {
                                const isMe = msg.senderId === appUser?.uid;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                        <div className={`relative max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                            isMe 
                                                ? 'bg-blue-600 text-white rounded-tr-none' 
                                                : 'bg-green-600 text-white rounded-tl-none'
                                        }`}>
                                            <p className="leading-relaxed">{msg.content}</p>
                                            <p className="text-[10px] mt-2 text-right opacity-80 flex items-center justify-end gap-1">
                                                <Clock size={10} />
                                                {format(new Date(msg.createdAt), 'HH:mm, dd/MM', { locale: vi })}
                                            </p>
                                            
                                            {/* Nút xóa tin nhắn khi hover */}
                                            <button 
                                                onClick={() => {
                                                    if (confirm('Xóa tin nhắn này?')) {
                                                        ChatService.deleteMessage(msg.id).then(() => {
                                                            setMessages(prev => prev.filter(m => m.id !== msg.id));
                                                            toast.success('Đã xóa tin nhắn');
                                                        }).catch(err => {
                                                            console.error('Delete message error:', err);
                                                            toast.error('Không có quyền xóa tin nhắn này');
                                                        });
                                                    }
                                                }}
                                                className={`absolute -top-2 ${isMe ? '-left-2' : '-right-2'} p-1.5 bg-white text-gray-400 hover:text-red-500 rounded-full shadow-md border border-gray-100 opacity-0 group-hover:opacity-100 transition-all`}
                                            >
                                                <Trash2 size={10} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-3">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Nhập câu trả lời hỗ trợ..."
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 text-sm text-blue-700 font-medium focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim()}
                                className="bg-primary text-white p-3 rounded-2xl shadow-lg hover:shadow-primary/20 active:scale-90 disabled:opacity-50 transition-all flex items-center gap-2 font-bold px-6"
                            >
                                <Send size={20} />
                                <span className="hidden sm:inline">Gửi trả lời</span>
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-secondary p-8 text-center bg-surface-card">
                        <div className="w-20 h-20 bg-surface-section rounded-full flex items-center justify-center mb-4 border border-border-subtle shadow-xs">
                            <MessageSquare size={40} className="text-text-tertiary" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary mb-2">Hộp thư hỗ trợ</h3>
                        <p className="max-w-xs text-text-secondary text-sm font-medium">Chọn một cuộc trò chuyện từ bên trái để bắt đầu phản hồi giáo viên và học sinh.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
