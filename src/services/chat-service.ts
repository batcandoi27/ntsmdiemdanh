import { supabase } from '@/lib/supabase';
import { ChatThread, ChatMessage } from '@/types/models';

export class ChatService {
    /**
     * Lấy hoặc tạo mới thread cho user hiện tại
     */
    static async getOrCreateThread(userId: string): Promise<string> {
        try {
            // Lấy Auth ID thực tế từ Supabase để đối chiếu
            const { data: { user: authUser } } = await supabase.auth.getUser();
            console.log('[ChatService] Debug Auth:', { 
                passedUserId: userId, 
                supabaseAuthId: authUser?.id 
            });

            // Tìm thread đang mở của user
            const { data: threads, error: findError } = await supabase
                .from('chat_threads')
                .select('id')
                .eq('user_id', userId)
                .eq('status', 'open')
                .limit(2); // Lấy dư để check
            
            if (findError) {
                console.error('[ChatService] Lỗi khi tìm thread:', findError);
                throw new Error(`Lỗi Database: ${findError.message}`);
            }
            
            if (threads && threads.length > 0) {
                console.log('[ChatService] Đã tìm thấy thread có sẵn:', threads[0].id);
                return threads[0].id;
            }

            // Tạo mới nếu chưa có
            console.log('[ChatService] Đang tạo luồng chat mới cho profile:', userId);
            const { data: newThreads, error: createError } = await supabase
                .from('chat_threads')
                .insert({ user_id: userId, subject: 'Hỗ trợ kỹ thuật' })
                .select('id');
            
            if (createError) {
                console.error('[ChatService] Lỗi khi tạo thread:', createError);
                throw new Error(`Lỗi tạo luồng chat: ${createError.message}. Hãy kiểm tra RLS policy.`);
            }

            if (!newThreads || newThreads.length === 0) {
                console.error('[ChatService] Insert thành công nhưng không trả về data (có thể do RLS chặn select sau insert)');
                // Thử tìm lại 1 lần nữa vì có thể insert được nhưng select() bị RLS chặn
                const { data: retryThreads } = await supabase
                    .from('chat_threads')
                    .select('id')
                    .eq('user_id', userId)
                    .limit(1);
                if (retryThreads && retryThreads.length > 0) return retryThreads[0].id;
                
                throw new Error('Không thể khởi tạo luồng chat (RLS Policy blocking).');
            }

            return newThreads[0].id;
        } catch (err: any) {
            console.error('[ChatService] getOrCreateThread Exception:', err);
            throw err;
        }
    }

    /**
     * Lấy danh sách tin nhắn của một thread
     */
    static async getMessages(threadId: string): Promise<ChatMessage[]> {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('thread_id', threadId)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        return data.map(m => ({
            id: m.id,
            threadId: m.thread_id,
            senderId: m.sender_id,
            content: m.content,
            isRead: m.is_read,
            createdAt: m.created_at
        }));
    }

    /**
     * Gửi tin nhắn mới
     */
    static async sendMessage(threadId: string, senderId: string, content: string): Promise<void> {
        const { error } = await supabase
            .from('chat_messages')
            .insert({
                thread_id: threadId,
                sender_id: senderId,
                content: content
            });
        
        if (error) {
            console.error('[ChatService] Lỗi khi gửi tin nhắn:', error);
            throw new Error(`Không thể gửi tin nhắn: ${error.message}`);
        }
    }

    /**
     * Đánh dấu các tin nhắn trong thread là đã đọc (cho receiver)
     */
    static async markAsRead(threadId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('chat_messages')
            .update({ is_read: true })
            .eq('thread_id', threadId)
            .neq('sender_id', userId)
            .eq('is_read', false);
        
        if (error) console.error('Error marking as read:', error);
    }

    /**
     * Đếm số tin nhắn chưa đọc của user
     */
    static async getUnreadCount(userId: string, isAdmin: boolean, threadId?: string): Promise<number> {
        if (isAdmin && !threadId) {
            // Admin đếm TỔNG tất cả tin nhắn chưa đọc toàn hệ thống để hiện ở Menu Inbox
            const { count } = await supabase
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .neq('sender_id', userId)
                .eq('is_read', false);
            return count || 0;
        }

        // Đếm tin chưa đọc trong 1 thread cụ thể (dành cho Bubble chat)
        let targetThreadId = threadId;
        if (!targetThreadId) {
            const { data: thread } = await supabase
                .from('chat_threads')
                .select('id')
                .eq('user_id', userId)
                .eq('status', 'open')
                .maybeSingle();
            if (!thread) return 0;
            targetThreadId = thread.id;
        }

        const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', targetThreadId)
            .neq('sender_id', userId)
            .eq('is_read', false);
        return count || 0;
    }

    /**
     * Lấy tất cả các thread kèm thông tin tin nhắn cuối cùng (Dành cho Admin)
     */
    static async getAllThreadsWithLastMessage() {
        try {
            // 1. Lấy tất cả threads kèm profile người dùng
            const { data: threads, error: threadError } = await supabase
                .from('chat_threads')
                .select(`
                    *,
                    profiles:user_id (id, full_name, role, email)
                `)
                .order('created_at', { ascending: false });

            if (threadError) throw threadError;

            // 2. Với mỗi thread, lấy tin nhắn cuối cùng và đếm tin chưa đọc (cho admin)
            const threadsWithDetails = await Promise.all((threads || []).map(async (thread: any) => {
                const { data: lastMsgs } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .eq('thread_id', thread.id)
                    .order('created_at', { ascending: false })
                    .limit(1);
                
                const { count: unreadCount } = await supabase
                    .from('chat_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('thread_id', thread.id)
                    .eq('is_read', false)
                    .neq('sender_id', thread.user_id); // Tin nhắn từ user mà admin chưa đọc

                return {
                    ...thread,
                    lastMessage: lastMsgs && lastMsgs.length > 0 ? lastMsgs[0] : null,
                    unreadCount: unreadCount || 0
                };
            }));

            // Sắp xếp theo thời gian tin nhắn cuối cùng hoặc thời gian tạo thread
            return threadsWithDetails.sort((a, b) => {
                const timeA = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : new Date(a.created_at).getTime();
                const timeB = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : new Date(b.created_at).getTime();
                return timeB - timeA;
            });
        } catch (err: any) {
            console.error('[ChatService] getAllThreadsWithLastMessage error:', err);
            throw err;
        }
    }

    /**
     * Xóa một tin nhắn cụ thể
     */
    static async deleteMessage(messageId: string): Promise<void> {
        const { error } = await supabase
            .from('chat_messages')
            .delete()
            .eq('id', messageId);
        
        if (error) throw error;
    }

    /**
     * Xóa toàn bộ luồng chat và tin nhắn liên quan
     */
    static async deleteThread(threadId: string): Promise<void> {
        const { error } = await supabase
            .from('chat_threads')
            .delete()
            .eq('id', threadId);
        
        if (error) throw error;
    }
}
