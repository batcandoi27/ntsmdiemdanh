'use server';

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { TeacherEvent, TeacherGroup } from '@/types/teacher';

const dbClient = (typeof window === 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;

/**
 * Lấy danh sách sự kiện kèm theo các nhóm tham gia
 */
export async function getAllEvents(): Promise<TeacherEvent[]> {
  const { data, error } = await dbClient
    .from('teacher_events')
    .select(`
      *,
      event_groups (
        teacher_groups (*)
      )
    `)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Lỗi getAllEvents:', error);
    return [];
  }
  
  return (data || []).map((e: any) => ({
    ...e,
    groups: e.event_groups?.map((eg: any) => eg.teacher_groups) || []
  }));
}

/**
 * Tạo sự kiện mới và gán nhóm
 */
export async function createEvent(
  event: Omit<TeacherEvent, 'id' | 'created_at' | 'updated_at' | 'groups'>,
  groupIds: string[]
): Promise<TeacherEvent | null> {
  // Tạo secret ngẫu nhiên cho QR
  const qrSecret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  const { data: newEvent, error: eventError } = await dbClient
    .from('teacher_events')
    .insert({ ...event, qr_secret: qrSecret })
    .select()
    .single();

  if (eventError || !newEvent) {
    console.error('Lỗi createEvent:', eventError);
    return null;
  }

  // Thêm các nhóm vào sự kiện qua bảng trung gian event_groups
  if (groupIds.length > 0) {
    const groupLinks = groupIds.map(gid => ({ event_id: newEvent.id, group_id: gid }));
    const { error: groupError } = await dbClient.from('event_groups').insert(groupLinks);
    if (groupError) console.error('Lỗi insert event_groups:', groupError);
  }

  return newEvent;
}

/**
 * Tạo Token QR động
 * Format: eventId:timestamp:nonce:signature
 */
export async function generateEventQRToken(eventId: string, secret: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = Math.random().toString(36).substring(7);
  
  // Tạo signature đơn giản bằng cách kết hợp data và secret
  const dataToSign = `${eventId}:${timestamp}:${nonce}`;
  // Lưu ý: Trong môi trường Node.js có thể dùng crypto.createHmac
  const signature = Buffer.from(dataToSign + secret).toString('base64').substring(0, 16);
  
  return `${dataToSign}:${signature}`;
}

/**
 * Verify QR Token từ client gửi lên
 */
export async function verifyQRToken(token: string, secret: string): Promise<{ eventId: string; isValid: boolean }> {
  try {
    const [eventId, timestampStr, nonce, signature] = token.split(':');
    const timestamp = parseInt(timestampStr);
    const now = Math.floor(Date.now() / 1000);

    // 1. Kiểm tra hết hạn (5 phút)
    if (now - timestamp > 300) return { eventId, isValid: false };

    // 2. Kiểm tra signature
    const dataToSign = `${eventId}:${timestamp}:${nonce}`;
    const expectedSignature = Buffer.from(dataToSign + secret).toString('base64').substring(0, 16);
    
    return { eventId, isValid: signature === expectedSignature };
  } catch (err) {
    return { eventId: '', isValid: false };
  }
}

/**
 * Lấy danh sách sự kiện liên quan đến một giáo viên
 */
export async function getEventsForTeacher(teacherId: string): Promise<any[]> {
  const { supabase } = await import('@/lib/supabase');
  
  // 1. Lấy danh sách các group mà giáo viên này tham gia
  const { data: groupMembers } = await supabase
    .from('teacher_group_members')
    .select('group_id')
    .eq('teacher_id', teacherId);
  
  const groupIds = groupMembers?.map(m => m.group_id) || [];

  // 2. Lấy các sự kiện kèm thông tin điểm danh của GV này
  const { data: events, error } = await supabase
    .from('teacher_events')
    .select('*, teacher_event_groups(group_id), teacher_attendance(*)')
    .order('start_time', { ascending: false });

  if (error) return [];

  return events.filter(event => {
    const eventGroupIds = event.teacher_event_groups?.map((eg: any) => eg.group_id) || [];
    // Dành cho tất cả hoặc đúng group
    return eventGroupIds.length === 0 || eventGroupIds.some((gid: string) => groupIds.includes(gid));
  }).map(event => {
    // Filter attendance cho đúng giáo viên này
    const myAttendance = event.teacher_attendance?.find((a: any) => a.teacher_id === teacherId);
    return {
      ...event,
      myAttendance
    };
  });
}
