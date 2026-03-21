'use server';

import { supabase } from '@/lib/supabase';
import { AppUser } from '@/types/models';

// --- User Actions ---

export async function sendFeedback(
    appUser: AppUser | null,
    payload: { type: string; content: string }
) {
    if (!appUser) return { success: false, message: "Bạn cần đăng nhập." };
    if (!payload.content || payload.content.trim().length < 10) {
        return { success: false, message: "Nội dung quá ngắn." };
    }

    try {
        const { error } = await supabase.from('feedbacks').insert({
            user_id: appUser.uid,
            user_email: appUser.email,
            type: payload.type,
            content: payload.content,
            is_read_admin: false,
            is_read_user: true
        });
        if (error) throw error;
        return { success: true, message: "Đã gửi góp ý thành công!" };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function getMyFeedbacks(appUser: AppUser | null) {
    if (!appUser) return [];
    const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('user_id', appUser.uid)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('[getMyFeedbacks] Error:', error);
        return [];
    }
    return data || [];
}

export async function markFeedbackAsRead(id: string) {
    await supabase.from('feedbacks').update({ is_read_user: true }).eq('id', id);
}

// --- Admin Actions ---

export async function getFeedbacksAdmin(appUser: AppUser | null) {
    if (!appUser || appUser.role !== 'admin') return [];
    
    const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('[getFeedbacksAdmin] Error:', error);
        return [];
    }
    return data || [];
}

export async function replyToFeedback(
    appUser: AppUser | null,
    feedbackId: string,
    replyContent: string
) {
    if (!appUser || appUser.role !== 'admin') return { success: false, message: "Quyền Admin yêu cầu." };
    
    try {
        const { error } = await supabase
            .from('feedbacks')
            .update({
                reply_content: replyContent,
                status: 'replied',
                is_read_user: false, // Để người dùng thấy chấm đỏ
                updated_at: new Date().toISOString()
            })
            .eq('id', feedbackId);

        if (error) throw error;
        return { success: true, message: "Đã phản hồi cho giáo viên!" };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function markAsReadByAdmin(feedbackId: string) {
    await supabase.from('feedbacks').update({ is_read_admin: true }).eq('id', feedbackId);
}
