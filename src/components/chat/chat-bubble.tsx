"use client";

import React from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useChat } from '@/context/chat-context';

export function ChatBubble() {
    const { isChatOpen, setIsChatOpen, isBubbleVisible, unreadCount } = useChat();

    if (!isBubbleVisible) return null;

    return (
        <div className="fixed bottom-24 right-6 z-[60] md:bottom-6">
            <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 ${
                    isChatOpen ? 'bg-slate-200 text-slate-600' : 'bg-primary text-white'
                }`}
                aria-label="Toggle chat"
            >
                {isChatOpen ? <X size={24} /> : <MessageCircle size={28} />}
                
                {unreadCount > 0 && !isChatOpen && (
                    <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white animate-bounce">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>
        </div>
    );
}
