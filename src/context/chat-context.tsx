"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth-context';
import { ChatService } from '@/services/chat-service';
import { ChatMessage } from '@/types/models';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface ChatContextType {
    isChatOpen: boolean;
    setIsChatOpen: (open: boolean) => void;
    isBubbleVisible: boolean;
    setIsBubbleVisible: (visible: boolean) => void;
    unreadCount: number;
    systemUnreadCount: number; // Tổng số tin chưa đọc toàn hệ thống (cho Admin)
    messages: ChatMessage[];
    sendMessage: (content: string) => Promise<void>;
    currentThreadId: string | null;
    setCurrentThreadId: (id: string | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const { appUser } = useAuth();
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isBubbleVisible, setIsBubbleVisible] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [systemUnreadCount, setSystemUnreadCount] = useState(0);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);

    const isAdmin = appUser?.role === 'admin' || appUser?.role === 'principal';

    // Khởi tạo thread và lấy tin nhắn
    const initChat = useCallback(async () => {
        if (!appUser) return;
        try {
            console.log('[ChatContext] Kết nối hòm thư cho user:', appUser.uid);
            const threadId = await ChatService.getOrCreateThread(appUser.uid);
            console.log('[ChatContext] Đã lấy/tạo Thread ID:', threadId);
            setCurrentThreadId(threadId);
            const msgs = await ChatService.getMessages(threadId);
            console.log('[ChatContext] Đã tải số lượng tin nhắn:', msgs.length);
            setMessages(msgs);
            
            // Cập nhật số tin nhắn chưa đọc của cá nhân (Bubble)
            const count = await ChatService.getUnreadCount(appUser.uid, false, threadId); 
            setUnreadCount(count);

            // Nếu là Admin, cập nhật thêm tổng số tin chưa đọc toàn hệ thống
            if (isAdmin) {
                const total = await ChatService.getUnreadCount(appUser.uid, true);
                setSystemUnreadCount(total);
            }
        } catch (error) {
            console.error('[ChatContext] Lỗi khởi tạo chat:', error);
        }
    }, [appUser, isAdmin]);

    useEffect(() => {
        if (appUser) {
            initChat();

            // Đăng ký realtime lắng nghe tin nhắn mới
            const channel = supabase
                .channel('chat_messages_changes')
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'chat_messages' 
                }, async (payload) => {
                    console.log('[ChatContext] << NHẬN TIN MỚI TỪ REALTIME >>', payload);
                    const newMsg = payload.new as any;
                    
                    // Nếu tin nhắn thuộc thread hiện tại, cập nhật danh sách
                    if (currentThreadId && newMsg.thread_id === currentThreadId) {
                        setMessages(prev => {
                            // Tránh duplicate nếu tin nhắn đã tồn tại
                            if (prev.some(m => m.id === newMsg.id)) return prev;
                            
                            return [...prev, {
                                id: newMsg.id,
                                threadId: newMsg.thread_id,
                                senderId: newMsg.sender_id,
                                content: newMsg.content,
                                isRead: newMsg.is_read,
                                createdAt: newMsg.created_at
                            }];
                        });

                        // Nếu chat đang mở, đánh dấu đã đọc luôn
                        if (isChatOpen && newMsg.sender_id !== appUser.uid) {
                            await ChatService.markAsRead(currentThreadId, appUser.uid);
                        }
                    }

                    // Thông báo Toast nếu tin nhắn không phải của mình
                    if (newMsg.sender_id !== appUser.uid) {
                        toast.success('Bạn có tin nhắn hỗ trợ mới!', { icon: '💬' });
                        
                        // Cập nhật cả 2 loại count
                        const count = await ChatService.getUnreadCount(appUser.uid, false, currentThreadId || undefined);
                        setUnreadCount(count);
                        
                        if (isAdmin) {
                            const total = await ChatService.getUnreadCount(appUser.uid, true);
                            setSystemUnreadCount(total);
                        }
                    }
                })
                .subscribe((status) => {
                    console.log(`[ChatContext] TRẠNG THÁI REALTIME:`, status);
                    if (status === 'CHANNEL_ERROR') {
                        console.error('[ChatContext] Lỗi kết nối Realtime. Tin nhắn có thể không tự động cập nhật.');
                    }
                });

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [appUser, currentThreadId, isChatOpen, isAdmin, initChat]);

    // Đánh dấu đã đọc khi mở chat
    useEffect(() => {
        if (isChatOpen && currentThreadId && appUser && unreadCount > 0) {
            ChatService.markAsRead(currentThreadId, appUser.uid).then(async () => {
                // Refresh lại count từ server cho chính xác
                const count = await ChatService.getUnreadCount(appUser.uid, false, currentThreadId);
                setUnreadCount(count);
                
                if (isAdmin) {
                    const total = await ChatService.getUnreadCount(appUser.uid, true);
                    setSystemUnreadCount(total);
                }
            });
        }
    }, [isChatOpen, currentThreadId, appUser, unreadCount, isAdmin]);

    const sendMessage = async (content: string) => {
        if (!currentThreadId) {
            console.warn('[ChatContext] Không thể gửi: threadId đang null');
            return;
        }
        if (!appUser) {
            console.warn('[ChatContext] Không thể gửi: appUser đang null');
            return;
        }
        
        console.log('[ChatContext] Đang gửi lên Database...');
        
        // Optimistic Update: Thêm vào UI ngay lập tức cho mượt
        const tempId = 'temp-' + Date.now();
        const optimisticMsg: ChatMessage = {
            id: tempId,
            threadId: currentThreadId,
            senderId: appUser.uid,
            content: content,
            isRead: true,
            createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            await ChatService.sendMessage(currentThreadId, appUser.uid, content);
            console.log('[ChatContext] Đã gửi xong.');
        } catch (error) {
            console.error('[ChatContext] Gửi tin thất bại, xóa tin tạm:', error);
            setMessages(prev => prev.filter(m => m.id !== tempId));
            throw error;
        }
    };

    return (
        <ChatContext.Provider value={{
            isChatOpen, setIsChatOpen,
            isBubbleVisible, setIsBubbleVisible,
            unreadCount, systemUnreadCount, messages,
            sendMessage, currentThreadId, setCurrentThreadId
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}
