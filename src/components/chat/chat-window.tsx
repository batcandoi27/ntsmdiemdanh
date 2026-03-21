"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, User as UserIcon, ShieldCheck, MessageCircle } from 'lucide-react';
import { useChat } from '@/context/chat-context';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export function ChatWindow() {
    const { isChatOpen, messages, sendMessage, currentThreadId } = useChat();
    const { appUser } = useAuth();
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Tự động cuộn xuống cuối khi có tin nhắn mới
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isChatOpen]);

    if (!isChatOpen) return null;

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        
        const content = input;
        console.log('[ChatWindow] Bắt đầu gửi tin nhắn:', content);
        setInput('');
        try {
            console.log('[ChatWindow] Gọi sendMessage với threadId:', currentThreadId);
            await sendMessage(content);
            console.log('[ChatWindow] Gửi tin nhắn thành công');
        } catch (error: any) {
            console.error('[ChatWindow] Lỗi gửi tin nhắn:', error);
            alert('Không thể gửi tin nhắn. Lỗ: ' + error.message);
        }
    };

    return (
        <div className="fixed bottom-24 right-6 z-[60] w-[90vw] sm:w-[350px] h-[450px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300 md:bottom-24">
            {/* Header */}
            <div className="bg-primary px-4 py-3 flex items-center justify-between text-white shadow-md">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <ShieldCheck size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold">Hỗ trợ kỹ thuật</h3>
                        <p className="text-[10px] opacity-80">Chúng tôi thường phản hồi ngay</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-4">
                        <MessageCircle size={40} className="mb-2 opacity-20" />
                        <p className="text-sm">Bắt đầu cuộc trò chuyện. Hãy gửi tin nhắn nếu bạn cần hỗ trợ!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderId === appUser?.uid;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                                    isMe 
                                        ? 'bg-blue-600 text-white rounded-tr-none' 
                                        : 'bg-green-600 text-white rounded-tl-none'
                                }`}>
                                    <p className="leading-relaxed">{msg.content}</p>
                                    <p className={`text-[9px] mt-1 text-right opacity-80`}>
                                        {format(new Date(msg.createdAt), 'HH:mm', { locale: vi })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-sm text-blue-700 font-medium focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-400"
                />
                <button
                    type="submit"
                    disabled={!input.trim()}
                    className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg active:scale-90 disabled:opacity-50 disabled:scale-100 transition-all"
                >
                    <Send size={18} className="ml-1" />
                </button>
            </form>
        </div>
    );
}
